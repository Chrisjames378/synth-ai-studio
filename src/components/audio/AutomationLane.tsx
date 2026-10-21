import React, { useState, useEffect, useRef, useMemo } from 'react';
import { audioEngine, SynthParams } from '../../lib/audio/AudioEngine';
import {
  Sliders,
  TrendingUp,
  Sparkles,
  RotateCcw,
  Power,
  Zap,
  Activity,
  Layers,
  Download,
} from 'lucide-react';
import {
  generateStandardMidiFile,
  downloadMidiFile,
  PARAMETER_TO_CC_MAP,
} from '../../lib/audio/midiExport';

export interface AutomationParameterConfig {
  key: keyof SynthParams;
  label: string;
  min: number;
  max: number;
  unit: string;
  format: (val: number) => string;
  defaultVal: number;
}

export const AUTOMATION_TARGETS: AutomationParameterConfig[] = [
  {
    key: 'cutoff',
    label: 'Filter Cutoff',
    min: 150,
    max: 12000,
    unit: 'Hz',
    format: (v) => `${Math.round(v)} Hz`,
    defaultVal: 2200,
  },
  {
    key: 'resonance',
    label: 'Filter Resonance (Q)',
    min: 0.5,
    max: 18.0,
    unit: 'Q',
    format: (v) => v.toFixed(1),
    defaultVal: 4.0,
  },
  {
    key: 'saturationDrive',
    label: 'Tube Saturation Drive',
    min: 0,
    max: 65,
    unit: '',
    format: (v) => `${Math.round(v)}`,
    defaultVal: 20,
  },
  {
    key: 'delayFeedbackVal',
    label: 'Delay Feedback',
    min: 0.0,
    max: 0.8,
    unit: '%',
    format: (v) => `${Math.round(v * 100)}%`,
    defaultVal: 0.4,
  },
  {
    key: 'reverbMix',
    label: 'Convolution Reverb Mix',
    min: 0.0,
    max: 0.85,
    unit: '%',
    format: (v) => `${Math.round(v * 100)}%`,
    defaultVal: 0.3,
  },
  {
    key: 'lfoDepth',
    label: 'LFO Filter Depth',
    min: 0,
    max: 800,
    unit: 'Hz',
    format: (v) => `${Math.round(v)} Hz`,
    defaultVal: 150,
  },
  {
    key: 'osc2Mix',
    label: 'Oscillator 2 Mix',
    min: 0.0,
    max: 1.0,
    unit: '%',
    format: (v) => `${Math.round(v * 100)}%`,
    defaultVal: 0.4,
  },
];

interface AutomationLaneProps {
  currentStep: number;
  isPlaying: boolean;
}

