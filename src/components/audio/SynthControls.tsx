import React, { useEffect, useState, useRef } from 'react';
import { audioEngine, SynthParams } from '../../lib/audio/AudioEngine';
import {
  Sliders,
  Sparkles,
  RotateCcw,
  Volume2,
  Wand2,
  Radio,
  Zap,
  Flame,
  Activity,
  Upload,
  Disc,
  Play,
  Layers,
  Cpu,
} from 'lucide-react';

const WAVEFORMS: OscillatorType[] = ['sawtooth', 'square', 'sine', 'triangle'];

export const SynthControls: React.FC = () => {
  const [params, setParams] = useState<SynthParams>({ ...audioEngine.params });
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [generatedToast, setGeneratedToast] = useState<string | null>(null);
  const [grainUploadStatus, setGrainUploadStatus] = useState<string | null>(null);
  const grainFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsubscribe = audioEngine.subscribe(() => {
      setParams({ ...audioEngine.params });
    });
    return unsubscribe;
  }, []);

  const handleChange = <K extends keyof SynthParams>(key: K, val: SynthParams[K]) => {
    audioEngine.setParam(key, val);
    setParams({ ...audioEngine.params });
  };

  const handleRandomize = () => {
    const randomOsc1 = WAVEFORMS[Math.floor(Math.random() * WAVEFORMS.length)];
    const randomOsc2 = WAVEFORMS[Math.floor(Math.random() * WAVEFORMS.length)];
    const randomCutoff = Math.round(300 + Math.random() * 5000);
    const randomRes = Number((1.5 + Math.random() * 8).toFixed(1));
    const randomAttack = Number((0.01 + Math.random() * 0.4).toFixed(3));
    const randomDecay = Number((0.1 + Math.random() * 0.6).toFixed(2));
    const randomSustain = Number((0.2 + Math.random() * 0.7).toFixed(2));
    const randomRelease = Number((0.2 + Math.random() * 1.5).toFixed(2));
    const randomLfoRate = Number((0.5 + Math.random() * 8).toFixed(1));
    const randomLfoDepth = Math.round(50 + Math.random() * 400);
    const randomSat = Math.round(5 + Math.random() * 45);
    const randomDelayTime = Number((0.15 + Math.random() * 0.45).toFixed(2));
    const randomDelayFeedback = Number((0.2 + Math.random() * 0.5).toFixed(2));
    const randomReverb = Number((0.1 + Math.random() * 0.6).toFixed(2));

    audioEngine.applyPatch({
      osc1Type: randomOsc1,
      osc2Type: randomOsc2,
      cutoff: randomCutoff,
      resonance: randomRes,
      attack: randomAttack,
      decay: randomDecay,
      sustain: randomSustain,
      release: randomRelease,
      lfoRate: randomLfoRate,
      lfoDepth: randomLfoDepth,
      saturationDrive: randomSat,
      delayTime: randomDelayTime,
      delayFeedbackVal: randomDelayFeedback,
      reverbMix: randomReverb,
    });
  };

  const handleReset = () => {
    audioEngine.applyPatch({
      osc1Type: 'sawtooth',
      osc1Detune: 0,
      osc2Type: 'square',
      osc2Detune: 12,
      osc2Mix: 0.4,
      filterType: 'lowpass',
      cutoff: 2200,
      resonance: 4,
      attack: 0.05,
      decay: 0.2,
      sustain: 0.7,
      release: 0.8,
      lfoRate: 3,
      lfoDepth: 150,
      delayTime: 0.3,
      delayFeedbackVal: 0.4,
      reverbMix: 0.3,
      saturationDrive: 20,
      masterVolume: 0.8,
    });
  };

  const handleAiSynthesize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    const result = audioEngine.generatePatchFromPrompt(aiPrompt);
    setGeneratedToast(`Synthesized "${result.name}"`);
    setTimeout(() => setGeneratedToast(null), 3000);
    setAiPrompt('');
  };

  const handleUploadGrainFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await audioEngine.loadGrainBuffer(file);
      setParams({ ...audioEngine.params });
      setGrainUploadStatus(`Loaded grain: "${res.name}" (${res.duration}s)`);
      setTimeout(() => setGrainUploadStatus(null), 4000);
    } catch (err: any) {
      setGrainUploadStatus(`Upload failed: ${err.message || 'Invalid audio file'}`);
      setTimeout(() => setGrainUploadStatus(null), 4000);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col gap-6">
      {/* Hidden Grain Buffer File Picker */}
      <input
        type="file"
        ref={grainFileInputRef}
        onChange={handleUploadGrainFile}
        accept="audio/*,.wav,.mp3,.ogg,.flac,.aac"
        className="hidden"
      />

      {/* Top Header & Patch Tools */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-800 rounded-lg text-cyan-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-100">Hybrid Analog & Neural DSP Matrix</h2>
              {audioEngine.midiConnected ? (
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  MIDI: {audioEngine.midiDeviceName}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-neutral-500">Web MIDI Ready</span>
              )}
            </div>
            <p className="text-xs text-neutral-400">
              Dual-oscillator architecture with non-linear saturation, convolution reverb & stereo delay
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* HARD TURBO TOGGLE BUTTON */}
          <button
            onClick={() => {
              const next = !params.hardMode;
              audioEngine.toggleHardMode(next);
              setParams({ ...audioEngine.params });
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
              params.hardMode
                ? 'bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-200'
            }`}
            title="Toggle Hard Turbo: Activates brickwall overdrive, sub-bass generator, and transient punch"
          >
            <Zap className={`w-3.5 h-3.5 ${params.hardMode ? 'fill-amber-400 text-amber-400 animate-pulse' : ''}`} />
            <span>{params.hardMode ? 'HARD TURBO ON' : 'Hard Turbo'}</span>
          </button>

          {/* GRANULAR MODE TOGGLE BUTTON */}
          <button
            onClick={() => {
              const next = !params.granularMode;
              audioEngine.toggleGranularMode(next);
              setParams({ ...audioEngine.params });
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
              params.granularMode
                ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-200'
            }`}
            title="Toggle Granular Mode: Generate continuous micro-grains from loaded audio buffer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${params.granularMode ? 'text-cyan-400' : ''}`} />
            <span>{params.granularMode ? 'GRANULAR ON' : 'Granular'}</span>
          </button>

          <button
            onClick={handleRandomize}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 rounded-lg hover:bg-cyan-900/60 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Randomize Patch
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-800 border border-neutral-700 rounded-lg hover:bg-neutral-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Init Default
          </button>
        </div>
      </div>

      {/* AI Prompt-to-Patch Generator */}
      <form
        onSubmit={handleAiSynthesize}
        className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl flex items-center gap-2 text-xs"
      >
        <Wand2 className="w-4 h-4 text-cyan-400 shrink-0" />
        <input
          type="text"
          placeholder="Prompt AI sound generator (e.g., 'aggressive 303 acid squelch', 'lush cinematic pad', 'thick sub bass')..."
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          className="flex-1 bg-transparent text-neutral-200 placeholder:text-neutral-500 focus:outline-none"
        />
        {generatedToast && (
          <span className="text-emerald-400 font-mono text-[11px] font-medium animate-pulse">
            {generatedToast}
          </span>
        )}
        <button
          type="submit"
          className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-semibold rounded-lg shrink-0 transition-colors"
        >
          Synthesize Patch
        </button>
      </form>

      {/* Grid of Synthesizer Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Module 1: Oscillators */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 border-b border-neutral-800 pb-2">
            <span>OSCILLATORS</span>
            <span className="text-[10px] text-cyan-400 font-mono">POLY DUAL</span>
          </div>

          {/* Osc 1 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Osc 1 Wave</span>
              <span className="font-mono text-cyan-400">{params.osc1Type}</span>
            </div>
            <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-900 rounded-lg border border-neutral-800">
              {WAVEFORMS.map((wf) => (
                <button
                  key={wf}
                  onClick={() => handleChange('osc1Type', wf)}
                  className={`text-[10px] py-1 font-medium capitalize rounded transition-colors ${
                    params.osc1Type === wf
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {wf.slice(0, 4)}
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center text-xs text-neutral-400 pt-1">
              <span>Detune</span>
              <span className="font-mono text-neutral-200">{params.osc1Detune}c</span>
            </div>
            <input
              type="range"
              min="-50"
              max="50"
              value={params.osc1Detune}
              onChange={(e) => handleChange('osc1Detune', Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Osc 2 */}
          <div className="space-y-2 border-t border-neutral-850 pt-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Osc 2 Wave</span>
              <span className="font-mono text-cyan-400">{params.osc2Type}</span>
            </div>
            <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-900 rounded-lg border border-neutral-800">
              {WAVEFORMS.map((wf) => (
                <button
                  key={wf}
                  onClick={() => handleChange('osc2Type', wf)}
                  className={`text-[10px] py-1 font-medium capitalize rounded transition-colors ${
                    params.osc2Type === wf
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {wf.slice(0, 4)}
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center text-xs text-neutral-400 pt-1">
              <span>Osc 2 Semitone</span>
              <span className="font-mono text-neutral-200">
                {params.osc2Detune > 0 ? `+${params.osc2Detune}` : params.osc2Detune} st
              </span>
            </div>
            <input
              type="range"
              min="-24"
              max="24"
              value={params.osc2Detune}
              onChange={(e) => handleChange('osc2Detune', Number(e.target.value))}
              className="w-full"
            />

            <div className="flex justify-between items-center text-xs text-neutral-400 pt-1">
              <span>Osc 2 Mix</span>
              <span className="font-mono text-neutral-200">{Math.round(params.osc2Mix * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={params.osc2Mix}
              onChange={(e) => handleChange('osc2Mix', Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Module 2: Filter & LFO */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 border-b border-neutral-800 pb-2">
            <span>FILTER & MODULATION</span>
            <span className="text-[10px] text-cyan-400 font-mono">24dB/OCT</span>
          </div>

          {/* Filter Cutoff */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-neutral-400">
              <span>Filter Cutoff</span>
              <span className="font-mono text-neutral-200">{params.cutoff} Hz</span>
            </div>
            <input
              type="range"
              min="100"
              max="16000"
              step="20"
              value={params.cutoff}
              onChange={(e) => handleChange('cutoff', Number(e.target.value))}
              className="w-full"
            />

            <div className="flex justify-between items-center text-xs text-neutral-400 pt-1">
              <span>Resonance (Q)</span>
              <span className="font-mono text-neutral-200">{params.resonance.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="20"
              step="0.1"
              value={params.resonance}
              onChange={(e) => handleChange('resonance', Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* LFO Modulation */}
          <div className="space-y-2 border-t border-neutral-850 pt-3">
            <div className="flex justify-between items-center text-xs text-neutral-400">
              <span>LFO Frequency</span>
              <span className="font-mono text-neutral-200">{params.lfoRate} Hz</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="15"
              step="0.1"
              value={params.lfoRate}
              onChange={(e) => handleChange('lfoRate', Number(e.target.value))}
              className="w-full"
            />

            <div className="flex justify-between items-center text-xs text-neutral-400 pt-1">
              <span>LFO Filter Depth</span>
              <span className="font-mono text-neutral-200">{params.lfoDepth} Hz</span>
            </div>
            <input
              type="range"
              min="0"
              max="800"
              step="10"
              value={params.lfoDepth}
              onChange={(e) => handleChange('lfoDepth', Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Module 3: ADSR Envelope */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 border-b border-neutral-800 pb-2">
            <span>AMPLIFIER ENVELOPE</span>
            <span className="text-[10px] text-cyan-400 font-mono">ADSR</span>
          </div>

          {/* Visual SVG ADSR curve */}
          <div className="h-14 w-full bg-neutral-900 border border-neutral-800 rounded-lg p-1.5 flex items-center justify-center">
            <svg viewBox="0 0 100 40" className="w-full h-full stroke-cyan-400 fill-cyan-500/10 stroke-2">
              <path
                d={`M 0 40 L ${Math.min(25, Math.max(5, params.attack * 25))} 5 L ${
                  25 + Math.min(25, params.decay * 25)
                } ${40 - params.sustain * 35} L 75 ${40 - params.sustain * 35} L ${
                  75 + Math.min(25, params.release * 20)
                } 40 Z`}
              />
            </svg>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-neutral-400">
              <span>Attack</span>
              <span className="font-mono text-neutral-200">{(params.attack * 1000).toFixed(0)} ms</span>
            </div>
            <input
              type="range"
              min="0.005"
              max="1.5"
              step="0.005"
              value={params.attack}
              onChange={(e) => handleChange('attack', Number(e.target.value))}
              className="w-full"
            />

            <div className="flex justify-between items-center text-xs text-neutral-400 pt-1">
              <span>Decay</span>
              <span className="font-mono text-neutral-200">{(params.decay * 1000).toFixed(0)} ms</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="2.0"
              step="0.01"
              value={params.decay}
              onChange={(e) => handleChange('decay', Number(e.target.value))}
              className="w-full"
            />

            <div className="flex justify-between items-center text-xs text-neutral-400 pt-1">
              <span>Sustain</span>
              <span className="font-mono text-neutral-200">{Math.round(params.sustain * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.02"
              value={params.sustain}
              onChange={(e) => handleChange('sustain', Number(e.target.value))}
              className="w-full"
            />

            <div className="flex justify-between items-center text-xs text-neutral-400 pt-1">
              <span>Release</span>
              <span className="font-mono text-neutral-200">{(params.release * 1000).toFixed(0)} ms</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="3.0"
              step="0.05"
              value={params.release}
              onChange={(e) => handleChange('release', Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Module 4: Master FX Chain & Saturation */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 border-b border-neutral-800 pb-2">
            <span>EXTENDED MASTER FX</span>
            <span className="text-[10px] text-amber-400 font-mono">TUBE / REVERB / DELAY</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-neutral-400">
              <span className="text-amber-300/90 font-medium">Tube Saturation Drive</span>
              <span className="font-mono text-amber-300">{params.saturationDrive}</span>
            </div>
            <input
              type="range"
              min="0"
              max="70"
              step="1"
              value={params.saturationDrive}
              onChange={(e) => handleChange('saturationDrive', Number(e.target.value))}
              className="w-full accent-amber-500"
            />

            <div className="flex justify-between items-center text-xs text-neutral-400 pt-1">
              <span>Convolution Reverb</span>
              <span className="font-mono text-cyan-300">{Math.round(params.reverbMix * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.85"
              step="0.02"
              value={params.reverbMix}
              onChange={(e) => handleChange('reverbMix', Number(e.target.value))}
              className="w-full"
            />

            <div className="flex justify-between items-center text-xs text-neutral-400 pt-1">
              <span>Stereo Delay Time</span>
              <span className="font-mono text-neutral-200">{Math.round(params.delayTime * 1000)} ms</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.8"
              step="0.01"
              value={params.delayTime}
              onChange={(e) => handleChange('delayTime', Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Master Volume */}
          <div className="space-y-2 border-t border-neutral-850 pt-2">
            <div className="flex justify-between items-center text-xs text-neutral-400">
              <span className="flex items-center gap-1.5 text-neutral-200 font-medium">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                Master Volume
              </span>
              <span className="font-mono text-cyan-300">{Math.round(params.masterVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={params.masterVolume}
              onChange={(e) => handleChange('masterVolume', Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Module 5: Hybrid Hard Engine & Overdrive Core */}
        <div className="bg-neutral-950 border border-amber-900/40 rounded-xl p-4 flex flex-col gap-4 relative overflow-hidden">
          {params.hardMode && (
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 blur-xl pointer-events-none rounded-full" />
          )}

          <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 border-b border-neutral-800 pb-2">
            <span className="flex items-center gap-1.5 text-amber-300">
              <Zap className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              HARD ENGINE
            </span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${params.hardMode ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'text-neutral-500'}`}>
              {params.hardMode ? 'OVERDRIVE ACTIVE' : 'CLEAN DSP'}
            </span>
          </div>

          <div className="space-y-3">
            {/* Drive Mode Selector */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs text-neutral-400">
                <span>Distortion Mode</span>
                <span className="font-mono text-amber-300 text-[11px] capitalize">
                  {params.driveMode?.replace('-', ' ') || 'Hard Clip'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800 text-[10px]">
                {(['neural-hard-clip', 'quantum-wavefolder', 'analog-tube', 'fuzz-overdrive'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleChange('driveMode', mode)}
                    className={`py-1 px-1.5 font-medium rounded transition-colors truncate text-left ${
                      params.driveMode === mode
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                    title={mode}
                  >
                    {mode === 'neural-hard-clip'
                      ? 'Hard Clip'
                      : mode === 'quantum-wavefolder'
                      ? 'Wavefolder'
                      : mode === 'analog-tube'
                      ? 'Tube Sat'
                      : 'Fuzz Drive'}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-Bass Generator */}
            <div className="space-y-1.5 border-t border-neutral-850 pt-2">
              <div className="flex justify-between items-center text-xs text-neutral-400">
                <span className="text-neutral-200 font-medium">Sub-Bass Punch</span>
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="text-cyan-400">{Math.round((params.subOscMix ?? 0.5) * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => handleChange('subOscOctave', params.subOscOctave === -2 ? -1 : -2)}
                    className="px-1.5 py-0.5 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-750 text-[10px]"
                  >
                    {params.subOscOctave === -2 ? '-2 Oct' : '-1 Oct'}
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.02"
                value={params.subOscMix ?? 0.5}
                onChange={(e) => handleChange('subOscMix', Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Transient Attack Punch */}
            <div className="space-y-1.5 border-t border-neutral-850 pt-2">
              <div className="flex justify-between items-center text-xs text-neutral-400">
                <span>Transient Attack Snap</span>
                <span className="font-mono text-amber-300">{params.transientPunch ?? 45}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="2"
                value={params.transientPunch ?? 45}
                onChange={(e) => handleChange('transientPunch', Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* FM Cross-Modulation */}
            <div className="space-y-1.5 border-t border-neutral-850 pt-2">
              <div className="flex justify-between items-center text-xs text-neutral-400">
                <span>FM Metallic Bite</span>
                <span className="font-mono text-purple-300">{params.fmModAmount ?? 15}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="2"
                value={params.fmModAmount ?? 15}
                onChange={(e) => handleChange('fmModAmount', Number(e.target.value))}
                className="w-full accent-purple-400"
              />
            </div>

            {/* Neural Intensity */}
            <div className="space-y-1.5 border-t border-neutral-850 pt-2">
              <div className="flex justify-between items-center text-xs text-neutral-400">
                <span>Hybrid Core Intensity</span>
                <span className="font-mono text-emerald-300">{params.hybridIntensity ?? 80}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="1"
                value={params.hybridIntensity ?? 80}
                onChange={(e) => handleChange('hybridIntensity', Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Module 6: Granular Synthesis Engine & Buffer Loader */}
        <div className="bg-neutral-950 border border-cyan-900/40 rounded-xl p-4 flex flex-col gap-4 relative overflow-hidden">
          {params.granularMode && (
            <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/10 blur-xl pointer-events-none rounded-full" />
          )}

          <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 border-b border-neutral-800 pb-2">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              GRANULAR ENGINE
            </span>
            <button
              type="button"
              onClick={() => {
                const next = !params.granularMode;
                audioEngine.toggleGranularMode(next);
                setParams({ ...audioEngine.params });
              }}
              className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                params.granularMode
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-800 font-semibold'
                  : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:text-neutral-300'
              }`}
            >
              {params.granularMode ? 'CLOUD ACTIVE' : 'BYPASS'}
            </button>
          </div>

          <div className="space-y-3">
            {/* Grain Buffer Upload & Presets */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs text-neutral-400">
                <span>Grain Sample Buffer</span>
                <span className="font-mono text-cyan-300 text-[10px] truncate max-w-[130px]">
                  {audioEngine.grainBufferName}
                </span>
              </div>

              {/* Upload Trigger Button */}
              <button
                type="button"
                onClick={() => grainFileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-200 border border-neutral-800 hover:border-cyan-500/50 rounded-lg text-xs font-medium transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upload Grain Sample (.wav, .mp3)</span>
              </button>

              {grainUploadStatus && (
                <div className="text-[10px] text-cyan-300 font-mono bg-cyan-950/70 border border-cyan-800/80 px-2 py-1 rounded">
                  {grainUploadStatus}
                </div>
              )}

              {/* Quick Synthetic Presets */}
              <div className="grid grid-cols-4 gap-1 pt-1">
                {(['metallic', 'ambient', 'vocal', 'glitch'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      audioEngine.loadPresetGrain(type);
                      setParams({ ...audioEngine.params });
                    }}
                    className="py-1 px-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded text-[10px] capitalize transition-colors"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Grain Density (grains / sec) */}
            <div className="space-y-1.5 border-t border-neutral-850 pt-2">
              <div className="flex justify-between items-center text-xs text-neutral-400">
                <span className="text-neutral-200 font-medium">Grain Density</span>
                <span className="font-mono text-cyan-400 text-[11px]">
                  {params.grainDensity ?? 24} grains/s
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="75"
                step="1"
                value={params.grainDensity ?? 24}
                onChange={(e) => handleChange('grainDensity', Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
            </div>

            {/* Grain Time Position Jitter */}
            <div className="space-y-1.5 border-t border-neutral-850 pt-2">
              <div className="flex justify-between items-center text-xs text-neutral-400">
                <span>Time Position Jitter</span>
                <span className="font-mono text-indigo-400 text-[11px]">
                  {params.grainJitter ?? 35}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={params.grainJitter ?? 35}
                onChange={(e) => handleChange('grainJitter', Number(e.target.value))}
                className="w-full accent-indigo-400"
              />
            </div>

            {/* Grain Playback Speed / Pitch */}
            <div className="space-y-1.5 border-t border-neutral-850 pt-2">
              <div className="flex justify-between items-center text-xs text-neutral-400">
                <span>Grain Playback Speed</span>
                <span className="font-mono text-emerald-300 text-[11px]">
                  {(params.grainPlaybackSpeed ?? 1.0).toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.25"
                max="3.0"
                step="0.05"
                value={params.grainPlaybackSpeed ?? 1.0}
                onChange={(e) => handleChange('grainPlaybackSpeed', Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>

            {/* Grain Window Duration */}
            <div className="space-y-1.5 border-t border-neutral-850 pt-2">
              <div className="flex justify-between items-center text-xs text-neutral-400">
                <span>Grain Window Duration</span>
                <span className="font-mono text-amber-300 text-[11px]">
                  {Math.round((params.grainSize ?? 0.08) * 1000)} ms
                </span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.25"
                step="0.005"
                value={params.grainSize ?? 0.08}
                onChange={(e) => handleChange('grainSize', Number(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>

            {/* Grain Cloud Audition Button */}
            <div className="pt-2 border-t border-neutral-850">
              <button
                type="button"
                onClick={() => {
                  audioEngine.ensureContext();
                  if (!params.granularMode) {
                    audioEngine.toggleGranularMode(true);
                    setParams({ ...audioEngine.params });
                  }
                  audioEngine.playNote('grain-audition', 261.63, 600, 0.9);
                }}
                className="w-full py-1.5 bg-neutral-900 hover:bg-neutral-850 text-cyan-300 border border-neutral-800 hover:border-cyan-500/50 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Audition Grain Cloud (C4)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
