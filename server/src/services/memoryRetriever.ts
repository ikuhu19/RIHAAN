import { MemoryStore } from '../types.js';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'am', 'i', 'me', 'my',
  'you', 'your', 'we', 'our', 'he', 'she', 'it', 'they', 'them', 'this', 'that', 'these',
  'those', 'to', 'for', 'in', 'on', 'at', 'by', 'from', 'with', 'about', 'as', 'into',
  'like', 'through', 'after', 'over', 'between', 'out', 'against', 'during', 'without',
  'before', 'under', 'around', 'among', 'haan', 'nahi', 'kya', 'hai', 'ho', 'ko', 'se',
  'mein', 'par', 'bhi', 'toh', 'ab', 'aaj', 'kal', 'yaar', 'batao', 'kuch'
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Selects only memories that are contextually relevant to the current user message.
 * This prevents overwhelming the prompt with irrelevant facts and makes recall feel natural.
 */
export function getRelevantMemories(
  memories: MemoryStore,
  message: string,
  maxTotal: number = 6
): Partial<MemoryStore> {
  const keywords = extractKeywords(message);
  const result: Partial<MemoryStore> = {};
  let totalSelected = 0;

  const categories: (keyof MemoryStore)[] = [
    'goals',
    'projects',
    'current_context',
    'likes',
    'dislikes',
    'profile',
    'important_context'
  ];

  // Helper to score a memory against query keywords
  const scoreMemory = (item: string): number => {
    const itemLower = item.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (itemLower.includes(kw)) score += 2;
    }
    return score;
  };

  // 1. First pass: Collect keyword-matching memories
  const scoredItems: { category: keyof MemoryStore; item: string; score: number }[] = [];

  for (const cat of categories) {
    const list = memories[cat];
    if (Array.isArray(list)) {
      for (const item of list) {
        if (typeof item === 'string' && item.trim()) {
          const score = scoreMemory(item);
          if (score > 0) {
            scoredItems.push({ category: cat, item, score });
          }
        }
      }
    }
  }

  // Sort by highest relevance score
  scoredItems.sort((a, b) => b.score - a.score);

  for (const match of scoredItems) {
    if (totalSelected >= maxTotal) break;
    if (!result[match.category]) result[match.category] = [];
    if (!result[match.category]!.includes(match.item)) {
      result[match.category]!.push(match.item);
      totalSelected++;
    }
  }

  // 2. Second pass: If very few or no specific keyword matches (e.g. general greeting or short chat),
  // inject a minimal grounded baseline (1 profile, 1 primary goal, 1 current context)
  if (totalSelected < 3) {
    const baselineOrder: (keyof MemoryStore)[] = ['goals', 'current_context', 'projects', 'profile'];
    for (const cat of baselineOrder) {
      if (totalSelected >= 3) break;
      const list = memories[cat];
      if (Array.isArray(list) && list.length > 0) {
        if (!result[cat]) result[cat] = [];
        const candidate = list[0];
        if (!result[cat]!.includes(candidate)) {
          result[cat]!.push(candidate);
          totalSelected++;
        }
      }
    }
  }

  return result;
}

/**
 * Formats retrieved memories cleanly for inclusion into Vihaan's system prompt.
 */
export function formatRelevantMemoriesForPrompt(relevant: Partial<MemoryStore>): string {
  const lines: string[] = [];

  const headers: Record<string, string> = {
    profile: "Kuhu's Profile & Style",
    likes: "Kuhu's Likes & Interests",
    dislikes: "Things Kuhu Dislikes / Avoids",
    goals: "Kuhu's Active Goals & Targets",
    important_context: "Important Background & People",
    current_context: "Current Situations & Deadlines",
    projects: "Active Projects & Work"
  };

  for (const [key, label] of Object.entries(headers)) {
    const list = relevant[key as keyof MemoryStore];
    if (Array.isArray(list) && list.length > 0) {
      lines.push(`- ${label}: ${list.join('; ')}`);
    }
  }

  if (lines.length === 0) {
    return 'No specific long-term memories retrieved for this turn.';
  }

  return lines.join('\n');
}
