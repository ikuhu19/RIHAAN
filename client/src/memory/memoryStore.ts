import {
  MemoryStore,
  MemoryItem,
  MemoryCategory,
  LearningState,
  OpenLoopItem,
  MasteryLevel
} from '../types';

const STORAGE_KEY = 'vihaan_memories_v2';
const RICH_STORAGE_KEY = 'rihaan_rich_memories_v1';
const LEARNING_STORAGE_KEY = 'rihaan_learning_state_v1';
const LOOPS_STORAGE_KEY = 'rihaan_open_loops_v1';
const TOGGLE_KEY = 'vihaan_memory_enabled_v1';

export const DEFAULT_MEMORIES: MemoryStore = {
  profile: ['Name: Kuhu', 'Prefers honest, straightforward advice and warm conversation'],
  likes: ['Coding & technology', 'Late night deep talks', 'Cold brew coffee'],
  dislikes: ['Unnecessary corporate formality', 'Endless procrastination guilt'],
  goals: ['Master Python and data structures', 'Stay consistent with daily learning'],
  important_context: ['Rihaan is her close AI best friend & alter ego'],
  current_context: ['College coursework and project submissions'],
  projects: ['AI companion interactive web application']
};

export const DEFAULT_LEARNING_STATE: LearningState = {
  topics: {
    Python: {
      topic: 'Python',
      currentGoal: 'Master fundamentals, data structures, and build practical projects',
      concepts: {
        Variables: {
          name: 'Variables',
          status: 'understood',
          lastPracticed: Date.now() - 86400000 * 3,
          attemptsCount: 3,
          notes: 'Solid on basics and types'
        },
        Functions: {
          name: 'Functions',
          status: 'understood',
          lastPracticed: Date.now() - 86400000 * 2,
          attemptsCount: 4,
          notes: 'Understands arguments and returns'
        },
        Dictionaries: {
          name: 'Dictionaries',
          status: 'practicing',
          lastPracticed: Date.now() - 86400000,
          attemptsCount: 2,
          notes: 'Comfortable with key-value access, needs practice with nested structures'
        },
        Classes: {
          name: 'Classes',
          status: 'struggling',
          lastPracticed: Date.now() - 86400000,
          attemptsCount: 2,
          notes: 'Finds OOP and self confusing; prefers procedural style',
          misconceptions: ['Thinks classes are just dictionaries with functions']
        },
        Recursion: {
          name: 'Recursion',
          status: 'struggling',
          lastPracticed: Date.now() - 86400000 * 4,
          attemptsCount: 2,
          notes: 'Gets stuck on the base case exit condition and call stack order',
          misconceptions: ['Views recursion as an infinite loop rather than shrinking problem']
        }
      }
    }
  },
  activeTopic: 'Python',
  activeConcept: 'Classes'
};

export const DEFAULT_OPEN_LOOPS: OpenLoopItem[] = [
  {
    id: 'loop_init_1',
    content: 'Practice recursion base cases and call stacks with a 3-line example',
    topic: 'Python',
    status: 'open',
    createdAt: Date.now() - 86400000
  }
];

