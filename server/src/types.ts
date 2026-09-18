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
  importance: number; // 1 (low) to 5 (critical/permanent)
  createdAt: number;
  updatedAt: number;
  lastAccessedAt?: number;
  source: 'explicit' | 'inferred';
  confidence: number; // 0.0 to 1.0
  tags: string[];
  active: boolean;
}

// Backward-compatible category string map for legacy client components
export interface MemoryStore {
  profile: string[];
  likes: string[];
  dislikes: string[];
  goals: string[];
  important_context: string[];
  current_context: string[];
  projects: string[];
  // Legacy fields
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

export interface ChatMessage {
  id: string;
  sender: 'user' | 'vihaan' | 'rihaan';
  text: string;
  timestamp: number;
  emotion?: AvatarEmotion;
  action?: CharacterAction;
}

export interface CandidateMemory {
  content: string;
  category: MemoryCategory;
  importance?: number;
  tags?: string[];
  source?: 'explicit' | 'inferred';
  confidence?: number;
}

export interface StructuredAiOutput {
  reply: string;
  speechText?: string;
  emotion: AvatarEmotion;
  action?: CharacterAction;
  intent?: ConversationIntent;
  shouldRemember?: boolean;
  memoryCandidates?: CandidateMemory[];
  forgetRequests?: string[];
  learning?: {
    active: boolean;
    topic?: string;
    concept?: string;
    status?: MasteryLevel;
    difficulty?: 'easy' | 'medium' | 'hard';
    misconception?: string;
    needsCheck?: boolean;
  };
  openLoop?: string | null;
  resolvedLoopId?: string | null;
  followUp?: string | null;
}

export interface ChatRequest {
  message: string;
  history: ChatMessage[];
  mode: PersonalityMode;
  memories: MemoryStore;
  richMemories?: MemoryItem[];
  learningState?: LearningState;
  openLoops?: OpenLoopItem[];
  memoryEnabled?: boolean;
  userName?: string;
}

export interface ChatResponse {
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
  authoritativeMemories?: MemoryItem[];
}
