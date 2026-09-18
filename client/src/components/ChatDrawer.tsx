import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, PersonalityMode } from '../types';
import { Send, X, Volume2, Sparkles, User, Bot } from 'lucide-react';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isSpeaking: boolean;
  currentMode: PersonalityMode;
}

const QUICK_STARTERS: Record<PersonalityMode, string[]> = {
  best_friend: [
    "I don't want to study right now 😭",
    "Tell me a funny joke to cheer me up",
    "I had the weirdest day today, sun na...",
    "What should I do this evening?"
  ],
  alter_ego: [
    "I have to make a tough decision and I'm second-guessing myself",
    "I'm feeling like an imposter today",
    "Help me cut through mental clutter and plan my day",
    "Why do I keep sabotaging my own routine?"
  ],
  roast: [
    "Roast my procrastination habits",
    "I swear I was about to study, but Instagram called me",
    "Give me your most honest roast about my sleep schedule",
    "Why am I like this, Vihaan?"
  ],
  study: [
    "I need to study for 25 minutes, keep me accountable",
    "Quiz me on what I just read",
    "I feel overwhelmed by my syllabus",
    "Let's do a quick focus sprint together"
  ],
  night_2am: [
    "I can't sleep, my mind won't shut off",
    "Do you ever think about where we'll be in five years?",
    "Why does everything feel heavier at night?",
    "Tell me something peaceful so I can relax"
  ]
};

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  isSpeaking,
  currentMode
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleStarterClick = (prompt: string) => {
    onSendMessage(prompt);
  };

  if (!isOpen) return null;

  return (
    <div className="chat-drawer-overlay">
      <div className="chat-drawer-panel">
        {/* Drawer Header */}
        <div className="chat-drawer-header">
          <div className="drawer-title-group">
            <div className="drawer-avatar-preview">
              <img src="/vihaan_portrait.jpg" alt="Vihaan mini" />
            </div>
            <div>
              <h2 className="drawer-title">Conversation with Vihaan</h2>
              <span className="drawer-subtitle">
                {isSpeaking ? (
                  <span className="speaking-indicator-pill">
                    <Volume2 size={12} className="animate-pulse" /> Speaking...
                  </span>
                ) : (
                  'Online · Listening'
                )}
              </span>
            </div>
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close chat">
            <X size={20} />
          </button>
        </div>

        {/* Quick Suggestion Starters */}
        <div className="chat-starters-scroll">
          {(QUICK_STARTERS[currentMode] || QUICK_STARTERS.best_friend).map((starter, idx) => (
            <button
              key={idx}
              className="starter-chip"
              onClick={() => handleStarterClick(starter)}
            >
              <Sparkles size={12} /> {starter}
            </button>
          ))}
        </div>

        {/* Message History List */}
        <div className="chat-messages-container">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const timeFormatted = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={msg.id}
                className={`chat-bubble-row ${isUser ? 'bubble-user' : 'bubble-vihaan'}`}
              >
                <div className="bubble-avatar-tag">
                  {isUser ? <User size={14} /> : <Bot size={14} />}
                  <span className="bubble-sender-name">{isUser ? 'YOU' : 'VIHAAN'}</span>
                  <span className="bubble-time">{timeFormatted}</span>
                </div>
                <div className="chat-bubble-content">
                  <p className="bubble-text">{msg.text}</p>
                  {msg.emotion && !isUser && (
                    <span className="bubble-emotion-tag">
                      {msg.emotion === 'playful' && '✨ Playful'}
                      {msg.emotion === 'happy' && '😊 Warm'}
                      {msg.emotion === 'sad' && '💙 Empathetic'}
                      {msg.emotion === 'thinking' && '💭 Reflective'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Bar */}
        <form className="chat-input-bar" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="chat-input-field"
            placeholder="Type a message to Vihaan..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!inputText.trim()}
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
