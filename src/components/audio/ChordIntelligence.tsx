import React, { useState } from 'react';
import { audioEngine } from '../../lib/audio/AudioEngine';
import { ModelCore } from '../../lib/models/registry';
import { NOTES, getFrequency } from '../../lib/audio/constants';
import {
  Sparkles,
  Music,
  ArrowRight,
  Zap,
  Volume2,
  Check,
  RefreshCw,
  Sliders,
  Play,
  RotateCcw,
  BookOpen,
} from 'lucide-react';

interface ChordSuggestion {
  title: string;
  description: string;
  key: string;
  scale: string;
  chords: string[];
  romanNumerals: string;
  suggestedBpm: number;
  sequence32: {
    stepNumber: number;
    note: string;
    active: boolean;
    accent: boolean;
    velocity: number;
  }[];
  automationTips: {
    cutoffTrend: string;
    saturationDrive: number;
    resonance: number;
  };
  source?: string;
}

interface ChordIntelligenceProps {
  activeModel: ModelCore;
  onApplyProgression: (progression: ChordSuggestion) => void;
}

const ROOT_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SCALES = [
  'Natural Minor',
  'Dorian',
  'Phrygian',
  'Lydian',
  'Mixolydian',
  'Major',
  'Harmonic Minor',
  'Melodic Minor',
];

const STYLES = [
  'Cyberpunk Acid',
  'Synthwave / Retrowave',
  'Dark Industrial Techno',
  'Ambient Chillout',
  'Neo-Soul / Jazz Minor',
  'Progressive Trance',
  'Cinematic Sci-Fi',
];

