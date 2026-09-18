import {
  MemoryItem,
  MemoryStore,
  MemoryCategory,
  CandidateMemory
} from '../types.js';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'am', 'i', 'me', 'my',
  'you', 'your', 'we', 'our', 'he', 'she', 'it', 'they', 'them', 'this', 'that', 'these',
  'those', 'to', 'for', 'in', 'on', 'at', 'by', 'from', 'with', 'about', 'as', 'into',
  'like', 'through', 'after', 'over', 'between', 'out', 'against', 'during', 'without',
  'before', 'under', 'around', 'among', 'haan', 'nahi', 'kya', 'hai', 'ho', 'ko', 'se',
  'mein', 'par', 'bhi', 'toh', 'ab', 'aaj', 'kal', 'yaar', 'batao', 'kuch', 'please', 'just'
]);

export function extractSearchTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Converts a legacy string-categorized MemoryStore into a normalized MemoryItem array.
 */
export function convertLegacyToMemoryItems(store: MemoryStore): MemoryItem[] {
  const items: MemoryItem[] = [];
  const now = Date.now();

  const categoryMap: Record<keyof MemoryStore, MemoryCategory> = {
    profile: 'identity',
    likes: 'interest',
    dislikes: 'preference',
    goals: 'goal',
    important_context: 'relationship',
    current_context: 'temporary_context',
    projects: 'project',
    preferences: 'preference',
    interests: 'interest',
    conversation_facts: 'experience',
    study_topics: 'learning',
    current_projects: 'project',
    recurring_problems: 'experience',
    important_people: 'relationship'
  };

  for (const [key, category] of Object.entries(categoryMap)) {
    const list = store[key as keyof MemoryStore];
    if (Array.isArray(list)) {
      list.forEach((content, index) => {
        if (typeof content === 'string' && content.trim()) {
          const clean = content.trim();
          items.push({
            id: `legacy_${key}_${index}_${clean.substring(0, 12).replace(/\s+/g, '_')}`,
            content: clean,
            category,
            importance: category === 'identity' || category === 'goal' || category === 'project' ? 4 : 3,
            createdAt: now,
            updatedAt: now,
            source: 'inferred',
            confidence: 0.9,
            tags: extractSearchTokens(clean),
            active: true
          });
        }
      });
    }
  }

  return items;
}

/**
 * Converts a MemoryItem array back into a legacy MemoryStore for compatibility.
 */
