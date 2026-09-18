import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PersonalityMode,
  AvatarEmotion,
  ChatMessage,
  MemoryStore,
  MemoryItem,
  LearningState,
  OpenLoopItem,
  MasteryLevel,
  ConversationSession,
  VoiceState
} from './types';
import {
  loadMemories,
  loadRichMemories,
  saveRichMemories,
  loadLearningState,
  saveLearningState,
  updateConceptMastery,
  loadOpenLoops,
  saveOpenLoops,
  loadMemoryEnabled,
  saveMemoryEnabled,
  addMemoryItem,
  removeMemoryItem,
  deleteRichMemoryItem,
  clearAllMemories,
  mergeExtractedMemories
} from './memory/memoryStore';
import {
  loadSessions,
  saveSessions,
  getActiveSessionId,
  setActiveSessionId,
  createNewSession
} from './services/storage';
import { sendChatMessage } from './services/api';
import { speechRecognizer } from './voice/speechRecognition';
import { ttsService } from './voice/ttsService';
import { generateVihaanGreeting } from './voice/greetings';

import { AvatarEngine } from './avatar/AvatarEngine';
import { FloatingHUD } from './components/FloatingHUD';
import { EnterWorldModal } from './components/EnterWorldModal';
import { SettingsModal } from './components/SettingsModal';
import { ChatDrawer } from './components/ChatDrawer';
import { MemoryModal } from './components/MemoryModal';
import { SessionDrawer } from './components/SessionDrawer';
import { VoiceDiagnosticsModal } from './components/VoiceDiagnosticsModal';

