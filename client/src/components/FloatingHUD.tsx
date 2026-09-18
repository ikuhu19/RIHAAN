import React from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageSquare,
  Sparkles,
  Settings,
  RotateCcw
} from 'lucide-react';
import { PersonalityMode, AvatarEmotion, VoiceState } from '../types';

interface FloatingHUDProps {
  currentMode: PersonalityMode;
  onModeChange: (mode: PersonalityMode) => void;
  voiceState: VoiceState;
  errorMessage?: string;
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  currentEmotion: AvatarEmotion;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleMic: () => void;
  onEndConversation: () => void;
  onOpenDiagnostics: () => void;
  onOpenChat: () => void;
  onOpenMemory: () => void;
  onOpenSettings: () => void;
  lastReplyText: string;
  interimTranscript: string;
  onReplayLastReply: () => void;
}

export const FloatingHUD: React.FC<FloatingHUDProps> = ({
  currentMode,
  onModeChange,
  voiceState,
  errorMessage,
  isListening,
  isThinking,
  isSpeaking,
  isMuted,
  onToggleMute,
  onToggleMic,
  onEndConversation,
  onOpenDiagnostics,
  onOpenChat,
  onOpenMemory,
  onOpenSettings,
  lastReplyText,
  interimTranscript,
  onReplayLastReply
}) => {
  const modeLabels: Record<PersonalityMode, { label: string; icon: string }> = {
    best_friend: { label: 'Best Friend', icon: '🫂' },
    alter_ego: { label: 'Alter Ego', icon: '🪞' },
    roast: { label: 'Roast Mode', icon: '🔥' },
    study: { label: 'Study Mode', icon: '📚' },
    night_2am: { label: '2 AM Heart-to-Heart', icon: '🌙' }
  };

  const getStatusBadge = () => {
    switch (voiceState) {
      case 'LISTENING':
        return { text: 'LISTENING', icon: '🟢', className: 'status-pill-listening' };
      case 'THINKING':
        return { text: 'THINKING', icon: '🧠', className: 'status-pill-thinking' };
      case 'SPEAKING':
      case 'GREETING':
        return { text: 'VIHAAN SPEAKING', icon: '🗣️', className: 'status-pill-speaking' };
      case 'MIC_ERROR':
        return { text: errorMessage ? `MIC ERROR: ${errorMessage.substring(0, 32)}...` : 'MICROPHONE ERROR', icon: '🔴', className: 'status-pill-error' };
      case 'INITIALIZING':
        return { text: 'INITIALIZING', icon: '🟡', className: 'status-pill-thinking' };
      case 'IDLE':
      default:
        return { text: 'IDLE', icon: '⚪', className: 'status-pill-idle' };
    }
  };

  const status = getStatusBadge();

  return (
    <div className="floating-hud-overlay">
      {/* 1. Sleek Floating Top Bar */}
      <header className="hud-top-bar">
        {/* Left: Vihaan Identity & Mode Switcher */}
        <div className="hud-left-group">
          <div className="hud-brand-pill">
            <span className="hud-brand-dot" />
            <span className="hud-brand-title">VIHAAN</span>
            <span className="hud-room-indicator">In Room</span>
          </div>

          <div className="hud-mode-selector">
            <select
              value={currentMode}
              onChange={(e) => onModeChange(e.target.value as PersonalityMode)}
              className="hud-mode-dropdown"
              title="Change Vihaan's personality mode"
            >
              {(Object.keys(modeLabels) as PersonalityMode[]).map((m) => (
                <option key={m} value={m}>
                  {modeLabels[m].icon} {modeLabels[m].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Live Voice State Indicator & End Session button */}
        <div className="hud-status-center">
          <div
            className={`hud-live-status-pill ${status.className}`}
            onClick={() => {
              if (voiceState === 'MIC_ERROR') onOpenDiagnostics();
            }}
            title={voiceState === 'MIC_ERROR' ? 'Click to inspect microphone diagnostics' : ''}
          >
            <span className="status-dot-icon">{status.icon}</span>
            <span className="status-badge-text">{status.text}</span>
          </div>

          <button
            className="hud-end-session-btn"
            onClick={onEndConversation}
            title="End voice conversation and stop microphone"
            id="hud-end-conversation-btn"
          >
            <span>⏹️ END CONVERSATION</span>
          </button>
        </div>

        {/* Right: Ambient Control Icons */}
        <div className="hud-right-group">
          <button
            className="hud-diag-pill-btn"
            onClick={onOpenDiagnostics}
            title="Test Microphone and Speech Recognition"
            id="hud-diagnostics-btn"
          >
            <Mic size={14} />
            <span>Test Mic</span>
          </button>

          <button
            className={`hud-icon-btn ${isMuted ? 'active-mute' : ''}`}
            onClick={onToggleMute}
            title={isMuted ? 'Unmute voice' : 'Mute voice'}
            id="hud-mute-btn"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <button
            className="hud-icon-btn"
            onClick={onOpenMemory}
            title="Memory Vault"
            id="hud-memory-btn"
          >
            <Sparkles size={18} />
          </button>

          <button
            className="hud-icon-btn"
            onClick={onOpenChat}
            title="Open Chat Drawer"
            id="hud-chat-btn"
          >
            <MessageSquare size={18} />
          </button>

          <button
            className="hud-icon-btn"
            onClick={onOpenSettings}
            title="Preferences & Settings"
            id="hud-settings-btn"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Active Microphone Error Banner */}
      {voiceState === 'MIC_ERROR' && (
        <div className="hud-error-banner" onClick={onOpenDiagnostics}>
          <span>🔴 {errorMessage || 'Microphone error detected.'}</span>
          <span className="underline ml-2 text-xs font-bold">Click to Diagnose & Fix</span>
        </div>
      )}

      {/* 2. Dynamic Subtitle & Dialogue Banner (Non-intrusive) */}
      <div className="hud-dialogue-wrapper">
        {interimTranscript && (
          <div className="hud-user-transcript">
            <span className="transcript-prefix">You:</span> "{interimTranscript}"
          </div>
        )}

        {lastReplyText && !interimTranscript && (
          <div className="hud-subtitles-card">
            <span className="vihaan-tag">Vihaan:</span>
            <p className="vihaan-spoken-text">"{lastReplyText}"</p>
            {isSpeaking && (
              <button
                className="hud-replay-btn"
                onClick={onReplayLastReply}
                title="Replay speech"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Floating Voice Capsule at Bottom */}
      <div className="hud-bottom-bar">
        <div
          className={`hud-voice-capsule ${
            isListening
              ? 'state-listening'
              : isThinking
              ? 'state-thinking'
              : isSpeaking
              ? 'state-speaking'
              : 'state-idle'
          }`}
          onClick={onToggleMic}
          id="hud-mic-capsule"
          title={isListening ? 'Microphone active - Tap to pause' : 'Tap to speak with Vihaan'}
        >
          {/* Status Indicator Icon */}
          <div className="capsule-icon-bubble">
            {isListening ? (
              <Mic className="capsule-mic-active" size={20} />
            ) : isMuted ? (
              <MicOff size={20} />
            ) : (
              <Mic size={20} />
            )}
          </div>

          {/* Status Text & Soundwave Animation */}
          <div className="capsule-info">
            <span className="capsule-status-title">
              {isListening
                ? 'Listening to you...'
                : isThinking
                ? 'Thinking...'
                : isSpeaking
                ? 'Vihaan is speaking...'
                : 'Continuous Voice Ready'}
            </span>
            <span className="capsule-subtext">
              {isListening
                ? 'Speak to Vihaan...'
                : 'Tap to toggle microphone'}
            </span>
          </div>

          {/* Mini Soundwave bars */}
          <div className="capsule-soundwave">
            <span className="bar b1" />
            <span className="bar b2" />
            <span className="bar b3" />
            <span className="bar b4" />
          </div>
        </div>
      </div>
    </div>
  );
};