export function loadMemoryEnabled(): boolean {
  try {
    const raw = localStorage.getItem(TOGGLE_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch (e) {
    return true;
  }
}

export function saveMemoryEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(TOGGLE_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.error('Failed to save memory enabled toggle:', e);
  }
}

// Convert legacy memory store to rich memory items
export function convertStoreToRich(store: MemoryStore): MemoryItem[] {
  const items: MemoryItem[] = [];
  const now = Date.now();

  const mapping: { key: keyof MemoryStore; category: MemoryCategory; imp: number }[] = [
    { key: 'profile', category: 'identity', imp: 4 },
    { key: 'likes', category: 'interest', imp: 3 },
    { key: 'dislikes', category: 'preference', imp: 3 },
    { key: 'goals', category: 'goal', imp: 4 },
    { key: 'important_context', category: 'relationship', imp: 3 },
    { key: 'current_context', category: 'temporary_context', imp: 2 },
    { key: 'projects', category: 'project', imp: 4 }
  ];

  for (const m of mapping) {
    const list = store[m.key];
    if (Array.isArray(list)) {
      list.forEach((content, index) => {
        if (typeof content === 'string' && content.trim()) {
          items.push({
            id: `rich_${m.key}_${index}_${Math.random().toString(36).substring(2, 6)}`,
            content: content.trim(),
            category: m.category,
            importance: m.imp,
            createdAt: now,
            updatedAt: now,
            source: 'inferred',
            confidence: 0.9,
            tags: content.toLowerCase().split(/\s+/).filter((w) => w.length > 2),
            active: true
          });
        }
      });
    }
  }

  return items;
}

// Convert rich items back to legacy store
export function convertRichToStore(items: MemoryItem[]): MemoryStore {
  const store: MemoryStore = {
    profile: [],
    likes: [],
    dislikes: [],
    goals: [],
    important_context: [],
    current_context: [],
    projects: []
  };

  for (const item of items) {
    if (!item.active) continue;
    switch (item.category) {
      case 'identity':
      case 'instruction':
        store.profile.push(item.content);
        break;
      case 'interest':
        store.likes.push(item.content);
        break;
      case 'preference':
        store.dislikes.push(item.content);
        break;
      case 'goal':
        store.goals.push(item.content);
        break;
      case 'relationship':
      case 'important_event':
      case 'experience':
        store.important_context.push(item.content);
        break;
      case 'temporary_context':
        store.current_context.push(item.content);
        break;
      case 'project':
      case 'skill':
      case 'learning':
        store.projects.push(item.content);
        break;
    }
  }

  return store;
}

export function loadMemories(): MemoryStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_MEMORIES;
    }
    const parsed = JSON.parse(raw);
    return {
      profile: Array.isArray(parsed.profile) ? parsed.profile : DEFAULT_MEMORIES.profile,
      likes: Array.isArray(parsed.likes) ? parsed.likes : [],
      dislikes: Array.isArray(parsed.dislikes) ? parsed.dislikes : [],
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      important_context: Array.isArray(parsed.important_context) ? parsed.important_context : [],
      current_context: Array.isArray(parsed.current_context) ? parsed.current_context : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : []
    };
  } catch (e) {
    console.error('Failed to load memories:', e);
    return DEFAULT_MEMORIES;
  }
}

export function saveMemories(memories: MemoryStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  } catch (e) {
    console.error('Failed to save memories:', e);
  }
}

