import { SynthParams } from '../audio/AudioEngine';

export interface ModelCore {
  id: string;
  name: string;
  category: string;
  latency: string;
  dspLoad: string;
  parameters: number;
  precision: string;
  accuracy: string;
  status: string;
  tags: string[];
  description: string;
  preset: Partial<SynthParams>;
}

export const MODEL_CATEGORIES = [
  'Neural Spectral Decomposition',
  'Subtractive Quantum Hybrid',
  'FM Generative Resonator',
  'Wavetable Wavelet Diffusion',
  'Analog Physical Modeling',
  'Bio-Acoustic Granular Matrix',
] as const;

export type ModelCategory = (typeof MODEL_CATEGORIES)[number];

const CATEGORY_PROFILES: Record<
  ModelCategory,
  {
    description: string;
    defaultTags: string[];
    synthPreset: (index: number) => Partial<SynthParams>;
  }
> = {
  'Neural Spectral Decomposition': {
    description:
      'Performs real-time Fourier spectrogram decomposition with latent neural residual resynthesis for pristine acoustic detail.',
    defaultTags: ['Fourier-Net', 'Latent Resynthesis', 'Low-Jitter', 'Hard DSP'],
    synthPreset: (i) => ({
      osc1Type: 'sawtooth',
      osc2Type: 'sine',
      osc2Mix: 0.35 + (i % 3) * 0.1,
      osc2Detune: 7 + (i % 5),
      cutoff: 1800 + (i % 10) * 150,
      resonance: 3.8 + (i % 4) * 0.5,
      attack: 0.04,
      decay: 0.3,
      sustain: 0.65,
      release: 1.2,
      lfoRate: 2.5 + (i % 4) * 0.8,
      lfoDepth: 120,
      saturationDrive: 22 + (i % 8) * 3,
      delayTime: 0.28,
      delayFeedbackVal: 0.35,
      driveMode: 'analog-tube',
      hardMode: true,
      hybridIntensity: 80,
      subOscMix: 0.45,
      subOscOctave: -1,
      transientPunch: 40,
      fmModAmount: 15,
      stereoSpread: 40,
    }),
  },
  'Subtractive Quantum Hybrid': {
    description:
      'High-order pole cascaded filters driven by dual quantized anti-aliased oscillators with sub-harmonic saturation and hard brickwall clipping.',
    defaultTags: ['Quantum Saturated', 'Zero-Delay Feedback', 'Hard Sub-Bass', 'Aggressive'],
    synthPreset: (i) => ({
      osc1Type: 'square',
      osc2Type: 'sawtooth',
      osc2Mix: 0.65,
      osc1Detune: -4,
      osc2Detune: 12,
      cutoff: 950 + (i % 12) * 200,
      resonance: 7 + (i % 4),
      attack: 0.008,
      decay: 0.22,
      sustain: 0.45,
      release: 0.5,
      lfoRate: 4 + (i % 3),
      lfoDepth: 220,
      saturationDrive: 42 + (i % 10) * 2,
      delayTime: 0.2,
      delayFeedbackVal: 0.25,
      driveMode: 'neural-hard-clip',
      hardMode: true,
      hybridIntensity: 95,
      subOscMix: 0.75,
      subOscOctave: -1,
      transientPunch: 75,
      fmModAmount: 22,
      stereoSpread: 35,
    }),
  },
  'FM Generative Resonator': {
    description:
      'Complex operator matrix synthesis with non-linear feedback loops for glassy bells, metallic percussions, and hyper-dynamic leads.',
    defaultTags: ['Phase Modulation', 'Metallic Resonator', 'Micro-Tonal', 'Fuzz Overdrive'],
    synthPreset: (i) => ({
      osc1Type: 'sine',
      osc2Type: 'sine',
      osc2Mix: 0.85,
      osc2Detune: 19 + (i % 4) * 5,
      cutoff: 4200,
      resonance: 3.2,
      attack: 0.003,
      decay: 0.45,
      sustain: 0.25,
      release: 1.5,
      lfoRate: 6.5,
      lfoDepth: 45,
      saturationDrive: 24,
      delayTime: 0.38,
      delayFeedbackVal: 0.5,
      driveMode: 'fuzz-overdrive',
      hardMode: true,
      hybridIntensity: 90,
      subOscMix: 0.4,
      subOscOctave: -1,
      transientPunch: 65,
      fmModAmount: 65,
      stereoSpread: 50,
    }),
  },
  'Wavetable Wavelet Diffusion': {
    description:
      'Continuous 2D wavelet coordinate morphing with statistical multi-band dispersion for fluid, evolving pads and drones.',
    defaultTags: ['Wavelet Morph', 'Diffusion Matrix', 'Evolving', 'Spatial Spread'],
    synthPreset: (i) => ({
      osc1Type: 'sawtooth',
      osc2Type: 'triangle',
      osc2Mix: 0.6,
      osc1Detune: -7,
      osc2Detune: 7,
      cutoff: 2400,
      resonance: 2.8,
      attack: 0.15,
      decay: 0.6,
      sustain: 0.85,
      release: 1.8,
      lfoRate: 0.8,
      lfoDepth: 350,
      saturationDrive: 22,
      delayTime: 0.45,
      delayFeedbackVal: 0.55,
      driveMode: 'analog-tube',
      hardMode: true,
      hybridIntensity: 75,
      subOscMix: 0.5,
      subOscOctave: -1,
      transientPunch: 30,
      fmModAmount: 12,
      stereoSpread: 70,
    }),
  },
  'Analog Physical Modeling': {
    description:
      'Waveguide impulse mesh simulating vibrating mechanical strings, reed tension, and non-linear wave-folding acoustics.',
    defaultTags: ['Acoustic Modeling', 'Karplus-Strong', 'Physical String', 'Wavefolder'],
    synthPreset: (i) => ({
      osc1Type: 'triangle',
      osc2Type: 'square',
      osc2Mix: 0.35,
      osc2Detune: 0,
      cutoff: 1600 + (i % 8) * 180,
      resonance: 5.2,
      attack: 0.002,
      decay: 0.15,
      sustain: 0.35,
      release: 0.9,
      lfoRate: 1.2,
      lfoDepth: 60,
      saturationDrive: 32,
      delayTime: 0.15,
      delayFeedbackVal: 0.3,
      driveMode: 'quantum-wavefolder',
      hardMode: true,
      hybridIntensity: 85,
      subOscMix: 0.45,
      subOscOctave: -1,
      transientPunch: 85,
      fmModAmount: 28,
      stereoSpread: 30,
    }),
  },
  'Bio-Acoustic Granular Matrix': {
    description:
      'Micro-grain grain cloud distribution utilizing organic spectral samples and stochastic density permutations.',
    defaultTags: ['Granular Cloud', 'Stochastic Density', 'Organic Timbre', 'Hard Saturation'],
    synthPreset: (i) => ({
      osc1Type: 'sine',
      osc2Type: 'sawtooth',
      osc2Mix: 0.5,
      osc1Detune: (i % 10) - 5,
      osc2Detune: 24,
      cutoff: 3100,
      resonance: 3.8,
      attack: 0.08,
      decay: 0.35,
      sustain: 0.7,
      release: 1.4,
      lfoRate: 5.2,
      lfoDepth: 180,
      saturationDrive: 28,
      delayTime: 0.32,
      delayFeedbackVal: 0.48,
      driveMode: 'neural-hard-clip',
      hardMode: true,
      hybridIntensity: 85,
      subOscMix: 0.55,
      subOscOctave: -1,
      transientPunch: 55,
      fmModAmount: 35,
      stereoSpread: 55,
    }),
  },
};

