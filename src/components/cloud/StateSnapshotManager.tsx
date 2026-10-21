import React, { useState, useRef, useEffect } from 'react';
import { audioEngine, SynthParams } from '../../lib/audio/AudioEngine';
import { ModelCore, ALL_MODELS } from '../../lib/models/registry';
import {
  SynthAIProject,
  getSavedActiveMacros,
  saveActiveMacros,
  getSavedActiveAutomation,
  saveActiveAutomation,
} from '../../lib/project/projectState';
import { MacroUnit } from '../audio/MacroControls';
import {
  Download,
  Upload,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  FileJson,
  Sliders,
  TrendingUp,
  Cpu,
  Music,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Clock,
  Layers,
  FileCode,
  HardDrive,
  Eye,
} from 'lucide-react';

export interface SynthEngineSnapshot {
  version: string;
  format: 'SynthEngine-State-Snapshot-v2';
  exportedAt: string;
  name: string;
  description: string;
  author: string;
  activeModel: {
    id: string;
    name: string;
    category: string;
    precision: string;
  };
  synthParams: SynthParams;
  macroMappings: MacroUnit[];
  automationCurves: {
    selectedTargetKey: string;
    isEnabled: boolean;
    smoothInterpolation: boolean;
    curves: Record<string, number[]>;
  };
  sequencer?: {
    bpm: number;
    stepDivision: number;
    sequence: any[];
  };
}

const LOCAL_SNAPSHOTS_KEY = 'synthai_local_state_snapshots_v2';

