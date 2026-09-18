import React, { useState } from 'react';
import { MemoryStore, MemoryItem, LearningState, MasteryLevel } from '../types';
import { Brain, Trash2, Plus, X, Power, Search, BookOpen, Star, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: MemoryStore;
  richMemories?: MemoryItem[];
  learningState?: LearningState;
  memoryEnabled: boolean;
  onToggleMemoryEnabled: (enabled: boolean) => void;
  onAddMemory: (category: keyof MemoryStore, item: string) => void;
  onDeleteMemory: (category: keyof MemoryStore, index: number) => void;
  onDeleteRichMemory?: (id: string) => void;
  onClearAll: () => void;
  onUpdateLearningMastery?: (topic: string, concept: string, status: MasteryLevel) => void;
}

const CATEGORY_META: { key: keyof MemoryStore; label: string; icon: string; description: string }[] = [
  { key: 'profile', label: 'Profile & Style', icon: '👤', description: 'Name, communication style, and personality cues' },
  { key: 'likes', label: 'Likes & Loves', icon: '💖', description: 'Hobbies, favourite drinks, music, and interests' },
  { key: 'dislikes', label: 'Dislikes & Avoids', icon: '🚫', description: 'Things Kuhu dislikes, avoids, or is frustrated by' },
  { key: 'goals', label: 'Goals & Ambitions', icon: '🎯', description: 'Study, career, and personal targets Kuhu is aiming for' },
  { key: 'important_context', label: 'People & Context', icon: '📌', description: 'Key people, relationships, and life situations' },
  { key: 'current_context', label: 'Current Deadlines', icon: '⏳', description: 'Upcoming exams, interviews, and temporary events' },
  { key: 'projects', label: 'Projects & Work', icon: '🚀', description: 'Apps, code, and creative projects being built' }
];

