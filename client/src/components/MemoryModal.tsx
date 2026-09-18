import React, { useState } from 'react';
import { MemoryStore } from '../types';
import { Brain, Trash2, Plus, X, Power } from 'lucide-react';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: MemoryStore;
  memoryEnabled: boolean;
  onToggleMemoryEnabled: (enabled: boolean) => void;
  onAddMemory: (category: keyof MemoryStore, item: string) => void;
  onDeleteMemory: (category: keyof MemoryStore, index: number) => void;
  onClearAll: () => void;
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
  memoryEnabled,
  onToggleMemoryEnabled,
  onAddMemory,
  onDeleteMemory,
  onClearAll
}) => {
  const [activeCategory, setActiveCategory] = useState<keyof MemoryStore>('profile');
  const [newItemText, setNewItemText] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  if (!isOpen) return null;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    onAddMemory(activeCategory, newItemText.trim());
    setNewItemText('');
  };

  const currentItems = (memories[activeCategory] as string[]) || [];
  const totalCount = CATEGORY_META.reduce(
    (acc, cat) => acc + ((memories[cat.key] as string[])?.length || 0),
    0
  );

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
                <h2 className="modal-title">Vihaan's Memory Vault</h2>
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
                  ? `${totalCount} memory fragments saved locally in 7 categories`
                  : 'Memory is currently PAUSED (no new memories stored or used in replies)'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

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

        {/* Active Category Description */}
        <div className="category-meta-banner">
          <p className="category-meta-desc">
            {CATEGORY_META.find((c) => c.key === activeCategory)?.description}
          </p>
        </div>

        {/* Add New Memory Form */}
        <form className="add-memory-form" onSubmit={handleAddItem}>
          <input
            type="text"
            className="add-memory-input"
            placeholder={`Add a memory to ${CATEGORY_META.find((c) => c.key === activeCategory)?.label}...`}
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
          {currentItems.length === 0 ? (
            <div className="empty-memories-box">
              <p>No memories recorded in this section yet.</p>
              <span>Vihaan will naturally remember facts you share in conversation, or you can add them above.</span>
            </div>
          ) : (
            currentItems.map((item, idx) => (
              <div key={idx} className="memory-item-card">
                <span className="memory-bullet">🪶</span>
                <p className="memory-text">{item}</p>
                <button
                  type="button"
                  className="memory-delete-btn"
                  onClick={() => onDeleteMemory(activeCategory, idx)}
                  title="Delete this memory"
                  aria-label="Delete item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

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
