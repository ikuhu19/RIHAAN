import { MemoryStore } from '../types';

const STORAGE_KEY = 'vihaan_memories_v2';
const TOGGLE_KEY = 'vihaan_memory_enabled_v1';

export const DEFAULT_MEMORIES: MemoryStore = {
  profile: ['Name: Kuhu', 'Prefers honest, straightforward advice and warm conversation'],
  likes: ['Coding & technology', 'Late night deep talks', 'Cold brew coffee'],
  dislikes: ['Unnecessary corporate formality', 'Endless procrastination guilt'],
  goals: ['Master Python and data structures', 'Stay consistent with daily learning'],
  important_context: ['Vihaan is her close AI best friend & alter ego'],
  current_context: ['College coursework and project submissions'],
  projects: ['AI companion interactive web application']
};

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

export function loadMemories(): MemoryStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check legacy v1 key if v2 not yet present
      const legacyRaw = localStorage.getItem('vihaan_memories_v1');
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw);
        return {
          profile: DEFAULT_MEMORIES.profile,
          likes: Array.isArray(legacy.interests) && legacy.interests.length ? legacy.interests : DEFAULT_MEMORIES.likes,
          dislikes: DEFAULT_MEMORIES.dislikes,
          goals: Array.isArray(legacy.goals) && legacy.goals.length ? legacy.goals : DEFAULT_MEMORIES.goals,
          important_context: Array.isArray(legacy.important_context) && legacy.important_context.length ? legacy.important_context : DEFAULT_MEMORIES.important_context,
          current_context: DEFAULT_MEMORIES.current_context,
          projects: Array.isArray(legacy.current_projects) && legacy.current_projects.length ? legacy.current_projects : DEFAULT_MEMORIES.projects
        };
      }
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
  return empty;
}

export function mergeExtractedMemories(
  current: MemoryStore,
  extracted?: Partial<MemoryStore>
): MemoryStore {
  if (!extracted) return current;

  let changed = false;
  const next: MemoryStore = { ...current };

  const validCategories: (keyof MemoryStore)[] = [
    'profile',
    'likes',
    'dislikes',
    'goals',
    'important_context',
    'current_context',
    'projects'
  ];

  validCategories.forEach((key) => {
    const items = extracted[key];
    if (Array.isArray(items)) {
      if (!next[key]) next[key] = [];
      const currentList = next[key]!;
      items.forEach((item) => {
        const clean = item.trim();
        if (clean && !currentList.some((existing) => existing.toLowerCase() === clean.toLowerCase())) {
          currentList.push(clean);
          changed = true;
        }
      });
    }
  });

  if (changed) {
    saveMemories(next);
  }
  return next;
}