export const MemoryModal: React.FC<MemoryModalProps> = ({
  isOpen,
  onClose,
  memories,
  richMemories = [],
  learningState,
  memoryEnabled,
  onToggleMemoryEnabled,
  onAddMemory,
  onDeleteMemory,
  onDeleteRichMemory,
  onClearAll,
  onUpdateLearningMastery
}) => {
  const [activeTab, setActiveTab] = useState<'vault' | 'learning'>('vault');
  const [activeCategory, setActiveCategory] = useState<keyof MemoryStore>('profile');
  const [newItemText, setNewItemText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  if (!isOpen) return null;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    onAddMemory(activeCategory, newItemText.trim());
    setNewItemText('');
  };

  const currentCategoryMeta = CATEGORY_META.find((c) => c.key === activeCategory);
  const currentItems = (memories[activeCategory] as string[]) || [];

  // Filter items by search query if present
  const filteredItems = searchQuery.trim()
    ? currentItems.filter((it) => it.toLowerCase().includes(searchQuery.toLowerCase()))
    : currentItems;

  const totalCount = CATEGORY_META.reduce(
    (acc, cat) => acc + ((memories[cat.key] as string[])?.length || 0),
    0
  );

  const getImportanceBadge = (importance: number = 3) => {
    if (importance >= 5) return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">CRITICAL</span>;
    if (importance >= 4) return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">HIGH</span>;
    return <span className="px-2 py-0.5 text-[10px] rounded bg-slate-700 text-slate-300">CORE</span>;
  };

  const getMasteryColor = (status: MasteryLevel) => {
    switch (status) {
      case 'mastered':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'understood':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
      case 'practicing':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'struggling':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'beginner':
      default:
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="memory-modal-card">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className={`modal-icon-badge ${memoryEnabled ? 'active' : 'inactive'}`}>
              <Brain size={22} />
            </div>
            <div>
              <div className="memory-title-status-line">
                <h2 className="modal-title">Rihaan's Memory & Knowledge Vault</h2>
                <button
                  type="button"
                  className={`memory-master-toggle ${memoryEnabled ? 'enabled' : 'disabled'}`}
                  onClick={() => onToggleMemoryEnabled(!memoryEnabled)}
                  title={memoryEnabled ? 'Click to pause memory system' : 'Click to enable memory system'}
                >
                  <Power size={13} />
                  <span>{memoryEnabled ? 'Memory Active' : 'Memory Paused'}</span>
                </button>
              </div>
              <p className="modal-subtitle">
                {memoryEnabled
                  ? `${totalCount} memory fragments across 7 categories + adaptive learning tracking`
                  : 'Memory is currently PAUSED (no new memories stored or used in replies)'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Primary View Switcher: Memory Vault vs Learning & Mastery */}
        <div className="flex border-b border-slate-700/60 px-4 bg-slate-900/40">
          <button
            type="button"
            className={`flex items-center gap-2 py-2.5 px-4 font-medium text-sm transition-all border-b-2 ${
              activeTab === 'vault'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('vault')}
          >
            <Sparkles size={15} />
            <span>Memory Fragments ({totalCount})</span>
          </button>
          <button
            type="button"
            className={`flex items-center gap-2 py-2.5 px-4 font-medium text-sm transition-all border-b-2 ${
              activeTab === 'learning'
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('learning')}
          >
            <BookOpen size={15} />
            <span>Adaptive Learning & Tutor Tracking</span>
          </button>
        </div>

        {activeTab === 'vault' ? (
          <>
            {/* Category Navigation Tabs */}
            <div className="memory-category-tabs">
              {CATEGORY_META.map((cat) => {
                const count = (memories[cat.key] as string[])?.length || 0;
                const isSelected = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    className={`category-tab ${isSelected ? 'selected' : ''}`}
                    onClick={() => setActiveCategory(cat.key)}
                  >
                    <span className="tab-icon">{cat.icon}</span>
                    <span className="tab-label">{cat.label}</span>
                    <span className="tab-count">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Search & Category Meta Row */}
            <div className="category-meta-banner flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <p className="category-meta-desc">
                {currentCategoryMeta?.description}
              </p>
              <div className="relative w-full md:w-56">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search in this category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Add New Memory Form */}
            <form className="add-memory-form" onSubmit={handleAddItem}>
              <input
                type="text"
                className="add-memory-input"
                placeholder={`Explicitly teach Rihaan something for ${currentCategoryMeta?.label}...`}
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
              />
              <button
                type="submit"
                className="add-memory-btn"
                disabled={!newItemText.trim()}
              >
                <Plus size={16} /> Add
              </button>
            </form>

            {/* Memory Items List */}
            <div className="memory-items-list">
              {filteredItems.length === 0 ? (
                <div className="empty-memories-box">
                  <p>No memories recorded here yet.</p>
                  <span>Rihaan will naturally remember stable facts you share in conversation, or you can add them explicitly above.</span>
                </div>
              ) : (
                filteredItems.map((item, idx) => {
                  const richItem = richMemories.find((r) => r.content.toLowerCase() === item.toLowerCase());
                  return (
                    <div key={idx} className="memory-item-card flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <span className="memory-bullet mt-0.5">🪶</span>
                        <div className="flex flex-col gap-1 min-w-0">
                          <p className="memory-text text-sm text-slate-200">{item}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            {getImportanceBadge(richItem?.importance || 3)}
                            <span>{richItem?.source === 'explicit' ? 'Explicit Command' : 'Conversational Recall'}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="memory-delete-btn"
                        onClick={() => {
                          if (richItem && onDeleteRichMemory) {
                            onDeleteRichMemory(richItem.id);
                          }
                          onDeleteMemory(activeCategory, idx);
                        }}
                        title="Delete this memory"
                        aria-label="Delete item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          /* Adaptive Learning Tab */
          <div className="p-4 space-y-4 overflow-y-auto max-h-[440px]">
            <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/60">
              <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-1.5 mb-1">
                <BookOpen size={16} />
                How Rihaan Teaches & Tracks Learning
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Rihaan observes which programming and academic concepts you find easy, which you are practicing, and which give you trouble. He automatically pivots his explanation style, creates intuitive real-world analogies, and provides targeted hints rather than robotic answers.
              </p>
            </div>

            {learningState && Object.keys(learningState.topics).length > 0 ? (
              Object.values(learningState.topics).map((top) => (
                <div key={top.topic} className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-base font-bold text-teal-300">{top.topic}</h4>
                      {top.currentGoal && (
                        <p className="text-xs text-slate-400">{top.currentGoal}</p>
                      )}
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                      {Object.keys(top.concepts).length} Concepts Tracked
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {Object.values(top.concepts).map((concept) => (
                      <div
                        key={concept.name}
                        className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-sm text-slate-100">{concept.name}</span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getMasteryColor(
                              concept.status
                            )}`}
                          >
                            {concept.status}
                          </span>
                        </div>

                        {concept.notes && (
                          <p className="text-xs text-slate-300 mb-1">{concept.notes}</p>
                        )}

                        {concept.misconceptions && concept.misconceptions.length > 0 && (
                          <p className="text-[11px] text-rose-300 flex items-center gap-1 mt-1">
                            <AlertCircle size={12} />
                            <span>Watch out: {concept.misconceptions[0]}</span>
                          </p>
                        )}

                        <div className="mt-2.5 pt-2 border-t border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
                          <span>Practiced {concept.attemptsCount} times</span>
                          {onUpdateLearningMastery && (
                            <select
                              value={concept.status}
                              onChange={(e) =>
                                onUpdateLearningMastery(
                                  top.topic,
                                  concept.name,
                                  e.target.value as MasteryLevel
                                )
                              }
                              className="bg-slate-900 text-slate-300 border border-slate-700 rounded px-1.5 py-0.5 text-[10px]"
                            >
                              <option value="beginner">Beginner</option>
                              <option value="struggling">Struggling</option>
                              <option value="practicing">Practicing</option>
                              <option value="understood">Understood</option>
                              <option value="mastered">Mastered</option>
                            </select>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-memories-box">
                <p>No learning topics active yet.</p>
                <span>Start discussing any programming language or subject with Rihaan to track your progression!</span>
              </div>
            )}
          </div>
        )}

        {/* Footer with Clear All */}
        <div className="modal-footer">
          {showConfirmClear ? (
            <div className="clear-confirm-dialog">
              <span className="confirm-text">Are you sure? This erases all saved memories.</span>
              <button
                type="button"
                className="confirm-yes-btn"
                onClick={() => {
                  onClearAll();
                  setShowConfirmClear(false);
                }}
              >
                Yes, Clear All
              </button>
              <button
                type="button"
                className="confirm-cancel-btn"
                onClick={() => setShowConfirmClear(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="clear-all-btn"
              onClick={() => setShowConfirmClear(true)}
              disabled={totalCount === 0}
            >
              <Trash2 size={14} /> Clear All Memories
            </button>
          )}

          <button type="button" className="done-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