export const generateModelRegistry = (): ModelCore[] => {
  const models: ModelCore[] = [];
  let idCounter = 1;

  MODEL_CATEGORIES.forEach((cat) => {
    const profile = CATEGORY_PROFILES[cat];
    const prefixes = ['Vortex', 'Pulse', 'Aether', 'Quantum', 'Hyperion', 'Zero', 'Flux', 'Genesis', 'Titan', 'Apex', 'Prism', 'Helios'];

    for (let i = 1; i <= 44; i++) {
      const id = `HYBRID-${idCounter.toString().padStart(3, '0')}`;
      const prefix = prefixes[(i - 1) % prefixes.length];
      const modelName = `${cat.split(' ')[0]} ${prefix}-${i}`;
      const latencyNum = 0.8 + (i % 7) * 0.25;
      const dspNum = 1.1 + (i % 9) * 0.35;
      const accuracyNum = 99.1 + (i % 9) * 0.09;
      const precisionVal =
        i % 4 === 0
          ? 'FP16 Tensor'
          : i % 4 === 1
          ? 'FP32 Core'
          : i % 4 === 2
          ? 'BF16 Neural'
          : 'INT8 SIMD';

      models.push({
        id,
        name: modelName,
        category: cat,
        latency: `${latencyNum.toFixed(2)}ms`,
        dspLoad: `${dspNum.toFixed(1)}%`,
        parameters: 128 + i * 16,
        precision: precisionVal,
        accuracy: `${accuracyNum.toFixed(2)}%`,
        status: i % 18 === 0 ? 'Updating' : 'Active',
        tags: [...profile.defaultTags, precisionVal],
        description: profile.description,
        preset: profile.synthPreset(i),
      });
      idCounter++;
    }
  });

  return models;
};

export const ALL_MODELS = generateModelRegistry();