const FACTORY_SNAPSHOTS: SynthEngineSnapshot[] = [
  {
    version: '2.0.0',
    format: 'SynthEngine-State-Snapshot-v2',
    exportedAt: '2026-10-21T03:00:00.000Z',
    name: 'Hard Turbo Neural Acid Bass',
    description: 'Aggressive tube saturation, sub-oscillator drive, and automated resonant 32-step acid cutoff sweeps.',
    author: 'SynthAI Sound Lab',
    activeModel: {
      id: 'HYBRID-001',
      name: 'Neural Vortex 1',
      category: 'Neural Spectral Decomposition',
      precision: 'FP32 Core',
    },
    synthParams: {
      osc1Type: 'sawtooth',
      osc1Detune: -12,
      osc2Type: 'square',
      osc2Detune: 7,
      osc2Mix: 0.7,
      subOscMix: 0.65,
      subOscOctave: -1,
      driveMode: 'neural-hard-clip',
      hardMode: true,
      hybridIntensity: 85,
      transientPunch: 70,
      fmModAmount: 30,
      filterType: 'lowpass',
      cutoff: 1950,
      resonance: 8.5,
      attack: 0.02,
      decay: 0.24,
      sustain: 0.35,
      release: 0.28,
      lfoRate: 4.8,
      lfoDepth: 240,
      delayTime: 0.28,
      delayFeedbackVal: 0.45,
      reverbMix: 0.22,
      saturationDrive: 42,
      masterVolume: 0.85,
    },
    macroMappings: [
      {
        id: 'snap-m1',
        name: 'Acid Bite & Saturation',
        color: '#38bdf8',
        value: 0.68,
        mappings: [
          { id: 'm1-1', targetParam: 'cutoff', minVal: 400, maxVal: 7200, enabled: true },
          { id: 'm1-2', targetParam: 'saturationDrive', minVal: 15, maxVal: 60, enabled: true },
          { id: 'm1-3', targetParam: 'resonance', minVal: 3.5, maxVal: 14.5, enabled: true },
        ],
      },
      {
        id: 'snap-m2',
        name: 'Hybrid Sub Hard Turbo',
        color: '#f59e0b',
        value: 0.55,
        mappings: [
          { id: 'm2-1', targetParam: 'subOscMix', minVal: 0.2, maxVal: 0.9, enabled: true },
          { id: 'm2-2', targetParam: 'hybridIntensity', minVal: 30, maxVal: 100, enabled: true },
          { id: 'm2-3', targetParam: 'transientPunch', minVal: 20, maxVal: 90, enabled: true },
        ],
      },
    ],
    automationCurves: {
      selectedTargetKey: 'cutoff',
      isEnabled: true,
      smoothInterpolation: true,
      curves: {
        cutoff: Array.from({ length: 32 }, (_, i) => {
          const beat = i % 8;
          return 0.15 + 0.82 * Math.pow(1 - beat / 8, 1.8);
        }),
        saturationDrive: Array.from({ length: 32 }, (_, i) => (i % 4 === 0 ? 0.85 : 0.35)),
        resonance: Array.from({ length: 32 }, (_, i) => 0.35 + 0.45 * Math.sin((i / 32) * Math.PI * 4)),
      },
    },
    sequencer: {
      bpm: 135,
      stepDivision: 16,
      sequence: Array.from({ length: 32 }, (_, i) => {
        const notes = ['C3', 'C3', 'D#3', 'C3', 'G3', 'F3', 'C3', 'A#3'];
        return {
          stepNumber: i + 1,
          note: notes[i % notes.length],
          active: i % 2 === 0 || i % 7 === 0,
          accent: i % 4 === 0,
          velocity: i % 4 === 0 ? 1.0 : 0.75,
        };
      }),
    },
  },
  {
    version: '2.0.0',
    format: 'SynthEngine-State-Snapshot-v2',
    exportedAt: '2026-10-21T03:00:00.000Z',
    name: 'Cosmic Quantum Pad & Reverb',
    description: 'Drifting lush polyphonic harmonics, slow convolution reverb swells, and subtle detuned sub-harmonics.',
    author: 'Aether Labs',
    activeModel: {
      id: 'HYBRID-045',
      name: 'Subtractive Pulse 1',
      category: 'Subtractive Quantum Hybrid',
      precision: 'FP16 Tensor',
    },
    synthParams: {
      osc1Type: 'sine',
      osc1Detune: 0,
      osc2Type: 'triangle',
      osc2Detune: 12,
      osc2Mix: 0.5,
      subOscMix: 0.3,
      subOscOctave: -2,
      driveMode: 'analog-tube',
      hardMode: false,
      hybridIntensity: 50,
      transientPunch: 20,
      fmModAmount: 15,
      filterType: 'lowpass',
      cutoff: 1200,
      resonance: 2.2,
      attack: 0.45,
      decay: 0.8,
      sustain: 0.85,
      release: 1.4,
      lfoRate: 0.6,
      lfoDepth: 80,
      delayTime: 0.45,
      delayFeedbackVal: 0.55,
      reverbMix: 0.45,
      saturationDrive: 12,
      masterVolume: 0.8,
    },
    macroMappings: [
      {
        id: 'snap-pad-m1',
        name: 'Space Swell & Cutoff',
        color: '#818cf8',
        value: 0.5,
        mappings: [
          { id: 'pm-1', targetParam: 'cutoff', minVal: 600, maxVal: 4500, enabled: true },
          { id: 'pm-2', targetParam: 'reverbMix', minVal: 0.2, maxVal: 0.75, enabled: true },
        ],
      },
    ],
    automationCurves: {
      selectedTargetKey: 'reverbMix',
      isEnabled: true,
      smoothInterpolation: true,
      curves: {
        reverbMix: Array.from({ length: 32 }, (_, i) => 0.25 + 0.45 * Math.sin((i / 32) * Math.PI)),
        cutoff: Array.from({ length: 32 }, (_, i) => 0.3 + 0.4 * (i / 32)),
      },
    },
  },
];

interface StateSnapshotManagerProps {
  activeModel: ModelCore;
  onModelSelect?: (model: ModelCore) => void;
  onSnapshotRestored?: (snapshot: SynthEngineSnapshot) => void;
}

