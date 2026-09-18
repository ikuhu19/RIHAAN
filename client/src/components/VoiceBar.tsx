import React from 'react';
import { Mic, MicOff, Square, Play, RefreshCw, MessageSquare, Volume2 } from 'lucide-react';

interface VoiceBarProps {
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  transcript: string;
  onToggleMic: () => void;
  onStopSpeaking: () => void;
  onReplayLastSpeech: () => void;
  onOpenTextChat: () => void;
  lastReplyText?: string;
}

export const VoiceBar: React.FC<VoiceBarProps> = ({
  isListening,
  isThinking,
  isSpeaking,
  transcript,
  onToggleMic,
  onStopSpeaking,
  onReplayLastSpeech,
  onOpenTextChat,
  lastReplyText
}) => {
  return (
    <div className="voice-bar-section">
      {/* Live Interim Transcript or Helpful Prompt */}
      <div className="voice-feedback-bubble">
        {isListening ? (
          <div className="transcript-active">
            <span className="live-mic-pulse" />
            <p className="transcript-text">
              {transcript ? `"${transcript}"` : "Listening... Speak naturally to Vihaan"}
            </p>
          </div>
        ) : isThinking ? (
          <p className="status-thinking-text">
            <span>💭</span> Vihaan is processing your thoughts...
          </p>
        ) : isSpeaking ? (
          <div className="status-speaking-row">
            <Volume2 className="speaking-icon animate-pulse" size={18} />
            <span className="speaking-label">Vihaan is speaking</span>
            <button
              className="stop-speech-btn"
              onClick={onStopSpeaking}
              title="Stop speaking"
            >
              <Square size={13} fill="currentColor" /> Stop
            </button>
          </div>
        ) : (
          <p className="prompt-text">"I'm here. What's on your mind?"</p>
        )}
      </div>

      {/* Central Microphone Button & Secondary Controls */}
      <div className="voice-controls-cluster">
        {/* Switch to Text Chat Button */}
        <button
          className="secondary-control-btn"
          onClick={onOpenTextChat}
          title="Type a message instead"
          aria-label="Open text chat"
        >
          <MessageSquare size={20} />
          <span className="btn-subtext">Type</span>
        </button>

        {/* Primary Tactile Microphone Trigger */}
        <button
          className={`primary-mic-button ${isListening ? 'listening' : ''} ${
            isThinking ? 'thinking' : ''
          }`}
          onClick={onToggleMic}
          disabled={isThinking}
          aria-label={isListening ? 'Stop listening' : 'Start speaking with Vihaan'}
        >
          <div className="mic-halo-effect" />
          <div className="mic-button-inner">
            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
          </div>
          <span className="mic-button-label">
            {isListening ? 'STOP' : isThinking ? 'THINKING' : 'TALK'}
          </span>
        </button>

        {/* Replay Last Response Button */}
        <button
          className="secondary-control-btn"
          onClick={onReplayLastSpeech}
          disabled={!lastReplyText || isSpeaking || isListening}
          title="Replay Vihaan's last response"
          aria-label="Replay speech"
        >
          <RefreshCw size={20} />
          <span className="btn-subtext">Replay</span>
        </button>
      </div>
    </div>
  );
};
