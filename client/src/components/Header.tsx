import React from 'react';
import { PersonalityMode } from '../types';
import { Brain, History, Volume2, VolumeX, Sparkles } from 'lucide-react';

interface HeaderProps {
  currentMode: PersonalityMode;
  onSelectMode: (mode: PersonalityMode) => void;
  memoryCount: number;
  onOpenMemory: () => void;
  onOpenHistory: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const MODES: { id: PersonalityMode; label: string; icon: string; description: string }[] = [
  { id: 'best_friend', label: 'Best Friend', icon: '🫂', description: 'Warm, casual, teasing & loyal buddy' },
  { id: 'alter_ego', label: 'Alter Ego', icon: '🪞', description: 'Clearer, wiser, grounded inner self' },
  { id: 'roast', label: 'Roast Mode', icon: '🔥', description: 'Playful sarcasm & cheeky banter' },
  { id: 'study', label: 'Study Mode', icon: '📚', description: 'Focus companion & accountability partner' },
  { id: 'night_2am', label: '2 AM Mode', icon: '🌙', description: 'Deep, calm, reflective midnight conversations' }
];

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  memoryCount,
  onOpenMemory,
  onOpenHistory,
  isMuted,
  onToggleMute
}) => {
  return (
    <header className="app-header">
      {/* Brand & Identity */}
      <div className="header-brand">
        <div className="brand-logo-gem">🪶</div>
        <div className="brand-titles">
          <h1 className="brand-name">VIHAAN</h1>
          <span className="brand-tagline">AI Best Friend & Alter Ego</span>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="mode-selector-container">
        {MODES.map((mode) => {
          const isActive = currentMode === mode.id;
          return (
            <button
              key={mode.id}
              className={`mode-pill ${isActive ? 'active' : ''}`}
              onClick={() => onSelectMode(mode.id)}
              title={mode.description}
            >
              <span className="mode-icon">{mode.icon}</span>
              <span className="mode-label">{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Utility Actions */}
      <div className="header-actions">
        {/* Audio Mute Toggle */}
        <button
          className={`action-btn ${isMuted ? 'muted' : ''}`}
          onClick={onToggleMute}
          title={isMuted ? 'Unmute voice output' : 'Mute voice output'}
          aria-label="Toggle voice output"
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Memory Vault Button */}
        <button
          className="action-btn memory-btn"
          onClick={onOpenMemory}
          title="Vihaan's Memory Vault"
          aria-label="Open memories"
        >
          <Brain size={18} />
          <span className="btn-text">Memory</span>
          {memoryCount > 0 && <span className="memory-badge">{memoryCount}</span>}
        </button>

        {/* Conversation History Drawer Button */}
        <button
          className="action-btn"
          onClick={onOpenHistory}
          title="Past Conversations"
          aria-label="Open conversation history"
        >
          <History size={18} />
          <span className="btn-text">History</span>
        </button>
      </div>
    </header>
  );
};
