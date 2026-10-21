import React, { useState, useEffect } from 'react';
import { audioEngine, SynthParams } from '../../lib/audio/AudioEngine';
import {
  Sliders,
  Plus,
  Trash2,
  Sparkles,
  RotateCcw,
  Layers,
  ArrowRight,
  Maximize2,
  Gauge,
  SlidersHorizontal,
} from 'lucide-react';

export interface MacroMapping {
  id: string;
  targetParam: keyof SynthParams;
  minVal: number;
  maxVal: number;
  enabled: boolean;
}

export interface MacroUnit {
  id: string;
  name: string;
  color: string;
  value: number; // 0.0 to 1.0
  mappings: MacroMapping[];
}

const AVAILABLE_PARAMS: {
  key: keyof SynthParams;
  label: string;
  unit: string;
  defaultMin: number;
  defaultMax: number;
  format: (v: number) => string;
}[] = [
  {
    key: 'cutoff',
    label: 'Filter Cutoff',
    unit: 'Hz',
    defaultMin: 200,
    defaultMax: 8000,
    format: (v) => `${Math.round(v)} Hz`,
  },
  {
    key: 'saturationDrive',
    label: 'Tube Saturation',
    unit: '',
    defaultMin: 5,
    defaultMax: 60,
    format: (v) => `${Math.round(v)}`,
  },
  {
    key: 'resonance',
    label: 'Filter Resonance (Q)',
    unit: 'Q',
    defaultMin: 1.0,
    defaultMax: 15.0,
    format: (v) => v.toFixed(1),
  },
  {
    key: 'delayFeedbackVal',
    label: 'Delay Feedback',
    unit: '%',
    defaultMin: 0.1,
    defaultMax: 0.75,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: 'reverbMix',
    label: 'Convolution Reverb',
    unit: '%',
    defaultMin: 0.05,
    defaultMax: 0.8,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: 'lfoDepth',
    label: 'LFO Filter Depth',
    unit: 'Hz',
    defaultMin: 20,
    defaultMax: 600,
    format: (v) => `${Math.round(v)} Hz`,
  },
  {
    key: 'osc2Mix',
    label: 'Oscillator 2 Mix',
    unit: '%',
    defaultMin: 0.1,
    defaultMax: 0.9,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: 'attack',
    label: 'Envelope Attack',
    unit: 's',
    defaultMin: 0.01,
    defaultMax: 0.8,
    format: (v) => `${Math.round(v * 1000)} ms`,
  },
  {
    key: 'release',
    label: 'Envelope Release',
    unit: 's',
    defaultMin: 0.1,
    defaultMax: 2.5,
    format: (v) => `${Math.round(v * 1000)} ms`,
  },
];