export const ChordIntelligence: React.FC<ChordIntelligenceProps> = ({
  activeModel,
  onApplyProgression,
}) => {
  const [rootNote, setRootNote] = useState<string>('C');
  const [scale, setScale] = useState<string>('Dorian');
  const [style, setStyle] = useState<string>('Cyberpunk Acid');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [appliedNotice, setAppliedNotice] = useState<boolean>(false);
  const [isPlayingAudition, setIsPlayingAudition] = useState<boolean>(false);

  // Initial suggestion populated with rich default
  const [currentSuggestion, setCurrentSuggestion] = useState<ChordSuggestion>({
    title: 'Cyberpunk Neon Dorian Squelch',
    description: 'Minor-modal oscillation with raised 6th degree tailored for high-resonance neural filters and tube drive.',
    key: 'C',
    scale: 'Dorian',
    chords: ['Cm9', 'F13', 'Bbmaj7#11', 'Dm7b5'],
    romanNumerals: 'i9 - IV13 - VII#11 - iiø7',
    suggestedBpm: 132,
    sequence32: [
      { stepNumber: 1, note: 'C4', active: true, accent: true, velocity: 1.0 },
      { stepNumber: 2, note: 'C4', active: true, accent: false, velocity: 0.75 },
      { stepNumber: 3, note: 'D#4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 4, note: 'G4', active: true, accent: false, velocity: 0.8 },
      { stepNumber: 5, note: 'A#4', active: true, accent: true, velocity: 0.95 },
      { stepNumber: 6, note: 'A4', active: true, accent: false, velocity: 0.7 },
      { stepNumber: 7, note: 'G4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 8, note: 'D#4', active: true, accent: false, velocity: 0.75 },
      { stepNumber: 9, note: 'F4', active: true, accent: true, velocity: 1.0 },
      { stepNumber: 10, note: 'A4', active: true, accent: false, velocity: 0.7 },
      { stepNumber: 11, note: 'C5', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 12, note: 'D#4', active: true, accent: false, velocity: 0.8 },
      { stepNumber: 13, note: 'F4', active: true, accent: true, velocity: 0.9 },
      { stepNumber: 14, note: 'D4', active: true, accent: false, velocity: 0.7 },
      { stepNumber: 15, note: 'C4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 16, note: 'A#3', active: true, accent: false, velocity: 0.75 },
      { stepNumber: 17, note: 'A#3', active: true, accent: true, velocity: 1.0 },
      { stepNumber: 18, note: 'D4', active: true, accent: false, velocity: 0.75 },
      { stepNumber: 19, note: 'F4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 20, note: 'A4', active: true, accent: false, velocity: 0.8 },
      { stepNumber: 21, note: 'C5', active: true, accent: true, velocity: 0.95 },
      { stepNumber: 22, note: 'A#4', active: true, accent: false, velocity: 0.7 },
      { stepNumber: 23, note: 'G4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 24, note: 'F4', active: true, accent: false, velocity: 0.75 },
      { stepNumber: 25, note: 'D4', active: true, accent: true, velocity: 1.0 },
      { stepNumber: 26, note: 'F4', active: true, accent: false, velocity: 0.7 },
      { stepNumber: 27, note: 'G#4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 28, note: 'C5', active: true, accent: false, velocity: 0.8 },
      { stepNumber: 29, note: 'D5', active: true, accent: true, velocity: 0.95 },
      { stepNumber: 30, note: 'C5', active: true, accent: false, velocity: 0.75 },
      { stepNumber: 31, note: 'G#4', active: false, accent: false, velocity: 0.6 },
      { stepNumber: 32, note: 'D4', active: true, accent: false, velocity: 0.85 },
    ],
    automationTips: {
      cutoffTrend: 'Aggressive resonant envelope decay at step 1 and step 17',
      saturationDrive: 35,
      resonance: 8.5,
    },
  });

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chord-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelName: activeModel.name,
          category: activeModel.category,
          style,
          rootNote,
          scale,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data: ChordSuggestion = await response.json();
      setCurrentSuggestion(data);
    } catch (err) {
      console.error('Failed to get chord progression from server', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyToSequencer = () => {
    onApplyProgression(currentSuggestion);
    setAppliedNotice(true);
    setTimeout(() => setAppliedNotice(false), 2500);
  };

  // Play a quick 4-chord polyphonic audition of the suggestion
  const handleAuditionProgression = () => {
    if (isPlayingAudition) return;
    audioEngine.ensureContext();
    setIsPlayingAudition(true);

    const activeNotes = currentSuggestion.sequence32
      .filter((s) => s.active)
      .slice(0, 16);

    let idx = 0;
    const interval = window.setInterval(() => {
      if (idx >= activeNotes.length) {
        clearInterval(interval);
        setIsPlayingAudition(false);
        return;
      }

      const step = activeNotes[idx];
      const found = NOTES.find((n) => n.note === step.note) || NOTES[0];
      audioEngine.playNote(
        `audition-${step.note}-${idx}`,
        found.freq,
        180,
        step.accent ? 1.0 : step.velocity
      );
      idx++;
    }, 120);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 rounded-xl text-cyan-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-neutral-100">Gemini Neural Chord Intelligence</h3>
              <span className="text-[10px] bg-cyan-950 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded font-mono">
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Harmonic progression generation tuned to <span className="text-cyan-300 font-semibold">{activeModel.name}</span> ({activeModel.category})
            </p>
          </div>
        </div>

        {/* Generate Trigger */}
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            isLoading
              ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
              : 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950 shadow-lg shadow-cyan-500/20'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? 'Synthesizing Harmony...' : 'Generate Progression'}</span>
        </button>
      </div>

      {/* Musical Parameter Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-neutral-400 mb-1 font-mono text-[11px] uppercase">Root Key</label>
          <select
            value={rootNote}
            onChange={(e) => setRootNote(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-neutral-200 font-semibold focus:outline-none focus:border-cyan-500"
          >
            {ROOT_NOTES.map((r) => (
              <option key={r} value={r}>
                {r} Key
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-neutral-400 mb-1 font-mono text-[11px] uppercase">Scale / Mode</label>
          <select
            value={scale}
            onChange={(e) => setScale(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-neutral-200 font-semibold focus:outline-none focus:border-cyan-500"
          >
            {SCALES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-neutral-400 mb-1 font-mono text-[11px] uppercase">Style & Vibe</label>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-neutral-200 font-semibold focus:outline-none focus:border-cyan-500"
          >
            {STYLES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Suggested Progression Card */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-neutral-100">{currentSuggestion.title}</h4>
              <span className="font-mono text-[11px] text-cyan-400 bg-cyan-950/70 border border-cyan-800/80 px-2 py-0.5 rounded">
                {currentSuggestion.key} {currentSuggestion.scale}
              </span>
              <span className="font-mono text-[11px] text-neutral-400">
                {currentSuggestion.suggestedBpm} BPM
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">{currentSuggestion.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAuditionProgression}
              disabled={isPlayingAudition}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                isPlayingAudition
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-800'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isPlayingAudition ? 'Auditioning...' : 'Audition'}</span>
            </button>

            <button
              onClick={handleApplyToSequencer}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
            >
              {appliedNotice ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              <span>{appliedNotice ? 'Loaded into Sequencer!' : 'Load into 32-Step'}</span>
            </button>
          </div>
        </div>

        {/* 4 Chords Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {currentSuggestion.chords.map((chord, idx) => {
            const roman = currentSuggestion.romanNumerals.split(' - ')[idx] || `Chord ${idx + 1}`;
            return (
              <div
                key={idx}
                className="p-3 bg-neutral-900 border border-neutral-800/80 rounded-lg text-center space-y-1 hover:border-cyan-500/40 transition-colors"
              >
                <div className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">{roman}</div>
                <div className="text-base font-extrabold text-cyan-300 font-mono">{chord}</div>
                <div className="text-[10px] text-neutral-400">Bar {idx + 1} Harmonic Anchor</div>
              </div>
            );
          })}
        </div>

        {/* 32-Step Mini Grid Ribbon */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5 font-mono">
            <span>32-Step Syncopated Pattern Preview</span>
            <span className="text-cyan-400">
              {currentSuggestion.sequence32.filter((s) => s.active).length} Active Steps
            </span>
          </div>

          <div className="grid grid-cols-16 sm:grid-cols-32 gap-1 bg-neutral-900 p-2 rounded-lg border border-neutral-800">
            {currentSuggestion.sequence32.map((s, i) => (
              <div
                key={i}
                title={`Step ${s.stepNumber}: ${s.note} ${s.accent ? '(Accent)' : ''}`}
                className={`h-5 rounded-sm flex items-center justify-center text-[8px] font-mono transition-colors ${
                  s.active
                    ? s.accent
                      ? 'bg-amber-400 text-neutral-950 font-bold'
                      : 'bg-cyan-500 text-neutral-950 font-semibold'
                    : 'bg-neutral-950 text-neutral-600'
                }`}
              >
                {s.active ? s.note.replace(/[0-9]/g, '') : ''}
              </div>
            ))}
          </div>
        </div>

        {/* Synthesizer Automation Advice */}
        {currentSuggestion.automationTips && (
          <div className="pt-2 border-t border-neutral-850 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                <strong className="text-neutral-300">Cutoff Trend:</strong>{' '}
                {currentSuggestion.automationTips.cutoffTrend}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span>Saturation Drive: {currentSuggestion.automationTips.saturationDrive}</span>
              <span>Resonance: Q {currentSuggestion.automationTips.resonance}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