export const StateSnapshotManager: React.FC<StateSnapshotManagerProps> = ({
  activeModel,
  onModelSelect,
  onSnapshotRestored,
}) => {
  const [snapshots, setSnapshots] = useState<SynthEngineSnapshot[]>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_SNAPSHOTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return FACTORY_SNAPSHOTS;
  });

  const [snapshotName, setSnapshotName] = useState<string>('');
  const [snapshotDesc, setSnapshotDesc] = useState<string>('');
  const [snapshotAuthor, setSnapshotAuthor] = useState<string>('Producer');
  const [isTakeSnapshotOpen, setIsTakeSnapshotOpen] = useState<boolean>(false);
  const [showJsonInspector, setShowJsonInspector] = useState<boolean>(false);
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pasteJsonInput, setPasteJsonInput] = useState<string>('');
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_SNAPSHOTS_KEY, JSON.stringify(snapshots));
    } catch (e) {
      console.error('Failed to save snapshots', e);
    }
  }, [snapshots]);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4500);
  };

  // Compile entire live SynthEngine state into snapshot object
  const createLiveSnapshot = (
    customName?: string,
    customDesc?: string,
    customAuthor?: string
  ): SynthEngineSnapshot => {
    // 1. Current SynthParams from AudioEngine
    const currentSynthParams: SynthParams = { ...audioEngine.params };

    // 2. Current Macro Mappings
    const currentMacros: MacroUnit[] = getSavedActiveMacros() || [];

    // 3. Current Automation Curves
    const currentAutomation = getSavedActiveAutomation() || {
      selectedTargetKey: 'cutoff',
      isEnabled: true,
      smoothInterpolation: true,
      curves: {},
    };

    // 4. Current Sequencer State
    let sequencerData: any = undefined;
    try {
      const rawSeq = localStorage.getItem('synthai_active_sequencer_state');
      if (rawSeq) {
        sequencerData = JSON.parse(rawSeq);
      }
    } catch {}

    const modelMeta = {
      id: activeModel.id,
      name: activeModel.name,
      category: activeModel.category,
      precision: activeModel.precision,
    };

    const name = customName?.trim() || `${activeModel.name} Live Snapshot`;
    const description =
      customDesc?.trim() ||
      `Full state snapshot of ${activeModel.name} with ${Object.keys(currentSynthParams).length} parameters, ${currentMacros.length} macros, and ${Object.keys(currentAutomation.curves || {}).length} automation curves.`;
    const author = customAuthor?.trim() || 'Sound Designer';

    return {
      version: '2.0.0',
      format: 'SynthEngine-State-Snapshot-v2',
      exportedAt: new Date().toISOString(),
      name,
      description,
      author,
      activeModel: modelMeta,
      synthParams: currentSynthParams,
      macroMappings: currentMacros,
      automationCurves: currentAutomation,
      sequencer: sequencerData,
    };
  };

  // Export live snapshot directly to a downloadable .json file
  const handleExportJsonFile = (snapshot?: SynthEngineSnapshot) => {
    const data = snapshot || createLiveSnapshot();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    const sanitizedName = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    downloadAnchor.download = `synthengine-snapshot-${sanitizedName}-${Date.now().toString(36)}.json`;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);

    showStatus(`Exported JSON snapshot: "${data.name}"`);
  };

  // Copy snapshot JSON to clipboard
  const handleCopyJson = (snapshot?: SynthEngineSnapshot) => {
    const data = snapshot || createLiveSnapshot();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
    showStatus('Snapshot JSON copied to clipboard!');
  };

  // Validate and parse an incoming snapshot JSON object
  const validateSnapshotJson = (rawJson: any): { valid: boolean; error?: string; snapshot?: SynthEngineSnapshot } => {
    if (!rawJson || typeof rawJson !== 'object') {
      return { valid: false, error: 'JSON payload is not an object.' };
    }

    // Check for synth parameters
    const synthParams = rawJson.synthParams || rawJson.parameters;
    if (!synthParams || typeof synthParams !== 'object') {
      return {
        valid: false,
        error: 'Missing required "synthParams" block in JSON snapshot.',
      };
    }

    // Fallbacks and normalization
    const snapshot: SynthEngineSnapshot = {
      version: rawJson.version || '2.0.0',
      format: 'SynthEngine-State-Snapshot-v2',
      exportedAt: rawJson.exportedAt || new Date().toISOString(),
      name: (rawJson.name && typeof rawJson.name === 'string') ? rawJson.name.trim() : 'Imported Snapshot',
      description: rawJson.description || 'Imported Synthesizer Snapshot',
      author: rawJson.author || 'Sound Designer',
      activeModel: rawJson.activeModel || rawJson.model || {
        id: activeModel.id,
        name: activeModel.name,
        category: activeModel.category,
        precision: activeModel.precision,
      },
      synthParams: {
        ...audioEngine.params,
        ...synthParams,
      },
      macroMappings: Array.isArray(rawJson.macroMappings)
        ? rawJson.macroMappings
        : Array.isArray(rawJson.macroUnits)
        ? rawJson.macroUnits
        : [],
      automationCurves: rawJson.automationCurves || rawJson.automation || {
        selectedTargetKey: 'cutoff',
        isEnabled: true,
        smoothInterpolation: true,
        curves: {},
      },
      sequencer: rawJson.sequencer,
    };

    return { valid: true, snapshot };
  };

  // Restore snapshot into live synthesizer engine
  const handleRestoreSnapshot = (snapshot: SynthEngineSnapshot) => {
    // 1. Apply synth parameters directly to audio engine
    audioEngine.applyPatch(snapshot.synthParams);

    // 2. Restore macro mappings
    if (snapshot.macroMappings && Array.isArray(snapshot.macroMappings)) {
      saveActiveMacros(snapshot.macroMappings);
    }

    // 3. Restore automation curves
    if (snapshot.automationCurves) {
      saveActiveAutomation(snapshot.automationCurves);
    }

    // 4. Restore sequencer state if provided
    if (snapshot.sequencer) {
      try {
        localStorage.setItem('synthai_active_sequencer_state', JSON.stringify(snapshot.sequencer));
      } catch {}
    }

    // 5. Select active neural model if provided
    if (snapshot.activeModel?.id) {
      const match = ALL_MODELS.find((m) => m.id === snapshot.activeModel.id);
      if (match && onModelSelect) {
        onModelSelect(match);
      }
    }

    // 6. Broadcast global project/snapshot load event to update UI components
    window.dispatchEvent(
      new CustomEvent('synthai:load-project', {
        detail: {
          id: `snap-${Date.now()}`,
          name: snapshot.name,
          model: snapshot.activeModel,
          synthParams: snapshot.synthParams,
          macroUnits: snapshot.macroMappings,
          automation: snapshot.automationCurves,
          sequencer: snapshot.sequencer,
        },
      })
    );

    onSnapshotRestored?.(snapshot);

    const macroCount = snapshot.macroMappings?.length || 0;
    const curveCount = Object.keys(snapshot.automationCurves?.curves || {}).length;
    showStatus(
      `Restored snapshot "${snapshot.name}": ${Object.keys(snapshot.synthParams).length} params, ${macroCount} macros, and ${curveCount} automation curves!`
    );
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const result = validateSnapshotJson(parsed);

        if (!result.valid || !result.snapshot) {
          showStatus(result.error || 'Invalid snapshot file format.', 'error');
          return;
        }

        const newSnap = result.snapshot;
        setSnapshots((prev) => [newSnap, ...prev]);
        handleRestoreSnapshot(newSnap);
      } catch (err: any) {
        showStatus(`Failed to parse JSON file: ${err.message || 'Syntax error'}`, 'error');
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle JSON paste submission
  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteJsonInput.trim()) return;

    try {
      const parsed = JSON.parse(pasteJsonInput.trim());
      const result = validateSnapshotJson(parsed);

      if (!result.valid || !result.snapshot) {
        showStatus(result.error || 'Invalid JSON content.', 'error');
        return;
      }

      const newSnap = result.snapshot;
      setSnapshots((prev) => [newSnap, ...prev]);
      handleRestoreSnapshot(newSnap);
      setPasteJsonInput('');
      setShowPasteModal(false);
    } catch (err: any) {
      showStatus(`JSON Parse Error: ${err.message || 'Invalid syntax'}`, 'error');
    }
  };

  // Save new in-browser snapshot to history
  const handleSaveSnapshotToHistory = (e: React.FormEvent) => {
    e.preventDefault();
    const newSnap = createLiveSnapshot(snapshotName, snapshotDesc, snapshotAuthor);
    setSnapshots((prev) => [newSnap, ...prev]);
    setSnapshotName('');
    setSnapshotDesc('');
    setIsTakeSnapshotOpen(false);
    showStatus(`Saved snapshot "${newSnap.name}" to browser history!`);
  };

  const handleDeleteSnapshot = (index: number) => {
    setSnapshots((prev) => prev.filter((_, i) => i !== index));
    showStatus('Snapshot removed.');
  };

  // Current live state statistics
  const currentParamsCount = Object.keys(audioEngine.params).length;
  const currentMacros = getSavedActiveMacros() || [];
  const currentAuto = getSavedActiveAutomation();
  const currentCurvesCount = currentAuto?.curves ? Object.keys(currentAuto.curves).length : 0;

  return (
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Top Hero Card for State Snapshot */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-neutral-800 border border-neutral-700/80 rounded-xl text-cyan-400 shrink-0">
            <FileJson className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-neutral-100">
                SynthEngine Full State Snapshot
              </h3>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-semibold">
                JSON Import / Export
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-400">
                v2.0 Schema
              </span>
            </div>
            <p className="text-xs text-neutral-400 max-w-2xl">
              Snapshot the entire synthesizer engine in one local JSON file: all {currentParamsCount} current parameter values,
              sub-oscillator & hard drive modes, multi-destination macro knob mappings, and 32-step automation curves.
            </p>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 text-xs font-semibold rounded-lg transition-colors shadow-sm"
            title="Import a JSON file from your computer"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import JSON</span>
          </button>

          <button
            onClick={() => setShowPasteModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 border border-neutral-700 text-xs font-medium rounded-lg transition-colors"
            title="Paste raw JSON text"
          >
            <FileCode className="w-3.5 h-3.5 text-indigo-400" />
            <span>Paste JSON</span>
          </button>

          <button
            onClick={() => handleExportJsonFile()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-100 border border-neutral-700 text-xs font-semibold rounded-lg transition-colors shadow-sm"
            title="Download current SynthEngine state as a .json file"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export State (.json)</span>
          </button>

          <button
            onClick={() => setIsTakeSnapshotOpen(!isTakeSnapshotOpen)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-xs font-bold rounded-lg transition-colors shadow-sm"
            title="Create a named snapshot saved in local storage"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Take Snapshot</span>
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 border animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800/80 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Live State HUD & Inspector Preview */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-850">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
              Live SynthEngine State Telemetry
            </h4>
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopyJson()}
              className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[11px] font-medium text-neutral-300 rounded-lg transition-colors"
            >
              {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-neutral-400" />}
              <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
            </button>

            <button
              onClick={() => setShowJsonInspector(!showJsonInspector)}
              className="flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[11px] font-medium text-neutral-300 rounded-lg transition-colors"
            >
              <Eye className="w-3 h-3 text-cyan-400" />
              <span>{showJsonInspector ? 'Hide JSON Tree' : 'Inspect JSON Tree'}</span>
            </button>
          </div>
        </div>

        {/* Live Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-neutral-900/90 rounded-lg border border-neutral-800/80">
            <div className="text-[10px] text-neutral-500 font-mono uppercase flex items-center gap-1">
              <Cpu className="w-3 h-3 text-cyan-400" />
              <span>Hybrid Model</span>
            </div>
            <div className="font-bold text-neutral-100 truncate mt-1">{activeModel.name}</div>
            <div className="text-[11px] text-cyan-400 font-mono mt-0.5">{activeModel.id} · {activeModel.precision}</div>
          </div>

          <div className="p-3 bg-neutral-900/90 rounded-lg border border-neutral-800/80">
            <div className="text-[10px] text-neutral-500 font-mono uppercase flex items-center gap-1">
              <Sliders className="w-3 h-3 text-amber-400" />
              <span>Synth Parameters</span>
            </div>
            <div className="font-bold text-neutral-100 mt-1">{currentParamsCount} Live Controls</div>
            <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
              Cutoff {Math.round(audioEngine.params.cutoff)}Hz · Q {audioEngine.params.resonance}
            </div>
          </div>

          <div className="p-3 bg-neutral-900/90 rounded-lg border border-neutral-800/80">
            <div className="text-[10px] text-neutral-500 font-mono uppercase flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-400" />
              <span>Macro Mappings</span>
            </div>
            <div className="font-bold text-neutral-100 mt-1">{currentMacros.length} Configured Units</div>
            <div className="text-[11px] text-indigo-400 font-mono mt-0.5">
              {currentMacros.reduce((acc, m) => acc + (m.mappings?.length || 0), 0)} Target Mappings
            </div>
          </div>

          <div className="p-3 bg-neutral-900/90 rounded-lg border border-neutral-800/80">
            <div className="text-[10px] text-neutral-500 font-mono uppercase flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>Automation Curves</span>
            </div>
            <div className="font-bold text-neutral-100 mt-1">{currentCurvesCount} Parameter Lanes</div>
            <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
              32-Step Sync ({currentAuto?.smoothInterpolation ? 'Hermite Smooth' : 'Steps'})
            </div>
          </div>
        </div>

        {/* Collapsible JSON Raw Inspector */}
        {showJsonInspector && (
          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span className="font-mono text-cyan-400">Live JSON Payload Preview</span>
              <span className="font-mono text-neutral-500">Read-Only Live Mirror</span>
            </div>
            <pre className="text-[10px] font-mono text-neutral-300 bg-neutral-950 p-3 rounded border border-neutral-850 overflow-x-auto max-h-64 scrollbar-thin">
              {JSON.stringify(createLiveSnapshot(), null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Take Snapshot Form Modal / Section */}
      {isTakeSnapshotOpen && (
        <form
          onSubmit={handleSaveSnapshotToHistory}
          className="bg-neutral-900 border border-cyan-500/50 rounded-xl p-5 space-y-4 animate-in fade-in shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-bold text-neutral-100">
                Snapshot Current SynthEngine State
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsTakeSnapshotOpen(false)}
              className="text-xs text-neutral-400 hover:text-neutral-200"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Snapshot Name</label>
              <input
                type="text"
                placeholder="e.g. Lead Solo - Hard Turbo Take 1"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                required
                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Author / Engineer</label>
              <input
                type="text"
                placeholder="Producer"
                value={snapshotAuthor}
                onChange={(e) => setSnapshotAuthor(e.target.value)}
                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-neutral-300 mb-1">Description / Notes</label>
              <textarea
                placeholder="Modulation notes, macro assignments, automation cues..."
                value={snapshotDesc}
                onChange={(e) => setSnapshotDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-100 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setIsTakeSnapshotOpen(false)}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-medium rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save to Snapshot Vault</span>
            </button>
          </div>
        </form>
      )}

      {/* Paste JSON Modal */}
      {showPasteModal && (
        <form
          onSubmit={handlePasteSubmit}
          className="bg-neutral-900 border border-indigo-500/50 rounded-xl p-5 space-y-4 animate-in fade-in shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-bold text-neutral-100">
                Paste SynthEngine JSON Snapshot
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowPasteModal(false)}
              className="text-xs text-neutral-400 hover:text-neutral-200"
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              JSON Snapshot Text
            </label>
            <textarea
              placeholder='Paste full JSON snapshot here (containing "synthParams", "macroMappings", etc.)...'
              value={pasteJsonInput}
              onChange={(e) => setPasteJsonInput(e.target.value)}
              rows={8}
              required
              className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-200 focus:outline-none focus:border-indigo-500 resize-y"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setShowPasteModal(false)}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-medium rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Parse & Restore Synth State</span>
            </button>
          </div>
        </form>
      )}

      {/* Saved Snapshots Grid / Vault */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-neutral-400" />
            <h4 className="text-sm font-bold text-neutral-200">
              State Snapshots Vault ({snapshots.length})
            </h4>
          </div>
          <span className="text-xs text-neutral-500 font-mono">
            Direct 1-Click Restore & Export
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {snapshots.map((snap, idx) => {
            const paramsCount = snap.synthParams ? Object.keys(snap.synthParams).length : 0;
            const macrosCount = snap.macroMappings ? snap.macroMappings.length : 0;
            const curvesCount = snap.automationCurves?.curves
              ? Object.keys(snap.automationCurves.curves).length
              : 0;

            return (
              <div
                key={`${snap.name}-${idx}`}
                className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 flex flex-col justify-between transition-colors group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h5 className="text-sm font-bold text-neutral-100 group-hover:text-cyan-300 transition-colors">
                        {snap.name}
                      </h5>
                      <div className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                        <span>by {snap.author}</span>
                        <span>·</span>
                        <span className="font-mono text-[11px] text-neutral-500">
                          {new Date(snap.exportedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-cyan-400 shrink-0">
                      {snap.activeModel?.id || 'HYBRID'}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400 line-clamp-2 mb-3">
                    {snap.description || 'SynthEngine state snapshot.'}
                  </p>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span className="text-[10px] bg-neutral-950 text-neutral-300 border border-neutral-800 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                      <Sliders className="w-2.5 h-2.5 text-amber-400" />
                      <span>{paramsCount} Params</span>
                    </span>

                    <span className="text-[10px] bg-neutral-950 text-neutral-300 border border-neutral-800 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                      <Layers className="w-2.5 h-2.5 text-indigo-400" />
                      <span>{macrosCount} Macros</span>
                    </span>

                    <span className="text-[10px] bg-neutral-950 text-neutral-300 border border-neutral-800 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                      <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
                      <span>{curvesCount} Auto Curves</span>
                    </span>

                    {snap.synthParams?.hardMode && (
                      <span className="text-[10px] bg-amber-950/80 text-amber-300 border border-amber-800/80 px-1.5 py-0.5 rounded font-mono font-semibold">
                        HARD TURBO
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleExportJsonFile(snap)}
                      title="Download as JSON file"
                      className="p-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-lg text-xs flex items-center gap-1 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>.JSON</span>
                    </button>

                    <button
                      onClick={() => handleCopyJson(snap)}
                      title="Copy snapshot JSON to clipboard"
                      className="p-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800 rounded-lg transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {idx >= FACTORY_SNAPSHOTS.length && (
                      <button
                        onClick={() => handleDeleteSnapshot(idx)}
                        title="Delete snapshot"
                        className="p-1.5 bg-neutral-950 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 border border-neutral-800 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleRestoreSnapshot(snap)}
                    className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore State</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