const INITIAL_MACROS: MacroUnit[] = [
  {
    id: 'macro-1',
    name: 'Acid Squelch & Drive',
    color: '#38bdf8', // Cyan
    value: 0.45,
    mappings: [
      {
        id: 'm1-1',
        targetParam: 'cutoff',
        minVal: 400,
        maxVal: 6500,
        enabled: true,
      },
      {
        id: 'm1-2',
        targetParam: 'saturationDrive',
        minVal: 8,
        maxVal: 55,
        enabled: true,
      },
      {
        id: 'm1-3',
        targetParam: 'resonance',
        minVal: 2.5,
        maxVal: 14.0,
        enabled: true,
      },
    ],
  },
  {
    id: 'macro-2',
    name: 'Cosmic Space Reverb',
    color: '#818cf8', // Indigo
    value: 0.35,
    mappings: [
      {
        id: 'm2-1',
        targetParam: 'reverbMix',
        minVal: 0.1,
        maxVal: 0.75,
        enabled: true,
      },
      {
        id: 'm2-2',
        targetParam: 'delayFeedbackVal',
        minVal: 0.2,
        maxVal: 0.65,
        enabled: true,
      },
      {
        id: 'm2-3',
        targetParam: 'cutoff',
        minVal: 1200,
        maxVal: 3800,
        enabled: true,
      },
    ],
  },
  {
    id: 'macro-3',
    name: 'Aggressive Sub Detune',
    color: '#f59e0b', // Amber
    value: 0.2,
    mappings: [
      {
        id: 'm3-1',
        targetParam: 'osc2Mix',
        minVal: 0.2,
        maxVal: 0.85,
        enabled: true,
      },
      {
        id: 'm3-2',
        targetParam: 'saturationDrive',
        minVal: 12,
        maxVal: 48,
        enabled: true,
      },
    ],
  },
  {
    id: 'macro-4',
    name: 'Pluck to Evolving Drone',
    color: '#34d399', // Emerald
    value: 0.1,
    mappings: [
      {
        id: 'm4-1',
        targetParam: 'attack',
        minVal: 0.01,
        maxVal: 0.7,
        enabled: true,
      },
      {
        id: 'm4-2',
        targetParam: 'release',
        minVal: 0.2,
        maxVal: 2.2,
        enabled: true,
      },
      {
        id: 'm4-3',
        targetParam: 'lfoDepth',
        minVal: 40,
        maxVal: 450,
        enabled: true,
      },
    ],
  },
];

