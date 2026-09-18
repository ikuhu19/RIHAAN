export type VoiceState =
  | 'IDLE'
  | 'INITIALIZING'
  | 'GREETING'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'MIC_ERROR';

export type AvatarEmotion =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'happy'
  | 'sad'
  | 'surprised'
  | 'playful';

export type EmotionalTone =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'excited'
  | 'tired'
  | 'confused'
  | 'playful'
  | 'serious'
  | 'neutral';

export type PersonalityMode =
  | 'alter_ego'
  | 'best_friend'
  | 'roast'
  | 'study'
  | 'night_2am';

export interface MemoryStore {
  profile: string[];
  likes: string[];
  dislikes: string[];
  goals: string[];
  important_context: string[];
  current_context: string[];
  projects: string[];
  // Backwards compatibility
  preferences?: string[];
  interests?: string[];
  conversation_facts?: string[];
  study_topics?: string[];
  current_projects?: string[];
  recurring_problems?: string[];
  important_people?: string[];
}

export type CharacterAction = 'sit' | 'stand' | 'walk_near' | 'walk_chair' | 'none';
export type CharacterPosture = 'sitting' | 'standing' | 'walking';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'vihaan';
  text: string;
  timestamp: number;
  emotion?: AvatarEmotion;
  action?: CharacterAction;
}

export interface ConversationSession {
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
  mode: PersonalityMode;
}

