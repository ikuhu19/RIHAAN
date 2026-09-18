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
  'mein', 'par', 'bhi', 'toh', 'ab', 'aaj', 'kal', 'yaar', 'batao', 'kuch', 'please', 'just',
  'want', 'tell', 'know', 'can', 'should', 'would', 'could', 'doing', 'doing'
]);

// Domain keyword associations for conceptual matching
const DOMAIN_ASSOCIATIONS: Record<string, string[]> = {
  python: ['functions', 'classes', 'recursion', 'dictionaries', 'lists', 'variables', 'programming', 'code', 'coding', 'script', 'dsa', 'syntax'],
  programming: ['python', 'react', 'javascript', 'typescript', 'code', 'functions', 'classes', 'debug', 'bug', 'developer'],
  functions: ['python', 'programming', 'code', 'learning', 'arguments', 'parameters', 'return'],
  classes: ['python', 'oop', 'objects', 'programming', 'code', 'learning', 'methods'],
  recursion: ['python', 'functions', 'base_case', 'programming', 'dsa', 'stack'],
  rihaan: ['companion', 'project', 'ai', 'voice', 'avatar', 'room', 'alter_ego', '3d'],
  shelfshare: ['project', 'book', 'sharing', 'completed'],
  react: ['frontend', 'javascript', 'components', 'state', 'hooks', 'ui']
};

export function extractSearchTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Filter out sensitive credentials or API keys for safety and privacy.
 */
export function containsSensitiveData(text: string): boolean {
  const sensitiveRegexes = [
    /(?:api[_-]?key|apikey|secret|password|token|bearer|auth[_-]?token)\s*[:=]\s*[^\s]+/i,
    /\b(?:sk-[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9_-]{35})\b/,
    /\b(?:ghp_[a-zA-Z0-9]{20,}|gho_[a-zA-Z0-9]{20,})\b/,
    /\bpassword\s+is\s+[^\s]+/i
  ];
  return sensitiveRegexes.some((rx) => rx.test(text));
}

/**
 * Filter out trivial chat phrases that should never become permanent memory.
 */