export const AutomationLane: React.FC<AutomationLaneProps> = ({ currentStep, isPlaying }) => {
  const [selectedTargetKey, setSelectedTargetKey] = useState<keyof SynthParams>('cutoff');
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [smoothInterpolation, setSmoothInterpolation] = useState<boolean>(true);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Map of parameter key -> 32 normalized values (0.0 to 1.0)
  const [automationMaps, setAutomationMaps] = useState<Record<string, number[]>>(() => {
    try {
      const raw = localStorage.getItem('synthai_active_automation_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.curves) return parsed.curves;
      }
    } catch {}

    // Default initial curves
    const initMaps: Record<string, number[]> = {};

    // Cutoff: classic rising acid swell
    initMaps['cutoff'] = Array.from({ length: 32 }, (_, i) => {
      const cycle = (i % 8) / 8;
      return 0.15 + 0.7 * (1 - Math.pow(cycle, 1.4));
    });

    // Resonance: subtle wobble
    initMaps['resonance'] = Array.from({ length: 32 }, (_, i) => {
      return 0.2 + 0.4 * Math.sin((i / 32) * Math.PI * 4);
    });

    // Tube Saturation: accent on beat 1 and 3
    initMaps['saturationDrive'] = Array.from({ length: 32 }, (_, i) => {
      return i % 4 === 0 ? 0.75 : 0.25;
    });

    // Reverb: swell on last 8 steps
    initMaps['reverbMix'] = Array.from({ length: 32 }, (_, i) => {
      return i >= 24 ? 0.2 + ((i - 24) / 8) * 0.55 : 0.2;
    });

    // Delay Feedback
    initMaps['delayFeedbackVal'] = Array.from({ length: 32 }, (_, i) => {
      return 0.25 + 0.45 * (i / 31);
    });

    // LFO Depth
    initMaps['lfoDepth'] = Array.from({ length: 32 }, (_, i) => {
      return 0.1 + 0.6 * Math.abs(Math.sin((i / 16) * Math.PI));
    });

    // Osc2 Mix
    initMaps['osc2Mix'] = Array.from({ length: 32 }, (_, i) => {
      return i % 8 === 0 ? 0.8 : 0.35;
    });

    return initMaps;
  });

  // Sync state to local storage for project export
  useEffect(() => {
    try {
      localStorage.setItem(
        'synthai_active_automation_state',
        JSON.stringify({
          selectedTargetKey,
          isEnabled,
          smoothInterpolation,
          curves: automationMaps,
        })
      );
    } catch {}
  }, [selectedTargetKey, isEnabled, smoothInterpolation, automationMaps]);

  // Listen for global project load events
  useEffect(() => {
    const handleProjectLoad = (e: any) => {
      const project = e.detail;
      if (project && project.automation) {
        if (project.automation.selectedTargetKey) {
          setSelectedTargetKey(project.automation.selectedTargetKey as keyof SynthParams);
        }
        if (typeof project.automation.isEnabled === 'boolean') {
          setIsEnabled(project.automation.isEnabled);
        }
        if (typeof project.automation.smoothInterpolation === 'boolean') {
          setSmoothInterpolation(project.automation.smoothInterpolation);
        }
        if (project.automation.curves) {
          setAutomationMaps(project.automation.curves);
        }
      }
    };

    window.addEventListener('synthai:load-project', handleProjectLoad);
    return () => window.removeEventListener('synthai:load-project', handleProjectLoad);
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeConfig = useMemo(() => {
    return (
      AUTOMATION_TARGETS.find((t) => t.key === selectedTargetKey) || AUTOMATION_TARGETS[0]
    );
  }, [selectedTargetKey]);

  const currentValues = automationMaps[selectedTargetKey] || Array(32).fill(0.5);

  // Real-time parameter modulation when step changes during playback
  useEffect(() => {
    if (!isEnabled) return;

    const normVal = currentValues[currentStep] ?? 0.5;
    const mappedVal = activeConfig.min + normVal * (activeConfig.max - activeConfig.min);

    // Set parameter in the audio engine
    audioEngine.setParam(activeConfig.key, mappedVal as any);
  }, [currentStep, isPlaying, isEnabled, activeConfig, currentValues]);

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const stepWidth = width / 32;

    // Clear background
    ctx.fillStyle = '#090a0f';
    ctx.fillRect(0, 0, width, height);

    // Subtle 4-step measure vertical dividers
    ctx.strokeStyle = '#1e2430';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 32; i++) {
      const x = i * stepWidth;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Bold line every 4 steps (quarter note beat)
      if (i % 4 === 0) {
        ctx.strokeStyle = '#27272a';
        ctx.stroke();
        ctx.strokeStyle = '#1e2430';
      }
    }

    // Horizontal guideline at 50%
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.5);
    ctx.lineTo(width, height * 0.5);
    ctx.stroke();

    // Draw Step Value Bars with cyan/blue gradient
    for (let i = 0; i < 32; i++) {
      const val = currentValues[i];
      const barHeight = val * (height - 8);
      const x = i * stepWidth + 2;
      const y = height - barHeight;
      const w = stepWidth - 4;

      const isCurrent = isPlaying && currentStep === i;

      const gradient = ctx.createLinearGradient(0, height, 0, y);
      if (isCurrent) {
        gradient.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
        gradient.addColorStop(1, 'rgba(125, 211, 252, 0.95)');
      } else {
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.15)');
        gradient.addColorStop(1, 'rgba(56, 189, 248, 0.6)');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, w, barHeight);
    }

    // Draw Smooth Curve / Polyline across step centers
    ctx.beginPath();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 6;

    for (let i = 0; i < 32; i++) {
      const val = currentValues[i];
      const x = i * stepWidth + stepWidth / 2;
      const y = height - val * (height - 8);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        if (smoothInterpolation) {
          const prevVal = currentValues[i - 1];
          const prevX = (i - 1) * stepWidth + stepWidth / 2;
          const prevY = height - prevVal * (height - 8);
          const cpX = (prevX + x) / 2;
          ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // Draw Node Handles on each step
    for (let i = 0; i < 32; i++) {
      const val = currentValues[i];
      const x = i * stepWidth + stepWidth / 2;
      const y = height - val * (height - 8);
      const isCurrent = isPlaying && currentStep === i;

      ctx.beginPath();
      ctx.arc(x, y, isCurrent ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = isCurrent ? '#ffffff' : '#38bdf8';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#090a0f';
      ctx.stroke();
    }

    // Draw Active Playback Cursor Line
    if (isPlaying) {
      const cursorX = currentStep * stepWidth + stepWidth / 2;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(cursorX, 0);
      ctx.lineTo(cursorX, height);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [currentValues, currentStep, isPlaying, smoothInterpolation]);

  // Pointer / Mouse handling for interactive drawing
  const updateStepFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const stepIndex = Math.floor((x / rect.width) * 32);
    if (stepIndex < 0 || stepIndex >= 32) return;

    // Invert y: top is 1.0 (high), bottom is 0.0 (low)
    const normalizedVal = Math.max(0, Math.min(1.0, 1.0 - y / rect.height));

    setAutomationMaps((prev) => {
      const cur = [...(prev[selectedTargetKey] || Array(32).fill(0.5))];
      cur[stepIndex] = normalizedVal;
      return {
        ...prev,
        [selectedTargetKey]: cur,
      };
    });

    // Real-time parameter preview on hover/draw
    const mappedVal = activeConfig.min + normalizedVal * (activeConfig.max - activeConfig.min);
    audioEngine.setParam(activeConfig.key, mappedVal as any);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateStepFromEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    updateStepFromEvent(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Preset Curve Generators
  const applyCurvePattern = (type: string) => {
    let newCurve: number[] = [];
    if (type === 'decay_saw') {
      // Periodic saw decay per 4 steps
      newCurve = Array.from({ length: 32 }, (_, i) => 1.0 - (i % 4) * 0.28);
    } else if (type === 'riser') {
      // Exponential riser from 0.1 to 1.0
      newCurve = Array.from({ length: 32 }, (_, i) => Math.pow(i / 31, 1.6));
    } else if (type === 'sine_lfo') {
      // Smooth sinusoidal cycle
      newCurve = Array.from({ length: 32 }, (_, i) => 0.5 + 0.45 * Math.sin((i / 32) * Math.PI * 4));
    } else if (type === 'random_sh') {
      // Step Sample & Hold
      newCurve = Array.from({ length: 32 }, () => Math.random());
    } else if (type === 'flat_center') {
      newCurve = Array(32).fill(0.5);
    } else if (type === 'invert') {
      newCurve = currentValues.map((v) => 1.0 - v);
    }

    setAutomationMaps((prev) => ({
      ...prev,
      [selectedTargetKey]: newCurve,
    }));
  };

  const currentModulatedVal =
    activeConfig.min + (currentValues[currentStep] || 0.5) * (activeConfig.max - activeConfig.min);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col gap-4 select-none">
      {/* Top Header & Parameter Target Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-800 rounded-lg text-cyan-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-100">32-Step Dynamic Parameter Automation</h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800/80 text-cyan-300">
                {activeConfig.format(currentModulatedVal)}
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Draw precise spline and step curves to modulate synth parameters synchronously with sequence playback
            </p>
          </div>
        </div>

        {/* Action Controls & Bypass */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Target Parameter Dropdown */}
          <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-xs">
            <Sliders className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={selectedTargetKey}
              onChange={(e) => setSelectedTargetKey(e.target.value as keyof SynthParams)}
              className="bg-transparent text-neutral-200 font-semibold focus:outline-none cursor-pointer"
            >
              {AUTOMATION_TARGETS.map((t) => (
                <option key={t.key} value={t.key} className="bg-neutral-900 text-neutral-100">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Interpolation mode */}
          <button
            onClick={() => setSmoothInterpolation(!smoothInterpolation)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              smoothInterpolation
                ? 'bg-neutral-800 text-cyan-300 border-neutral-700'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800'
            }`}
          >
            {smoothInterpolation ? 'Smooth Spline' : 'Step Quantized'}
          </button>

          {/* Active / Bypass Toggle */}
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              isEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-neutral-300'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isEnabled ? 'Active' : 'Bypassed'}</span>
          </button>

          {/* Export MIDI Automation Curve */}
          <button
            onClick={() => {
              const ccDef = PARAMETER_TO_CC_MAP[selectedTargetKey] || { cc: 74, name: 'Cutoff' };
              const midiBytes = generateStandardMidiFile({
                bpm: 128,
                stepDivision: 16,
                sequence: [],
                automationCurves: [
                  {
                    parameterKey: selectedTargetKey,
                    ccNumber: ccDef.cc,
                    values: currentValues,
                  },
                ],
                trackName: `SynthAI Automation ${activeConfig.label} (CC ${ccDef.cc})`,
              });
              downloadMidiFile(
                midiBytes,
                `synthai_automation_${selectedTargetKey}_cc${ccDef.cc}.mid`
              );
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 rounded-lg text-xs font-semibold transition-colors"
            title={`Export ${activeConfig.label} curve as Standard MIDI CC (.mid)`}
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CC (.mid)</span>
          </button>
        </div>
      </div>

      {/* Preset Curve Palette */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-neutral-400">
          <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Draw Curves:</span>
          <button
            onClick={() => applyCurvePattern('decay_saw')}
            className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 transition-colors"
          >
            Acid Decay
          </button>
          <button
            onClick={() => applyCurvePattern('riser')}
            className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 transition-colors"
          >
            Swell Riser
          </button>
          <button
            onClick={() => applyCurvePattern('sine_lfo')}
            className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 transition-colors"
          >
            Sine Wave
          </button>
          <button
            onClick={() => applyCurvePattern('random_sh')}
            className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 transition-colors"
          >
            Random S&H
          </button>
          <button
            onClick={() => applyCurvePattern('invert')}
            className="px-2.5 py-1 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800 transition-colors"
          >
            Invert
          </button>
          <button
            onClick={() => applyCurvePattern('flat_center')}
            className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors"
            title="Reset to 50%"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-2">
          <span>MIN: {activeConfig.format(activeConfig.min)}</span>
          <span className="text-neutral-600">·</span>
          <span>MAX: {activeConfig.format(activeConfig.max)}</span>
        </div>
      </div>

      {/* Interactive Automation Canvas */}
      <div className="relative h-44 w-full bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden cursor-crosshair touch-none">
        <canvas
          ref={canvasRef}
          width={800}
          height={176}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full"
        />

        {/* Step Numbers Overlay at bottom */}
        <div className="absolute bottom-1 left-0 right-0 flex pointer-events-none px-1">
          {Array.from({ length: 32 }).map((_, idx) => (
            <div
              key={idx}
              className={`flex-1 text-center font-mono text-[8px] ${
                isPlaying && currentStep === idx
                  ? 'text-cyan-300 font-bold'
                  : idx % 4 === 0
                  ? 'text-neutral-400'
                  : 'text-neutral-700'
              }`}
            >
              {idx + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
