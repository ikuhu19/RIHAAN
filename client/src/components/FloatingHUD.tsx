import React from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageSquare,
  Sparkles,
  Settings,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { PersonalityMode, AvatarEmotion, VoiceState, ConversationIntent } from '../types';

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
  activeTopic?: string;
  activeConcept?: string;
  currentIntent?: ConversationIntent;
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
  onReplayLastReply,
  activeTopic,
  activeConcept,
  currentIntent
}) => {
  const modeLabels: Record<PersonalityMode, { label: string; icon: string }> = {
    best_friend: { label: 'Best Friend', icon: '🫂' },
    alter_ego: { label: 'Alter Ego', icon: '🪞' },
    roast: { label: 'Roast Mode', icon: '🔥' },
    study: { label: 'Study & Tutor', icon: '📚' },
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
        return { text: 'RIHAAN SPEAKING', icon: '🗣️', className: 'status-pill-speaking' };
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
        {/* Left: Rihaan Identity & Mode Switcher */}
        <div className="hud-left-group">
          <div className="hud-brand-pill">
            <span className="hud-brand-dot" />
            <span className="hud-brand-title">RIHAAN</span>
            <span className="hud-room-indicator">In Room</span>
          </div>

          <div className="hud-mode-selector">
            <select
              value={currentMode}
              onChange={(e) => onModeChange(e.target.value as PersonalityMode)}
              className="hud-mode-dropdown"
              title="Change Rihaan's personality mode"
            >
              {(Object.keys(modeLabels) as PersonalityMode[]).map((m) => (
                <option key={m} value={m}>
                  {modeLabels[m].icon} {modeLabels[m].label}
                </option>
              ))}
            </select>
          </div>

          {/* Active Learning / Tutor Topic Pill */}
          {activeTopic && (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs text-amber-300">
              <BookOpen size={12} className="text-amber-400" />
              <span>{activeTopic}{activeConcept ? ` · ${activeConcept}` : ''}</span>
            </div>
          )}
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
            title="Settings & Audio Preferences"
            id="hud-settings-btn"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* 2. Bottom Living Voice & Subtitles Tray */}
      <footer className="hud-bottom-tray">
        {/* Real-time Interim Live Voice Feedback */}
        {interimTranscript && (
          <div className="hud-interim-voice-bubble">
            <span className="interim-listening-dot" />
            <span className="interim-text">"{interimTranscript}"</span>
          </div>
        )}

        {/* Spoken Subtitle Banner with Replay Action */}
        {lastReplyText && !interimTranscript && (
          <div className="hud-speech-subtitle-banner">
            <div className="speech-quote-container">
              <span className="quote-mark">“</span>
              <p className="speech-quote-text">{lastReplyText}</p>
              <span className="quote-mark">”</span>
            </div>

            <button
              className="hud-replay-speech-btn"
              onClick={onReplayLastReply}
              title="Listen to this reply again"
              disabled={isSpeaking || isThinking}
            >
              <RotateCcw size={14} />
              <span>Replay Voice</span>
            </button>
          </div>
        )}

        {/* Floating Mic Control Center */}
        <div className="hud-mic-actions-container">
          <button
            id="hud-toggle-mic-btn"
            className={`hud-primary-mic-button ${isListening ? 'mic-listening-pulse' : ''} ${
              isThinking ? 'mic-thinking-glow' : ''
            }`}
            onClick={onToggleMic}
            title={isListening ? 'Click to stop listening' : 'Click to talk to Rihaan'}
          >
            {isListening ? (
              <MicOff size={28} className="text-rose-400" />
            ) : (
              <Mic size={28} className="text-teal-300" />
            )}
          </button>

          <span className="hud-mic-caption">
            {isListening
              ? 'Listening to you... Speak anytime'
              : isThinking
              ? 'Rihaan is reasoning...'
              : isSpeaking
              ? 'Rihaan is speaking aloud...'
              : 'Tap Mic to speak to Rihaan'}
          </span>
        </div>
      </footer>
    </div>
  );
};