export function convertMemoryItemsToLegacy(items: MemoryItem[]): MemoryStore {
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

/**
 * Check if the user is giving an explicit command to remember or forget.
 */
export function detectExplicitMemoryIntent(userText: string): {
  isExplicitRemember: boolean;
  isExplicitForget: boolean;
  targetText?: string;
  category?: MemoryCategory;
} {
  const clean = userText.trim();

  // Explicit Remember patterns
  const rememberPatterns = [
    /^(?:please\s+)?remember\s+that\s+(.+)$/i,
    /^(?:please\s+)?remember\s+(.+)$/i,
    /^(?:don't|do not)\s+forget\s+that\s+(.+)$/i,
    /^(?:don't|do not)\s+forget\s+(.+)$/i,
    /^(?:keep in mind|note that|make a note that)\s+(.+)$/i,
    /^(?:yaad rakhna ki|yaad rakh)\s+(.+)$/i
  ];

  for (const rx of rememberPatterns) {
    const match = rx.exec(clean);
    if (match && match[1]?.trim()) {
      let content = match[1].trim();
      let category: MemoryCategory = 'identity';
      if (/project|app|website|code|building|tool/i.test(content)) category = 'project';
      else if (/want to learn|target|goal|plan to|aiming to/i.test(content)) category = 'goal';
      else if (/like|love|enjoy|prefer/i.test(content)) category = 'interest';
      else if (/hate|dislike|can't stand/i.test(content)) category = 'preference';
      else if (/learn|study|understand/i.test(content)) category = 'learning';

      return {
        isExplicitRemember: true,
        isExplicitForget: false,
        targetText: content,
        category
      };
    }
  }

  // Explicit Forget patterns
  const forgetPatterns = [
    /^(?:please\s+)?forget\s+that\s+(.+)$/i,
    /^(?:please\s+)?forget\s+(?:about\s+)?(.+)$/i,
    /^(?:delete|remove|erase)\s+(?:the\s+)?memory\s+(?:about\s+)?(.+)$/i,
    /^(?:bhool jao|bhula do)\s+(.+)$/i
  ];

  for (const rx of forgetPatterns) {
    const match = rx.exec(clean);
    if (match && match[1]?.trim()) {
      return {
        isExplicitRemember: false,
        isExplicitForget: true,
        targetText: match[1].trim()
      };
    }
  }

  return { isExplicitRemember: false, isExplicitForget: false };
}

/**
 * Filter out trivial chat phrases that should never become permanent memory.
 */
export function isTrivialCandidate(text: string): boolean {
  const clean = text.trim();
  if (clean.length < 5) return true;

  const trivialRegexes = [
    /^(?:i(?:'m| am)?\s+)?(?:bored|tired|sleepy|hungry|exhausted|thak gaya|thak gayi)$/i,
    /^(?:hi|hello|hey|yo|namaste|good morning|good evening|good night|bye)$/i,
    /^(?:ok|okay|yeah|yep|yes|nah|no|nope|hmm+|kuch nahi|nothing|theek hai)$/i,
    /^(?:what are you doing|kya kar rahe ho|what's up|kuch bolo)$/i,
    /^(?:tell me a joke|tell me something random)$/i,
    /^(?:user said|user asked|user is listening|user replied)/i
  ];

  return trivialRegexes.some((rx) => rx.test(clean));
}

/**
 * Calculates similarity between two text snippets based on token overlap.
 */
export function calculateTokenSimilarity(textA: string, textB: string): number {
  const tokensA = new Set(extractSearchTokens(textA));
  const tokensB = new Set(extractSearchTokens(textB));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Selects only the most relevant memories for the current prompt.
 * Avoids dumping everything. Respects importance and recency.
 */
export function retrieveContextualMemories(
  memories: MemoryItem[],
  query: string,
  maxCount: number = 6
): MemoryItem[] {
  const activeList = memories.filter((m) => m.active);
  if (activeList.length === 0) return [];

  const tokens = extractSearchTokens(query);

  const scored = activeList.map((item) => {
    let score = 0;
    const contentLower = item.content.toLowerCase();

    // Token match scoring
    for (const token of tokens) {
      if (contentLower.includes(token)) {
        score += 3;
      }
      if (item.tags && item.tags.includes(token)) {
        score += 2;
      }
    }

    // Category weighting
    if (item.category === 'identity') score += 1.5;
    if (item.category === 'project' && /code|build|project|app|bug|error|repo/i.test(query)) score += 3;
    if (item.category === 'goal' && /learn|study|future|target|want to/i.test(query)) score += 2.5;
    if (item.category === 'temporary_context') score += 1;

    // Importance multiplier (1 to 5)
    score += item.importance * 0.75;

    return { item, score };
  });

  // Filter items with meaningful match or base importance
  const matches = scored.filter((s) => s.score > 3).sort((a, b) => b.score - a.score);

  if (matches.length > 0) {
    return matches.slice(0, maxCount).map((m) => m.item);
  }

  // Fallback: If no direct query match, supply up to 3 core baseline anchors (identity / current project / primary goal)
  const baseline = activeList
    .filter((m) => m.category === 'identity' || m.category === 'project' || m.category === 'goal')
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 3);

  return baseline;
}

/**
 * Formats retrieved memories for injection into Rihaan's system context.
 * Memory is naturalized: no database IDs, no clinical robotic jargon.
 */
export function formatMemoriesForContext(memories: MemoryItem[]): string {
  if (memories.length === 0) return 'No specific past memories active for this topic.';

  return memories
    .map((m) => `- [${m.category.toUpperCase()}]: ${m.content}`)
    .join('\n');
}

/**
 * Merge new candidate memories into the existing memory list.
 * Deduplicates and updates existing items if closely matching.
 */
export function mergeCandidateMemories(
  existing: MemoryItem[],
  candidates: CandidateMemory[]
): { updatedList: MemoryItem[]; newItems: MemoryItem[] } {
  const result = [...existing];
  const newlyAdded: MemoryItem[] = [];
  const now = Date.now();

  for (const cand of candidates) {
    if (isTrivialCandidate(cand.content)) continue;

    const content = cand.content.trim();
    // Check for duplicate or near-duplicate (similarity > 0.65)
    const existingIndex = result.findIndex((item) => {
      if (!item.active) return false;
      if (item.content.toLowerCase() === content.toLowerCase()) return true;
      return calculateTokenSimilarity(item.content, content) > 0.65;
    });

    if (existingIndex >= 0) {
      // Update existing item with newer content or bumped importance/timestamp
      const old = result[existingIndex];
      result[existingIndex] = {
        ...old,
        content: content.length > old.content.length ? content : old.content,
        importance: Math.max(old.importance, cand.importance || 3),
        updatedAt: now,
        confidence: Math.max(old.confidence, cand.confidence || 0.8),
        tags: Array.from(new Set([...old.tags, ...(cand.tags || extractSearchTokens(content))]))
      };
    } else {
      const newItem: MemoryItem = {
        id: `mem_${now}_${Math.random().toString(36).substring(2, 7)}`,
        content,
        category: cand.category || 'experience',
        importance: cand.importance || 3,
        createdAt: now,
        updatedAt: now,
        source: cand.source || 'inferred',
        confidence: cand.confidence || 0.85,
        tags: cand.tags || extractSearchTokens(content),
        active: true
      };
      result.push(newItem);
      newlyAdded.push(newItem);
    }
  }

  return { updatedList: result, newItems: newlyAdded };
}

/**
 * Invalidate / deactivate memories matching forget queries.
 */
export function removeMemoriesByQuery(
  existing: MemoryItem[],
  query: string
): { updatedList: MemoryItem[]; removedIds: string[] } {
  const tokens = extractSearchTokens(query);
  const removedIds: string[] = [];

  const updatedList = existing.map((item) => {
    const itemLower = item.content.toLowerCase();
    const hasMatch = tokens.some((t) => itemLower.includes(t));
    if (hasMatch) {
      removedIds.push(item.id);
      return { ...item, active: false, updatedAt: Date.now() };
    }
    return item;
  });

  return { updatedList, removedIds };
}