export const MacroControls: React.FC = () => {
  const [macros, setMacros] = useState<MacroUnit[]>(() => {
    try {
      const raw = localStorage.getItem('synthai_active_macros_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_MACROS;
  });
  const [expandedMacroId, setExpandedMacroId] = useState<string | null>(null);

  // Apply macro changes to synth parameters
  const applyMacroValue = (macro: MacroUnit, newVal: number) => {
    macro.mappings.forEach((mapping) => {
      if (!mapping.enabled) return;
      const targetParamConfig = AVAILABLE_PARAMS.find((p) => p.key === mapping.targetParam);
      if (!targetParamConfig) return;

      // Linear interpolation between mapping min and max
      const calculatedVal = mapping.minVal + newVal * (mapping.maxVal - mapping.minVal);
      audioEngine.setParam(mapping.targetParam, calculatedVal as any);
    });
  };

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('synthai_active_macros_state', JSON.stringify(macros));
    } catch {}
  }, [macros]);

  // Listen for global project load events
  useEffect(() => {
    const handleProjectLoad = (e: any) => {
      const project = e.detail;
      if (project && Array.isArray(project.macroUnits)) {
        setMacros(project.macroUnits);
        // Apply values
        project.macroUnits.forEach((m: MacroUnit) => {
          applyMacroValue(m, m.value ?? 0.5);
        });
      }
    };

    window.addEventListener('synthai:load-project', handleProjectLoad);
    return () => window.removeEventListener('synthai:load-project', handleProjectLoad);
  }, []);

  const handleMacroSliderChange = (macroId: string, newVal: number) => {
    setMacros((prev) =>
      prev.map((m) => {
        if (m.id === macroId) {
          const updated = { ...m, value: newVal };
          applyMacroValue(updated, newVal);
          return updated;
        }
        return m;
      })
    );
  };

  const handleAddMapping = (macroId: string) => {
    setMacros((prev) =>
      prev.map((m) => {
        if (m.id === macroId) {
          const newMap: MacroMapping = {
            id: `map-${Date.now().toString().slice(-4)}`,
            targetParam: 'cutoff',
            minVal: 300,
            maxVal: 5000,
            enabled: true,
          };
          return { ...m, mappings: [...m.mappings, newMap] };
        }
        return m;
      })
    );
  };

  const handleRemoveMapping = (macroId: string, mapId: string) => {
    setMacros((prev) =>
      prev.map((m) => {
        if (m.id === macroId) {
          return {
            ...m,
            mappings: m.mappings.filter((map) => map.id !== mapId),
          };
        }
        return m;
      })
    );
  };

  const handleUpdateMapping = (
    macroId: string,
    mapId: string,
    updates: Partial<MacroMapping>
  ) => {
    setMacros((prev) =>
      prev.map((m) => {
        if (m.id === macroId) {
          const updatedMappings = m.mappings.map((map) => {
            if (map.id === mapId) {
              const updated = { ...map, ...updates };
              // If param changed, update default range
              if (updates.targetParam && updates.targetParam !== map.targetParam) {
                const conf = AVAILABLE_PARAMS.find((p) => p.key === updates.targetParam);
                if (conf) {
                  updated.minVal = conf.defaultMin;
                  updated.maxVal = conf.defaultMax;
                }
              }
              return updated;
            }
            return map;
          });
          const updatedMacro = { ...m, mappings: updatedMappings };
          applyMacroValue(updatedMacro, updatedMacro.value);
          return updatedMacro;
        }
        return m;
      })
    );
  };

  const handleUpdateMacroName = (macroId: string, newName: string) => {
    setMacros((prev) =>
      prev.map((m) => (m.id === macroId ? { ...m, name: newName } : m))
    );
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col gap-5">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-800 rounded-lg text-cyan-400">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-100">Multi-Destination Macro Matrix</h2>
              <span className="text-xs font-mono text-cyan-400">4 Hardware Racks</span>
            </div>
            <p className="text-xs text-neutral-400">
              Bind a single UI control to multiple parameters simultaneously with custom min/max ranges and polarities
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => {
              // Apply all current macro values to synth
              macros.forEach((m) => applyMacroValue(m, m.value));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded-lg border border-neutral-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Sync All Macros
          </button>
        </div>
      </div>

      {/* 4 Macro Knobs / Slider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {macros.map((macro, idx) => {
          const isExpanded = expandedMacroId === macro.id;

          return (
            <div
              key={macro.id}
              className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between space-y-4 hover:border-neutral-700 transition-all"
            >
              {/* Macro Title & Label */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] font-bold text-neutral-400">
                    MACRO {idx + 1}
                  </span>
                  <span
                    className="font-mono font-bold text-xs"
                    style={{ color: macro.color }}
                  >
                    {Math.round(macro.value * 100)}%
                  </span>
                </div>

                <input
                  type="text"
                  value={macro.name}
                  onChange={(e) => handleUpdateMacroName(macro.id, e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-neutral-100 focus:outline-none focus:border-b border-cyan-500 py-0.5"
                />

                <div className="text-[11px] text-neutral-500">
                  {macro.mappings.filter((m) => m.enabled).length} parameters linked
                </div>
              </div>

              {/* Master Macro Slider */}
              <div className="space-y-1.5">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={macro.value}
                  onChange={(e) =>
                    handleMacroSliderChange(macro.id, parseFloat(e.target.value))
                  }
                  className="w-full"
                  style={{ accentColor: macro.color }}
                />
              </div>

              {/* Mappings Summary Chips */}
              <div className="space-y-1.5 bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-850 text-xs">
                <div className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider flex justify-between">
                  <span>Linked Targets</span>
                  <button
                    onClick={() =>
                      setExpandedMacroId(isExpanded ? null : macro.id)
                    }
                    className="text-cyan-400 hover:text-cyan-300 font-normal"
                  >
                    {isExpanded ? 'Hide Map' : 'Edit Mapping'}
                  </button>
                </div>

                <div className="space-y-1">
                  {macro.mappings.map((m) => {
                    const conf = AVAILABLE_PARAMS.find(
                      (p) => p.key === m.targetParam
                    );
                    const curVal =
                      m.minVal + macro.value * (m.maxVal - m.minVal);

                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between text-[11px] text-neutral-300"
                      >
                        <span className="truncate pr-1 text-neutral-400">
                          {conf?.label}
                        </span>
                        <span className="font-mono font-semibold text-neutral-200">
                          {conf?.format(curVal)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Mapping Editor Drawer */}
      {expandedMacroId && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4 animate-in fade-in">
          {(() => {
            const macro = macros.find((m) => m.id === expandedMacroId);
            if (!macro) return null;

            return (
              <>
                <div className="flex items-center justify-between border-b border-neutral-850 pb-3">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal
                      className="w-4 h-4"
                      style={{ color: macro.color }}
                    />
                    <h3 className="text-sm font-semibold text-neutral-100">
                      Configure Destinations for {macro.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAddMapping(macro.id)}
                      className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Parameter Destination
                    </button>
                    <button
                      onClick={() => setExpandedMacroId(null)}
                      className="px-3 py-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-medium rounded-lg"
                    >
                      Done
                    </button>
                  </div>
                </div>

                {/* Destinations List */}
                <div className="space-y-3">
                  {macro.mappings.map((mapping) => {
                    const paramConf = AVAILABLE_PARAMS.find(
                      (p) => p.key === mapping.targetParam
                    );

                    return (
                      <div
                        key={mapping.id}
                        className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-neutral-900 border border-neutral-800 p-3 rounded-lg text-xs"
                      >
                        {/* Parameter Select */}
                        <div className="md:col-span-4">
                          <label className="text-[10px] text-neutral-500 block mb-1">
                            DESTINATION PARAMETER
                          </label>
                          <select
                            value={mapping.targetParam}
                            onChange={(e) =>
                              handleUpdateMapping(macro.id, mapping.id, {
                                targetParam: e.target.value as keyof SynthParams,
                              })
                            }
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-cyan-500 font-medium"
                          >
                            {AVAILABLE_PARAMS.map((p) => (
                              <option key={p.key} value={p.key}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Min Value */}
                        <div className="md:col-span-3">
                          <div className="flex justify-between text-[10px] text-neutral-500 mb-1">
                            <span>MIN (AT 0%)</span>
                            <span className="font-mono text-neutral-300">
                              {paramConf?.format(mapping.minVal)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={paramConf?.defaultMin ?? 0}
                            max={paramConf?.defaultMax ?? 100}
                            step={
                              (paramConf?.defaultMax ?? 100) > 100 ? 10 : 0.01
                            }
                            value={mapping.minVal}
                            onChange={(e) =>
                              handleUpdateMapping(macro.id, mapping.id, {
                                minVal: parseFloat(e.target.value),
                              })
                            }
                            className="w-full"
                          />
                        </div>

                        {/* Max Value */}
                        <div className="md:col-span-3">
                          <div className="flex justify-between text-[10px] text-neutral-500 mb-1">
                            <span>MAX (AT 100%)</span>
                            <span className="font-mono text-neutral-300">
                              {paramConf?.format(mapping.maxVal)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={paramConf?.defaultMin ?? 0}
                            max={paramConf?.defaultMax ?? 100}
                            step={
                              (paramConf?.defaultMax ?? 100) > 100 ? 10 : 0.01
                            }
                            value={mapping.maxVal}
                            onChange={(e) =>
                              handleUpdateMapping(macro.id, mapping.id, {
                                maxVal: parseFloat(e.target.value),
                              })
                            }
                            className="w-full"
                          />
                        </div>

                        {/* Invert & Remove Button */}
                        <div className="md:col-span-2 flex items-center justify-end gap-2 pt-3 md:pt-0">
                          <button
                            type="button"
                            onClick={() => {
                              // Swap min and max to invert polarity
                              handleUpdateMapping(macro.id, mapping.id, {
                                minVal: mapping.maxVal,
                                maxVal: mapping.minVal,
                              });
                            }}
                            className="px-2 py-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded border border-neutral-700 text-[11px]"
                            title="Invert polarity (e.g. increase macro reduces parameter)"
                          >
                            Invert
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveMapping(macro.id, mapping.id)
                            }
                            className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 rounded transition-colors"
                            title="Remove mapping"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};
