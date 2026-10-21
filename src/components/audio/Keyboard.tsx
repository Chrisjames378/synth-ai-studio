import React, { useState, useEffect } from 'react';
import { audioEngine } from '../../lib/audio/AudioEngine';
import { BASE_NOTES, getFrequency } from '../../lib/audio/constants';
import { ChevronLeft, ChevronRight, Waves } from 'lucide-react';

export const Keyboard: React.FC = () => {
  const [octaveShift, setOctaveShift] = useState<number>(0);
  const [sustain, setSustain] = useState<boolean>(false);
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());

  // Generate 2 full octaves (e.g., Octave 4 and 5 + C6)
  const baseOctave = 4 + octaveShift;

  const keysToRender: {
    name: string;
    freq: number;
    isBlack: boolean;
    octave: number;
    keyLabel: string;
    semitone: number;
  }[] = [];

  const keyLabelsLower = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j'];
  const keyLabelsUpper = ['k', 'o', 'l', 'p', ';', "'", ']', '\\', '', '', '', ''];

  [baseOctave, baseOctave + 1].forEach((oct, octIdx) => {
    BASE_NOTES.forEach((bn, noteIdx) => {
      const label = octIdx === 0 ? keyLabelsLower[noteIdx] : keyLabelsUpper[noteIdx];
      keysToRender.push({
        name: `${bn.name}${oct}`,
        freq: getFrequency(bn.semitone, oct),
        isBlack: bn.isBlack,
        octave: oct,
        keyLabel: label,
        semitone: bn.semitone,
      });
    });
  });
  // Add ending C key
  keysToRender.push({
    name: `C${baseOctave + 2}`,
    freq: getFrequency(0, baseOctave + 2),
    isBlack: false,
    octave: baseOctave + 2,
    keyLabel: 'Enter',
    semitone: 0,
  });

  const handleNoteOn = (noteName: string, freq: number) => {
    audioEngine.ensureContext();
    audioEngine.playNote(noteName, freq, null, 0.9);
    setActiveNotes((prev) => new Set(prev).add(noteName));
  };

  const handleNoteOff = (noteName: string) => {
    if (!sustain) {
      audioEngine.stopNote(noteName);
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(noteName);
        return next;
      });
    }
  };

  // Listen to MIDI and external note triggers
  useEffect(() => {
    const unsub = audioEngine.onNoteChange((note, isOn) => {
      setActiveNotes((prev) => {
        const next = new Set(prev);
        if (isOn) next.add(note);
        else next.delete(note);
        return next;
      });
    });
    return unsub;
  }, []);

  // Keyboard hotkey event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const key = e.key.toLowerCase();
      const matched = keysToRender.find((k) => k.keyLabel.toLowerCase() === key);
      if (matched) {
        handleNoteOn(matched.name, matched.freq);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const key = e.key.toLowerCase();
      const matched = keysToRender.find((k) => k.keyLabel.toLowerCase() === key);
      if (matched) {
        handleNoteOff(matched.name);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [keysToRender, sustain]);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col gap-4 select-none">
      {/* Keyboard Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Waves className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-neutral-200">Interactive Physical & QWERTY Keyboard</span>
          <span className="text-neutral-500">·</span>
          <span className="text-xs text-neutral-400">Low-Latency Polyphonic Touch/Key Controller</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Octave Shift */}
          <div className="flex items-center gap-1.5 bg-neutral-950 px-2 py-1 rounded-lg border border-neutral-800 text-xs">
            <span className="text-neutral-400">Octave</span>
            <button
              onClick={() => setOctaveShift((prev) => Math.max(-2, prev - 1))}
              disabled={octaveShift <= -2}
              className="p-1 hover:bg-neutral-800 rounded disabled:opacity-30 text-neutral-300"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono font-semibold text-cyan-300 w-6 text-center">
              {octaveShift > 0 ? `+${octaveShift}` : octaveShift}
            </span>
            <button
              onClick={() => setOctaveShift((prev) => Math.min(2, prev + 1))}
              disabled={octaveShift >= 2}
              className="p-1 hover:bg-neutral-800 rounded disabled:opacity-30 text-neutral-300"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sustain Pedal Toggle */}
          <button
            onClick={() => {
              if (sustain) {
                audioEngine.stopAllNotes();
                setActiveNotes(new Set());
              }
              setSustain(!sustain);
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${
              sustain
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
            }`}
          >
            Sustain {sustain ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Keys Row */}
      <div className="relative h-44 w-full flex overflow-x-auto pb-2 justify-center">
        <div className="relative flex h-36">
          {keysToRender.map((k) => {
            const isPressed = activeNotes.has(k.name);

            if (k.isBlack) {
              return (
                <button
                  key={k.name}
                  onMouseDown={() => handleNoteOn(k.name, k.freq)}
                  onMouseUp={() => handleNoteOff(k.name)}
                  onMouseLeave={() => handleNoteOff(k.name)}
                  onTouchStart={() => handleNoteOn(k.name, k.freq)}
                  onTouchEnd={() => handleNoteOff(k.name)}
                  className={`absolute z-10 w-7 h-24 rounded-b-md border transition-all ${
                    isPressed
                      ? 'bg-cyan-500 border-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.8)]'
                      : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 shadow-md'
                  }`}
                  style={{
                    // Position black key over the previous white key boundary
                    left: calculateBlackKeyOffset(k.semitone, k.octave - baseOctave),
                  }}
                >
                  <div className="absolute bottom-2 left-0 right-0 text-center font-mono text-[9px] uppercase text-neutral-400">
                    {k.keyLabel}
                  </div>
                </button>
              );
            }

            return (
              <button
                key={k.name}
                onMouseDown={() => handleNoteOn(k.name, k.freq)}
                onMouseUp={() => handleNoteOff(k.name)}
                onMouseLeave={() => handleNoteOff(k.name)}
                onTouchStart={() => handleNoteOn(k.name, k.freq)}
                onTouchEnd={() => handleNoteOff(k.name)}
                className={`relative w-11 h-36 border border-neutral-700/80 rounded-b-lg flex flex-col justify-end pb-2 items-center transition-all ${
                  isPressed
                    ? 'bg-cyan-400/90 text-neutral-950 border-cyan-300 shadow-[0_0_14px_rgba(56,189,248,0.7)]'
                    : 'bg-neutral-200 hover:bg-white text-neutral-700 shadow-sm'
                }`}
              >
                <span className="font-semibold text-[10px] tracking-tight">{k.name}</span>
                <span className="font-mono text-[9px] uppercase opacity-60 font-semibold">{k.keyLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

function calculateBlackKeyOffset(semitone: number, octaveOffset: number): string {
  // White keys are 44px wide (w-11)
  // Semitones to white key position offsets
  const whiteKeyWidth = 44;
  let baseIndex = 0;
  if (semitone === 1) baseIndex = 0.7; // C#
  else if (semitone === 3) baseIndex = 1.75; // D#
  else if (semitone === 6) baseIndex = 3.65; // F#
  else if (semitone === 8) baseIndex = 4.7; // G#
  else if (semitone === 10) baseIndex = 5.75; // A#

  const totalPixel = (octaveOffset * 7 * whiteKeyWidth) + (baseIndex * whiteKeyWidth);
  return `${totalPixel}px`;
}
