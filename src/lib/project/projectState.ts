import { audioEngine, SynthParams } from '../audio/AudioEngine';
import { ALL_MODELS, ModelCore } from '../models/registry';
import { MacroUnit } from '../../components/audio/MacroControls';

export interface AutomationProjectState {
  selectedTargetKey: string;
  isEnabled: boolean;
  smoothInterpolation: boolean;
  curves: Record<string, number[]>;
}

export interface SequencerStepData {
  stepNumber: number;
  note: string;
  active: boolean;
  accent: boolean;
  velocity: number;
}

export interface SequencerProjectState {
  bpm: number;
  stepDivision: number;
  sequence: SequencerStepData[];
}

export interface SynthAIProject {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  model: {
    id: string;
    name: string;
    category: string;
    precision: string;
  };
  synthParams: SynthParams;
  macroUnits: MacroUnit[];
  automation: AutomationProjectState;
  sequencer?: SequencerProjectState;
}

const STORAGE_KEY = 'synthai_saved_projects_v2';
const ACTIVE_MACROS_KEY = 'synthai_active_macros_state';
const ACTIVE_AUTOMATION_KEY = 'synthai_active_automation_state';

// Factory showcase projects
export const FACTORY_PROJECTS: SynthAIProject[] = [
  {
    id: 'factory-cyber-acid',
    name: 'Cyberpunk 2099 Acid Overdrive',
    description: 'High-resonance squelch with aggressive tube drive automation and 32-step syncopated bassline.',
    author: 'SynthAI Labs',
    version: '2.0.0',
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    tags: ['Acid', 'Industrial', 'Resonance', 'Bass'],
    model: {
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
      osc2Mix: 0.65,
      filterType: 'lowpass',
      cutoff: 1850,
      resonance: 8.5,
      attack: 0.02,
      decay: 0.22,
      sustain: 0.35,
      release: 0.25,
      lfoRate: 4.5,
      lfoDepth: 220,
      delayTime: 0.28,
      delayFeedbackVal: 0.45,
      reverbMix: 0.25,
      saturationDrive: 38,
      masterVolume: 0.82,
    },
    macroUnits: [
      {
        id: 'm-acid',
        name: 'Acid Bite & Saturation',
        color: '#38bdf8',
        value: 0.62,
        mappings: [
          { id: 'm-a1', targetParam: 'cutoff', minVal: 500, maxVal: 7500, enabled: true },
          { id: 'm-a2', targetParam: 'saturationDrive', minVal: 15, maxVal: 60, enabled: true },
          { id: 'm-a3', targetParam: 'resonance', minVal: 4, maxVal: 15, enabled: true },
        ],
      },
      {
        id: 'm-space',
        name: 'Dark Matter Echo',
        color: '#818cf8',
        value: 0.4,
        mappings: [
          { id: 'm-s1', targetParam: 'delayFeedbackVal', minVal: 0.2, maxVal: 0.7, enabled: true },
          { id: 'm-s2', targetParam: 'reverbMix', minVal: 0.1, maxVal: 0.6, enabled: true },
        ],
      },
    ],
    automation: {
      selectedTargetKey: 'cutoff',
      isEnabled: true,
      smoothInterpolation: true,
      curves: {
        cutoff: Array.from({ length: 32 }, (_, i) => {
          const beat = i % 8;
          return 0.15 + 0.8 * Math.pow(1 - beat / 8, 1.8);
        }),
        saturationDrive: Array.from({ length: 32 }, (_, i) => (i % 4 === 0 ? 0.85 : 0.35)),
        resonance: Array.from({ length: 32 }, (_, i) => 0.4 + 0.4 * Math.sin((i / 32) * Math.PI * 4)),
      },
    },
    sequencer: {
      bpm: 134,
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
    id: 'factory-ethereal-ambient',
    name: 'Deep Celestial Ambient Voyage',
    description: 'Drifting lush polyphonic harmonics, slow convolution reverb swells, and detuned sub-harmonics.',
    author: 'Aether Labs',
    version: '2.0.0',
    createdAt: '2026-10-20T11:00:00.000Z',
    updatedAt: '2026-10-20T11:00:00.000Z',
    tags: ['Ambient', 'Pads', 'Reverb', 'Ethereal'],
    model: {
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
      filterType: 'lowpass',
      cutoff: 4200,
      resonance: 2.2,
      attack: 0.45,
      decay: 0.6,
      sustain: 0.85,
      release: 1.8,
      lfoRate: 1.2,
      lfoDepth: 180,
      delayTime: 0.42,
      delayFeedbackVal: 0.65,
      reverbMix: 0.7,
      saturationDrive: 8,
      masterVolume: 0.78,
    },
    macroUnits: [
      {
        id: 'm-shimmer',
        name: 'Starlight Shimmer',
        color: '#34d399',
        value: 0.55,
        mappings: [
          { id: 'm-sh1', targetParam: 'reverbMix', minVal: 0.3, maxVal: 0.85, enabled: true },
          { id: 'm-sh2', targetParam: 'cutoff', minVal: 2000, maxVal: 9000, enabled: true },
        ],
      },
    ],
    automation: {
      selectedTargetKey: 'reverbMix',
      isEnabled: true,
      smoothInterpolation: true,
      curves: {
        reverbMix: Array.from({ length: 32 }, (_, i) => 0.3 + 0.5 * (i / 31)),
        cutoff: Array.from({ length: 32 }, (_, i) => 0.35 + 0.45 * Math.sin((i / 32) * Math.PI * 2)),
      },
    },
    sequencer: {
      bpm: 96,
      stepDivision: 16,
      sequence: Array.from({ length: 32 }, (_, i) => {
        const notes = ['C4', 'G4', 'D#4', 'A#4', 'F4', 'C5', 'G4', 'D#4'];
        return {
          stepNumber: i + 1,
          note: notes[i % notes.length],
          active: i % 4 === 0,
          accent: i % 8 === 0,
          velocity: 0.85,
        };
      }),
    },
  },
];

// Local Storage helpers
export function getStoredProjects(): SynthAIProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(FACTORY_PROJECTS));
      return FACTORY_PROJECTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : FACTORY_PROJECTS;
  } catch (e) {
    console.error('Failed to load projects from storage', e);
    return FACTORY_PROJECTS;
  }
}