export function loadRichMemories(): MemoryItem[] {
  try {
    const raw = localStorage.getItem(RICH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Auto-migrate from existing legacy store
    const legacy = loadMemories();
    const converted = convertStoreToRich(legacy);
    saveRichMemories(converted);
    return converted;
  } catch (e) {
    console.error('Failed to load rich memories, falling back:', e);
    return convertStoreToRich(DEFAULT_MEMORIES);
  }
}

export function saveRichMemories(items: MemoryItem[]): void {
  try {
    localStorage.setItem(RICH_STORAGE_KEY, JSON.stringify(items));
    // Keep legacy store synchronized
    const legacy = convertRichToStore(items);
    saveMemories(legacy);
  } catch (e) {
    console.error('Failed to save rich memories:', e);
  }
}

export function addRichMemoryItem(
  current: MemoryItem[],
  content: string,
  category: MemoryCategory = 'identity',
  importance: number = 3
): MemoryItem[] {
  const clean = content.trim();
  if (!clean) return current;

  const newItem: MemoryItem = {
    id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    content: clean,
    category,
    importance,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: 'explicit',
    confidence: 1.0,
    tags: clean.toLowerCase().split(/\s+/).filter((w) => w.length > 2),
    active: true
  };

  const updated = [newItem, ...current];
  saveRichMemories(updated);
  return updated;
}

export function deleteRichMemoryItem(current: MemoryItem[], id: string): MemoryItem[] {
  const updated = current.filter((m) => m.id !== id);
  saveRichMemories(updated);
  return updated;
}

export function updateRichMemoryItem(
  current: MemoryItem[],
  id: string,
  updates: Partial<MemoryItem>
): MemoryItem[] {
  const updated = current.map((m) => (m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m));
  saveRichMemories(updated);
  return updated;
}

// Learning state persistence
export function loadLearningState(): LearningState {
  try {
    const raw = localStorage.getItem(LEARNING_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    return DEFAULT_LEARNING_STATE;
  } catch (e) {
    return DEFAULT_LEARNING_STATE;
  }
}

export function saveLearningState(state: LearningState): void {
  try {
    localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save learning state:', e);
  }
}

export function updateConceptMastery(
  state: LearningState,
  topicName: string,
  conceptName: string,
  newStatus: MasteryLevel
): LearningState {
  const topics = { ...state.topics };
  if (!topics[topicName]) {
    topics[topicName] = { topic: topicName, concepts: {} };
  }
  const topic = { ...topics[topicName] };
  const existingConcept = topic.concepts[conceptName] || {
    name: conceptName,
    status: newStatus,
    lastPracticed: Date.now(),
    attemptsCount: 1
  };

  topic.concepts = {
    ...topic.concepts,
    [conceptName]: {
      ...existingConcept,
      status: newStatus,
      lastPracticed: Date.now()
    }
  };
  topics[topicName] = topic;

  const nextState: LearningState = { ...state, topics };
  saveLearningState(nextState);
  return nextState;
}

// Open Loops persistence
export function loadOpenLoops(): OpenLoopItem[] {
  try {
    const raw = localStorage.getItem(LOOPS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    return DEFAULT_OPEN_LOOPS;
  } catch (e) {
    return DEFAULT_OPEN_LOOPS;
  }
}

export function saveOpenLoops(loops: OpenLoopItem[]): void {
  try {
    localStorage.setItem(LOOPS_STORAGE_KEY, JSON.stringify(loops));
  } catch (e) {
    console.error('Failed to save open loops:', e);
  }
}

// Legacy helpers preserved
export function addMemoryItem(
  memories: MemoryStore,
  category: keyof MemoryStore,
  text: string
): MemoryStore {
  const clean = text.trim();
  const list = memories[category] || [];
  if (!clean || list.includes(clean)) return memories;

  const updated: MemoryStore = {
    ...memories,
    [category]: [...list, clean]
  };
  saveMemories(updated);
  return updated;
}

export function removeMemoryItem(
  memories: MemoryStore,
  category: keyof MemoryStore,
  index: number
): MemoryStore {
  const list = memories[category] || [];
  const updated: MemoryStore = {
    ...memories,
    [category]: list.filter((_, i) => i !== index)
  };
  saveMemories(updated);
  return updated;
}

export function clearAllMemories(): MemoryStore {
  const empty: MemoryStore = {
    profile: [],
    likes: [],
    dislikes: [],
    goals: [],
    important_context: [],
    current_context: [],
    projects: []
  };
  saveMemories(empty);
  saveRichMemories([]);
  return empty;
}

export function mergeExtractedMemories(
  current: MemoryStore,
  extracted?: Partial<MemoryStore>
): MemoryStore {
  if (!extracted) return current;

  let changed = false;
  const updated: MemoryStore = { ...current };

  const categories: (keyof MemoryStore)[] = [
    'profile',
    'likes',
    'dislikes',
    'goals',
    'important_context',
    'current_context',
    'projects'
  ];

  for (const cat of categories) {
    const newItems = extracted[cat];
    if (Array.isArray(newItems) && newItems.length > 0) {
      const existingList = [...(updated[cat] || [])];
      for (const item of newItems) {
        if (
          item &&
          typeof item === 'string' &&
          !existingList.some((ex) => ex.toLowerCase() === item.toLowerCase())
        ) {
          existingList.push(item);
          changed = true;
        }
      }
      updated[cat] = existingList;
    }
  }

  if (changed) {
    saveMemories(updated);
  }
  return updated;
}
