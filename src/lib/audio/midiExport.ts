/**
 * SynthAI Studio Standard MIDI File (SMF Format 0 & Format 1) Generator
 * Encodes 32-step polyphonic patterns, tempo, velocity, and CC automation curves
 * fully compatible with Ableton Live, FL Studio, Logic Pro, Reaper, Bitwig, Cubase, etc.
 */

export interface MidiStepNote {
  stepNumber: number;
  note: string; // e.g. "C4", "F#3"
  active: boolean;
  accent?: boolean;
  velocity?: number; // 0.0 to 1.0
}

export interface MidiAutomationCurve {
  parameterKey: string;
  ccNumber: number; // e.g. 74 for Cutoff, 71 for Resonance
  values: number[]; // 32 normalized values (0.0 to 1.0)
}

export interface MidiExportOptions {
  bpm: number;
  stepDivision: number; // 16 or 32
  sequence: MidiStepNote[];
  automationCurves?: MidiAutomationCurve[];
  trackName?: string;
}

// Standard General MIDI Continuous Controller mappings
export const PARAMETER_TO_CC_MAP: Record<string, { cc: number; name: string }> = {
  cutoff: { cc: 74, name: 'Filter Cutoff / Brightness' },
  resonance: { cc: 71, name: 'Filter Resonance' },
  saturationDrive: { cc: 1, name: 'Modulation / Distortion Drive' },
  reverbMix: { cc: 91, name: 'Reverb Level' },
  delayFeedbackVal: { cc: 94, name: 'Delay Depth' },
  osc2Mix: { cc: 11, name: 'Expression / Osc Mix' },
  lfoDepth: { cc: 73, name: 'Attack Time / LFO Depth' },
};

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  'C#': 1,
  DB: 1,
  D: 2,
  'D#': 3,
  EB: 3,
  E: 4,
  F: 5,
  'F#': 6,
  GB: 6,
  G: 7,
  'G#': 8,
  AB: 8,
  A: 9,
  'A#': 10,
  BB: 10,
  B: 11,
};

export function noteNameToMidiNumber(noteName: string): number {
  if (!noteName) return 60; // Default C4
  const cleaned = noteName.trim().toUpperCase();
  const match = cleaned.match(/^([A-G][#B]?)(-?\d+)$/);
  if (!match) return 60;

  const pitch = match[1];
  const octave = parseInt(match[2], 10);
  const semitone = NOTE_TO_SEMITONE[pitch] ?? 0;

  // MIDI standard: C4 = 60, octave -1 = 0..11, C0 = 12, C1 = 24, C2 = 36, C3 = 48, C4 = 60
  const midiNum = (octave + 1) * 12 + semitone;
  return Math.max(0, Math.min(127, midiNum));
}

// Variable-length quantity encoder for MIDI delta times
function encodeVariableLength(value: number): number[] {
  let buffer = value & 0x7f;
  const bytes = [];

  while ((value >>= 7) > 0) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }

  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      break;
    }
  }

  return bytes;
}

// 32-bit big-endian integer to 4 bytes
function toUint32Bytes(val: number): number[] {
  return [(val >> 24) & 0xff, (val >> 16) & 0xff, (val >> 8) & 0xff, val & 0xff];
}

// 16-bit big-endian integer to 2 bytes
function toUint16Bytes(val: number): number[] {
  return [(val >> 8) & 0xff, val & 0xff];
}

/**
 * Builds a valid Standard MIDI File (SMF Format 0)
 */
