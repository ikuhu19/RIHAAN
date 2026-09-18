import {
  ChatMessage,
  PersonalityMode,
  MemoryStore,
  MemoryItem,
  LearningState,
  OpenLoopItem,
  AvatarEmotion,
  CharacterAction,
  ConversationIntent
} from '../types';

export interface ChatApiResponse {
  reply: string;
  speechText?: string;
  emotion: AvatarEmotion;
  action?: CharacterAction;
  intent?: ConversationIntent;
  extractedMemories?: Partial<MemoryStore>;
  newMemories?: MemoryItem[];
  removedMemoryIds?: string[];
  updatedLearningState?: LearningState;
  updatedOpenLoops?: OpenLoopItem[];
  followUp?: string | null;
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
  mode: PersonalityMode,
  memories: MemoryStore,
  memoryEnabled: boolean = true,
  richMemories?: MemoryItem[],
  learningState?: LearningState,
  openLoops?: OpenLoopItem[],
  userName: string = 'Kuhu'
): Promise<ChatApiResponse> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history,
        mode,
        memories,
        richMemories,
        learningState,
        openLoops,
        memoryEnabled,
        userName
      })
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.warn('Backend /api/chat unreachable, using local intelligent fallback:', error);
    return getLocalClientFallback(message, mode, memories, memoryEnabled, richMemories, userName);
  }
}

function cleanSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, 'Here is the code.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function getLocalClientFallback(
  message: string,
  mode: PersonalityMode,
  memories: MemoryStore,
  memoryEnabled: boolean = true,
  richMemories?: MemoryItem[],
  userName: string = 'Kuhu'
): ChatApiResponse {
  const lower = message.toLowerCase().trim();
  const wordCount = lower.split(/\s+/).filter(Boolean).length;
  let reply = `I'm right here with you, ${userName}. Speak your mind!`;
  let speechText = reply;
  let emotion: AvatarEmotion = 'happy';
  let action: CharacterAction = 'none';
  let intent: ConversationIntent = 'casual_chat';

  const studyTopic = (memoryEnabled && (memories.goals?.[0] || memories.projects?.[0])) || 'Python';

  // Physical Room Action Commands
  if (lower.includes('sit down') || lower.includes('baith jao') || lower.includes('go sit') || lower.includes('chair')) {
    reply = "Haan baba, chair par aakar baith gaya. Relax, I'm comfortable. Ab batao, kya chal raha hai?";
    speechText = reply;
    emotion = 'happy';
    action = 'sit';
    return { reply, speechText, emotion, action, intent: 'casual_chat' };
  }

  if (lower.includes('come here') || lower.includes('idhar aao') || lower.includes('come closer')) {
    reply = `Coming right there! Haan ${userName}, I'm right in front of you. Tell me what's on your mind.`;
    speechText = reply;
    emotion = 'curious';
    action = 'walk_near';
    return { reply, speechText, emotion, action, intent: 'casual_chat' };
  }

  if (lower.includes('stand up') || lower.includes('khade ho jao')) {
    reply = "Alright, standing up! Stretching a bit. Tell me, what are we tackling now?";
    speechText = reply;
    emotion = 'playful';
    action = 'stand';
    return { reply, speechText, emotion, action, intent: 'casual_chat' };
  }

  // Explicit Memory commands
  if (lower.startsWith('remember that') || lower.startsWith("don't forget")) {
    const fact = message.replace(/^(?:remember that|don't forget that|don't forget)\s+/i, '').trim();
    reply = `Locked into memory: "${fact}". I'll keep that firmly in mind.`;
    speechText = `Locked into memory. I'll keep that firmly in mind.`;
    emotion = 'serious';
    return {
      reply,
      speechText,
      emotion,
      action: 'none',
      intent: 'memory_request',
      extractedMemories: {
        profile: [fact]
      }
    };
  }

  if (lower.startsWith('forget that') || lower.startsWith('delete memory')) {
    reply = `Consider it wiped from my records. Clean slate on that.`;
    speechText = reply;
    emotion = 'thinking';
    return { reply, speechText, emotion, action: 'none', intent: 'memory_request' };
  }

  // Brevity / Short-Answer Detection
  const shortAffirmations = ['yeah', 'yes', 'yep', 'hmm', 'kuch nahi', 'nothing', 'theek hai', 'fine', 'nahi', 'kaha', 'ok', 'okay'];
  if (wordCount <= 2 && shortAffirmations.some((w) => lower === w || lower.startsWith(w))) {
    reply = "Hmm... bas 'yeah'? Aise kaise chalega madam? Kuch toh hua hai, bata mujhe. You only give one-word answers when you're either exhausted or sulking.";
    speechText = reply;
    emotion = 'teasing';
    return { reply, speechText, emotion, action, intent: 'casual_chat' };
  }

  // Reel Scrolling & Procrastination
  if (lower.includes('reels') || lower.includes('scrolling')) {
    reply = `Seriously ${userName}? 😭 You could have knocked out a whole concept in that time, but instead the algorithm is feeding you dopamine traps. Put the phone face-down right now. Let's do 15 solid minutes. Deal?`;
    speechText = `Seriously ${userName}? Put the phone face-down right now. Let's do 15 solid minutes together first. Deal?`;
    emotion = 'playful';
    action = 'walk_near';
    return { reply, speechText, emotion, action, intent: 'casual_chat' };
  }

  if (lower.includes('study tomorrow') || lower.includes('kal padh') || lower.includes('kal karungi') || lower.includes('do it tomorrow')) {
    reply = `Kal kabhi nahi aata ${userName}! You said that yesterday too 😭 Look, don't sit for four hours. Let's just do twenty solid minutes right now, and then you're free. Deal?`;
    speechText = `Kal kabhi nahi aata ${userName}! Let's just do twenty solid minutes right now, and then you're free. Deal?`;
    emotion = 'teasing';
    action = 'walk_near';
    return { reply, speechText, emotion, action, intent: 'casual_chat' };
  }

  // Teaching: Recursion
  if (lower.includes('recursion') || lower.includes('recursive')) {
    if (lower.includes("don't understand") || lower.includes('explain') || lower.includes('what is')) {
      reply = `Okay, let's forget the dry textbook definition for a second. Think of it like Russian nesting dolls until you hit the solid one in the center.\n\nBefore I show you code: what do you think would happen if a function kept calling itself forever without that stopping doll?`;
      speechText = `Okay, let's forget the textbook definition. Think of Russian nesting dolls until you reach the solid one in the center. Before we look at code, what do you think would happen if a function kept calling itself forever without a stopping condition?`;
      emotion = 'curious';
      intent = 'teaching';
      return { reply, speechText, emotion, action, intent };
    }
  }

  // Teaching: Classes
  if (lower.includes('class') || lower.includes('classes') || lower.includes('oop')) {
    if (lower.includes('hate') || lower.includes("don't understand") || lower.includes('struggle')) {
      reply = `Fair enough 😂. Classes feel super ceremonial at first. But think of a class like a cookie cutter, and the objects as the actual cookies with their own sprinkles.\n\nSince you already get functions and variables, classes just bundle them together so they don't get lost. Makes sense so far?`;
      speechText = `Fair enough! Classes feel ceremonial at first. But think of a class like a cookie cutter, and objects as the actual cookies. It just bundles variables and functions together. Makes sense so far?`;
      emotion = 'playful';
      intent = 'teaching';
      return { reply, speechText, emotion, action, intent };
    }
  }

  // Coding & Debugging: Don't over-assist
  if (lower.includes('code') && (lower.includes("doesn't work") || lower.includes('error') || lower.includes('bug') || lower.includes('fix'))) {
    reply = `Send me the error first. I don't want to guess what's broken in the dark. What line is it tripping on?`;
    speechText = reply;
    emotion = 'curious';
    intent = 'debugging';
    return { reply, speechText, emotion, action, intent };
  }

  // General questions or study topics
  if (lower.includes("don't know what to study") || lower.includes('what should i study') || lower.includes('kya padhu')) {
    if (memoryEnabled) {
      reply = `You're asking me? What about ${studyTopic} that you planned to finish? Open that chapter right now, let's knock out one topic together.`;
    } else {
      reply = "Pick whatever is most urgent or terrifying right now, and let's do 20 minutes on it together.";
    }
    speechText = reply;
    emotion = 'playful';
    return { reply, speechText, emotion, action, intent: 'casual_chat' };
  }

  // Default fallback
  speechText = cleanSpeech(reply);
  return { reply, speechText, emotion, action, intent };
}