export const App: React.FC = () => {
  // Application Data States
  const [sessions, setSessions] = useState<ConversationSession[]>(() => loadSessions());
  const [activeSessionId, setActiveId] = useState<string>(() =>
    getActiveSessionId(loadSessions())
  );
  const [memories, setMemories] = useState<MemoryStore>(() => loadMemories());
  const [richMemories, setRichMemories] = useState<MemoryItem[]>(() => loadRichMemories());
  const [learningState, setLearningState] = useState<LearningState>(() => loadLearningState());
  const [openLoops, setOpenLoops] = useState<OpenLoopItem[]>(() => loadOpenLoops());
  const [memoryEnabled, setMemoryEnabled] = useState<boolean>(() => loadMemoryEnabled());
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('vihaan_user_name') || 'Kuhu';
  });

  // Settings & Audio States
  const [hasEnteredWorld, setHasEnteredWorld] = useState(false);
  const hasEnteredWorldRef = useRef(false);
  const [continuousVoice, setContinuousVoice] = useState(true);
  const [proactiveTalking, setProactiveTalking] = useState(true);
  const [speechLanguage, setSpeechLanguage] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const [speechVolume, setSpeechVolume] = useState(1.0);

  // Active Session Helper
  const currentSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0] || createNewSession();
  const currentMode = currentSession.mode || 'best_friend';

  // Explicit Voice State Machine
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [voiceErrorMessage, setVoiceErrorMessage] = useState<string>('');
  const [currentEmotion, setCurrentEmotion] = useState<AvatarEmotion>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  // Derived flags for components
  const isListening = voiceState === 'LISTENING';
  const isThinking = voiceState === 'THINKING';
  const isSpeaking = voiceState === 'SPEAKING' || voiceState === 'GREETING';

  // UI Modal & Drawer States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  // Subtitle / Spoken text
  const [lastReply, setLastReply] = useState<string>(() => {
    const msgs = currentSession.messages;
    const lastVihaan = [...msgs].reverse().find((m) => m.sender === 'vihaan' || (m.sender as any) === 'rihaan');
    return lastVihaan ? lastVihaan.text : "Arre Kuhu, I'm right here in my room.";
  });

  const proactiveTimerRef = useRef<any>(null);

  // Keep hasEnteredWorldRef in sync
  useEffect(() => {
    hasEnteredWorldRef.current = hasEnteredWorld;
  }, [hasEnteredWorld]);

  // Sync initial mute state
  useEffect(() => {
    setIsMuted(ttsService.isMuted());
  }, []);

  // Persist user name
  const handleUpdateUserName = (name: string) => {
    setUserName(name);
    localStorage.setItem('vihaan_user_name', name);
  };

  // Adjust volume
  const handleVolumeChange = (vol: number) => {
    setSpeechVolume(vol);
    ttsService.setVolume(vol);
  };

  // Session updater helper
  const updateActiveSession = useCallback(
    (updater: (prev: ConversationSession) => ConversationSession) => {
      setSessions((prevSessions) => {
        const next = prevSessions.map((s) => {
          if (s.id === activeSessionId) {
            return updater(s);
          }
          return s;
        });
        saveSessions(next);
        return next;
      });
    },
    [activeSessionId]
  );

  // Reset proactive idle banter timer
  const resetProactiveTimer = useCallback(() => {
    if (proactiveTimerRef.current) {
      clearTimeout(proactiveTimerRef.current);
    }
    if (!proactiveTalking || !hasEnteredWorldRef.current) return;

    proactiveTimerRef.current = setTimeout(() => {
      if (voiceState === 'LISTENING') {
        const randomThoughts = [
          "Random thought: why does every productive plan begin with 'kal se'? Like, Thursday afternoon ko life improve karna illegal hai kya? 😭",
          "Don't laugh, but I just thought of something completely absurd.",
          "Okay, I need your opinion on something... don't judge me yet.",
          `${userName}? You're unusually quiet today. Sab theek na? Kuch chal raha hai dimaag mein?`,
          "Tell me something — what's been on your mind lately? You seem a bit lost."
        ];
        const randomPrompt = randomThoughts[Math.floor(Math.random() * randomThoughts.length)];
        speechRecognizer.stopListening();
        setVoiceState('SPEAKING');
        playSpeech(randomPrompt, 'playful');
      }
    }, 55000);
  }, [proactiveTalking, voiceState, userName]);

  // Start speech recognition listening turn
  const startListeningTurn = () => {
    if (!hasEnteredWorldRef.current || isMuted) {
      return;
    }

    setInterimTranscript('');

    speechRecognizer.startListening({
      onStart: () => {
        setVoiceState('LISTENING');
        setCurrentEmotion('listening');
        setVoiceErrorMessage('');
      },
      onInterim: (text) => {
        setInterimTranscript(text);
      },
      onSpeechFinal: (finalText) => {
        if (finalText.trim()) {
          console.log('[VOICE DEBUG] FINAL transcript received:', finalText);
          setInterimTranscript('');
          handleProcessUserMessage(finalText.trim());
        }
      },
      onError: (err, friendlyMsg) => {
        console.warn('[VOICE DEBUG] speechRecognizer.onError:', err, friendlyMsg);
        if (friendlyMsg) {
          setVoiceErrorMessage(friendlyMsg);
        }
        if (err === 'not-allowed' || err === 'audio-capture' || err === 'not-supported') {
          setVoiceState('MIC_ERROR');
        }
      },
      onEnd: () => {
        // Recognition cycle ended; handled by state machine
      }
    });
  };

  // Play Speech with guaranteed transition to LISTENING
  const playSpeech = (text: string, emotion: AvatarEmotion = 'happy') => {
    setCurrentEmotion(emotion);

    ttsService.speak(text, {
      onStart: () => {
        // Voice state is already GREETING or SPEAKING
      },
      onEnd: () => {
        setCurrentEmotion('idle');
        resetProactiveTimer();

        if (hasEnteredWorldRef.current && continuousVoice && !isMuted) {
          console.log('[VOICE] restarting recognition');
          setTimeout(() => {
            if (hasEnteredWorldRef.current && !isMuted) {
              startListeningTurn();
            }
          }, 600);
        } else {
          setVoiceState('IDLE');
        }
      },
      onError: (err) => {
        console.warn('[VOICE] Speech playback error:', err);
        setCurrentEmotion('idle');
        resetProactiveTimer();

        if (hasEnteredWorldRef.current && continuousVoice && !isMuted) {
          console.log('[VOICE] restarting recognition');
          setTimeout(() => {
            if (hasEnteredWorldRef.current && !isMuted) {
              startListeningTurn();
            }
          }, 600);
        } else {
          setVoiceState('IDLE');
        }
      }
    });
  };

  // Handle user entering Rihaan's room
  const handleEnterWorld = async () => {
    console.log('[VOICE DEBUG] session started');
    setHasEnteredWorld(true);
    hasEnteredWorldRef.current = true;
    setVoiceState('INITIALIZING');
    setVoiceErrorMessage('');

    // 1. Request microphone permission ONCE (retained active for the entire session)
    const micRes = await speechRecognizer.requestSessionMicrophone();
    if (!micRes.success) {
      setVoiceState('MIC_ERROR');
      setVoiceErrorMessage(micRes.message || 'Microphone permission or device access failed.');
    }

    // 2. Formulate time-aware personalized greeting
    const greeting = generateVihaanGreeting(userName);
    setLastReply(greeting.text);

    if (currentSession.messages.length === 0) {
      const initialGreetingMsg: ChatMessage = {
        id: 'msg_greet_' + Date.now(),
        sender: 'vihaan',
        text: greeting.text,
        timestamp: Date.now(),
        emotion: greeting.emotion
      };
      updateActiveSession((prev) => ({
        ...prev,
        messages: [initialGreetingMsg]
      }));
    }

    // 3. Rihaan greets aloud
    setVoiceState('GREETING');
    setTimeout(() => {
      playSpeech(greeting.text, greeting.emotion);
    }, 350);
  };

  // End voice conversation explicitly
  const handleEndConversation = () => {
    console.log('[VOICE] session ended');
    hasEnteredWorldRef.current = false;
    setHasEnteredWorld(false);
    setVoiceState('IDLE');
    setVoiceErrorMessage('');
    setCurrentEmotion('idle');

    speechRecognizer.stopListening();
    speechRecognizer.stopSessionMicrophone();
    ttsService.stop();
  };

  // Process a user message (voice or text input)
  const handleProcessUserMessage = async (userText: string) => {
    if (!userText.trim()) return;

    resetProactiveTimer();

    // 1. Transition: LISTENING -> THINKING
    setVoiceState('THINKING');
    setCurrentEmotion('thinking');

    // 2. Append user message
    const userMsg: ChatMessage = {
      id: 'msg_user_' + Date.now(),
      sender: 'user',
      text: userText.trim(),
      timestamp: Date.now()
    };

    updateActiveSession((prev) => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      title:
        prev.messages.length <= 1
          ? userText.substring(0, 30) + (userText.length > 30 ? '...' : '')
          : prev.title
    }));

    try {
      console.log('[AI] sending user message to Rihaan brain:', userText);
      const history = [...currentSession.messages, userMsg];

      // 3. Request reply with rich context (memories, learning state, open loops)
      const res = await sendChatMessage(
        userText,
        history,
        currentMode,
        memories,
        memoryEnabled,
        richMemories,
        learningState,
        openLoops,
        userName
      );

      console.log('[AI] response received:', res.reply);

      // 4. Update rich memories and legacy store if enabled
      if (memoryEnabled) {
        if (res.newMemories && res.newMemories.length > 0) {
          setRichMemories((prev) => {
            const merged = [...res.newMemories!, ...prev];
            saveRichMemories(merged);
            return merged;
          });
        }
        if (res.extractedMemories) {
          setMemories((prev) => mergeExtractedMemories(prev, res.extractedMemories));
        }
      }

      // 5. Update adaptive learning state if changed
      if (res.updatedLearningState) {
        setLearningState(res.updatedLearningState);
        saveLearningState(res.updatedLearningState);
      }

      // 6. Update open loops if changed
      if (res.updatedOpenLoops) {
        setOpenLoops(res.updatedOpenLoops);
        saveOpenLoops(res.updatedOpenLoops);
      }

      // 7. Append Rihaan's message
      const rihaanMsg: ChatMessage = {
        id: 'msg_rihaan_' + Date.now(),
        sender: 'vihaan',
        text: res.reply,
        timestamp: Date.now(),
        emotion: res.emotion,
        action: res.action
      };

      updateActiveSession((prev) => ({
        ...prev,
        messages: [...prev.messages, rihaanMsg]
      }));

      setLastReply(res.reply);

      // Brief conversational natural pause
      await new Promise((resolve) => setTimeout(resolve, 350));

      // 8. Transition: THINKING -> SPEAKING (Using clean speech text for natural non-robotic audio)
      setVoiceState('SPEAKING');
      playSpeech(res.speechText || res.reply, res.emotion);
    } catch (err) {
      console.error('[VOICE] Failed to process message:', err);
      setVoiceState('IDLE');
      setCurrentEmotion('idle');
      setTimeout(() => {
        if (hasEnteredWorldRef.current) {
          console.log('[VOICE] restarting recognition');
          startListeningTurn();
        }
      }, 1000);
    }
  };

  // Toggle microphone manually
  const handleToggleMic = () => {
    if (voiceState === 'SPEAKING' || voiceState === 'GREETING') {
      ttsService.stop();
      setVoiceState('IDLE');
    }

    if (voiceState === 'LISTENING') {
      speechRecognizer.stopListening();
      setVoiceState('IDLE');
      return;
    }

    startListeningTurn();
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const muted = ttsService.toggleMute();
    setIsMuted(muted);
    if (muted && voiceState === 'LISTENING') {
      speechRecognizer.stopListening();
      setVoiceState('IDLE');
    }
  };

  // Replay speech
  const handleReplayLastSpeech = () => {
    if (lastReply) {
      speechRecognizer.stopListening();
      setVoiceState('SPEAKING');
      playSpeech(lastReply, currentEmotion);
    }
  };

  // Personality Mode change
  const handleSelectMode = (mode: PersonalityMode) => {
    updateActiveSession((prev) => ({
      ...prev,
      mode
    }));
  };

  // Memory Handlers
  const handleAddMemory = (category: keyof MemoryStore, item: string) => {
    setMemories((prev) => addMemoryItem(prev, category, item));
  };

  const handleDeleteMemory = (category: keyof MemoryStore, index: number) => {
    setMemories((prev) => removeMemoryItem(prev, category, index));
  };

  const handleClearAllMemories = () => {
    setMemories(clearAllMemories());
    setRichMemories([]);
  };

  // Session Handlers
  const handleNewSession = () => {
    const fresh = createNewSession(currentMode);
    const updated = [fresh, ...sessions];
    setSessions(updated);
    saveSessions(updated);
    setActiveId(fresh.id);
    setActiveSessionId(fresh.id);
    setIsSessionOpen(false);
  };

  const handleSelectSession = (id: string) => {
    setActiveId(id);
    setActiveSessionId(id);
    setIsSessionOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    if (sessions.length <= 1) return;
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    saveSessions(remaining);
    if (activeSessionId === id) {
      setActiveId(remaining[0].id);
      setActiveSessionId(remaining[0].id);
    }
  };

  return (
    <div className="living-room-app-wrapper">
      {/* 1. Ambient Cozy Virtual Room Backdrop */}
      <div className="ambient-room-backdrop">
        <div className="ambient-lamp-glow top-left-lamp" />
        <div className="ambient-lamp-glow warm-center-glow" />
        <div className="cozy-room-grid-overlay" />
      </div>

      {/* 2. Central Living Character: Rihaan */}
      <main className="central-character-stage">
        <AvatarEngine
          emotion={currentEmotion}
          isListening={isListening}
          isThinking={isThinking}
          isSpeaking={isSpeaking}
          onAvatarClick={handleToggleMic}
        />
      </main>

      {/* 3. Floating Minimal HUD Overlay */}
      {hasEnteredWorld && (
        <FloatingHUD
          currentMode={currentMode}
          onModeChange={handleSelectMode}
          voiceState={voiceState}
          errorMessage={voiceErrorMessage}
          isListening={isListening}
          isThinking={isThinking}
          isSpeaking={isSpeaking}
          currentEmotion={currentEmotion}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onToggleMic={handleToggleMic}
          onEndConversation={handleEndConversation}
          onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
          onOpenChat={() => setIsChatOpen(true)}
          onOpenMemory={() => setIsMemoryOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          lastReplyText={lastReply}
          interimTranscript={interimTranscript}
          onReplayLastReply={handleReplayLastSpeech}
          activeTopic={learningState.activeTopic}
          activeConcept={learningState.activeConcept}
        />
      )}

      {/* 4. Welcome / First Launch Enter Modal */}
      {!hasEnteredWorld && (
        <EnterWorldModal
          onEnter={handleEnterWorld}
          onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
          userName={userName}
        />
      )}

      {/* 5. Slide-out Secondary Text Chat Drawer */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={currentSession.messages}
        onSendMessage={handleProcessUserMessage}
        isSpeaking={isSpeaking}
        currentMode={currentMode}
      />

      {/* 6. Memory & Adaptive Learning Modal */}
      <MemoryModal
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        memories={memories}
        richMemories={richMemories}
        learningState={learningState}
        memoryEnabled={memoryEnabled}
        onToggleMemoryEnabled={(val) => {
          setMemoryEnabled(val);
          saveMemoryEnabled(val);
        }}
        onAddMemory={handleAddMemory}
        onDeleteMemory={handleDeleteMemory}
        onDeleteRichMemory={(id) => {
          setRichMemories((prev) => deleteRichMemoryItem(prev, id));
        }}
        onClearAll={handleClearAllMemories}
        onUpdateLearningMastery={(topic, concept, status) => {
          setLearningState((prev) => updateConceptMastery(prev, topic, concept, status));
        }}
      />

      {/* 7. Session History Drawer */}
      <SessionDrawer
        isOpen={isSessionOpen}
        onClose={() => setIsSessionOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
      />

      {/* 8. Settings Preferences Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        proactiveTalking={proactiveTalking}
        onToggleProactive={() => setProactiveTalking((p) => !p)}
        continuousVoice={continuousVoice}
        onToggleContinuous={() => setContinuousVoice((c) => !c)}
        userName={userName}
        onUpdateUserName={handleUpdateUserName}
        speechLanguage={speechLanguage}
        onLanguageChange={(lang) => {
          setSpeechLanguage(lang);
          speechRecognizer.setLanguage(lang);
        }}
        speechVolume={speechVolume}
        onVolumeChange={handleVolumeChange}
      />

      {/* 9. Standalone Voice & Hardware Diagnostics Modal */}
      <VoiceDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />
    </div>
  );
};

export default App;
