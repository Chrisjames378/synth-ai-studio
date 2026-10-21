import React, { useState, useEffect, useRef } from 'react';
import { audioEngine, SynthParams } from '../../lib/audio/AudioEngine';
import { ModelCore, ALL_MODELS } from '../../lib/models/registry';
import {
  SynthAIProject,
  getStoredProjects,
  saveProjects,
  exportProjectFile,
  validateProjectJson,
  getSavedActiveMacros,
  getSavedActiveAutomation,
  FACTORY_PROJECTS,
} from '../../lib/project/projectState';
import {
  FolderArchive,
  Save,
  Download,
  Upload,
  Sparkles,
  Layers,
  Sliders,
  TrendingUp,
  Music,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  FileText,
  Clock,
  Tag,
  Search,
  CheckCircle2,
} from 'lucide-react';

interface ProjectManagerProps {
  activeModel: ModelCore;
  onModelSelect: (model: ModelCore) => void;
  onProjectLoaded?: (project: SynthAIProject) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  activeModel,
  onModelSelect,
  onProjectLoaded,
}) => {
  const [projects, setProjects] = useState<SynthAIProject[]>(getStoredProjects());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // New Project Form
  const [projectName, setProjectName] = useState<string>('');
  const [projectDesc, setProjectDesc] = useState<string>('');
  const [projectAuthor, setProjectAuthor] = useState<string>('Producer');
  const [projectTags, setProjectTags] = useState<string>('Electronic, Cyber, Custom');
  const [isSavingFormOpen, setIsSavingFormOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  const showNotification = (msg: string) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 3500);
  };

  // Build the live snapshot of the entire synth state
  const getCurrentLiveProjectState = (): SynthAIProject => {
    // 1. Synth parameters from audio engine
    const currentParams = { ...audioEngine.params };

    // 2. Active macros from storage / state
    const currentMacros = getSavedActiveMacros() || [];

    // 3. Active automation lanes from storage / state
    const currentAutomation = getSavedActiveAutomation() || {
      selectedTargetKey: 'cutoff',
      isEnabled: true,
      smoothInterpolation: true,
      curves: {},
    };

    // 4. Active sequencer from storage
    let sequencerData = undefined;
    try {
      const rawSeq = localStorage.getItem('synthai_active_sequencer_state');
      if (rawSeq) {
        sequencerData = JSON.parse(rawSeq);
      }
    } catch {}

    const tagsArray = projectTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    return {
      id: `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      name: projectName.trim() || `${activeModel.name} Session`,
      description: projectDesc.trim() || `Synthesizer workspace state based on ${activeModel.name}.`,
      author: projectAuthor.trim() || 'Producer',
      version: '2.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: tagsArray.length > 0 ? tagsArray : ['SynthAI', activeModel.category.split(' ')[0]],
      model: {
        id: activeModel.id,
        name: activeModel.name,
        category: activeModel.category,
        precision: activeModel.precision,
      },
      synthParams: currentParams,
      macroUnits: currentMacros,
      automation: currentAutomation,
      sequencer: sequencerData,
    };
  };

  // Save current synth state into local vault
  const handleSaveToVault = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    const newProject = getCurrentLiveProjectState();
    setProjects((prev) => [newProject, ...prev]);
    setProjectName('');
    setProjectDesc('');
    setIsSavingFormOpen(false);
    showNotification(`Project "${newProject.name}" saved to Local Vault!`);
  };

  // Export current live synth state directly to JSON file
  const handleExportCurrentState = () => {
    const liveProject = getCurrentLiveProjectState();
    exportProjectFile(liveProject);
    showNotification(`Exported "${liveProject.name}" as JSON file.`);
  };

  // Export specific saved project to JSON file
  const handleExportProject = (project: SynthAIProject) => {
    exportProjectFile(project);
    showNotification(`Downloaded "${project.name}.json"`);
  };

  // Load a project into active synthesizer state
  const handleLoadProject = (project: SynthAIProject) => {
    const matchedModel =
      ALL_MODELS.find((m) => m.id === project.model?.id) || ALL_MODELS[0];
    onModelSelect(matchedModel);

    // 2. Apply synth parameters to AudioEngine
    if (project.synthParams) {
      audioEngine.applyPatch(project.synthParams);
    }

    // 3. Dispatch global project load event for Macros, Automation, and Sequencer
    window.dispatchEvent(
      new CustomEvent('synthai:load-project', {
        detail: project,
      })
    );

    onProjectLoaded?.(project);
    showNotification(`Loaded project "${project.name}" into Synthesizer Workspace!`);
  };

  // Delete project
  const handleDeleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    showNotification('Project removed from vault.');
  };

  // Duplicate project
  const handleDuplicateProject = (project: SynthAIProject) => {
    const dup: SynthAIProject = {
      ...project,
      id: `proj-${Date.now().toString(36)}`,
      name: `${project.name} (Copy)`,
      updatedAt: new Date().toISOString(),
    };
    setProjects((prev) => [dup, ...prev]);
    showNotification(`Duplicated "${project.name}"`);
  };

  // Handle JSON file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const result = validateProjectJson(parsed);

        if (!result.valid || !result.project) {
          setImportError(result.error || 'Invalid project JSON structure.');
          return;
        }

        const imported = result.project;
        setProjects((prev) => [imported, ...prev]);
        setImportError(null);

        // Automatically load imported project
        handleLoadProject(imported);
        showNotification(`Successfully imported and loaded "${imported.name}"!`);
      } catch (err: any) {
        setImportError(`Failed to parse file: ${err.message || 'Invalid JSON syntax'}`);
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.model?.name.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  // Count active macro mappings and automation curves for live stats
  const activeMacrosCount = getSavedActiveMacros()?.length || 4;
  const activeAutomation = getSavedActiveAutomation();
  const automationCurvesCount = activeAutomation?.curves
    ? Object.keys(activeAutomation.curves).length
    : 7;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-neutral-800 rounded-xl text-cyan-400">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-100">Synthesizer Project Management</h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                Full State Persistence
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Save, export, and import entire workstation sessions—neural model, 32-step automation curves, macros, and synth parameters
            </p>
          </div>
        </div>

        {/* Global Import / Export Buttons */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import Project (.json)</span>
          </button>

          <button
            onClick={handleExportCurrentState}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 text-xs font-semibold rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export Current Session (.json)</span>
          </button>

          <button
            onClick={() => setIsSavingFormOpen(!isSavingFormOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-xs font-bold rounded-lg transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save to Vault</span>
          </button>
        </div>
      </div>

      {/* Notifications / Errors */}
      {successNotice && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {importError && (
        <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{importError}</span>
          </div>
          <button
            onClick={() => setImportError(null)}
            className="text-[11px] underline hover:text-rose-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Workstation State Live Snapshot HUD */}
      <div className="bg-neutral-950 border border-neutral-800/90 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-850">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active Synthesizer State Snapshot</span>
          </div>
          <span className="font-mono text-[11px] text-neutral-400">
            Sync: Real-Time AudioContext & DOM
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs">
          <div className="p-2.5 bg-neutral-900 rounded-lg border border-neutral-800">
            <div className="text-[10px] text-neutral-500 font-mono uppercase">Neural Model</div>
            <div className="font-semibold text-neutral-100 truncate mt-0.5">{activeModel.name}</div>
            <div className="text-[10px] text-cyan-400 font-mono mt-0.5">{activeModel.id}</div>
          </div>

          <div className="p-2.5 bg-neutral-900 rounded-lg border border-neutral-800">
            <div className="text-[10px] text-neutral-500 font-mono uppercase">VCF & Saturation</div>
            <div className="font-semibold text-neutral-100 truncate mt-0.5">
              {Math.round(audioEngine.params.cutoff)} Hz · Q {audioEngine.params.resonance}
            </div>
            <div className="text-[10px] text-amber-400 font-mono mt-0.5">
              Drive: {Math.round(audioEngine.params.saturationDrive)}
            </div>
          </div>

          <div className="p-2.5 bg-neutral-900 rounded-lg border border-neutral-800">
            <div className="text-[10px] text-neutral-500 font-mono uppercase">Macro Controls</div>
            <div className="font-semibold text-neutral-100 truncate mt-0.5">
              {activeMacrosCount} Active Knobs
            </div>
            <div className="text-[10px] text-indigo-400 font-mono mt-0.5">
              Multi-Destination Mappings
            </div>
          </div>

          <div className="p-2.5 bg-neutral-900 rounded-lg border border-neutral-800">
            <div className="text-[10px] text-neutral-500 font-mono uppercase">Automation Lanes</div>
            <div className="font-semibold text-neutral-100 truncate mt-0.5">
              32-Step Dynamic Mod
            </div>
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
              {automationCurvesCount} Parameter Curves
            </div>
          </div>
        </div>
      </div>

      {/* Save Project Modal / Accordion */}
      {isSavingFormOpen && (
        <form
          onSubmit={handleSaveToVault}
          className="bg-neutral-900 border border-cyan-500/40 rounded-xl p-5 space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-neutral-100">Save Workstation Session to Local Vault</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsSavingFormOpen(false)}
              className="text-xs text-neutral-400 hover:text-neutral-200"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Project Name</label>
              <input
                type="text"
                placeholder="e.g. Cyberpunk Acid Bass Odyssey"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Author / Sound Designer</label>
              <input
                type="text"
                placeholder="Your producer handle"
                value={projectAuthor}
                onChange={(e) => setProjectAuthor(e.target.value)}
                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-neutral-300 mb-1">Description / Notes</label>
              <textarea
                placeholder="Session notes, tempo guidance, modulation details..."
                value={projectDesc}
                onChange={(e) => setProjectDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-100 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-neutral-300 mb-1">Tags (Comma-separated)</label>
              <input
                type="text"
                placeholder="Acid, Industrial, Reverb, Lead"
                value={projectTags}
                onChange={(e) => setProjectTags(e.target.value)}
                className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={() => setIsSavingFormOpen(false)}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-medium rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Commit & Save Project</span>
            </button>
          </div>
        </form>
      )}

      {/* Projects Vault List */}
      <div className="space-y-4">
        {/* Search & Counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter saved projects by name, author, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
            <span>{filteredProjects.length} Projects in Local Vault</span>
          </div>
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project) => {
            const isFactory = project.id.startsWith('factory-');
            const macrosCount = project.macroUnits?.length || 0;
            const hasAutomation = !!project.automation?.curves;

            return (
              <div
                key={project.id}
                className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700/80 rounded-xl p-4 flex flex-col justify-between transition-colors group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-neutral-100 group-hover:text-cyan-300 transition-colors">
                          {project.name}
                        </h4>
                        {isFactory && (
                          <span className="text-[10px] bg-indigo-950 border border-indigo-800 text-indigo-300 px-1.5 py-0.2 rounded font-mono">
                            Showcase
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                        <span>by {project.author}</span>
                        <span>·</span>
                        <span className="font-mono text-[11px] text-neutral-500">
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-cyan-400 shrink-0">
                      {project.model?.id || 'HYBRID'}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400 line-clamp-2 mb-3">
                    {project.description || 'Custom synthesized sound design project.'}
                  </p>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span className="text-[10px] bg-neutral-950 text-neutral-300 border border-neutral-800 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                      <Sliders className="w-2.5 h-2.5 text-cyan-400" />
                      <span>{macrosCount} Macros</span>
                    </span>

                    <span className="text-[10px] bg-neutral-950 text-neutral-300 border border-neutral-800 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                      <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
                      <span>{hasAutomation ? '32-Step Auto' : 'Static'}</span>
                    </span>

                    {project.sequencer?.bpm && (
                      <span className="text-[10px] bg-neutral-950 text-neutral-300 border border-neutral-800 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                        <Music className="w-2.5 h-2.5 text-amber-400" />
                        <span>{project.sequencer.bpm} BPM</span>
                      </span>
                    )}

                    {project.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] text-neutral-400 bg-neutral-950 border border-neutral-850 px-1.5 py-0.5 rounded"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleExportProject(project)}
                      title="Download JSON Project File"
                      className="p-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800 rounded-lg transition-colors text-xs flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="hidden sm:inline">JSON</span>
                    </button>

                    <button
                      onClick={() => handleDuplicateProject(project)}
                      title="Duplicate Project"
                      className="p-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800 rounded-lg transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {!isFactory && (
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        title="Delete Project"
                        className="p-1.5 bg-neutral-950 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 border border-neutral-800 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleLoadProject(project)}
                    className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-neutral-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Load Project</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-400 space-y-2">
            <FileText className="w-8 h-8 mx-auto text-neutral-600" />
            <div className="text-sm font-semibold text-neutral-300">No projects match your search</div>
            <div className="text-xs">Try clearing the search query or import a JSON project file above.</div>
          </div>
        )}
      </div>
    </div>
  );
};
