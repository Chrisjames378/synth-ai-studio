export interface NoteConfig {
  note: string;
  freq: number;
  isBlack: boolean;
  key: string;
  octave: number;
}

export const BASE_NOTES: { name: string; semitone: number; isBlack: boolean; key: string }[] = [
  { name: 'C', semitone: 0, isBlack: false, key: 'a' },
  { name: 'C#', semitone: 1, isBlack: true, key: 'w' },
  { name: 'D', semitone: 2, isBlack: false, key: 's' },
  { name: 'D#', semitone: 3, isBlack: true, key: 'e' },
  { name: 'E', semitone: 4, isBlack: false, key: 'd' },
  { name: 'F', semitone: 5, isBlack: false, key: 'f' },
  { name: 'F#', semitone: 6, isBlack: true, key: 't' },
  { name: 'G', semitone: 7, isBlack: false, key: 'g' },
  { name: 'G#', semitone: 8, isBlack: true, key: 'y' },
  { name: 'A', semitone: 9, isBlack: false, key: 'h' },
  { name: 'A#', semitone: 10, isBlack: true, key: 'u' },
  { name: 'B', semitone: 11, isBlack: false, key: 'j' },
];

export const getFrequency = (semitone: number, octave: number): number => {
  // A4 is 440 Hz (octave 4, semitone 9 -> MIDI 69)
  const midi = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
};

export const NOTES: NoteConfig[] = [
  { note: 'C4', freq: 261.63, isBlack: false, key: 'a', octave: 4 },
  { note: 'C#4', freq: 277.18, isBlack: true, key: 'w', octave: 4 },
  { note: 'D4', freq: 293.66, isBlack: false, key: 's', octave: 4 },
  { note: 'D#4', freq: 311.13, isBlack: true, key: 'e', octave: 4 },
  { note: 'E4', freq: 329.63, isBlack: false, key: 'd', octave: 4 },
  { note: 'F4', freq: 349.23, isBlack: false, key: 'f', octave: 4 },
  { note: 'F#4', freq: 369.99, isBlack: true, key: 't', octave: 4 },
  { note: 'G4', freq: 392.00, isBlack: false, key: 'g', octave: 4 },
  { note: 'G#4', freq: 415.30, isBlack: true, key: 'y', octave: 4 },
  { note: 'A4', freq: 440.00, isBlack: false, key: 'h', octave: 4 },
  { note: 'A#4', freq: 466.16, isBlack: true, key: 'u', octave: 4 },
  { note: 'B4', freq: 493.88, isBlack: false, key: 'j', octave: 4 },
  { note: 'C5', freq: 523.25, isBlack: false, key: 'k', octave: 5 },
  { note: 'C#5', freq: 554.37, isBlack: true, key: 'o', octave: 5 },
  { note: 'D5', freq: 587.33, isBlack: false, key: 'l', octave: 5 },
  { note: 'D#5', freq: 622.25, isBlack: true, key: 'p', octave: 5 },
  { note: 'E5', freq: 659.25, isBlack: false, key: ';', octave: 5 },
];

export const SEQUENCER_PITCHES = [
  { note: 'C5', freq: 523.25 },
  { note: 'A#4', freq: 466.16 },
  { note: 'G4', freq: 392.00 },
  { note: 'F4', freq: 349.23 },
  { note: 'D#4', freq: 311.13 },
  { note: 'D4', freq: 293.66 },
  { note: 'C4', freq: 261.63 },
  { note: 'A#3', freq: 233.08 },
];
