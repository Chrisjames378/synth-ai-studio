import React, { useState } from 'react';
import { ModelCore } from '../../lib/models/registry';
import { audioEngine } from '../../lib/audio/AudioEngine';
import { Play, Check, Download, Zap } from 'lucide-react';

interface ModelCardProps {
  model: ModelCore;
  onDeploy: (model: ModelCore) => void;
  onLoadPreset: (model: ModelCore) => void;
}

export const ModelCard: React.FC<ModelCardProps> = ({ model, onDeploy, onLoadPreset }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const handleAudition = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioEngine.ensureContext();

    // Temporarily save current params, audition model preset, and play an expressive sequence
    const previous = { ...audioEngine.params };
    audioEngine.applyPatch(model.preset);

    setIsPlaying(true);
    // Play a melodic 3-chord flourish
    const chord = [261.63, 329.63, 392.0, 523.25];
    chord.forEach((freq, idx) => {
      setTimeout(() => {
        audioEngine.playNote(`audition-${model.id}-${idx}`, freq, 450, 0.8);
      }, idx * 120);
    });

    setTimeout(() => {
      setIsPlaying(false);
      // restore after audition if not permanently loaded
      if (!isLoaded) {
        audioEngine.applyPatch(previous);
      }
    }, 1200);
  };

  const handleLoad = (e: React.MouseEvent) => {
    e.stopPropagation();
    audioEngine.applyPatch(model.preset);
    onLoadPreset(model);
    setIsLoaded(true);
    setTimeout(() => setIsLoaded(false), 2000);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800/90 rounded-xl p-4 flex flex-col justify-between hover:border-neutral-700 transition-all duration-150">
      <div className="space-y-3">
        {/* Model ID and Category */}
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-mono text-cyan-400 font-semibold">{model.id}</span>
          <span>{model.precision}</span>
        </div>

        {/* Model Title */}
        <div>
          <h3 className="text-base font-semibold text-neutral-100 tracking-tight">{model.name}</h3>
          <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">{model.description}</p>
        </div>

        {/* Unboxed Metadata row (Frontend Design Constitution compliant - no pills) */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-400 pt-1 border-t border-neutral-800/80">
          <span>{model.category.split(' ')[0]}</span>
          <span aria-hidden="true" className="text-neutral-600">·</span>
          <span>{model.tags[0]}</span>
          <span aria-hidden="true" className="text-neutral-600">·</span>
          <span>{model.tags[1] || 'Real-time'}</span>
        </div>

        {/* Hardware & DSP Metrics */}
        <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 font-mono text-xs">
          <div>
            <div className="text-[10px] text-neutral-500 uppercase">Latency</div>
            <div className="font-semibold text-cyan-300 mt-0.5">{model.latency}</div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 uppercase">DSP Load</div>
            <div className="font-semibold text-neutral-200 mt-0.5">{model.dspLoad}</div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 uppercase">Accuracy</div>
            <div className="font-semibold text-emerald-400 mt-0.5">{model.accuracy}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-4 mt-2 border-t border-neutral-800/60">
        <button
          onClick={handleAudition}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
            isPlaying
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
              : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border-neutral-700'
          }`}
        >
          <Play className={`w-3.5 h-3.5 ${isPlaying ? 'fill-cyan-300' : ''}`} />
          {isPlaying ? 'Auditioning...' : 'Audition'}
        </button>

        <button
          onClick={handleLoad}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            isLoaded
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
              : 'bg-cyan-500 text-neutral-950 font-semibold hover:bg-cyan-400 border-cyan-400'
          }`}
          title="Load patch directly into Synthesizer"
        >
          {isLoaded ? (
            <span className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Loaded
            </span>
          ) : (
            'Load Patch'
          )}
        </button>

        <button
          onClick={() => onDeploy(model)}
          className="p-1.5 rounded-lg text-neutral-400 hover:text-cyan-300 hover:bg-neutral-800 border border-neutral-800 transition-colors"
          title="Export Edge DSP & Docker"
        >
          <Zap className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
