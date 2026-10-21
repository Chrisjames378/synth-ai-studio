export type DriveMode =
  | 'neural-hard-clip'
  | 'quantum-wavefolder'
  | 'analog-tube'
  | 'fuzz-overdrive';

export interface SynthParams {
  osc1Type: OscillatorType;
  osc1Detune: number;
  osc2Type: OscillatorType;
  osc2Detune: number;
  osc2Mix: number;
  filterType: BiquadFilterType;
  cutoff: number;
  resonance: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  lfoRate: number;
  lfoDepth: number;
  delayTime: number;
  delayFeedbackVal: number;
  reverbMix: number;
  saturationDrive: number;
  masterVolume: number;
  // Hybrid Hard Engine parameters
  driveMode?: DriveMode;
  hardMode?: boolean;
  hybridIntensity?: number; // 0 - 100%
  subOscMix?: number; // 0.0 - 1.0 (sub-bass punch)
  subOscOctave?: -1 | -2;
  transientPunch?: number; // 0 - 100% (snappy attack click)
  fmModAmount?: number; // 0 - 100% (cross-frequency modulation)
  stereoSpread?: number; // 0 - 100% (voice detuning width)
  // Granular Synthesis Engine parameters
  granularMode?: boolean;
  grainDensity?: number; // grains per second: 5 - 80
  grainJitter?: number; // time position randomness: 0 - 100%
  grainPlaybackSpeed?: number; // speed factor: 0.25 - 3.0x
  grainSize?: number; // grain window duration: 0.02 - 0.25s
  grainBufferName?: string;
  grainMix?: number; // 0.0 - 1.0
}

export class AdvancedAudioEngine {
  public ctx: AudioContext | null = null;
  public masterGain: GainNode | null = null;
  public analyser: AnalyserNode | null = null;
  public activeNotes: Map<
    string,
    {
      osc1: OscillatorNode;
      osc2: OscillatorNode;
      subOsc?: OscillatorNode;
      lfo: OscillatorNode;
      noteGain: GainNode;
      filter: BiquadFilterNode;
      grainTimer?: number;
      grainGain?: GainNode;
    }
  > = new Map();

  // Granular Engine Buffer & State
  public grainBuffer: AudioBuffer | null = null;
  public grainBufferName: string = 'Synthetic Shimmer Chime';
  public grainBufferDuration: number = 2.5;

  // Advanced FX Nodes
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private saturationNode: WaveShaperNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;

  // Recording Nodes
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  public isRecording: boolean = false;

  // Active Model Reference & Hybrid Architecture
  public activeModelId: string = 'HYBRID-001';
  public activeModelName: string = 'Neural Vortex 1';
  public activeModelCategory: string = 'Neural Spectral Decomposition';

  // MIDI Controller State
  public midiConnected: boolean = false;
  public midiDeviceName: string = '';

  public params: SynthParams = {
    osc1Type: 'sawtooth',
    osc1Detune: 0,
    osc2Type: 'square',
    osc2Detune: 12,
    osc2Mix: 0.45,
    filterType: 'lowpass',
    cutoff: 2200,
    resonance: 4.5,
    attack: 0.03,
    decay: 0.2,
    sustain: 0.65,
    release: 0.8,
    lfoRate: 3.2,
    lfoDepth: 150,
    delayTime: 0.3,
    delayFeedbackVal: 0.4,
    reverbMix: 0.28,
    saturationDrive: 32,
    masterVolume: 0.82,
    // Hybrid Hard Engine defaults
    driveMode: 'neural-hard-clip',
    hardMode: true,
    hybridIntensity: 85,
    subOscMix: 0.5,
    subOscOctave: -1,
    transientPunch: 45,
    fmModAmount: 15,
    stereoSpread: 35,
    // Granular Synthesis Engine defaults
    granularMode: false,
    grainDensity: 24,
    grainJitter: 35,
    grainPlaybackSpeed: 1.0,
    grainSize: 0.08,
    grainBufferName: 'Synthetic Shimmer Chime',
    grainMix: 0.75,
  };

