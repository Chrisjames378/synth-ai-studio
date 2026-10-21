import React, { useEffect, useRef, useState, useMemo } from 'react';
import { audioEngine } from '../../lib/audio/AudioEngine';
import * as d3 from 'd3';
import {
  Disc3,
  Activity,
  Music,
  Sparkles,
  RotateCcw,
  Sliders,
  Layers,
  Volume2,
} from 'lucide-react';

interface PersistentPeakMarker {
  id: string;
  freq: number;
  note: string;
  cents: string;
  amplitude: number;
  db: number;
  x: number;
  y: number;
  decayLife: number; // 1.0 (fresh) down to 0.0 (expired)
  lastSeenTime: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Octave frequencies for C1 through C8
const OCTAVE_NOTES: { note: string; freq: number; isFundamentalA4?: boolean }[] = [
  { note: 'C1', freq: 32.7 },
  { note: 'C2', freq: 65.41 },
  { note: 'C3', freq: 130.81 },
  { note: 'C4', freq: 261.63 },
  { note: 'A4', freq: 440.0, isFundamentalA4: true },
  { note: 'C5', freq: 523.25 },
  { note: 'C6', freq: 1046.5 },
  { note: 'C7', freq: 2093.0 },
  { note: 'C8', freq: 4186.01 },
];

// Chromatic notes between 30 Hz and 5000 Hz for the overlay ruler
const ALL_CHROMATIC_NOTES: { note: string; freq: number; isSharp: boolean; octave: number }[] = [];
for (let midi = 24; midi <= 108; midi++) {
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const noteIdx = ((midi % 12) + 12) % 12;
  const noteName = NOTE_NAMES[noteIdx];
  const octave = Math.floor(midi / 12) - 1;
  const isSharp = noteName.includes('#');
  ALL_CHROMATIC_NOTES.push({
    note: `${noteName}${octave}`,
    freq,
    isSharp,
    octave,
  });
}

function frequencyToMusicalNote(freq: number): { note: string; cents: string } | null {
  if (freq < 20 || freq > 20000 || !isFinite(freq)) return null;
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  const noteName = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  const standardFreq = 440 * Math.pow(2, (midi - 69) / 12);
  const centsNum = Math.round(1200 * Math.log2(freq / standardFreq));
  const centsStr = centsNum > 0 ? `+${centsNum}¢` : `${centsNum}¢`;
  return {
    note: `${noteName}${octave}`,
    cents: centsStr,
  };
}

export const Visualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<'combined' | 'wave' | 'fft'>('combined');
  const [noteOverlayMode, setNoteOverlayMode] = useState<'chromatic' | 'octaves' | 'off'>('chromatic');
  const [peakHoldDuration, setPeakHoldDuration] = useState<'normal' | 'long' | 'infinite'>('normal');
  const [showPeakMarkers, setShowPeakMarkers] = useState<boolean>(true);
  const [peakL, setPeakL] = useState<number>(-60);
  const [peakR, setPeakR] = useState<number>(-60);
  const [dominantNote, setDominantNote] = useState<{ note: string; freq: number; cents: string; db: number } | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const persistentPeaksRef = useRef<PersistentPeakMarker[]>([]);
  const peakHoldBinsRef = useRef<Float32Array | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Function to manually clear all persistent peaks
  const handleResetPeaks = () => {
    persistentPeaksRef.current = [];
    if (peakHoldBinsRef.current) {
      peakHoldBinsRef.current.fill(0);
    }
    setDominantNote(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = 256;
    const timeDomainArray = new Uint8Array(bufferLength);
    const frequencyArray = new Uint8Array(bufferLength);
    const sampleRate = audioEngine.ctx?.sampleRate || 48000;
    const fftSize = audioEngine.analyser?.fftSize || 512;

    if (!peakHoldBinsRef.current || peakHoldBinsRef.current.length !== bufferLength) {
      peakHoldBinsRef.current = new Float32Array(bufferLength);
    }

    const render = (timestamp: number) => {
      animationFrameRef.current = requestAnimationFrame(render);

      const dt = Math.min(100, timestamp - lastTimeRef.current);
      lastTimeRef.current = timestamp;

      const width = canvas.width;
      const height = canvas.height;
      const bottomAxisHeight = 24;
      const topPadding = 16;
      const renderHeight = height - bottomAxisHeight;

      // 1. D3 Logarithmic Frequency and Linear Amplitude Scales
      const freqScale = d3
        .scaleLog()
        .domain([20, 20000])
        .range([12, width - 12])
        .clamp(true);

      const ampScale = d3
        .scaleLinear()
        .domain([0, 255])
        .range([renderHeight, topPadding]);

      // 2. Clear Canvas with deep cyber acoustic dark background
      ctx.fillStyle = '#090a0f';
      ctx.fillRect(0, 0, width, height);

      // 3. Render D3 Standard Frequency Axis Grid Lines (Hz)
      const standardHz = [30, 60, 120, 250, 500, 1000, 2500, 5000, 10000, 20000];
      ctx.lineWidth = 1;
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';

      standardHz.forEach((f) => {
        const x = freqScale(f);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
        ctx.beginPath();
        ctx.moveTo(x, topPadding);
        ctx.lineTo(x, renderHeight);
        ctx.stroke();

        const label = f >= 1000 ? `${f / 1000}k` : `${f}`;
        ctx.fillText(label, x, height - 3);
      });

      // 4. Render D3 Musical Note Overlays directly on canvas analysis
      if (noteOverlayMode !== 'off') {
        // Octave lines & badges
        OCTAVE_NOTES.forEach((o) => {
          const x = freqScale(o.freq);
          const isA4 = o.isFundamentalA4;

          // Vertical guide line
          ctx.strokeStyle = isA4 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(56, 189, 248, 0.12)';
          ctx.lineWidth = isA4 ? 1.5 : 1;
          ctx.setLineDash(isA4 ? [3, 2] : [2, 3]);
          ctx.beginPath();
          ctx.moveTo(x, topPadding);
          ctx.lineTo(x, renderHeight);
          ctx.stroke();
          ctx.setLineDash([]);

          // Musical Note Tag near top
          ctx.font = isA4 ? 'bold 9px "JetBrains Mono", monospace' : '8px "JetBrains Mono", monospace';
          ctx.fillStyle = isA4 ? '#f59e0b' : '#38bdf8';
          ctx.textAlign = 'center';
          ctx.fillText(o.note, x, topPadding - 4);
        });

        // Chromatic Semitone Overlay Ruler along bottom of spectrum
        if (noteOverlayMode === 'chromatic') {
          ALL_CHROMATIC_NOTES.forEach((cn) => {
            if (cn.freq < 30 || cn.freq > 14000) return;
            const x = freqScale(cn.freq);
            const isC = cn.note.startsWith('C') && !cn.isSharp;
            const isA4 = cn.note === 'A4';

            ctx.lineWidth = 1;
            ctx.strokeStyle = isA4
              ? 'rgba(245, 158, 11, 0.35)'
              : isC
              ? 'rgba(56, 189, 248, 0.2)'
              : 'rgba(255, 255, 255, 0.05)';

            ctx.beginPath();
            ctx.moveTo(x, renderHeight - (isC ? 9 : 5));
            ctx.lineTo(x, renderHeight);
            ctx.stroke();

            // Label key notes (C notes and A4)
            if (isC || isA4) {
              ctx.font = isA4 ? 'bold 8px "JetBrains Mono", monospace' : '7px "JetBrains Mono", monospace';
              ctx.fillStyle = isA4 ? '#f59e0b' : '#7dd3fc';
              ctx.textAlign = 'center';
              ctx.fillText(cn.note, x, renderHeight - 11);
            }
          });
        }
      }

      // If audio is disconnected or idle
      if (!audioEngine.analyser) {
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, renderHeight / 2);
        ctx.lineTo(width, renderHeight / 2);
        ctx.stroke();
        return;
      }

      // 5. Query Real-Time Audio Data
      audioEngine.getWaveformData(timeDomainArray);
      audioEngine.getFrequencyData(frequencyArray);

      // Peak dB calculation
      let maxVal = 0;
      for (let i = 0; i < bufferLength; i++) {
        const absVal = Math.abs(timeDomainArray[i] - 128);
        if (absVal > maxVal) maxVal = absVal;
      }
      const normLevel = maxVal / 128;
      const dbLevel = normLevel > 0.001 ? 20 * Math.log10(normLevel) : -60;
      setPeakL(Math.max(-60, Math.round(dbLevel)));
      setPeakR(Math.max(-60, Math.round(dbLevel - 0.8)));

      // 6. Update Persistent Peak-Hold Bins
      const peakHoldBins = peakHoldBinsRef.current!;
      const decayCoeff =
        peakHoldDuration === 'infinite'
          ? 0.9999
          : peakHoldDuration === 'long'
          ? Math.pow(0.995, dt / 16.6)
          : Math.pow(0.982, dt / 16.6);

      for (let i = 0; i < bufferLength; i++) {
        const currentAmp = frequencyArray[i];
        if (currentAmp >= peakHoldBins[i]) {
          peakHoldBins[i] = currentAmp;
        } else {
          peakHoldBins[i] = Math.max(0, peakHoldBins[i] * decayCoeff - 0.15);
        }
      }

      const validBins = Math.min(bufferLength, Math.floor((20000 * fftSize) / sampleRate));

      // 7. Render FFT Spectrum Area with D3 Curve
      if (mode === 'fft' || mode === 'combined') {
        const spectrumPoints: [number, number][] = [];

        for (let i = 1; i < validBins; i++) {
          const binFreq = Math.max(20, (i * sampleRate) / fftSize);
          const x = freqScale(binFreq);
          const y = ampScale(frequencyArray[i]);
          spectrumPoints.push([x, y]);
        }

        if (spectrumPoints.length > 2) {
          // Fill gradient area using D3 curve
          ctx.beginPath();
          ctx.moveTo(freqScale(20), renderHeight);

          // Use D3 curveMonotoneX interpolation
          const lineGenerator = d3
            .line<[number, number]>()
            .x((d) => d[0])
            .y((d) => d[1])
            .curve(d3.curveMonotoneX)
            .context(ctx);

          lineGenerator(spectrumPoints);
          ctx.lineTo(freqScale(20000), renderHeight);
          ctx.closePath();

          const areaGrad = ctx.createLinearGradient(0, topPadding, 0, renderHeight);
          areaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
          areaGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.2)');
          areaGrad.addColorStop(1, 'rgba(15, 23, 42, 0.05)');
          ctx.fillStyle = areaGrad;
          ctx.fill();

          // Spectrum primary stroke
          ctx.lineWidth = 1.8;
          ctx.strokeStyle = '#38bdf8';
          ctx.stroke();

          // 8. Render Persistent Peak-Hold Curve (glowing ceiling trace line)
          const peakHoldPoints: [number, number][] = [];
          for (let i = 1; i < validBins; i++) {
            if (peakHoldBins[i] > 10) {
              const binFreq = Math.max(20, (i * sampleRate) / fftSize);
              peakHoldPoints.push([freqScale(binFreq), ampScale(peakHoldBins[i])]);
            }
          }

          if (peakHoldPoints.length > 2) {
            ctx.beginPath();
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
            ctx.setLineDash([2, 2]);
            const peakLineGen = d3
              .line<[number, number]>()
              .x((d) => d[0])
              .y((d) => d[1])
              .curve(d3.curveMonotoneX)
              .context(ctx);
            peakLineGen(peakHoldPoints);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // 9. Render Oscilloscope Waveform
      if (mode === 'wave' || mode === 'combined') {
        ctx.lineWidth = mode === 'wave' ? 2.2 : 1.6;
        ctx.strokeStyle = mode === 'combined' ? 'rgba(125, 211, 252, 0.85)' : '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = mode === 'combined' ? 4 : 8;

        ctx.beginPath();
        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeDomainArray[i] / 128.0;
          const y = ((v * (renderHeight - topPadding)) / 2) + topPadding;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }
        ctx.lineTo(width, renderHeight / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 10. Persistent Frequency Peak Markers & Musical Note Overlays
      if (showPeakMarkers) {
        // Detect current instantaneous spectral peaks
        const threshold = 32; // minimum amplitude threshold
        const currentPeaks: { freq: number; amp: number; db: number }[] = [];

        for (let i = 2; i < bufferLength - 2; i++) {
          const val = frequencyArray[i];
          if (
            val > threshold &&
            val > frequencyArray[i - 1] &&
            val > frequencyArray[i - 2] &&
            val >= frequencyArray[i + 1] &&
            val >= frequencyArray[i + 2]
          ) {
            // Parabolic sub-bin interpolation for ultra-fine frequency precision
            const alpha = frequencyArray[i - 1];
            const beta = val;
            const gamma = frequencyArray[i + 1];
            const delta = (0.5 * (alpha - gamma)) / (alpha - 2 * beta + gamma + 1e-6);
            const peakBin = i + delta;
            const exactFreq = (peakBin * sampleRate) / fftSize;

            if (exactFreq >= 25 && exactFreq <= 18000) {
              const normAmp = val / 255;
              const db = Math.round(20 * Math.log10(normAmp || 0.001));
              currentPeaks.push({
                freq: Math.round(exactFreq * 10) / 10,
                amp: val,
                db,
              });
            }
          }
        }

        // Sort by amplitude and keep the top harmonic peaks
        currentPeaks.sort((a, b) => b.amp - a.amp);
        const topInstantPeaks = currentPeaks.slice(0, 4);

        // Update persistent peaks collection with persistence and decay
        const persistentPeaks = persistentPeaksRef.current;
        const decayDurationMs =
          peakHoldDuration === 'infinite' ? 300000 : peakHoldDuration === 'long' ? 4000 : 2000;

        // Advance decay on existing persistent markers
        persistentPeaks.forEach((p) => {
          const age = timestamp - p.lastSeenTime;
          p.decayLife = Math.max(0, 1.0 - age / decayDurationMs);
        });

        // Match or insert new peaks into persistent collection
        topInstantPeaks.forEach((ip) => {
          const musical = frequencyToMusicalNote(ip.freq);
          if (!musical) return;

          // Check if peak is near an existing persistent peak within 4% frequency tolerance
          const existing = persistentPeaks.find(
            (p) => Math.abs(p.freq - ip.freq) / ip.freq < 0.04
          );

          if (existing) {
            existing.freq = ip.freq;
            existing.note = musical.note;
            existing.cents = musical.cents;
            existing.amplitude = Math.max(existing.amplitude * 0.7, ip.amp);
            existing.db = ip.db;
            existing.x = freqScale(ip.freq);
            existing.y = ampScale(ip.amp);
            existing.decayLife = 1.0;
            existing.lastSeenTime = timestamp;
          } else {
            // Add new persistent peak marker
            persistentPeaks.push({
              id: `peak-${ip.freq}-${Date.now().toString(36)}`,
              freq: ip.freq,
              note: musical.note,
              cents: musical.cents,
              amplitude: ip.amp,
              db: ip.db,
              x: freqScale(ip.freq),
              y: ampScale(ip.amp),
              decayLife: 1.0,
              lastSeenTime: timestamp,
            });
          }
        });

        // Remove fully decayed markers (keep at most 6)
        persistentPeaksRef.current = persistentPeaks
          .filter((p) => p.decayLife > 0.02)
          .sort((a, b) => b.amplitude - a.amplitude)
          .slice(0, 5);

        const activePersistent = persistentPeaksRef.current;

        // Set dominant note in UI state if available
        if (activePersistent.length > 0) {
          const dominant = activePersistent[0];
          setDominantNote({
            note: dominant.note,
            freq: dominant.freq,
            cents: dominant.cents,
            db: dominant.db,
          });
        }

        // 11. Render Persistent Peak Markers directly onto the Canvas
        activePersistent.forEach((p, idx) => {
          const isFundamental = idx === 0;
          const alpha = Math.max(0.15, p.decayLife);

          ctx.save();
          ctx.globalAlpha = alpha;

          // Vertical indicator needle line from peak down to frequency axis
          ctx.strokeStyle = isFundamental ? '#38bdf8' : 'rgba(56, 189, 248, 0.45)';
          ctx.lineWidth = isFundamental ? 1.5 : 1.0;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, renderHeight);
          ctx.stroke();
          ctx.setLineDash([]);

          // Glowing circular bead at the peak
          ctx.beginPath();
          ctx.arc(p.x, p.y, isFundamental ? 4.5 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = isFundamental ? '#38bdf8' : '#7dd3fc';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0;

          // Callout Badge Box with Musical Note Label (e.g. 'C4', 'G#5') & Frequency
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          const noteWidth = ctx.measureText(p.note).width;
          ctx.font = '8px "JetBrains Mono", monospace';
          const freqText = ` · ${Math.round(p.freq)}Hz (${p.cents})`;
          const freqWidth = ctx.measureText(freqText).width;

          const badgeWidth = noteWidth + freqWidth + 14;
          const badgeHeight = 18;
          const badgeX = Math.max(6, Math.min(width - badgeWidth - 6, p.x - badgeWidth / 2));
          const badgeY = Math.max(topPadding, p.y - 24);

          // Badge container with cyber glow
          ctx.fillStyle = isFundamental ? 'rgba(3, 105, 161, 0.92)' : 'rgba(15, 23, 42, 0.92)';
          ctx.strokeStyle = isFundamental ? '#38bdf8' : '#475569';
          ctx.lineWidth = isFundamental ? 1.5 : 1.0;
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 5);
          ctx.fill();
          ctx.stroke();

          // Musical note label (e.g. 'C4', 'G#5')
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.fillStyle = isFundamental ? '#38bdf8' : '#f59e0b';
          ctx.textAlign = 'left';
          ctx.fillText(p.note, badgeX + 6, badgeY + 13);

          // Frequency & cents detail
          ctx.font = '8px "JetBrains Mono", monospace';
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText(freqText, badgeX + 6 + noteWidth, badgeY + 13);

          ctx.restore();
        });
      }
    };

    render(performance.now());

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mode, noteOverlayMode, peakHoldDuration, showPeakMarkers]);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
      {/* Visualizer Header */}
      <div className="flex flex-wrap items-center justify-between text-xs text-neutral-400 gap-2">
        <div className="flex items-center gap-2">
          <Disc3 className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-neutral-200">Neural Spectral Monitor</span>
          <span className="text-neutral-500">·</span>
          <span className="font-mono text-neutral-400">D3.js Log Frequency Axis</span>

          {dominantNote && (
            <span className="ml-2 font-mono text-[11px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-semibold flex items-center gap-1.5 shadow-sm">
              <Music className="w-3 h-3 text-cyan-400" />
              <span>
                {dominantNote.note} ({dominantNote.freq} Hz, {dominantNote.cents})
              </span>
              <span className="text-[10px] text-neutral-400 font-normal">
                {dominantNote.db} dB
              </span>
            </span>
          )}
        </div>

        {/* View, D3 Peak Marker, & Note Overlay Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Note Overlays Selector */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-[11px]">
            <span className="text-[10px] text-neutral-500 px-1 font-mono uppercase">Notes:</span>
            <button
              onClick={() => setNoteOverlayMode('chromatic')}
              className={`px-2 py-0.5 rounded transition-colors ${
                noteOverlayMode === 'chromatic'
                  ? 'bg-neutral-800 text-cyan-300 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Show all chromatic piano notes on frequency axis"
            >
              Chromatic
            </button>
            <button
              onClick={() => setNoteOverlayMode('octaves')}
              className={`px-2 py-0.5 rounded transition-colors ${
                noteOverlayMode === 'octaves'
                  ? 'bg-neutral-800 text-cyan-300 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Show only octave markers C1-C8"
            >
              Octaves
            </button>
            <button
              onClick={() => setNoteOverlayMode('off')}
              className={`px-2 py-0.5 rounded transition-colors ${
                noteOverlayMode === 'off'
                  ? 'bg-neutral-800 text-neutral-300 font-semibold'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title="Hide note overlay grid"
            >
              Off
            </button>
          </div>

          {/* Persistent Peak Hold Decay Mode */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-[11px]">
            <span className="text-[10px] text-neutral-500 px-1 font-mono uppercase">Hold:</span>
            <button
              onClick={() => setPeakHoldDuration('normal')}
              className={`px-2 py-0.5 rounded transition-colors ${
                peakHoldDuration === 'normal'
                  ? 'bg-neutral-800 text-amber-300 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Normal peak hold duration (2s)"
            >
              2s
            </button>
            <button
              onClick={() => setPeakHoldDuration('long')}
              className={`px-2 py-0.5 rounded transition-colors ${
                peakHoldDuration === 'long'
                  ? 'bg-neutral-800 text-amber-300 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Long peak hold duration (4s)"
            >
              4s
            </button>
            <button
              onClick={() => setPeakHoldDuration('infinite')}
              className={`px-2 py-0.5 rounded transition-colors ${
                peakHoldDuration === 'infinite'
                  ? 'bg-neutral-800 text-amber-300 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Infinite peak hold until reset"
            >
              Hold
            </button>
            <button
              onClick={handleResetPeaks}
              className="p-1 text-neutral-400 hover:text-cyan-300 rounded hover:bg-neutral-800 transition-colors"
              title="Clear persistent peak markers and peak hold trace"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            <button
              onClick={() => setMode('combined')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                mode === 'combined'
                  ? 'bg-neutral-800 text-cyan-300'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Combined
            </button>
            <button
              onClick={() => setMode('fft')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                mode === 'fft'
                  ? 'bg-neutral-800 text-cyan-300'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Spectrum
            </button>
            <button
              onClick={() => setMode('wave')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                mode === 'wave'
                  ? 'bg-neutral-800 text-cyan-300'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Waveform
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas and Peak Meter Row */}
      <div className="relative flex gap-3 h-52">
        <canvas
          ref={canvasRef}
          width={800}
          height={210}
          className="w-full h-full rounded-lg bg-neutral-950 border border-neutral-800/80"
        />

        {/* Real-time Hardware Peak dB Meters */}
        <div className="flex flex-col justify-between w-16 bg-neutral-950 border border-neutral-800/80 rounded-lg p-2 font-mono text-[10px]">
          <div className="text-neutral-400 text-center font-medium">PEAK</div>

          <div className="flex justify-center gap-2 h-32 my-1">
            {/* Left Channel Meter */}
            <div className="w-2.5 bg-neutral-900 rounded-full overflow-hidden flex flex-col justify-end">
              <div
                className="w-full transition-all duration-75 rounded-full"
                style={{
                  height: `${Math.max(4, Math.min(100, ((peakL + 60) / 60) * 100))}%`,
                  backgroundColor: peakL > -3 ? '#ef4444' : peakL > -12 ? '#f59e0b' : '#10b981',
                }}
              />
            </div>
            {/* Right Channel Meter */}
            <div className="w-2.5 bg-neutral-900 rounded-full overflow-hidden flex flex-col justify-end">
              <div
                className="w-full transition-all duration-75 rounded-full"
                style={{
                  height: `${Math.max(4, Math.min(100, ((peakR + 60) / 60) * 100))}%`,
                  backgroundColor: peakR > -3 ? '#ef4444' : peakR > -12 ? '#f59e0b' : '#10b981',
                }}
              />
            </div>
          </div>

          <div className="flex justify-between text-neutral-400 px-1">
            <span>{peakL > -60 ? `${peakL}` : '-inf'}</span>
            <span>dB</span>
          </div>
        </div>
      </div>
    </div>
  );
};
