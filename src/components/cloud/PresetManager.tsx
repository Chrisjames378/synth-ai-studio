import React, { useState, useEffect } from 'react';
import { audioEngine } from '../../lib/audio/AudioEngine';
import {
  Preset,
  getStoredPresets,
  savePresets,
  generateMockEmbedding,
  cosineSimilarity,
  SUPABASE_SQL_DDL,
} from '../../lib/supabase/client';
import {
  FolderArchive,
  Database,
  Search,
  Plus,
  Play,
  Trash2,
  Download,
  Upload,
  Code,
  Copy,
  Check,
  Sparkles,
  Share2,
  FileJson,
} from 'lucide-react';
import { ProjectManager } from './ProjectManager';
import { StateSnapshotManager } from './StateSnapshotManager';
import { ModelCore, ALL_MODELS } from '../../lib/models/registry';
import { SynthAIProject } from '../../lib/project/projectState';

interface PresetManagerProps {
  onPresetLoaded: (preset: Preset) => void;
  activeModel?: ModelCore;
  onModelSelect?: (model: ModelCore) => void;
  onProjectLoaded?: (project: SynthAIProject) => void;
}

export const PresetManager: React.FC<PresetManagerProps> = ({
  onPresetLoaded,
  activeModel = ALL_MODELS[0],
  onModelSelect = () => {},
  onProjectLoaded = () => {},
}) => {
  const [presets, setPresets] = useState<Preset[]>(getStoredPresets());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [vectorQuery, setVectorQuery] = useState<string>('');
  const [vectorResults, setVectorResults] = useState<(Preset & { similarityScore: number })[] | null>(null);
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'snapshot' | 'projects' | 'presets' | 'vectorSearch' | 'schema'>('snapshot');
  const [displayFormat, setDisplayFormat] = useState<'cards' | 'table'>('cards');

  // New preset form state
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [newPresetCategory, setNewPresetCategory] = useState<string>('Neural Spectral Decomposition');
  const [newPresetTags, setNewPresetTags] = useState<string>('Lead, Cyber, Custom');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    savePresets(presets);
  }, [presets]);

  const handleLoad = (p: Preset) => {
    audioEngine.applyPatch(p.parameters);
    onPresetLoaded(p);
  };

  const handleDelete = (id: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSaveCurrentPatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const tagsArray = newPresetTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const embedding = generateMockEmbedding(
      `${newPresetName} ${newPresetCategory} ${newPresetTags} ${audioEngine.params.osc1Type} ${audioEngine.params.cutoff}`
    );

    const newPreset: Preset = {
      id: `preset-${Date.now().toString().slice(-4)}`,
      name: newPresetName.trim(),
      modelCore: 'HYBRID-CUSTOM',
      category: newPresetCategory,
      tags: tagsArray,
      parameters: { ...audioEngine.params },
      isPublic: true,
      createdAt: new Date().toISOString(),
      embedding,
    };

    setPresets((prev) => [newPreset, ...prev]);
    setNewPresetName('');
    setIsSaving(false);
  };

  const handleVectorSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vectorQuery.trim()) {
      setVectorResults(null);
      return;
    }

    const queryEmbedding = generateMockEmbedding(vectorQuery);
    const scored = presets.map((p) => {
      const pEmb = p.embedding || generateMockEmbedding(`${p.name} ${p.category} ${p.tags.join(' ')}`);
      const sim = cosineSimilarity(queryEmbedding, pEmb);
      return {
        ...p,
        similarityScore: Math.round(sim * 1000) / 10,
      };
    });

    scored.sort((a, b) => b.similarityScore - a.similarityScore);
    setVectorResults(scored);
  };

  const exportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(presets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'synthai_spectral_presets.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const copySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_DDL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const filteredPresets = presets.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.tags.some((t) => t.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner and Navigation */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-neutral-800 rounded-xl text-cyan-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-100">Supabase pgvector Cloud Sound Vault</h2>
              <span className="font-mono text-xs text-cyan-400">1536-dim Vector Space</span>
            </div>
            <p className="text-xs text-neutral-400">
              Query sounds by spectral acoustic similarity or sync patches with PostgreSQL pgvector
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('snapshot')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'snapshot'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileJson className="w-3.5 h-3.5 text-cyan-400" />
            <span>State Snapshot (.json)</span>
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'projects'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5 text-cyan-400" />
            <span>Project Management</span>
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'presets'
                ? 'bg-neutral-800 text-cyan-300 border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            All Presets ({presets.length})
          </button>
          <button
            onClick={() => setActiveTab('vectorSearch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'vectorSearch'
                ? 'bg-neutral-800 text-cyan-300 border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Neural Vector Match
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'schema'
                ? 'bg-neutral-800 text-cyan-300 border border-neutral-700'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            SQL Schema & DDL
          </button>
        </div>
      </div>

      {/* Tab: Full SynthEngine State Snapshot (.json Import/Export) */}
      {activeTab === 'snapshot' && (
        <StateSnapshotManager
          activeModel={activeModel}
          onModelSelect={onModelSelect}
        />
      )}

      {/* Tab 0: Project Management (Full Workstation Session Save / Export / Import) */}
      {activeTab === 'projects' && (
        <ProjectManager
          activeModel={activeModel}
          onModelSelect={onModelSelect}
          onProjectLoaded={onProjectLoaded}
        />
      )}

      {/* Tab 1: Presets Library */}
      {activeTab === 'presets' && (
        <div className="space-y-4">
          {/* Actions & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search presets by keyword or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Grid / Table toggle */}
              <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs font-mono">
                <button
                  onClick={() => setDisplayFormat('cards')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    displayFormat === 'cards' ? 'bg-neutral-800 text-cyan-300 font-semibold' : 'text-neutral-400'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setDisplayFormat('table')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    displayFormat === 'table' ? 'bg-neutral-800 text-cyan-300 font-semibold' : 'text-neutral-400'
                  }`}
                >
                  Registry Table
                </button>
              </div>

              <button
                onClick={() => setIsSaving(!isSaving)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Save Current Patch
              </button>
              <button
                onClick={exportJson}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs font-medium rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </button>
            </div>
          </div>

          {/* Save Patch Drawer */}
          {isSaving && (
            <form
              onSubmit={handleSaveCurrentPatch}
              className="bg-neutral-900 border border-cyan-800/60 rounded-xl p-4 space-y-3"
            >
              <div className="text-xs font-semibold text-cyan-300 flex items-center justify-between">
                <span>Save Active Studio Patch to Cloud Vault</span>
                <span className="text-[10px] text-neutral-500">Includes dual oscillators, ADSR, saturation, & delay</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Preset Name (e.g. Hyperion Sub)"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  required
                  className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:border-cyan-500 focus:outline-none"
                />
                <select
                  value={newPresetCategory}
                  onChange={(e) => setNewPresetCategory(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="Neural Spectral Decomposition">Neural Spectral Decomposition</option>
                  <option value="Subtractive Quantum Hybrid">Subtractive Quantum Hybrid</option>
                  <option value="FM Generative Resonator">FM Generative Resonator</option>
                  <option value="Wavetable Wavelet Diffusion">Wavetable Wavelet Diffusion</option>
                  <option value="Analog Physical Modeling">Analog Physical Modeling</option>
                  <option value="Bio-Acoustic Granular Matrix">Bio-Acoustic Granular Matrix</option>
                </select>
                <input
                  type="text"
                  placeholder="Tags separated by commas (Lead, Punchy, Acid)"
                  value={newPresetTags}
                  onChange={(e) => setNewPresetTags(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsSaving(false)}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-xs font-semibold rounded-lg"
                >
                  Save Patch & Generate Vector
                </button>
              </div>
            </form>
          )}

          {/* Preset Cards Grid or Registry Table */}
          {displayFormat === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="bg-neutral-900 border border-neutral-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-neutral-700 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span className="font-mono text-cyan-400">{preset.modelCore}</span>
                      <span className="text-neutral-500">{preset.createdAt.split('T')[0]}</span>
                    </div>

                    <h3 className="text-sm font-semibold text-neutral-100">{preset.name}</h3>
                    <div className="text-xs text-neutral-400">{preset.category}</div>

                    {/* Clean unboxed tags with separators (anti-slop) */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-400 pt-1">
                      {preset.tags.map((tag, idx) => (
                        <React.Fragment key={tag}>
                          <span>{tag}</span>
                          {idx < preset.tags.length - 1 && (
                            <span aria-hidden="true" className="text-neutral-600">·</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Parameter summary */}
                    <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-2 rounded-lg text-[10px] font-mono text-neutral-400 border border-neutral-800/60 mt-2">
                      <div>
                        <span className="text-neutral-500">OSC1:</span> {preset.parameters.osc1Type || 'saw'}
                      </div>
                      <div>
                        <span className="text-neutral-500">CUT:</span> {preset.parameters.cutoff || 2000}Hz
                      </div>
                      <div>
                        <span className="text-neutral-500">RES:</span> {preset.parameters.resonance || 3}Q
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 mt-3 border-t border-neutral-800">
                    <button
                      onClick={() => handleLoad(preset)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Load Patch
                    </button>
                    <button
                      onClick={() => handleDelete(preset.id)}
                      className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Delete preset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Cloud Presets Registry Table (from prototype) */
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400">
                  <tr>
                    <th className="p-3">Preset Name</th>
                    <th className="p-3">Hybrid Model Core</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Updated</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                  {filteredPresets.map((row) => (
                    <tr key={row.id} className="hover:bg-neutral-900/50 transition-colors">
                      <td className="p-3 font-semibold text-neutral-100">{row.name}</td>
                      <td className="p-3 text-cyan-400">{row.modelCore}</td>
                      <td className="p-3 text-neutral-400">{row.category.split(' ')[0]}</td>
                      <td className="p-3 text-neutral-500">{row.createdAt.split('T')[0]}</td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => handleLoad(row)}
                          className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-cyan-400 border border-cyan-500/30 rounded font-semibold transition-colors"
                        >
                          Sync Load
                        </button>
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="p-1 hover:bg-rose-950/50 text-rose-400 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Neural Spectral Vector Search */}
      {activeTab === 'vectorSearch' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-neutral-100">
              1536-Dimensional Neural Spectral Embedding Search
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Describe the timbre, acoustic texture, or aesthetic you need in plain English. The cosine similarity engine
              projects your query against 1536 spectral coefficients.
            </p>
          </div>

          <form onSubmit={handleVectorSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 'Aggressive cyber bass with extreme resonant squelch and tube drive' or 'ambient glass bell pad'..."
              value={vectorQuery}
              onChange={(e) => setVectorQuery(e.target.value)}
              className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-xs font-semibold rounded-xl transition-colors shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Compute Match
            </button>
          </form>

          {/* Quick Suggestion Prompts */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
            <span className="text-neutral-500">Quick Searches:</span>
            {[
              'Heavy distorted industrial saw bass',
              'Warm shimmering atmospheric pad',
              'Metallic bell resonator with stereo delay',
              'Subtractive 303 acid filter sweep',
            ].map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => {
                  setVectorQuery(sug);
                  const queryEmbedding = generateMockEmbedding(sug);
                  const scored = presets.map((p) => {
                    const pEmb = p.embedding || generateMockEmbedding(`${p.name} ${p.category} ${p.tags.join(' ')}`);
                    const sim = cosineSimilarity(queryEmbedding, pEmb);
                    return { ...p, similarityScore: Math.round(sim * 1000) / 10 };
                  });
                  scored.sort((a, b) => b.similarityScore - a.similarityScore);
                  setVectorResults(scored);
                }}
                className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 rounded-lg hover:border-neutral-700 text-neutral-300"
              >
                {sug}
              </button>
            ))}
          </div>

          {/* Vector Results View */}
          {vectorResults && (
            <div className="space-y-3 border-t border-neutral-800 pt-4">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Vector Cosine Similarity Rankings</span>
                <span className="font-mono text-cyan-400">{vectorResults.length} Matched</span>
              </div>

              <div className="space-y-2">
                {vectorResults.map((result, idx) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800/80 rounded-xl hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 text-center font-mono text-xs font-bold text-cyan-400">
                        {result.similarityScore}%
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-neutral-200">{result.name}</div>
                        <div className="text-xs text-neutral-400 mt-0.5">
                          {result.category} · {result.tags.join(', ')}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleLoad(result)}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg border border-neutral-700 transition-colors"
                    >
                      Load Patch
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Supabase SQL Schema & DDL */}
      {activeTab === 'schema' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-neutral-100">Supabase pgvector Production Schema</h3>
              <p className="text-xs text-neutral-400 mt-1">
                PostgreSQL schema definitions with pgvector extension, RLS policies, and cosine distance SQL match function.
              </p>
            </div>
            <button
              onClick={copySql}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-medium rounded-lg transition-colors"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSql ? 'Copied SQL' : 'Copy DDL Script'}
            </button>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 font-mono text-xs text-neutral-300 overflow-x-auto max-h-96">
            <pre>{SUPABASE_SQL_DDL}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
