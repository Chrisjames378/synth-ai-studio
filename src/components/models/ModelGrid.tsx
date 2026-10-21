import React, { useState, useMemo } from 'react';
import { ALL_MODELS, MODEL_CATEGORIES, ModelCore } from '../../lib/models/registry';
import { ModelCard } from './ModelCard';
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight, X, Copy, Check, Terminal, Cpu } from 'lucide-react';

interface ModelGridProps {
  onLoadPreset: (model: ModelCore) => void;
}

export const ModelGrid: React.FC<ModelGridProps> = ({ onLoadPreset }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'id' | 'latency' | 'dsp' | 'accuracy'>('id');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [deployModalModel, setDeployModalModel] = useState<ModelCore | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const pageSize = 12;

  const filteredModels = useMemo(() => {
    return ALL_MODELS.filter((m) => {
      const matchCat = selectedCategory === 'All' || m.category === selectedCategory;
      const matchSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    }).sort((a, b) => {
      if (sortBy === 'latency') {
        return parseFloat(a.latency) - parseFloat(b.latency);
      }
      if (sortBy === 'dsp') {
        return parseFloat(a.dspLoad) - parseFloat(b.dspLoad);
      }
      if (sortBy === 'accuracy') {
        return parseFloat(b.accuracy) - parseFloat(a.accuracy);
      }
      return a.id.localeCompare(b.id);
    });
  }, [selectedCategory, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredModels.length / pageSize) || 1;
  const paginatedModels = filteredModels.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
        <div>
          <div className="text-[11px] text-neutral-400 font-medium">TOTAL HYBRID MODELS</div>
          <div className="text-xl font-bold font-mono text-neutral-100 mt-1">264 Active</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">Across 6 DSP Architectures</div>
        </div>
        <div>
          <div className="text-[11px] text-neutral-400 font-medium">AVERAGE BUFFER LATENCY</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">1.24 ms</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">WASM SIMD Accelerated</div>
        </div>
        <div>
          <div className="text-[11px] text-neutral-400 font-medium">MEAN DSP LOAD</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">2.18%</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">Per polyphonic voice</div>
        </div>
        <div>
          <div className="text-[11px] text-neutral-400 font-medium">SPECTRAL PRECISION</div>
          <div className="text-xl font-bold font-mono text-neutral-100 mt-1">99.46%</div>
          <div className="text-[11px] text-neutral-500 mt-0.5">Fourier Resynthesis Match</div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-neutral-900 rounded-lg border border-neutral-800 text-xs shrink-0">
          <button
            onClick={() => handleCategoryChange('All')}
            className={`px-3 py-1.5 font-medium rounded-md whitespace-nowrap transition-colors ${
              selectedCategory === 'All'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            All Families ({ALL_MODELS.length})
          </button>
          {MODEL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-3 py-1.5 font-medium rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {cat.split(' ')[0]} ({ALL_MODELS.filter((m) => m.category === cat).length})
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search model, ID, tag..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 px-2 py-1.5 rounded-lg text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-neutral-300 focus:outline-none cursor-pointer"
            >
              <option value="id" className="bg-neutral-900 text-neutral-200">Sort by ID</option>
              <option value="latency" className="bg-neutral-900 text-neutral-200">Lowest Latency</option>
              <option value="dsp" className="bg-neutral-900 text-neutral-200">Lowest DSP Load</option>
              <option value="accuracy" className="bg-neutral-900 text-neutral-200">Highest Accuracy</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Cards View */}
      {paginatedModels.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center">
          <Cpu className="w-10 h-10 text-neutral-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-neutral-200">No AI DSP Models Found</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or switch to another synthesis family.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            className="mt-4 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-xs font-medium rounded-lg text-neutral-200 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              onDeploy={(m) => setDeployModalModel(m)}
              onLoadPreset={onLoadPreset}
            />
          ))}
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-neutral-800 pt-4 text-xs text-neutral-400">
          <div>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredModels.length)} of {filteredModels.length} models
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono px-2 font-medium text-neutral-200">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Edge Deployment Modal */}
      {deployModalModel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-semibold text-neutral-100">
                  Deploy {deployModalModel.name} ({deployModalModel.id})
                </h3>
              </div>
              <button
                onClick={() => setDeployModalModel(null)}
                className="text-neutral-400 hover:text-neutral-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-neutral-300 leading-relaxed">
                Compile this neural model into an ultra-low latency WebAssembly SIMD worklet or Vercel Edge runtime.
              </p>

              {/* Code Snippet Box */}
              <div className="relative bg-neutral-950 border border-neutral-800 rounded-lg p-3 font-mono text-xs overflow-x-auto text-neutral-300">
                <pre>{`// Edge AudioWorklet Initialization for ${deployModalModel.id}
import { registerEdgeModel } from '@synthai/dsp-runtime';

export const modelInstance = registerEdgeModel({
  modelId: '${deployModalModel.id}',
  architecture: '${deployModalModel.category}',
  precision: '${deployModalModel.precision}',
  targetLatencyMs: ${parseFloat(deployModalModel.latency)},
  parameters: ${JSON.stringify(deployModalModel.preset, null, 2)}
});

// Run real-time audio block
export function processAudioBlock(inputBuffer, outputBuffer) {
  modelInstance.renderSIMD(inputBuffer, outputBuffer, 128);
}`}</pre>

                <button
                  onClick={() =>
                    copyCode(`import { registerEdgeModel } from '@synthai/dsp-runtime';
export const modelInstance = registerEdgeModel({
  modelId: '${deployModalModel.id}',
  architecture: '${deployModalModel.category}',
  precision: '${deployModalModel.precision}'
});`)
                  }
                  className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-[11px] rounded border border-neutral-700 text-neutral-200"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? 'Copied' : 'Copy Code'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                  <div className="text-[10px] text-neutral-500">WASM BINARY SIZE</div>
                  <div className="font-mono font-semibold text-neutral-200 mt-0.5">38.4 KB (gzipped)</div>
                </div>
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                  <div className="text-[10px] text-neutral-500">SIMD INSTRUCTION SET</div>
                  <div className="font-mono font-semibold text-cyan-400 mt-0.5">AVX2 / ARM NEON</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={() => setDeployModalModel(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
