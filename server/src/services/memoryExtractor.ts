import { MemoryStore } from '../types.js';

// Trivial, ephemeral, or conversational statements that must NEVER be saved as long-term memories
const TRIVIAL_PATTERNS = [
  /^(?:i(?:'m| am)?\s+)?bored$/i,
  /^(?:i(?:'m| am)?\s+)?bore ho (?:raha|rahi)/i,
  /^(?:i(?:'m| am)?\s+)?tired$/i,
  /^(?:i(?:'m| am)?\s+)?thak gay(?:i|a)/i,
  /^(?:i(?:'m| am)?\s+)?sleepy$/i,
  /^(?:i(?:'m| am)?\s+)?hungry$/i,
  /^(?:hi|hello|hey|yo|namaste|good morning|good night|bye)$/i,
  /^(?:ok|okay|yeah|yes|yep|nah|no|nope|hmm+|kuch nahi|nothing|theek hai)$/i,
  /^(?:what are you doing|kya kar rahe ho|kya chal raha|what's up)$/i,
  /^(?:tell me something random|tell me a joke|kuch bolo)$/i
];

function isTrivial(text: string): boolean {
  const clean = text.trim();
  if (clean.length < 4) return true;
  return TRIVIAL_PATTERNS.some((p) => p.test(clean));
}

function cleanExtractedItem(raw: string): string {
  return raw
    .trim()
    .replace(/^[,.\s"'-]+|[,.\s"'-]+$/g, '')
    .replace(/\s{2,}/g, ' ');
}

export function extractMemoriesFromText(text: string): Partial<MemoryStore> {
  const extracted: Partial<MemoryStore> = {};
  const clean = text.trim();
  if (!clean || isTrivial(clean)) {
    return extracted;
  }

  // Helper to add unique entry
  const add = (category: keyof MemoryStore, item: string) => {
    const formatted = cleanExtractedItem(item);
    if (formatted && formatted.length >= 3 && formatted.length <= 120) {
      if (!extracted[category]) extracted[category] = [];
      const current = extracted[category]!;
      if (!current.some((existing) => existing.toLowerCase() === formatted.toLowerCase())) {
        current.push(formatted);
      }
    }
  };

  // 1. LIKES (hobbies, favourite things, interests)
  // e.g. "I love cold brew coffee", "my favourite movie is Interstellar", "I really like rock music"
  const likeRegexes = [
    /(?:my\s+(?:favourite|favorite)\s+(?:is|are)?)\s+([^.!?,\n]+)/gi,
    /(?:i\s+(?:really\s+)?(?:love|enjoy|adore|like))\s+([^.!?,\n]+)/gi,
    /(?:i'm\s+(?:really\s+)?into|i am\s+(?:really\s+)?into)\s+([^.!?,\n]+)/gi
  ];
  for (const rx of likeRegexes) {
    let match;
    while ((match = rx.exec(clean)) !== null) {
      const candidate = match[1]?.trim();
      // Ignore if it's "you", "this", or ephemeral states like "sleeping"
      if (candidate && !/^(?:you|this|that|it|talking to you)\b/i.test(candidate)) {
        add('likes', candidate);
      }
    }
  }

  // 2. DISLIKES (things Kuhu dislikes or avoids)
  // e.g. "I hate early mornings", "I don't like tea", "I can't stand noisy places"
  const dislikeRegexes = [
    /(?:i\s+(?:really\s+)?(?:hate|dislike|can't stand|detest))\s+([^.!?,\n]+)/gi,
    /(?:i\s+(?:don't|do not)\s+like)\s+([^.!?,\n]+)/gi,
    /(?:i\s+avoid)\s+([^.!?,\n]+)/gi
  ];
  for (const rx of dislikeRegexes) {
    let match;
    while ((match = rx.exec(clean)) !== null) {
      const candidate = match[1]?.trim();
      if (candidate && !/^(?:you|this|that|it)\b/i.test(candidate)) {
        add('dislikes', candidate);
      }
    }
  }

  // 3. GOALS (study, career, personal targets)
  // e.g. "I want to finish Python", "my goal is to become an engineer", "I need to score 9 CGPA"
  const goalRegexes = [
    /(?:my\s+goal\s+is\s+to|i'm\s+aiming\s+to|i am\s+aiming\s+to)\s+([^.!?,\n]+)/gi,
    /(?:i\s+(?:really\s+)?want\s+to\s+(?:learn|master|finish|complete|score|crack|build|achieve))\s+([^.!?,\n]+)/gi,
    /(?:i\s+have\s+to\s+(?:prepare for|crack|clear))\s+([^.!?,\n]+)/gi,
    /(?:i\s+need\s+to\s+(?:finish|complete|study))\s+(python|javascript|typescript|react|dsa|java|c\+\+|maths|physics|database|sql|os|ai|ml|exam|thesis|assignment[^.!?,\n]*)/gi
  ];
  for (const rx of goalRegexes) {
    let match;
    while ((match = rx.exec(clean)) !== null) {
      const candidate = match[1]?.trim();
      if (candidate) {
        add('goals', candidate);
      }
    }
  }

  // 4. CURRENT CONTEXT (temporary/upcoming events, exams, interviews)
  // e.g. "I have an exam next week", "presentation on Friday", "interview coming up"
  const currentContextRegexes = [
    /(?:i\s+have\s+(?:an?\s+)?(?:exam|test|quiz|presentation|interview|submission|deadline))\s+([^.!?,\n]+)/gi,
    /(?:(?:exam|test|quiz|presentation|interview|submission)\s+(?:is\s+)?(?:on|next|this|tomorrow))\s+([^.!?,\n]+)/gi,
    /(?:traveling\s+to|going\s+to\s+(?:home|delhi|mumbai|bangalore|trip))\s*([^.!?,\n]*)/gi
  ];
  for (const rx of currentContextRegexes) {
    let match;
    while ((match = rx.exec(clean)) !== null) {
      add('current_context', match[0]);
    }
  }

  // 5. PROJECTS (coding projects, apps, design work)
  // e.g. "I am building a React portfolio", "working on an AI companion app"
  const projectRegexes = [
    /(?:building|working on|developing|designing|creating)\s+(?:a|an|my)?\s+([^.!?,\n]+(?:project|app|website|portfolio|model|system|thesis|bot))/gi
  ];
  for (const rx of projectRegexes) {
    let match;
    while ((match = rx.exec(clean)) !== null) {
      if (match[1]) add('projects', match[1]);
    }
  }

  // 6. IMPORTANT CONTEXT & PEOPLE (key relationships, recurring situations)
  // e.g. "my mom is visiting", "my friend Rohan", "my roommate Sneha"
  const importantContextRegexes = [
    /(?:my\s+(?:friend|roommate|mom|dad|mother|father|sister|brother|professor|boss|mentor)\s+([a-zA-Z]+))/gi,
    /(?:living\s+in|staying\s+at|hostel|apartment|campus)\s+([^.!?,\n]+)/gi
  ];
  for (const rx of importantContextRegexes) {
    let match;
    while ((match = rx.exec(clean)) !== null) {
      add('important_context', match[0]);
    }
  }

  // 7. PROFILE (name, communication style, identity)
  // e.g. "my name is Kuhu", "call me Kuhu", "I prefer honest advice"
  const profileRegexes = [
    /(?:my\s+name\s+is|call\s+me)\s+([A-Za-z]+)/gi,
    /(?:i\s+prefer\s+(?:straightforward|honest|calm|blunt|kind)\s+(?:feedback|advice|answers))/gi
  ];
  for (const rx of profileRegexes) {
    let match;
    while ((match = rx.exec(clean)) !== null) {
      add('profile', match[0]);
    }
  }

  return extracted;
}
