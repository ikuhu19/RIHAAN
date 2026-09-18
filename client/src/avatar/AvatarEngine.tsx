import React, { useEffect, useState, useRef } from 'react';
import { AvatarEmotion } from '../types';

interface AvatarEngineProps {
  emotion: AvatarEmotion;
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  speechTick?: number; // increments on speech boundaries for lip-sync
  onAvatarClick?: () => void;
}

export const AvatarEngine: React.FC<AvatarEngineProps> = ({
  emotion,
  isListening,
  isThinking,
  isSpeaking,
  speechTick = 0,
  onAvatarClick
}) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [mouthOpenAmount, setMouthOpenAmount] = useState(0);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Natural random eye blinking logic (blinks every 3-6 seconds)
  useEffect(() => {
    const scheduleNextBlink = () => {
      const delay = Math.random() * 3000 + 2500; // between 2.5s and 5.5s
      blinkTimerRef.current = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleNextBlink();
        }, 160); // 160ms realistic blink duration
      }, delay);
    };

    scheduleNextBlink();
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

  // Lip-sync simulation: fluctuate mouth open amount when speaking
  useEffect(() => {
    if (!isSpeaking) {
      setMouthOpenAmount(0);
      return;
    }

    let active = true;
    const interval = setInterval(() => {
      if (!active) return;
      // Organic mouth variance between 0.15 and 0.85
      const variance = Math.random() * 0.7 + 0.15;
      setMouthOpenAmount(variance);
    }, 110);

    return () => {
      active = false;
      clearInterval(interval);
      setMouthOpenAmount(0);
    };
  }, [isSpeaking]);

  // Determine current effective avatar state
  const effectiveState: AvatarEmotion = isThinking
    ? 'thinking'
    : isListening
    ? 'listening'
    : isSpeaking
    ? 'speaking'
    : emotion;

  return (
    <div className="avatar-stage-container" onClick={onAvatarClick}>
      {/* Background Celestial & Aura Glows */}
      <div className={`avatar-aura aura-${effectiveState}`} />

      {/* Listening Soundwave Rings */}
      {isListening && (
        <div className="listening-pulse-rings">
          <div className="pulse-ring ring-1" />
          <div className="pulse-ring ring-2" />
          <div className="pulse-ring ring-3" />
        </div>
      )}

      {/* Main Avatar Character Frame */}
      <div
        className={`avatar-frame state-${effectiveState} ${
          isSpeaking ? 'speaking-active' : ''
        }`}
      >
        {/* Base Character Portrait */}
        <img
          src="/vihaan_portrait.jpg"
          alt="Vihaan - AI Companion"
          className="avatar-portrait-image"
          draggable={false}
        />

        {/* Dynamic Eye Blink Overlay */}
        <div
          className={`avatar-eyelids ${isBlinking ? 'blink-closed' : 'blink-open'}`}
          aria-hidden="true"
        >
          {/* Left Eye Eyelid */}
          <div className="eyelid eyelid-left" />
          {/* Right Eye Eyelid */}
          <div className="eyelid eyelid-right" />
        </div>

        {/* Dynamic Mouth Lip-Sync Overlay */}
        {isSpeaking && (
          <div
            className="avatar-mouth-overlay"
            style={{
              transform: `scaleY(${1 + mouthOpenAmount * 0.6}) scaleX(${1 + mouthOpenAmount * 0.15})`
            }}
            aria-hidden="true"
          >
            <div className="mouth-parting" />
          </div>
        )}

        {/* Dynamic Ambient Light Reflection & Rim Glow */}
        <div className={`avatar-rim-lighting rim-${effectiveState}`} />
      </div>

      {/* Floating Sparkles & Dust Particles */}
      <div className="celestial-particles" aria-hidden="true">
        <span className="particle p1">✦</span>
        <span className="particle p2">·</span>
        <span className="particle p3">✦</span>
        <span className="particle p4">·</span>
      </div>

      {/* Expression & State Badge */}
      <div className={`avatar-state-badge badge-${effectiveState}`}>
        {effectiveState === 'listening' && (
          <span className="flex items-center gap-1.5 font-bold tracking-wide text-emerald-400">
            <span className="badge-dot pulse" /> 🟢 LISTENING
          </span>
        )}
        {effectiveState === 'thinking' && (
          <span className="flex items-center gap-1.5 font-bold tracking-wide text-amber-300">
            <span className="badge-spinner" /> 🧠 THINKING
          </span>
        )}
        {effectiveState === 'speaking' && (
          <span className="flex items-center gap-1.5 font-bold tracking-wide text-teal-300">
            <span className="badge-sound-bars">
              <span className="bar b1" />
              <span className="bar b2" />
              <span className="bar b3" />
            </span>
            🗣️ VIHAAN IS SPEAKING
          </span>
        )}
        {effectiveState === 'idle' && (
          <span className="flex items-center gap-1.5 text-slate-300 font-medium">
            ⚪ IDLE
          </span>
        )}
        {effectiveState === 'playful' && (
          <span className="flex items-center gap-1.5 text-amber-300 font-medium">
            ✨ PLAYFUL
          </span>
        )}
        {effectiveState === 'happy' && (
          <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
            😊 HAPPY
          </span>
        )}
        {effectiveState === 'sad' && (
          <span className="flex items-center gap-1.5 text-sky-300 font-medium">
            💙 GENTLE & SUPPORTIVE
          </span>
        )}
        {effectiveState === 'surprised' && (
          <span className="flex items-center gap-1.5 text-purple-300 font-medium">
            😮 SURPRISED
          </span>
        )}
      </div>
    </div>
  );
};
