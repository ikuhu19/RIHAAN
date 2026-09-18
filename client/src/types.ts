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
  | 'playful'
  | 'curious'
  | 'serious'
  | 'teasing'
  | 'concerned';

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

export type MemoryCategory =
  | 'identity'
  | 'preference'
  | 'interest'
  | 'project'
  | 'skill'
  | 'goal'
  | 'learning'
  | 'experience'
  | 'relationship'
  | 'instruction'
  | 'important_event'
  | 'temporary_context';

export interface MemoryItem {
  id: string;
  content: string;
  category: MemoryCategory;
  importance: number; // 1 to 5
  createdAt: number;
  updatedAt: number;
  lastAccessedAt?: number;
  source: 'explicit' | 'inferred';
  confidence: number;
  tags: string[];
  active: boolean;
}

export interface MemoryStore {
  profile: string[];
  likes: string[];
  dislikes: string[];
  goals: string[];
  important_context: string[];
  current_context: string[];
  projects: string[];
  // Legacy compatibility
  preferences?: string[];
  interests?: string[];
  conversation_facts?: string[];
  study_topics?: string[];
  current_projects?: string[];
  recurring_problems?: string[];
  important_people?: string[];
}

export type MasteryLevel =
  | 'beginner'
  | 'struggling'
  | 'practicing'
  | 'understood'
  | 'mastered';

export interface LearningConcept {
  name: string;
  status: MasteryLevel;
  difficulty?: 'easy' | 'medium' | 'hard';
  notes?: string;
  lastPracticed: number;
  attemptsCount: number;
  misconceptions?: string[];
}

export interface LearningTopic {
  topic: string;
  concepts: Record<string, LearningConcept>;
  currentGoal?: string;
  notes?: string;
}

export interface LearningState {
  topics: Record<string, LearningTopic>;
  activeTopic?: string;
  activeConcept?: string;
}

export interface OpenLoopItem {
  id: string;
  content: string;
  topic?: string;
  status: 'open' | 'resolved';
  createdAt: number;
  lastReferencedAt?: number;
}

export type ConversationIntent =
  | 'casual_chat'
  | 'question'
  | 'teaching'
  | 'learning'
  | 'coding'
  | 'debugging'
  | 'brainstorming'
  | 'planning'
  | 'project_discussion'
  | 'memory_request'
  | 'reflection'
  | 'follow_up';

export type CharacterAction = 'sit' | 'stand' | 'walk_near' | 'walk_chair' | 'none';
export type CharacterPosture = 'sitting' | 'standing' | 'walking';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'vihaan' | 'rihaan';
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