  private listeners: Set<() => void> = new Set();
  private noteListeners: Set<(note: string, isOn: boolean) => void> = new Set();

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onNoteChange(listener: (note: string, isOn: boolean) => void) {
    this.noteListeners.add(listener);
    return () => {
      this.noteListeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private notifyNote(note: string, isOn: boolean) {
    this.noteListeners.forEach((l) => l(note, isOn));
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.params.masterVolume;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.85;

      // Tube Saturation WaveShaper
      this.saturationNode = this.ctx.createWaveShaper();
      this.saturationNode.curve = this.makeDistortionCurve(this.params.saturationDrive) as any;
      this.saturationNode.oversample = '4x';

      // Stereo Delay Circuit
      this.delayNode = this.ctx.createDelay(5.0);
      this.delayNode.delayTime.value = this.params.delayTime;
      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.value = this.params.delayFeedbackVal;

      // Reverb Convolver Node with procedurally generated impulse response
      this.reverbNode = this.ctx.createConvolver();
      this.reverbNode.buffer = this.buildImpulseResponse(2.4, 2.0);
      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.value = this.params.reverbMix;

      // Routing Graph:
      // Dry Saturation -> Delay Loop -> Master
      this.saturationNode.connect(this.delayNode);
      this.delayNode.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayNode.connect(this.masterGain);

      // Reverb routing
      this.saturationNode.connect(this.reverbNode);
      this.reverbNode.connect(this.reverbGain);
      this.reverbGain.connect(this.masterGain);

      // Direct dry bypass mix into masterGain
      this.saturationNode.connect(this.masterGain);

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);

      // Try initializing Web MIDI
      this.initMIDI();
    } catch (e) {
      console.warn('AudioContext initialization error:', e);
    }
  }

