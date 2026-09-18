import { ConversationSession, ChatMessage, PersonalityMode } from '../types';

const SESSIONS_KEY = 'vihaan_sessions_v1';
const ACTIVE_SESSION_KEY = 'vihaan_active_session_v1';

export function createNewSession(mode: PersonalityMode = 'best_friend'): ConversationSession {
  return {
    id: 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title: 'New Conversation',
    createdAt: Date.now(),
    messages: [
      {
        id: 'init_' + Date.now(),
        sender: 'vihaan',
        text: "I'm right here. What's on your mind today, yaar?",
        timestamp: Date.now(),
        emotion: 'happy'
      }
    ],
    mode
  };
}

export function loadSessions(): ConversationSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) {
      const initial = [createNewSession()];
      saveSessions(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const initial = [createNewSession()];
      saveSessions(initial);
      return initial;
    }
    return parsed;
  } catch (e) {
    console.error('Failed to load sessions:', e);
    return [createNewSession()];
  }
}

export function saveSessions(sessions: ConversationSession[]): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save sessions:', e);
  }
}

export function getActiveSessionId(sessions: ConversationSession[]): string {
  const stored = localStorage.getItem(ACTIVE_SESSION_KEY);
  if (stored && sessions.some((s) => s.id === stored)) {
    return stored;
  }
  return sessions[0]?.id || '';
}

export function setActiveSessionId(id: string): void {
  localStorage.setItem(ACTIVE_SESSION_KEY, id);
}