export function isTrivialCandidate(text: string): boolean {
  const clean = text.trim();
  if (clean.length < 5) return true;
  if (containsSensitiveData(clean)) return true;

  const trivialRegexes = [
    /^(?:i(?:'m| am)?\s+)?(?:bored|tired|sleepy|hungry|exhausted|thak gaya|thak gayi)$/i,
    /^(?:hi|hello|hey|yo|namaste|good morning|good evening|good night|bye)$/i,
    /^(?:ok|okay|yeah|yep|yes|nah|no|nope|hmm+|kuch nahi|nothing|theek hai|fine)$/i,
    /^(?:what are you doing|kya kar rahe ho|what's up|kuch bolo)$/i,
    /^(?:tell me a joke|tell me something random)$/i,
    /^(?:user said|user asked|user is listening|user replied)/i,
    /^(?:lol|rofl|lmao|haha|cool|nice|great|thanks|thank you)$/i
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
 * Check if the user is giving an explicit command to remember or forget.
 */
export function detectExplicitMemoryIntent(userText: string): {
  isExplicitRemember: boolean;
  isExplicitForget: boolean;
  targetText?: string;
  category?: MemoryCategory;
} {
  const clean = userText.trim();

  // Explicit Forget patterns
  const forgetPatterns = [
    /^(?:please\s+)?forget\s+that\s+(.+)$/i,
    /^(?:please\s+)?forget\s+(?:about\s+)?(.+)$/i,
    /^(?:don't|do not)\s+remember\s+(?:that\s+)?(.+)$/i,
    /^(?:delete|remove|erase)\s+(?:the\s+)?memory\s+(?:about\s+)?(.+)$/i,
    /^(?:bhool jao|bhula do)\s+(.+)$/i
  ];

  for (const rx of forgetPatterns) {
    const match = rx.exec(clean);
    if (match && match[1]?.trim()) {
      let target = match[1].trim().replace(/^that\s+/i, '');
      return {
        isExplicitRemember: false,
        isExplicitForget: true,
        targetText: target
      };
    }
  }

  // Explicit Remember patterns
  const rememberPatterns = [
    /^(?:please\s+)?remember\s+that\s+(.+)$/i,
    /^(?:please\s+)?remember\s+(?:this\s*:\s*)?(.+)$/i,
    /^(?:don't|do not)\s+forget\s+(?:that\s+)?(.+)$/i,
    /^(?:keep in mind|note that|make a note of|make a note that|save this|you should remember)\s+(?:that\s+)?(.+)$/i,
    /^(?:yaad rakhna ki|yaad rakh)\s+(.+)$/i
  ];

  for (const rx of rememberPatterns) {
    const match = rx.exec(clean);
    if (match && match[1]?.trim()) {
      let content = match[1].trim();
      let category: MemoryCategory = 'identity';
      if (/project|app|website|code|building|tool|repo/i.test(content)) category = 'project';
      else if (/learning|learn|study|understand|master|course/i.test(content)) category = 'learning';
      else if (/want to|target|goal|plan to|aiming to/i.test(content)) category = 'goal';
      else if (/like|love|enjoy|prefer/i.test(content)) category = 'interest';
      else if (/hate|dislike|can't stand|avoid/i.test(content)) category = 'preference';

      return {
        isExplicitRemember: true,
        isExplicitForget: false,
        targetText: content,
        category
      };
    }
  }

  return { isExplicitRemember: false, isExplicitForget: false };
}

/**
 * Contextual Memory Retrieval:
 * Only returns memories that have real semantic or keyword relevance to the current query.
 * If NO memories are relevant, returns an empty array to prevent hallucinations.
 */
export function retrieveContextualMemories(
  memories: MemoryItem[],
  query: string,
  maxCount: number = 6
): MemoryItem[] {
  const activeList = memories.filter((m) => m.active);
  if (activeList.length === 0) return [];

  const tokens = extractSearchTokens(query);
  if (tokens.length === 0) return [];

  // Expand query tokens with domain associations
  const expandedTokens = new Set<string>(tokens);
  for (const token of tokens) {
    if (DOMAIN_ASSOCIATIONS[token]) {
      DOMAIN_ASSOCIATIONS[token].forEach((assoc) => expandedTokens.add(assoc));
    }
  }

  const scored = activeList.map((item) => {
    let matchScore = 0;
    const contentLower = item.content.toLowerCase();
    const itemTokens = extractSearchTokens(item.content);

    // Direct token overlap
    for (const token of tokens) {
      if (contentLower.includes(token)) {
        matchScore += 3.0;
      }
      if (item.tags && item.tags.includes(token)) {
        matchScore += 2.5;
      }
    }

    // Domain association overlap
    for (const itemToken of itemTokens) {
      if (expandedTokens.has(itemToken)) {
        matchScore += 2.0;
      }
    }

    // Category weighting if relevant to user intent
    if (item.category === 'project' && /project|build|app|code|repo/i.test(query)) matchScore += 3.0;
    if (item.category === 'learning' && /learn|study|function|class|recursion|concept|python|code/i.test(query)) matchScore += 3.0;
    if (item.category === 'goal' && /goal|target|plan|want/i.test(query)) matchScore += 2.5;

    // Strict relevance: If there is no query or domain overlap, score is 0
    if (matchScore === 0) {
      return { item, score: 0 };
    }

    // Importance & confidence weighting boosts matched items
    const score = matchScore + (item.importance || 3) * 0.5 + (item.confidence || 0.8) * 0.5;

    return { item, score };
  });

  // Strict relevance threshold: Only accept items with genuine match (score >= 3.0)
  const relevantMatches = scored
    .filter((s) => s.score >= 3.0)
    .sort((a, b) => b.score - a.score);

  // Return only the top ranked memories (max 3–6)
  return relevantMatches.slice(0, Math.min(maxCount, 6)).map((m) => m.item);
}

/**
 * Formats retrieved memories cleanly for inclusion into Rihaan's system prompt.
 * Naturalized: never exposes internal IDs or database jargon.
 */
export function formatMemoriesForContext(memories: MemoryItem[]): string {
  if (memories.length === 0) {
    return 'No specific past memories active or relevant to this topic.';
  }

  return memories
    .map((m) => `- [${m.category.toUpperCase()}]: ${m.content}`)
    .join('\n');
}

/**
 * Merge new candidate memories into existing memory store.
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
    const candTokens = extractSearchTokens(content);

    // Deduplication check: Match exact, high similarity (>0.55), or same category & core subject
    const existingIndex = result.findIndex((item) => {
      if (!item.active) return false;
      if (item.content.toLowerCase() === content.toLowerCase()) return true;

      // Check category match & token overlap
      if (item.category === cand.category) {
        const sim = calculateTokenSimilarity(item.content, content);
        if (sim > 0.45) return true;
        // Shared primary subject (e.g. both about python learning)
        const itemTokens = extractSearchTokens(item.content);
        const shared = itemTokens.filter((t) => candTokens.includes(t));
        if (shared.length >= 2) return true;
      }

      return calculateTokenSimilarity(item.content, content) > 0.60;
    });

    if (existingIndex >= 0) {
      // Update existing item rather than duplicating
      const old = result[existingIndex];
      const mergedTags = Array.from(new Set([...old.tags, ...(cand.tags || candTokens)]));
      const updatedItem: MemoryItem = {
        ...old,
        content: content,
        importance: Math.max(old.importance, cand.importance || 3),
        updatedAt: now,
        confidence: Math.max(old.confidence, cand.confidence || 0.85),
        source: cand.source === 'explicit' ? 'explicit' : old.source,
        tags: mergedTags
      };
      result[existingIndex] = updatedItem;
      newlyAdded.push(updatedItem);
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
        tags: cand.tags || candTokens,
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
    if (!item.active) return item;
    const itemLower = item.content.toLowerCase();
    const hasMatch = tokens.some((t) => itemLower.includes(t)) || item.tags.some((tag) => tokens.includes(tag));
    if (hasMatch) {
      removedIds.push(item.id);
      return { ...item, active: false, updatedAt: Date.now() };
    }
    return item;
  });

  return { updatedList, removedIds };
}

/**
 * Converts a legacy MemoryStore to rich MemoryItem array.
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
 * Converts rich MemoryItem array back to legacy MemoryStore for backwards compatibility.
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