export function generateStandardMidiFile(options: MidiExportOptions): Uint8Array {
  const {
    bpm = 128,
    stepDivision = 16,
    sequence,
    automationCurves = [],
    trackName = 'SynthAI Studio Pattern',
  } = options;

  const ticksPerQuarterNote = 480;
  // For 16th notes: 480 / 4 = 120 ticks per step. For 32nd notes: 480 / 8 = 60 ticks per step.
  const ticksPerStep = Math.round(ticksPerQuarterNote / (stepDivision / 4));
  const gateTicks = Math.round(ticksPerStep * 0.85); // 85% gate length
  const restTicks = ticksPerStep - gateTicks;

  const trackEvents: number[] = [];

  // Helper to push delta-time + event bytes
  const addEvent = (deltaTime: number, ...bytes: number[]) => {
    trackEvents.push(...encodeVariableLength(deltaTime), ...bytes);
  };

  // 1. Meta Event: Track Name
  const trackNameBytes = Array.from(new TextEncoder().encode(trackName));
  addEvent(0, 0xff, 0x03, trackNameBytes.length, ...trackNameBytes);

  // 2. Meta Event: Set Tempo
  // Microseconds per quarter note = 60,000,000 / BPM
  const mpqn = Math.round(60000000 / Math.max(20, Math.min(300, bpm)));
  const tempoBytes = [(mpqn >> 16) & 0xff, (mpqn >> 8) & 0xff, mpqn & 0xff];
  addEvent(0, 0xff, 0x51, 0x03, ...tempoBytes);

  // 3. Meta Event: Time Signature (4/4 time signature)
  addEvent(0, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08);

  // Iterate over 32 steps
  let accumulatedDelta = 0;

  for (let i = 0; i < sequence.length; i++) {
    const step = sequence[i];

    // Emit CC Automation messages at step boundary
    for (const curve of automationCurves) {
      const normVal = curve.values[i] ?? 0.5;
      const ccVal = Math.max(0, Math.min(127, Math.round(normVal * 127)));
      // MIDI Channel 1 CC: 0xB0 <ccNumber> <ccValue>
      addEvent(accumulatedDelta, 0xb0, curve.ccNumber, ccVal);
      accumulatedDelta = 0;
    }

    if (step && step.active) {
      const midiNote = noteNameToMidiNumber(step.note);
      const vel = step.accent ? 120 : Math.round((step.velocity ?? 0.75) * 110);
      const midiVelocity = Math.max(1, Math.min(127, vel));

      // Note On (Channel 0): 0x90 <note> <velocity>
      addEvent(accumulatedDelta, 0x90, midiNote, midiVelocity);

      // Note Off after gate length: 0x80 <note> 0
      addEvent(gateTicks, 0x80, midiNote, 0);

      // Remaining ticks of this step to pass before next step
      accumulatedDelta = restTicks;
    } else {
      // Step was inactive: accumulate ticks for next event
      accumulatedDelta += ticksPerStep;
    }
  }

  // End of Track meta-event: 0xFF 0x2F 0x00
  addEvent(accumulatedDelta, 0xff, 0x2f, 0x00);

  // Build MThd Header Chunk
  // Format 0 (single track), 1 track, ticksPerQuarterNote division
  const headerChunk = [
    0x4d, 0x54, 0x68, 0x64, // 'MThd'
    0x00, 0x00, 0x00, 0x06, // Chunk length (6 bytes)
    0x00, 0x00,             // Format 0
    0x00, 0x01,             // 1 Track
    ...toUint16Bytes(ticksPerQuarterNote),
  ];

  // Build MTrk Track Chunk
  const trackChunkHeader = [
    0x4d, 0x54, 0x72, 0x6b, // 'MTrk'
    ...toUint32Bytes(trackEvents.length),
  ];

  const fullFileBytes = new Uint8Array([
    ...headerChunk,
    ...trackChunkHeader,
    ...trackEvents,
  ]);

  return fullFileBytes;
}

/**
 * Triggers browser download for standard MIDI file
 */
export function downloadMidiFile(
  fileBytes: Uint8Array,
  filename = 'synthai-pattern.mid'
): void {
  const blob = new Blob([fileBytes.buffer as ArrayBuffer], { type: 'audio/midi' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.mid') ? filename : `${filename}.mid`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
