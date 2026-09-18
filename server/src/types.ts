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
  // Backwards compatibility for existing local stores
  preferences?: string[];
  interests?: string[];
  conversation_facts?: string[];
  study_topics?: string[];
  current_projects?: string[];
  recurring_problems?: string[];
  important_people?: string[];
}

export type CharacterAction = 'sit' | 'stand' | 'walk_near' | 'walk_chair' | 'none';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'vihaan';
  text: string;
  timestamp: number;
  emotion?: AvatarEmotion;
  action?: CharacterAction;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
  mode: PersonalityMode;
  memories: MemoryStore;
  memoryEnabled?: boolean;
}

export interface ChatResponse {
  reply: string;
  emotion: AvatarEmotion;
  action?: CharacterAction;
  extractedMemories?: Partial<MemoryStore>;
}


