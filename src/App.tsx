import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { audioEngine } from './lib/audio/AudioEngine';
import { ALL_MODELS, ModelCore } from './lib/models/registry';
import { Preset } from './lib/supabase/client';
import { UserSubscriptionState, getStoredSubscription, saveSubscription } from './lib/paypal/client';
import { Header, ActiveTab } from './components/ui/Header';
import { Visualizer } from './components/audio/Visualizer';
import { SynthControls } from './components/audio/SynthControls';
import { MacroControls } from './components/audio/MacroControls';
import { Sequencer32Step } from './components/audio/Sequencer32Step';
import { ChordIntelligence } from './components/audio/ChordIntelligence';
import { AutomationLane } from './components/audio/AutomationLane';
import { Keyboard } from './components/audio/Keyboard';
import { ModelGrid } from './components/models/ModelGrid';
import { PresetManager } from './components/cloud/PresetManager';
import { PricingView } from './components/saas/PricingView';
import { DeployView } from './components/deploy/DeployView';
import { AuthModal } from './components/auth/AuthModal';
import {
  Volume2,
  Disc,
  Check,
  Cpu,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Radio,
  Zap,
  Play,
  Download,
} from 'lucide-react';
import {
  generateStandardMidiFile,
  downloadMidiFile,
  PARAMETER_TO_CC_MAP,
  MidiAutomationCurve,
} from './lib/audio/midiExport';
import { getSavedActiveAutomation } from './lib/project/projectState';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('studio');
  const [activeModel, setActiveModel] = useState<ModelCore>(ALL_MODELS[0]);
  const [subState, setSubState] = useState<UserSubscriptionState>(getStoredSubscription());
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isAudioRunning, setIsAudioRunning] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const [sequencerStep, setSequencerStep] = useState<number>(0);
  const [isSequencerPlaying, setIsSequencerPlaying] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (audioEngine.ctx && audioEngine.ctx.state === 'running') {
      setIsAudioRunning(true);
    }
  }, []);

  // Recording timer
  useEffect(() => {
    let interval: number | null = null;
    if (isRecording) {
      interval = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleStartAudio = () => {
    audioEngine.ensureContext();
    setIsAudioRunning(true);
    showToast('WebAudio SIMD DSP Engine Active');
  };

  const handleToggleRecord = async () => {
    if (!isRecording) {
      const ok = audioEngine.startRecording();
      if (ok) {
        setIsRecording(true);
        showToast('Recording session audio...');
      }
    } else {
      const blob = await audioEngine.stopRecording();
      setIsRecording(false);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `synthai-recording-${Date.now().toString().slice(-6)}.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('Audio recording exported successfully!');
      }
    }
  };

  const handlePanicStop = () => {
    audioEngine.stopAllNotes();
    showToast('All audio voices silenced');
  };

  const handleLoadModelPreset = (model: ModelCore) => {
    setActiveModel(model);
    audioEngine.setActiveModel(model);
    showToast(`Loaded ${model.name} (${model.id}) into Synthesizer`);
  };

  const handleCycleModel = (direction: 'next' | 'prev') => {
    const currentIndex = ALL_MODELS.findIndex((m) => m.id === activeModel.id);
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0) nextIndex = ALL_MODELS.length - 1;
    if (nextIndex >= ALL_MODELS.length) nextIndex = 0;
    const nextModel = ALL_MODELS[nextIndex];
    handleLoadModelPreset(nextModel);
  };

  const handleAuditionActiveModel = () => {
    audioEngine.ensureContext();
    const chord = [261.63, 329.63, 392.0, 523.25];
    chord.forEach((freq, idx) => {
      setTimeout(() => {
        audioEngine.playNote(`hud-audition-${idx}`, freq, 450, 0.85);
      }, idx * 110);
    });
  };

  const handlePresetLoaded = (preset: Preset) => {
    showToast(`Applied preset: ${preset.name}`);
  };

  const handleSwitchTier = (tier: 'creator' | 'studio_pro' | 'enterprise') => {
    const updated: UserSubscriptionState = {
      ...subState,
      tier,
      paypalSubscriptionId: tier === 'creator' ? null : `I-SUB-${Date.now().toString().slice(-6)}`,
    };
    setSubState(updated);
    saveSubscription(updated);
    showToast(`Switched account tier to ${tier.replace('_', ' ').toUpperCase()}`);
  };

  // Export 32-Step Pattern + CC Automation as a Standard MIDI file blob (.mid)
  const handleExportStudioMidi = () => {
    let sequence: any[] = [];
    let bpm = 128;
    let stepDivision = 16;

    try {
      const raw = localStorage.getItem('synthai_active_sequencer_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.sequence) && parsed.sequence.length > 0) {
          sequence = parsed.sequence;
          bpm = parsed.bpm || 128;
          stepDivision = parsed.stepDivision || 16;
        }
      }
    } catch {}

    if (sequence.length === 0) {
      const defaultNotes = [
        'C4', 'C4', 'G4', 'C4', 'D4', 'F4', 'E4', 'C4',
        'A4', 'G4', 'C5', 'A#4', 'F4', 'D4', 'G4', 'C4',
      ];
      for (let i = 0; i < 32; i++) {
        sequence.push({
          stepNumber: i + 1,
          note: defaultNotes[i % 16],
          active: i % 2 === 0,
          accent: i % 8 === 0,
          velocity: i % 8 === 0 ? 1.0 : 0.7,
        });
      }
    }

    const savedAuto = getSavedActiveAutomation();
    const automationCurves: MidiAutomationCurve[] = [];
    if (savedAuto && savedAuto.curves) {
      Object.entries(savedAuto.curves).forEach(([paramKey, vals]) => {
        const ccDef = PARAMETER_TO_CC_MAP[paramKey];
        if (ccDef && Array.isArray(vals)) {
          automationCurves.push({
            parameterKey: paramKey,
            ccNumber: ccDef.cc,
            values: vals,
          });
        }
      });
    }

    const midiBytes = generateStandardMidiFile({
      bpm,
      stepDivision,
      sequence,
      automationCurves,
      trackName: `${activeModel.name} 32-Step (${bpm} BPM)`,
    });

    downloadMidiFile(
      midiBytes,
      `synthai_32step_${activeModel.id.toLowerCase()}_${bpm}bpm.mid`
    );

    const activeCount = sequence.filter((s: any) => s.active).length;
    showToast(`Exported 32-Step MIDI File (${bpm} BPM, ${activeCount} active steps with CC automation)!`);
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-neutral-100 flex flex-col font-sans">
      {/* Top Bar Contract (Wordmark - Links - Primary Action) */}
      <Header
        activeTab={activeTab}
        onSelectTab={(t) => setActiveTab(t)}
        subState={subState}
        onOpenAccount={() => setIsAuthOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Studio Workspace View */}
        {activeTab === 'studio' && (
          <div className="space-y-6">
            {/* Audio Engine Transport Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 px-4 py-3 rounded-xl text-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleStartAudio}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    isAudioRunning
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-semibold'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isAudioRunning ? 'Audio DSP Live' : 'Enable WebAudio'}</span>
                </button>

                <div className="hidden sm:flex items-center gap-2 text-neutral-400 font-mono">
                  <span>SAMPLE RATE: 48.0 kHz</span>
                  <span>·</span>
                  <span>BUFFER: 128 SIMD</span>
                </div>
              </div>

              {/* MIDI Export, Recording & Voice Silencer */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportStudioMidi}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 hover:text-cyan-300 border border-neutral-700 hover:border-cyan-500/50 rounded-lg font-medium transition-colors"
                  title="Parse and export current 32-step sequence into a standard MIDI (.mid) file blob"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Export 32-Step MIDI (.mid)</span>
                </button>

                <button
                  onClick={handleToggleRecord}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                    isRecording
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                      : 'bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border-neutral-700'
                  }`}
                >
                  <Disc className={`w-3.5 h-3.5 ${isRecording ? 'text-rose-400' : ''}`} />
                  <span>
                    {isRecording ? `REC ${recordDuration}s (Click to Save)` : 'Record WAV'}
                  </span>
                </button>

                <button
                  onClick={handlePanicStop}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-neutral-100 border border-neutral-700 rounded-lg font-medium transition-colors"
                  title="Silence all active oscillator voices"
                >
                  Panic / Mute
                </button>
              </div>
            </div>

            {/* Top Grid: Visualizer + Active Model HUD (from prototype) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Audio Visualizer Engine (2 cols) */}
              <div className="lg:col-span-2">
                <Visualizer />
              </div>

              {/* Active Neural Model Panel (1 col) */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-neutral-200 tracking-wide uppercase flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Active Hybrid Core</span>
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          audioEngine.toggleHardMode();
                          showToast(audioEngine.params.hardMode ? 'Hard Turbo Mode ENGAGED' : 'Clean DSP Mode');
                        }}
                        className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-mono font-semibold transition-colors border ${
                          audioEngine.params.hardMode
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                        }`}
                        title="Toggle Hard Turbo Mode"
                      >
                        <Zap className="w-2.5 h-2.5 fill-current" />
                        <span>{audioEngine.params.hardMode ? 'HARD TURBO' : 'CLEAN'}</span>
                      </button>
                      <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800/80 px-2 py-0.5 rounded font-mono font-medium">
                        {activeModel.id}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 mb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-neutral-100">{activeModel.name}</div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCycleModel('prev')}
                          className="p-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800"
                          title="Previous Model"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCycleModel('next')}
                          className="p-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded border border-neutral-800"
                          title="Next Model"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-neutral-400">{activeModel.category}</div>
                    <div className="flex items-center justify-between pt-2 border-t border-neutral-850 text-xs text-neutral-400 font-mono">
                      <span>Drive: <strong className="text-amber-400 font-normal">{audioEngine.params.driveMode?.replace('-', ' ')}</strong></span>
                      <span className="text-emerald-400 font-medium">{activeModel.accuracy} Match</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-neutral-950 p-2.5 rounded-lg border border-neutral-850 text-neutral-300 mb-3">
                    <div>
                      <div className="text-[10px] text-neutral-500 uppercase">Sub-Bass Punch</div>
                      <div className="font-semibold text-cyan-400 mt-0.5">
                        {Math.round((audioEngine.params.subOscMix ?? 0.5) * 100)}% ({audioEngine.params.subOscOctave || -1} Oct)
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-500 uppercase">Transient Snap</div>
                      <div className="font-semibold text-amber-300 mt-0.5">{audioEngine.params.transientPunch ?? 45}%</div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-800 flex items-center gap-2">
                  <button
                    onClick={handleAuditionActiveModel}
                    className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 hover:border-neutral-600 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    title="Audition model's signature chord flourish"
                  >
                    <Play className="w-3 h-3 fill-current text-cyan-400" />
                    <span>Audition</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('models')}
                    className="flex-[1.5] py-2 bg-neutral-800 hover:bg-neutral-750 text-cyan-300 border border-neutral-700 hover:border-cyan-500/40 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>264+ Models</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                </div>
              </div>
            </div>

            {/* Multi-Destination Macro Control Matrix */}
            <MacroControls />

            {/* Modular Synthesizer Controls */}
            <SynthControls />

            {/* Gemini Neural Chord Intelligence */}
            <ChordIntelligence
              activeModel={activeModel}
              onApplyProgression={(progression) => {
                // Apply harmonic progression to sequencer via project load event
                window.dispatchEvent(
                  new CustomEvent('synthai:load-project', {
                    detail: {
                      sequencer: {
                        bpm: progression.suggestedBpm,
                        stepDivision: 16,
                        sequence: progression.sequence32,
                      },
                    },
                  })
                );

                // Optionally apply suggested saturation or resonance if available
                if (progression.automationTips?.saturationDrive) {
                  audioEngine.setParam('saturationDrive', progression.automationTips.saturationDrive);
                }
                if (progression.automationTips?.resonance) {
                  audioEngine.setParam('resonance', progression.automationTips.resonance);
                }

                showToast(`Loaded ${progression.title} (${progression.suggestedBpm} BPM) into 32-Step Sequencer!`);
              }}
            />

            {/* 32-Step Polyphonic Sequencer */}
            <Sequencer32Step
              onStepTrigger={(step) => setSequencerStep(step)}
              onPlayStateChange={(playing) => setIsSequencerPlaying(playing)}
            />

            {/* 32-Step Dynamic Parameter Automation Lane */}
            <AutomationLane
              currentStep={sequencerStep}
              isPlaying={isSequencerPlaying}
            />

            {/* Interactive Physical & QWERTY Keyboard */}
            <Keyboard />
          </div>
        )}

        {/* 264+ AI Models Directory */}
        {activeTab === 'models' && (
          <ModelGrid onLoadPreset={handleLoadModelPreset} />
        )}

        {/* Cloud Presets & Project Management Vault */}
        {activeTab === 'cloud' && (
          <PresetManager
            onPresetLoaded={handlePresetLoaded}
            activeModel={activeModel}
            onModelSelect={(m) => {
              setActiveModel(m);
              showToast(`Switched active neural model to ${m.name}`);
            }}
            onProjectLoaded={(project) => {
              const matched = ALL_MODELS.find((m) => m.id === project.model?.id);
              if (matched) setActiveModel(matched);
              showToast(`Restored full project session: "${project.name}"`);
            }}
          />
        )}

        {/* Edge Deploy & WASM Benchmark */}
        {activeTab === 'deploy' && <DeployView />}

        {/* SaaS Pricing & PayPal Subscriptions */}
        {activeTab === 'saas' && (
          <PricingView
            onPlanChanged={(tier) => {
              setSubState(getStoredSubscription());
              showToast(`Workspace Plan updated to ${tier.toUpperCase()}`);
            }}
          />
        )}
      </main>

      {/* Account & Credentials Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        subState={subState}
        onSwitchTier={handleSwitchTier}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border border-cyan-500/60 text-cyan-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-neutral-850 px-6 py-6 mt-12 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>SynthAI Studio · Neural Audio Synthesis & Edge DSP Engine</span>
          <div className="flex items-center gap-4 text-neutral-400">
            <button onClick={() => setActiveTab('studio')} className="hover:text-neutral-200">
              Studio
            </button>
            <button onClick={() => setActiveTab('models')} className="hover:text-neutral-200">
              Models ({ALL_MODELS.length})
            </button>
            <button onClick={() => setActiveTab('cloud')} className="hover:text-neutral-200">
              pgvector
            </button>
            <button onClick={() => setActiveTab('saas')} className="hover:text-neutral-200">
              Licensing
            </button>
          </div>
        </div>
      </footer>
      <Analytics />
    </div>
  );
}
