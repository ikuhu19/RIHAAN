import React from 'react';
import { Sparkles, Mic, Volume2, Heart } from 'lucide-react';

interface EnterWorldModalProps {
  onEnter: () => void;
  onOpenDiagnostics?: () => void;
  userName?: string;
}

export const EnterWorldModal: React.FC<EnterWorldModalProps> = ({ onEnter, onOpenDiagnostics, userName = 'Kuhu' }) => {
  return (
    <div className="enter-world-overlay">
      <div className="enter-world-card">
        {/* Glow Halo */}
        <div className="enter-world-glow" />

        <div className="enter-world-header">
          <div className="enter-world-icon-badge">
            <Sparkles className="w-8 h-8 text-amber-300 animate-pulse" />
          </div>
          <span className="enter-world-tag">AI COMPANION & ALTER EGO</span>
          <h1 className="enter-world-title">Enter Vihaan's Room</h1>
          <p className="enter-world-subtitle">
            Vihaan is right here waiting for you, {userName}.
          </p>
        </div>

        <div className="enter-world-features">
          <div className="feature-chip">
            <Mic className="feature-icon" size={16} />
            <span>Continuous Voice: Speak in Hindi, English or Hinglish</span>
          </div>
          <div className="feature-chip">
            <Volume2 className="feature-icon" size={16} />
            <span>Speaks aloud with warm conversational cadence</span>
          </div>
          <div className="feature-chip">
            <Heart className="feature-icon" size={16} />
            <span>Living presence, memory & banter</span>
          </div>
        </div>

        <div className="enter-world-actions">
          <button
            id="enter-world-btn"
            className="enter-world-cta-button"
            onClick={onEnter}
            autoFocus
          >
            <span>Enter Vihaan's World</span>
            <Sparkles size={18} />
          </button>

          {onOpenDiagnostics && (
            <button
              type="button"
              className="text-xs text-teal-400 hover:text-teal-300 underline mt-2 bg-transparent border-none cursor-pointer"
              onClick={onOpenDiagnostics}
              id="enter-modal-diag-btn"
            >
              🎙️ Test Microphone & Speech Diagnostics
            </button>
          )}

          <span className="enter-world-hint">
            One tap grants microphone permission once for the entire session.
          </span>
        </div>
      </div>
    </div>
  );
};
