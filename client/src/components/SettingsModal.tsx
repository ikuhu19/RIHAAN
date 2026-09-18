import React from 'react';
import { X, Sliders, Volume2, User, Sparkles, MessageCircle } from 'lucide-react';
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  proactiveTalking: boolean;
  onToggleProactive: () => void;
  continuousVoice: boolean;
  onToggleContinuous: () => void;
  userName: string;
  onUpdateUserName: (name: string) => void;
  speechLanguage: string;
  onLanguageChange: (lang: 'en-IN' | 'hi-IN') => void;
  speechVolume: number;
  onVolumeChange: (volume: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  proactiveTalking,
  onToggleProactive,
  continuousVoice,
  onToggleContinuous,
  userName,
  onUpdateUserName,
  speechLanguage,
  onLanguageChange,
  speechVolume,
  onVolumeChange
}) => {
  if (!isOpen) return null;

  return (
    <div className="settings-modal-backdrop" onClick={onClose}>
      <div className="settings-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <div className="flex items-center gap-2">
            <Sliders size={20} className="text-amber-400" />
            <h2 className="settings-modal-title">Vihaan Preferences</h2>
          </div>
          <button className="settings-close-btn" onClick={onClose} id="close-settings-btn">
            <X size={20} />
          </button>
        </div>

        <div className="settings-body">
          {/* User Name Config */}
          <div className="settings-section">
            <div className="settings-label-row">
              <User size={16} className="text-teal-400" />
              <label htmlFor="user-name-input" className="settings-label">
                Your Name
              </label>
            </div>
            <input
              id="user-name-input"
              type="text"
              value={userName}
              onChange={(e) => onUpdateUserName(e.target.value)}
              className="settings-input"
              placeholder="Kuhu"
            />
            <p className="settings-hint">Vihaan addresses you by this name naturally in conversation.</p>
          </div>

          {/* Continuous Voice Loop Toggle */}
          <div className="settings-section">
            <div className="settings-toggle-row">
              <div>
                <div className="settings-label-row">
                  <Volume2 size={16} className="text-teal-400" />
                  <span className="settings-label">Continuous Voice Conversation</span>
                </div>
                <p className="settings-hint">
                  Automatically listens again after Vihaan finishes speaking.
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={continuousVoice}
                  onChange={onToggleContinuous}
                />
                <span className="slider round" />
              </label>
            </div>
          </div>

          {/* Proactive Talking Toggle */}
          <div className="settings-section">
            <div className="settings-toggle-row">
              <div>
                <div className="settings-label-row">
                  <MessageCircle size={16} className="text-amber-400" />
                  <span className="settings-label">Proactive Talking</span>
                </div>
                <p className="settings-hint">
                  Vihaan makes a gentle natural comment if you stay quiet for a while.
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={proactiveTalking}
                  onChange={onToggleProactive}
                />
                <span className="slider round" />
              </label>
            </div>
          </div>

          {/* Speech Language Switcher */}
          <div className="settings-section">
            <div className="settings-label-row">
              <Sparkles size={16} className="text-teal-400" />
              <label className="settings-label">Speech Recognition Dialect</label>
            </div>
            <div className="settings-lang-options">
              <button
                className={`lang-pill ${speechLanguage === 'en-IN' ? 'active' : ''}`}
                onClick={() => onLanguageChange('en-IN')}
              >
                🇮🇳 Indian English / Hinglish
              </button>
              <button
                className={`lang-pill ${speechLanguage === 'hi-IN' ? 'active' : ''}`}
                onClick={() => onLanguageChange('hi-IN')}
              >
                🇮🇳 Conversational Hindi
              </button>
            </div>
          </div>

          {/* Voice Volume Slider */}
          <div className="settings-section">
            <div className="settings-label-row">
              <Volume2 size={16} className="text-teal-400" />
              <label htmlFor="voice-volume-slider" className="settings-label">
                Vihaan's Voice Volume ({Math.round(speechVolume * 100)}%)
              </label>
            </div>
            <input
              id="voice-volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={speechVolume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-teal-400 cursor-pointer"
            />
            <p className="settings-hint">Adjust Vihaan's speech volume level during voice responses.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