  private buildImpulseResponse(durationSec: number, decayRate: number): AudioBuffer {
    if (!this.ctx) {
      const dummyCtx = new AudioContext();
      return dummyCtx.createBuffer(2, 44100, 44100);
    }
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * durationSec;
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const decay = Math.exp(-n * decayRate * 4);
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }
    return impulse;
  }

  public initMIDI() {
    if (typeof navigator !== 'undefined' && (navigator as any).requestMIDIAccess) {
      try {
        (navigator as any).requestMIDIAccess().then((midiAccess: any) => {
          let hasInputs = false;
          midiAccess.inputs.forEach((input: any) => {
            hasInputs = true;
            this.midiDeviceName = input.name || 'External MIDI Device';
            input.onmidimessage = (msg: any) => this.handleMIDIMessage(msg);
          });
          this.midiConnected = hasInputs;
          this.notify();
        }).catch(() => {});
      } catch {}
    }
  }

  private handleMIDIMessage(event: any) {
    const [status, noteNum, velocity] = event.data;
    const command = status >> 4;
    // 9 = note on, 8 = note off
    if (command === 9 && velocity > 0) {
      const freq = 440 * Math.pow(2, (noteNum - 69) / 12);
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const noteName = `${noteNames[noteNum % 12]}${Math.floor(noteNum / 12) - 1}`;
      this.playNote(noteName, freq, null, velocity / 127);
      this.notifyNote(noteName, true);
    } else if (command === 8 || (command === 9 && velocity === 0)) {
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const noteName = `${noteNames[noteNum % 12]}${Math.floor(noteNum / 12) - 1}`;
      this.stopNote(noteName);
      this.notifyNote(noteName, false);
    }
  }

  public ensureContext(): boolean {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return !!this.ctx;
  }

  public setParam<K extends keyof SynthParams>(key: K, val: SynthParams[K]) {
    this.params[key] = val;

    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (key === 'masterVolume' && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(val as number, now, 0.01);
    } else if (key === 'delayTime' && this.delayNode) {
      this.delayNode.delayTime.setTargetAtTime(val as number, now, 0.02);
    } else if (key === 'delayFeedbackVal' && this.delayFeedback) {
      this.delayFeedback.gain.setTargetAtTime(val as number, now, 0.02);
    } else if (key === 'reverbMix' && this.reverbGain) {
      this.reverbGain.gain.setTargetAtTime(val as number, now, 0.02);
    } else if ((key === 'saturationDrive' || key === 'driveMode' || key === 'hardMode') && this.saturationNode) {
      this.saturationNode.curve = this.makeDistortionCurve(
        this.params.saturationDrive,
        this.params.driveMode
      ) as any;
    } else if (key === 'cutoff') {
      this.activeNotes.forEach(({ filter }) => {
        try {
          filter.frequency.setTargetAtTime(val as number, now, 0.01);
        } catch {}
      });
    } else if (key === 'resonance') {
      this.activeNotes.forEach(({ filter }) => {
        try {
          filter.Q.setTargetAtTime(val as number, now, 0.01);
        } catch {}
      });
    }

    this.notify();
  }

  // Multi-Mode Neural & Hard Drive Curve Generator
  public makeDistortionCurve(
    amount: number,
    mode: DriveMode = this.params.driveMode || 'neural-hard-clip'
  ): Float32Array {
    const k = typeof amount === 'number' ? Math.max(0, amount) : 20;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    const hardBoost = this.params.hardMode ? 1.4 : 1.0;

    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      if (k === 0) {
        curve[i] = x;
        continue;
      }

      switch (mode) {
        case 'neural-hard-clip': {
          // Brickwall high-gain hard clipping with intense harmonic bite
          const preGain = (1 + (k / 10) * 2.8) * hardBoost;
          const y = x * preGain;
          if (y > 0.78) {
            curve[i] = 0.78 + 0.22 * Math.tanh((y - 0.78) * 3);
          } else if (y < -0.78) {
            curve[i] = -0.78 + 0.22 * Math.tanh((y + 0.78) * 3);
          } else {
            curve[i] = y;
          }
          break;
        }
        case 'quantum-wavefolder': {
          // Non-linear West-Coast wave folding overtones
          const foldStages = (1 + (k / 14)) * hardBoost;
          curve[i] = Math.sin(x * foldStages * Math.PI * 0.5) * 0.95;
          break;
        }
        case 'fuzz-overdrive': {
          // Blistering square-wave fuzz with raw analog edge
          const fuzzGain = (1 + k * 0.9) * hardBoost;
          const saturated = x * fuzzGain;
          if (saturated > 0) {
            curve[i] = Math.min(0.96, Math.pow(Math.min(1.0, saturated), 0.65));
          } else {
            curve[i] = -Math.min(0.96, Math.pow(Math.min(1.0, -saturated), 0.65));
          }
          break;
        }
        case 'analog-tube':
        default: {
          // Warm asymmetric tube saturation with rich even-order harmonics
          curve[i] = ((3 + k * hardBoost) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
          break;
        }
      }
    }
    return curve;
  }

  public playNote(noteName: string, freq: number, duration: number | null = null, velocity: number = 1.0) {
    if (!this.ensureContext() || !this.ctx) return;

    if (this.activeNotes.has(noteName)) {
      this.stopNote(noteName);
    }

    const now = this.ctx.currentTime;
    const hardMultiplier = this.params.hardMode ? 1.25 : 1.0;
    const intensityMultiplier = 0.5 + ((this.params.hybridIntensity ?? 80) / 100) * 0.7;

    // --- OSCILLATOR 1 ---
    const osc1 = this.ctx.createOscillator();
    osc1.type = this.params.osc1Type;
    osc1.frequency.setValueAtTime(freq, now);
    osc1.detune.setValueAtTime(this.params.osc1Detune, now);

    // Transient Punch Shaper: snappy attack pitch spike for kicks/plucks/leads
    if (this.params.transientPunch && this.params.transientPunch > 0) {
      const punchAmount = (this.params.transientPunch / 100) * hardMultiplier;
      osc1.frequency.setValueAtTime(freq * (1 + punchAmount * 0.8), now);
      osc1.frequency.exponentialRampToValueAtTime(freq, now + 0.012);
    }

    // --- OSCILLATOR 2 ---
    const osc2 = this.ctx.createOscillator();
    osc2.type = this.params.osc2Type;
    osc2.frequency.setValueAtTime(freq * Math.pow(2, this.params.osc2Detune / 12), now);

    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(this.params.osc2Mix * velocity * hardMultiplier, now);
    osc2.connect(osc2Gain);

    // --- FM CROSS-MODULATION ---
    // If active model is FM Generative or fmModAmount > 0, cross-modulate Osc2 into Osc1 frequency
    if (
      (this.params.fmModAmount && this.params.fmModAmount > 0) ||
      this.activeModelCategory === 'FM Generative Resonator'
    ) {
      const fmGain = this.ctx.createGain();
      const depth = (this.params.fmModAmount || 25) * 12 * hardMultiplier;
      fmGain.gain.setValueAtTime(depth, now);
      osc2.connect(fmGain);
      fmGain.connect(osc1.frequency);
    }

    // --- MAIN BIQUAD FILTER ---
    const filter = this.ctx.createBiquadFilter();
    filter.type = this.params.filterType || 'lowpass';
    const effectiveCutoff = Math.min(20000, this.params.cutoff * (this.params.hardMode ? 1.15 : 1.0));
    filter.frequency.setValueAtTime(effectiveCutoff, now);
    filter.Q.setValueAtTime(this.params.resonance * hardMultiplier, now);

    // --- LFO FILTER MODULATION ---
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(Math.max(0.1, this.params.lfoRate), now);
    lfoGain.gain.setValueAtTime(this.params.lfoDepth * intensityMultiplier, now);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(now);

    // --- SUB-OSCILLATOR (HARD SUB-BASS GENERATOR) ---
    let subOsc: OscillatorNode | undefined;
    if (this.params.subOscMix && this.params.subOscMix > 0.02) {
      const subOctMultiplier = this.params.subOscOctave === -2 ? 0.25 : 0.5;
      const subFreq = Math.max(20, freq * subOctMultiplier);
      subOsc = this.ctx.createOscillator();
      subOsc.type = this.params.hardMode ? 'square' : 'sine';
      subOsc.frequency.setValueAtTime(subFreq, now);

      const subGain = this.ctx.createGain();
      const subLevel = this.params.subOscMix * velocity * (this.params.hardMode ? 1.2 : 0.9);
      subGain.gain.setValueAtTime(subLevel, now);

      subOsc.connect(subGain);
      subGain.connect(filter);
      subOsc.start(now);
    }

    // --- GRANULAR SYNTHESIS ENGINE CLOUD ---
    let grainTimer: number | undefined;
    let grainGain: GainNode | undefined;

    if (this.params.granularMode) {
      if (!this.grainBuffer) {
        this.grainBuffer = this.generateSyntheticGrainBuffer('metallic');
      }
      grainGain = this.ctx.createGain();
      const gMix = this.params.grainMix ?? 0.8;
      grainGain.gain.setValueAtTime(gMix * velocity, now);
      grainGain.connect(filter);

      const density = Math.max(5, Math.min(80, this.params.grainDensity || 24));
      const intervalMs = Math.max(12, Math.round(1000 / density));
      const grainDur = Math.max(0.015, Math.min(0.35, this.params.grainSize || 0.08));
      const jitterAmount = (this.params.grainJitter ?? 35) / 100;
      const speedMultiplier = this.params.grainPlaybackSpeed ?? 1.0;
      const basePitchRatio = freq / 261.63; // C4 base pitch

      const spawnGrain = () => {
        if (!this.ctx || !this.grainBuffer || !grainGain) return;
        const grainNow = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = this.grainBuffer;

        // Pitch scale with playback speed and musical frequency
        src.playbackRate.setValueAtTime(
          Math.max(0.08, Math.min(8.0, basePitchRatio * speedMultiplier)),
          grainNow
        );

        // Calculate jittered buffer start offset
        const maxOffset = Math.max(0, this.grainBuffer.duration - grainDur);
        const randomPos = Math.random() * maxOffset;
        const grainOffset = Math.min(maxOffset, randomPos * jitterAmount);

        // Smooth grain window envelope (cosine/hann-like attack and decay)
        const env = this.ctx.createGain();
        env.gain.setValueAtTime(0.0001, grainNow);
        env.gain.linearRampToValueAtTime(0.6 * velocity, grainNow + grainDur * 0.3);
        env.gain.linearRampToValueAtTime(0.0001, grainNow + grainDur);

        src.connect(env);
        env.connect(grainGain);

        src.start(grainNow, Math.max(0, grainOffset), grainDur);
        src.stop(grainNow + grainDur + 0.02);

        setTimeout(() => {
          try {
            src.disconnect();
            env.disconnect();
          } catch {}
        }, (grainDur + 0.05) * 1000);
      };

      spawnGrain();
      grainTimer = window.setInterval(spawnGrain, intervalMs);
    }

    // --- NOTE ENVELOPE GAIN ---
    const noteGain = this.ctx.createGain();
    const peakGain = 0.85 * Math.max(0.1, Math.min(1.0, velocity)) * (this.params.hardMode ? 1.15 : 1.0);
    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.linearRampToValueAtTime(peakGain, now + Math.max(0.003, this.params.attack));
    noteGain.gain.exponentialRampToValueAtTime(
      Math.max(0.001, this.params.sustain * peakGain),
      now + Math.max(0.003, this.params.attack) + Math.max(0.01, this.params.decay)
    );

    osc1.connect(filter);
    osc2Gain.connect(filter);
    filter.connect(noteGain);

    if (this.saturationNode) {
      noteGain.connect(this.saturationNode);
    } else if (this.masterGain) {
      noteGain.connect(this.masterGain);
    }

    // Start oscillators if not purely granular or blended
    osc1.start(now);
    osc2.start(now);

    this.activeNotes.set(noteName, {
      osc1,
      osc2,
      subOsc,
      lfo,
      noteGain,
      filter,
      grainTimer,
      grainGain,
    });

    if (duration) {
      setTimeout(() => this.stopNote(noteName), duration);
    }
  }

  public stopNote(noteName: string) {
    if (!this.activeNotes.has(noteName) || !this.ctx) return;
    const voice = this.activeNotes.get(noteName);
    if (!voice) return;
    const { osc1, osc2, subOsc, lfo, noteGain, grainTimer, grainGain } = voice;
    const now = this.ctx.currentTime;

    if (grainTimer) {
      clearInterval(grainTimer);
    }

    const releaseTime = Math.max(0.05, this.params.release);
    try {
      noteGain.gain.cancelScheduledValues(now);
      noteGain.gain.setValueAtTime(Math.max(0.0001, noteGain.gain.value), now);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

      if (grainGain) {
        grainGain.gain.cancelScheduledValues(now);
        grainGain.gain.setValueAtTime(Math.max(0.0001, grainGain.gain.value), now);
        grainGain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);
      }

      setTimeout(() => {
        try {
          osc1.stop();
          osc2.stop();
          if (subOsc) subOsc.stop();
          lfo.stop();
          osc1.disconnect();
          osc2.disconnect();
          if (subOsc) subOsc.disconnect();
          lfo.disconnect();
          noteGain.disconnect();
          if (grainGain) grainGain.disconnect();
        } catch {}
      }, releaseTime * 1000 + 50);
    } catch (e) {
      console.warn('Error releasing note:', e);
    }

    this.activeNotes.delete(noteName);
  }

  // --- GRANULAR SYNTHESIS BUFFER MANAGERS ---
  public generateSyntheticGrainBuffer(type: 'metallic' | 'ambient' | 'vocal' | 'glitch' = 'metallic'): AudioBuffer {
    if (!this.ensureContext() || !this.ctx) {
      throw new Error('AudioContext unavailable');
    }
    const sampleRate = this.ctx.sampleRate;
    const duration = type === 'glitch' ? 0.8 : 2.5;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      let sL = 0;
      let sR = 0;

      if (type === 'metallic') {
        const decays = [Math.exp(-t * 2.2), Math.exp(-t * 3.5), Math.exp(-t * 5.0), Math.exp(-t * 8.0)];
        sL =
          Math.sin(2 * Math.PI * 220 * t) * 0.4 * decays[0] +
          Math.sin(2 * Math.PI * 607.2 * t) * 0.25 * decays[1] +
          Math.sin(2 * Math.PI * 1188 * t) * 0.18 * decays[2] +
          Math.sin(2 * Math.PI * 1964 * t) * 0.1 * decays[3];
        sR =
          Math.sin(2 * Math.PI * 221.5 * t) * 0.4 * decays[0] +
          Math.sin(2 * Math.PI * 611 * t) * 0.25 * decays[1] +
          Math.sin(2 * Math.PI * 1182 * t) * 0.18 * decays[2] +
          Math.sin(2 * Math.PI * 1970 * t) * 0.1 * decays[3];
      } else if (type === 'vocal') {
        const formant1 = 650 + 150 * Math.sin(2 * Math.PI * 1.2 * t);
        const formant2 = 1100 + 200 * Math.cos(2 * Math.PI * 0.8 * t);
        const carrier = Math.sin(2 * Math.PI * 130.8 * t);
        sL = (Math.sin(2 * Math.PI * formant1 * t) * 0.5 + Math.sin(2 * Math.PI * formant2 * t) * 0.3) * carrier * Math.exp(-t * 0.8);
        sR = (Math.sin(2 * Math.PI * (formant1 + 3) * t) * 0.5 + Math.sin(2 * Math.PI * (formant2 - 4) * t) * 0.3) * carrier * Math.exp(-t * 0.8);
      } else if (type === 'glitch') {
        const phase = (i % 2400) / 2400;
        const burst = Math.sin(phase * Math.PI * 16) * Math.exp(-phase * 12);
        sL = burst * (Math.random() > 0.3 ? 0.8 : -0.8);
        sR = burst * (Math.random() > 0.3 ? 0.8 : -0.8);
      } else {
        const mod = 1 + 0.03 * Math.sin(2 * Math.PI * 3.5 * t);
        sL =
          Math.sin(2 * Math.PI * 164.8 * mod * t) * 0.35 +
          Math.sin(2 * Math.PI * 329.6 * t) * 0.25 +
          Math.sin(2 * Math.PI * 493.88 * t) * 0.15;
        sR =
          Math.sin(2 * Math.PI * 165.4 * mod * t) * 0.35 +
          Math.sin(2 * Math.PI * 330.2 * t) * 0.25 +
          Math.sin(2 * Math.PI * 492.5 * t) * 0.15;
      }

      left[i] = Math.max(-0.95, Math.min(0.95, sL));
      right[i] = Math.max(-0.95, Math.min(0.95, sR));
    }

    return buffer;
  }

  public async loadGrainBuffer(file: File): Promise<{ name: string; duration: number; sampleRate: number }> {
    this.ensureContext();
    if (!this.ctx) throw new Error('AudioContext unavailable');
    const arrayBuffer = await file.arrayBuffer();
    const decoded = await this.ctx.decodeAudioData(arrayBuffer);
    this.grainBuffer = decoded;
    this.grainBufferName = file.name;
    this.grainBufferDuration = Math.round(decoded.duration * 100) / 100;
    this.params.grainBufferName = file.name;
    this.params.granularMode = true;
    this.notify();
    return {
      name: file.name,
      duration: this.grainBufferDuration,
      sampleRate: decoded.sampleRate,
    };
  }

  public loadPresetGrain(type: 'metallic' | 'ambient' | 'vocal' | 'glitch') {
    this.ensureContext();
    if (!this.ctx) return;
    this.grainBuffer = this.generateSyntheticGrainBuffer(type);
    const labels = {
      metallic: 'Resonant Metallic Bell',
      ambient: 'Ethereal Cosmic Drift',
      vocal: 'Formant Vocal Swell',
      glitch: 'Digital Granular Impulse',
    };
    this.grainBufferName = labels[type];
    this.grainBufferDuration = Math.round(this.grainBuffer.duration * 100) / 100;
    this.params.grainBufferName = labels[type];
    this.params.granularMode = true;
    this.notify();
  }

  public toggleGranularMode(enabled?: boolean) {
    const next = typeof enabled === 'boolean' ? enabled : !this.params.granularMode;
    this.setParam('granularMode', next);
    if (next && !this.grainBuffer) {
      this.loadPresetGrain('metallic');
    }
  }

  public stopAllNotes() {
    Array.from(this.activeNotes.keys()).forEach((key) => this.stopNote(key));
  }

  // Toggle Hard Turbo Mode on or off
  public toggleHardMode(enabled?: boolean) {
    const nextVal = enabled !== undefined ? enabled : !this.params.hardMode;
    this.setParam('hardMode', nextVal);
    if (nextVal) {
      this.setParam('saturationDrive', Math.max(38, this.params.saturationDrive));
      this.setParam('subOscMix', Math.max(0.55, this.params.subOscMix ?? 0));
      this.setParam('transientPunch', Math.max(50, this.params.transientPunch ?? 0));
      this.setParam('driveMode', 'neural-hard-clip');
    }
  }

  // Set active model and apply full acoustic profile
  public setActiveModel(model: any) {
    if (!model) return;
    this.activeModelId = model.id || 'HYBRID-001';
    this.activeModelName = model.name || 'Neural Vortex 1';
    this.activeModelCategory = model.category || 'Neural Spectral Decomposition';
    if (model.preset) {
      this.applyPatch(model.preset);
    }
    this.notify();
  }

  public getWaveformData(array: Uint8Array) {
    if (this.analyser) {
      this.analyser.getByteTimeDomainData(array as any);
    }
  }

  public getFrequencyData(array: Uint8Array) {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(array as any);
    }
  }

  // Audio Recording feature
  public startRecording(): boolean {
    if (!this.ensureContext() || !this.ctx || !this.masterGain) return false;
    try {
      this.mediaStreamDest = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.mediaStreamDest);
      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(this.mediaStreamDest.stream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };
      this.mediaRecorder.start();
      this.isRecording = true;
      this.notify();
      return true;
    } catch (err) {
      console.error('Recording initialization error:', err);
      return false;
    }
  }

  public stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        this.isRecording = false;
        this.notify();
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        this.recordedChunks = [];
        this.isRecording = false;
        if (this.mediaStreamDest && this.masterGain) {
          try {
            this.masterGain.disconnect(this.mediaStreamDest);
          } catch {}
        }
        this.notify();
        resolve(blob);
      };

      try {
        this.mediaRecorder.stop();
      } catch {
        this.isRecording = false;
        this.notify();
        resolve(null);
      }
    });
  }

  public applyPatch(newParams: Partial<SynthParams>) {
    Object.assign(this.params, newParams);
    if (this.ctx) {
      this.setParam('masterVolume', this.params.masterVolume);
      this.setParam('delayTime', this.params.delayTime);
      this.setParam('delayFeedbackVal', this.params.delayFeedbackVal);
      this.setParam('reverbMix', this.params.reverbMix);
      this.setParam('saturationDrive', this.params.saturationDrive);
      this.setParam('cutoff', this.params.cutoff);
      this.setParam('resonance', this.params.resonance);
    }
    this.notify();
  }

  // AI Acoustic Prompt Synthesizer
  public generatePatchFromPrompt(prompt: string): { name: string; patch: Partial<SynthParams> } {
    const p = prompt.toLowerCase();
    const patch: Partial<SynthParams> = {};
    let patchName = 'Neural Synthesis Patch';

    if (p.includes('acid') || p.includes('303') || p.includes('squelch')) {
      patchName = 'Acid 303 Resonance';
      patch.osc1Type = 'sawtooth';
      patch.osc2Type = 'square';
      patch.osc2Mix = 0.3;
      patch.osc2Detune = 12;
      patch.cutoff = 850;
      patch.resonance = 12.0;
      patch.attack = 0.01;
      patch.decay = 0.25;
      patch.sustain = 0.2;
      patch.release = 0.35;
      patch.lfoRate = 6.0;
      patch.lfoDepth = 350;
      patch.saturationDrive = 45;
      patch.delayTime = 0.22;
      patch.delayFeedbackVal = 0.35;
    } else if (p.includes('bass') || p.includes('sub') || p.includes('reese')) {
      patchName = 'Quantum Sub Reese';
      patch.osc1Type = 'sawtooth';
      patch.osc2Type = 'sawtooth';
      patch.osc1Detune = -8;
      patch.osc2Detune = 8;
      patch.osc2Mix = 0.7;
      patch.cutoff = 600;
      patch.resonance = 4.5;
      patch.attack = 0.02;
      patch.decay = 0.3;
      patch.sustain = 0.65;
      patch.release = 0.5;
      patch.saturationDrive = 35;
      patch.delayTime = 0.15;
      patch.delayFeedbackVal = 0.2;
    } else if (p.includes('pad') || p.includes('ambient') || p.includes('lush') || p.includes('drone')) {
      patchName = 'Aether Wavelet Pad';
      patch.osc1Type = 'sawtooth';
      patch.osc2Type = 'triangle';
      patch.osc1Detune = -6;
      patch.osc2Detune = 7;
      patch.osc2Mix = 0.6;
      patch.cutoff = 2200;
      patch.resonance = 2.0;
      patch.attack = 0.55;
      patch.decay = 0.8;
      patch.sustain = 0.85;
      patch.release = 2.0;
      patch.lfoRate = 0.8;
      patch.lfoDepth = 300;
      patch.saturationDrive = 14;
      patch.reverbMix = 0.55;
      patch.delayTime = 0.42;
      patch.delayFeedbackVal = 0.5;
    } else if (p.includes('bell') || p.includes('glass') || p.includes('fm') || p.includes('chime')) {
      patchName = 'Ethereal Glass Resonator';
      patch.osc1Type = 'sine';
      patch.osc2Type = 'sine';
      patch.osc2Mix = 0.85;
      patch.osc2Detune = 19;
      patch.cutoff = 5200;
      patch.resonance = 2.4;
      patch.attack = 0.005;
      patch.decay = 0.6;
      patch.sustain = 0.2;
      patch.release = 1.8;
      patch.saturationDrive = 10;
      patch.reverbMix = 0.45;
      patch.delayTime = 0.36;
      patch.delayFeedbackVal = 0.55;
    } else {
      patchName = 'Custom Neural Matrix';
      patch.osc1Type = 'sawtooth';
      patch.osc2Type = 'square';
      patch.osc2Detune = 7;
      patch.osc2Mix = 0.4;
      patch.cutoff = 2400;
      patch.resonance = 5.0;
      patch.attack = 0.05;
      patch.decay = 0.3;
      patch.sustain = 0.5;
      patch.release = 0.8;
      patch.saturationDrive = 25;
      patch.delayTime = 0.28;
      patch.delayFeedbackVal = 0.4;
      patch.reverbMix = 0.3;
    }

    this.applyPatch(patch);
    return { name: patchName, patch };
  }
}

export const audioEngine = new AdvancedAudioEngine();
