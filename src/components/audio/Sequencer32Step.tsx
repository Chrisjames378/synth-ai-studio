import React, { useState, useEffect, useRef } from 'react';
import { audioEngine } from '../../lib/audio/AudioEngine';
import { NOTES, SEQUENCER_PITCHES } from '../../lib/audio/constants';
import {
  generateStandardMidiFile,
  downloadMidiFile,
  PARAMETER_TO_CC_MAP,
  MidiAutomationCurve,
} from '../../lib/audio/midiExport';
import { getSavedActiveAutomation } from '../../lib/project/projectState';
import {
  Play,
  Pause,
  Square,
  Sparkles,
  Trash2,
  Clock,
  Music,
  Grid,
  Download,
  Sliders,
  ChevronRight,
  FileCode,
} from 'lucide-react';

interface SequencerProps {
  onStepTrigger?: (step: number) => void;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

interface StepItem {
  stepNumber: number;
  note: string;
  active: boolean;
  accent: boolean;
  velocity: number;
}

export const Sequencer32Step: React.FC<SequencerProps> = ({
  onStepTrigger,
  onPlayStateChange,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [bpm, setBpm] = useState<number>(128);
  const [seqPage, setSeqPage] = useState<1 | 2>(1);
  const [stepDivision, setStepDivision] = useState<16 | 32>(16);
  const [viewMode, setViewMode] = useState<'matrix' | 'runner'>('runner');

  // 32-Step Sequential Pattern
  const [sequence, setSequence] = useState<StepItem[]>(() => {
    const defaultNotes = [
      'C4', 'C4', 'G4', 'C4', 'D4', 'F4', 'E4', 'C4',
      'A4', 'G4', 'C5', 'A#4', 'F4', 'D4', 'G4', 'C4',
    ];
    const steps: StepItem[] = [];
    for (let i = 0; i < 32; i++) {
      steps.push({
        stepNumber: i + 1,
        note: defaultNotes[i % 16],
        active: i % 2 === 0,
        accent: i % 8 === 0,
        velocity: i % 8 === 0 ? 1.0 : 0.7,
      });
    }
    return steps;
  });

  const timerRef = useRef<number | null>(null);
  const currentStepRef = useRef<number>(0);
  const tapTimesRef = useRef<number[]>([]);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // Sync sequencer to storage
  useEffect(() => {
    try {
      localStorage.setItem(
        'synthai_active_sequencer_state',
        JSON.stringify({
          bpm,
          stepDivision,
          sequence,
        })
      );
    } catch {}
  }, [bpm, stepDivision, sequence]);

  // Listen for global project load events
  useEffect(() => {
    const handleProjectLoad = (e: any) => {
      const project = e.detail;
      if (project && project.sequencer) {
        if (typeof project.sequencer.bpm === 'number') {
          setBpm(project.sequencer.bpm);
        }
        if (project.sequencer.stepDivision) {
          setStepDivision(project.sequencer.stepDivision);
        }
        if (Array.isArray(project.sequencer.sequence) && project.sequencer.sequence.length > 0) {
          setSequence(project.sequencer.sequence);
        }
      }
    };

    window.addEventListener('synthai:load-project', handleProjectLoad);
    return () => window.removeEventListener('synthai:load-project', handleProjectLoad);
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Step duration based on 16th or 32nd note division
    const stepDurationMs = (60 * 1000) / bpm / (stepDivision / 4);

    timerRef.current = window.setInterval(() => {
      const nextStep = (currentStepRef.current + 1) % sequence.length;
      currentStepRef.current = nextStep;
      setCurrentStep(nextStep);
      onStepTrigger?.(nextStep);

      const stepData = sequence[nextStep];
      if (stepData && stepData.active) {
        const foundNote = NOTES.find((n) => n.note === stepData.note) || NOTES[0];
        const vel = stepData.accent ? 1.0 : stepData.velocity || 0.7;
        audioEngine.playNote(
          `${stepData.note}-step-${nextStep}`,
          foundNote.freq,
          Math.max(60, stepDurationMs * 0.8),
          vel
        );
      }
    }, stepDurationMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, bpm, sequence, stepDivision, onStepTrigger]);

  const toggleSequenceStep = (index: number) => {
    setSequence((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], active: !next[index].active };
      if (next[index].active) {
        const found = NOTES.find((n) => n.note === next[index].note) || NOTES[0];
        audioEngine.playNote('preview', found.freq, 120, 0.7);
      }
      return next;
    });
  };

  const toggleStepAccent = (index: number) => {
    setSequence((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], accent: !next[index].accent };
      return next;
    });
  };

  const changeStepNote = (index: number, newNote: string) => {
    setSequence((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], note: newNote };
      return next;
    });
  };

  const handlePlayPause = () => {
    audioEngine.ensureContext();
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    onPlayStateChange?.(nextState);
  };

  const handleStop = () => {
    setIsPlaying(false);
    onPlayStateChange?.(false);
    setCurrentStep(0);
    currentStepRef.current = 0;
    onStepTrigger?.(0);
    audioEngine.stopAllNotes();
  };

  const handleClear = () => {
    setSequence((prev) =>
      prev.map((s) => ({ ...s, active: false, accent: false }))
    );
  };

  const handleRandomize = () => {
    const scale = ['C4', 'D#4', 'F4', 'G4', 'A#4', 'C5', 'D5'];
    setSequence((prev) =>
      prev.map((s, idx) => ({
        ...s,
        note: scale[Math.floor(Math.random() * scale.length)],
        active: Math.random() < 0.45,
        accent: idx % 4 === 0,
      }))
    );
  };

  const handleTapTempo = () => {
    const now = performance.now();
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length > 4) tapTimesRef.current.shift();
    if (tapTimesRef.current.length >= 2) {
      const diffs: number[] = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        diffs.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const calcBpm = Math.round(60000 / avg);
      if (calcBpm >= 50 && calcBpm <= 240) setBpm(calcBpm);
    }
  };

  // Export Sequence + Automation Lane data as Standard MIDI file (.mid)
  const exportMidiFile = () => {
    const savedAuto = getSavedActiveAutomation();
    const automationCurves: MidiAutomationCurve[] = [];

    if (savedAuto && savedAuto.curves) {
      Object.entries(savedAuto.curves).forEach(([paramKey, vals]) => {
        const ccDef = PARAMETER_TO_CC_MAP[paramKey];
        if (ccDef && Array.isArray(vals)) {
          automationCurves.push({
            parameterKey: paramKey,
            ccNumber: ccDef.cc,
            values: vals,
          });
        }
      });
    }

    const midiBytes = generateStandardMidiFile({
      bpm,
      stepDivision,
      sequence,
      automationCurves,
      trackName: `SynthAI 32-Step (${bpm} BPM)`,
    });

    downloadMidiFile(
      midiBytes,
      `synthai_sequence_automation_${bpm}bpm.mid`
    );
  };

  // Sliced steps for 1-16 or 17-32
  const displayedSteps = sequence.slice((seqPage - 1) * 16, seqPage * 16);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col gap-4">
      {/* Sequencer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-800 rounded-lg text-cyan-400">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-100">32-Step Pattern Sequencer Core</h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400">
                Step {currentStep + 1} / 32
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Polyphonic 32-step sequence memory feeding directly into neural hybrid WASM nodes
            </p>
          </div>
        </div>

        {/* Transport & Tempo Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Play / Stop */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            <button
              onClick={handlePlayPause}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                isPlaying
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-cyan-500 text-neutral-950 hover:bg-cyan-400'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={handleStop}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 transition-colors"
              title="Stop & Rewind"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Page Controls (Steps 1-16 vs Steps 17-32) */}
          <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs font-mono">
            <button
              onClick={() => setSeqPage(1)}
              className={`px-3 py-1 rounded transition-colors ${
                seqPage === 1 ? 'bg-neutral-800 text-cyan-300 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Steps 1–16
            </button>
            <button
              onClick={() => setSeqPage(2)}
              className={`px-3 py-1 rounded transition-colors ${
                seqPage === 2 ? 'bg-neutral-800 text-cyan-300 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Steps 17–32
            </button>
          </div>

          {/* Step Division: 1/16 Beat vs 1/32 Fast */}
          <select
            value={stepDivision}
            onChange={(e) => setStepDivision(Number(e.target.value) as any)}
            className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-400 font-mono focus:outline-none"
          >
            <option value={16}>1/16 Beat</option>
            <option value={32}>1/32 Fast</option>
          </select>

          {/* BPM & Tap */}
          <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800 text-xs">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-neutral-400">BPM</span>
            <input
              type="number"
              min="50"
              max="240"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-12 bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-center font-mono text-cyan-300 font-semibold"
            />
            <button
              onClick={handleTapTempo}
              className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[10px] font-medium"
            >
              Tap
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
            <button
              onClick={() => setViewMode('runner')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                viewMode === 'runner' ? 'bg-neutral-800 text-cyan-300' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Pitch Step Runner"
            >
              Runner
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                viewMode === 'matrix' ? 'bg-neutral-800 text-cyan-300' : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Matrix View"
            >
              Matrix
            </button>
          </div>

          {/* Utility Tools */}
          <div className="flex items-center gap-1">
            <button
              onClick={exportMidiFile}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-neutral-200 hover:text-cyan-300 bg-neutral-950 hover:bg-neutral-800 rounded-lg border border-neutral-800 transition-colors text-xs font-semibold"
              title="Export 32-Step Sequence and Automation Lane CC to external DAW (.mid)"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export MIDI (.mid)</span>
            </button>
            <button
              onClick={handleRandomize}
              className="p-1.5 text-cyan-400 hover:bg-neutral-800 rounded-lg transition-colors"
              title="Randomize Matrix"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              onClick={handleClear}
              className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition-colors"
              title="Clear Matrix"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: STEP RUNNER WITH ACCENT & NOTE PICKERS (from prototype) */}
      {viewMode === 'runner' && (
        <div className="space-y-3">
          <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-16 gap-2">
            {displayedSteps.map((step) => {
              const absoluteIndex = step.stepNumber - 1;
              const isCurrent = isPlaying && currentStep === absoluteIndex;

              return (
                <div key={step.stepNumber} className="flex flex-col gap-1.5">
                  {/* Accent Toggle */}
                  <button
                    onClick={() => toggleStepAccent(absoluteIndex)}
                    title="Toggle Velocity Accent (1.0 vs 0.7)"
                    className={`text-[9px] font-mono py-0.5 rounded border transition-colors ${
                      step.accent
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                        : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-neutral-300'
                    }`}
                  >
                    {step.accent ? 'ACCENT' : 'NORM'}
                  </button>

                  {/* Main Step Trigger Button */}
                  <button
                    onClick={() => toggleSequenceStep(absoluteIndex)}
                    className={`h-16 rounded-xl border transition-all flex flex-col items-center justify-center p-1 relative ${
                      step.active
                        ? isCurrent
                          ? 'bg-cyan-300 border-white shadow-[0_0_15px_rgba(56,189,248,0.9)] text-neutral-950 font-bold'
                          : 'bg-gradient-to-b from-cyan-500 to-blue-600 border-cyan-400 text-white font-bold'
                        : isCurrent
                        ? 'bg-neutral-800 border-cyan-500/60 text-cyan-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-600 hover:border-neutral-700'
                    }`}
                  >
                    <span className="text-[10px] font-mono opacity-80">{step.stepNumber}</span>
                    <span className="text-xs font-mono">{step.note}</span>
                  </button>

                  {/* Note Pitch Selector */}
                  <select
                    value={step.note}
                    onChange={(e) => changeStepNote(absoluteIndex, e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 rounded text-[10px] font-mono text-neutral-300 focus:outline-none p-0.5 text-center cursor-pointer"
                  >
                    {NOTES.map((n) => (
                      <option key={n.note} value={n.note}>
                        {n.note}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: FULL 32-STEP MULTI-LANE PITCH MATRIX */}
      {viewMode === 'matrix' && (
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[700px] flex flex-col gap-1.5 select-none">
            {/* Step numbers header indicator */}
            <div className="flex items-center gap-1 pl-14">
              {Array.from({ length: 32 }).map((_, stepIdx) => (
                <div
                  key={stepIdx}
                  className={`flex-1 text-center font-mono text-[9px] py-0.5 rounded ${
                    currentStep === stepIdx
                      ? 'text-cyan-400 font-bold bg-cyan-950/80 border border-cyan-800/80'
                      : stepIdx % 4 === 0
                      ? 'text-neutral-300 font-semibold'
                      : 'text-neutral-600'
                  }`}
                >
                  {stepIdx + 1}
                </div>
              ))}
            </div>

            {/* Pitch rows */}
            {SEQUENCER_PITCHES.map((pitch) => (
              <div key={pitch.note} className="flex items-center gap-1">
                {/* Pitch Label */}
                <div className="w-12 text-right pr-2 text-xs font-mono font-medium text-neutral-400 shrink-0">
                  {pitch.note}
                </div>

                {/* Step Cells */}
                <div className="flex-1 flex gap-1">
                  {sequence.map((step, stepIdx) => {
                    const isActive = step.active && step.note === pitch.note;
                    const isCurrent = currentStep === stepIdx;
                    const isBeatStart = stepIdx % 4 === 0;

                    return (
                      <button
                        key={stepIdx}
                        onClick={() => {
                          if (step.active && step.note === pitch.note) {
                            toggleSequenceStep(stepIdx);
                          } else {
                            changeStepNote(stepIdx, pitch.note);
                            if (!step.active) toggleSequenceStep(stepIdx);
                          }
                        }}
                        className={`h-7 flex-1 rounded transition-all duration-75 border ${
                          isActive
                            ? isCurrent
                              ? 'bg-cyan-300 border-white shadow-[0_0_12px_rgba(56,189,248,0.9)]'
                              : 'bg-cyan-500 border-cyan-400 shadow-[0_0_6px_rgba(56,189,248,0.4)]'
                            : isCurrent
                            ? 'bg-neutral-800 border-cyan-500/50'
                            : isBeatStart
                            ? 'bg-neutral-950 border-neutral-700/80 hover:border-neutral-600'
                            : 'bg-neutral-950/70 border-neutral-850 hover:border-neutral-700'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 32-Step Progress Indicator Ribbon */}
      <div className="pt-2 flex items-center gap-1">
        {sequence.map((step, idx) => (
          <div
            key={idx}
            onClick={() => setSeqPage(idx < 16 ? 1 : 2)}
            title={`Jump to Step ${idx + 1}`}
            className={`h-1.5 flex-1 rounded-full cursor-pointer transition-all ${
              currentStep === idx && isPlaying
                ? 'bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.8)] scale-y-125'
                : step.active
                ? 'bg-cyan-600/70'
                : 'bg-neutral-800'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