export function saveProjects(projects: SynthAIProject[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects to storage', e);
  }
}

// Global active macro & automation getters/setters
export function getSavedActiveMacros(): MacroUnit[] | null {
  try {
    const raw = localStorage.getItem(ACTIVE_MACROS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveActiveMacros(macros: MacroUnit[]): void {
  try {
    localStorage.setItem(ACTIVE_MACROS_KEY, JSON.stringify(macros));
  } catch {}
}

export function getSavedActiveAutomation(): AutomationProjectState | null {
  try {
    const raw = localStorage.getItem(ACTIVE_AUTOMATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveActiveAutomation(auto: AutomationProjectState): void {
  try {
    localStorage.setItem(ACTIVE_AUTOMATION_KEY, JSON.stringify(auto));
  } catch {}
}

// Export single project to downloadable JSON
export function exportProjectFile(project: SynthAIProject): void {
  const jsonStr = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const sanitizedName = project.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  a.download = `synthai-project-${sanitizedName}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Validate imported project JSON
export function validateProjectJson(json: any): { valid: boolean; error?: string; project?: SynthAIProject } {
  if (!json || typeof json !== 'object') {
    return { valid: false, error: 'File is not a valid JSON object.' };
  }
  if (!json.name || typeof json.name !== 'string') {
    return { valid: false, error: 'Missing project "name" property.' };
  }
  if (!json.synthParams || typeof json.synthParams !== 'object') {
    return { valid: false, error: 'Missing or malformed "synthParams" block.' };
  }

  // Sanitize and structure
  const project: SynthAIProject = {
    id: json.id || `proj-${Date.now()}`,
    name: json.name.trim(),
    description: json.description || 'Imported SynthAI Studio Project',
    author: json.author || 'Producer',
    version: json.version || '2.0.0',
    createdAt: json.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: Array.isArray(json.tags) ? json.tags : ['Imported'],
    model: json.model || {
      id: 'HYBRID-001',
      name: 'Neural Spectral Vortex 1',
      category: 'Neural Spectral Decomposition',
      precision: 'FP32 Core',
    },
    synthParams: {
      ...audioEngine.params,
      ...json.synthParams,
    },
    macroUnits: Array.isArray(json.macroUnits) ? json.macroUnits : [],
    automation: json.automation || {
      selectedTargetKey: 'cutoff',
      isEnabled: true,
      smoothInterpolation: true,
      curves: {},
    },
    sequencer: json.sequencer,
  };

  return { valid: true, project };
}
