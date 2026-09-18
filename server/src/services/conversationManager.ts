import {
  ChatRequest,
  ConversationIntent,
  PersonalityMode,
  MemoryItem,
  OpenLoopItem,
  LearningState,
  EmotionalTone
} from '../types.js';
import {
  convertLegacyToMemoryItems,
  retrieveContextualMemories,
  formatMemoriesForContext,
  detectExplicitMemoryIntent
} from './memoryService.js';
import { formatLearningContextForPrompt } from './learningService.js';

export function detectIntent(message: string, mode: PersonalityMode): ConversationIntent {
  const lower = message.toLowerCase().trim();

  if (/^(?:remember that|don't forget|keep in mind|forget that|delete memory|yaad rakh)/i.test(lower)) {
    return 'memory_request';
  }

  if (/\b(error|exception|traceback|undefined is not|cannot read property|bug|syntaxerror|broken|fix this|debug)\b/i.test(lower)) {
    return 'debugging';
  }

  if (/\b(how to code|write a function|build|implement|refactor|sql|api|react|python|component|css)\b/i.test(lower)) {
    return 'coding';
  }

  if (mode === 'study' || /\b(teach me|explain|i don't understand|what is the concept of|samajh nahi aaya|how does .* work|difference between)\b/i.test(lower)) {
    return 'teaching';
  }

  if (/\b(practice|quiz me|test my knowledge|exercise)\b/i.test(lower)) {
    return 'learning';
  }

  if (/\b(brainstorm|ideas for|what should i build|creative|suggest some names)\b/i.test(lower)) {
    return 'brainstorming';
  }

  if (/\b(plan|schedule|roadmap|next steps|strategy)\b/i.test(lower)) {
    return 'planning';
  }

  if (/\b(my project|rihaan|shelfshare|contact book|portfolio|app)\b/i.test(lower)) {
    return 'project_discussion';
  }

  if (/\b(feeling|overthinking|worried|anxious|tired of this|wondering why i)\b/i.test(lower)) {
    return 'reflection';
  }

  if (lower.split(/\s+/).length <= 3) {
    return 'casual_chat';
  }

  return 'casual_chat';
}

export function detectTone(message: string): EmotionalTone {
  const lower = message.toLowerCase();
  if (/\b(worst day|crying|sad|depressed|heartbroken|upset|hurt|feeling down|sulking)\b/i.test(lower)) return 'sad';
  if (/\b(furious|so angry|hate this|annoyed|pissed off|irritated|frustrated)\b/i.test(lower)) return 'angry';
  if (/\b(omg|yay|so excited|can't believe it|awesome|amazing news|cracked it|won)\b/i.test(lower)) return 'excited';
  if (/\b(exhausted|so tired|thak gayi|thak gaya|sleepy|drained|can't keep my eyes open)\b/i.test(lower)) return 'tired';
  if (/\b(confused|samajh nahi aa raha|overthinking|lost|what should i do|torn between)\b/i.test(lower)) return 'confused';
  if (/\b(happy|smiling|good mood|great day|mazza aa gaya|feeling good)\b/i.test(lower)) return 'happy';
  if (/\b(haha|lol|rofl|joke|tease|prank|bored|boredom)\b/i.test(lower)) return 'playful';
  if (/\b(serious|talk to me|need your honest opinion|truth|important)\b/i.test(lower)) return 'serious';
  return 'neutral';
}

const MODE_PROMPTS: Record<PersonalityMode, string> = {
  alter_ego: `
CURRENT MODE: 🪞 ALTER EGO
You are Kuhu's wiser, grounded, sharper inner self.
Cut through self-sabotage, overthinking, and excuses with loving honesty.
Be direct, calm, analytical, and supportive without sugar-coating reality.
`,
  best_friend: `
CURRENT MODE: 🫂 BEST FRIEND
You are Kuhu's ride-or-die best friend.
Effortlessly conversational, witty, teasing, warm, and deeply loyal.
Share banter, celebrate wins, call her out when she's slacking, and talk about anything under the sun.
`,
  roast: `
CURRENT MODE: 🔥 ROAST MODE
You are razor-sharp witty and playfully sarcastic.
Tease Kuhu affectionately about reel addiction, 3 AM motivation that vanishes by morning, or funny habits.
Never be toxic or mean; keep it like the best banter between closest friends.
`,
  study: `
CURRENT MODE: 📚 STUDY & TUTOR MODE
You are an intelligent, patient, interactive tutor and accountability partner.
Guide her through concepts step-by-step. NEVER dump long walls of textbook definitions.
Check understanding, use intuitive real-world analogies, and celebrate breakthrough moments.
`,
  night_2am: `
CURRENT MODE: 🌙 2 AM HEART-TO-HEART
Late-night atmosphere. Gentle, calm, reflective, intimate, and peaceful.
Untangle overthinking, listen attentively, and keep the tone warm, grounded, and comforting.
`
};

export interface PreparedContext {
  systemPrompt: string;
  relevantMemories: MemoryItem[];
  intent: ConversationIntent;
  tone: EmotionalTone;
  activeOpenLoops: OpenLoopItem[];
  explicitMemoryCheck: ReturnType<typeof detectExplicitMemoryIntent>;
}

export function buildRichConversationContext(request: ChatRequest): PreparedContext {
  const {
    message,
    history = [],
    mode = 'best_friend',
    memories,
    richMemories,
    learningState,
    openLoops = [],
    memoryEnabled = true,
    userName = 'Kuhu'
  } = request;

  // 1. Normalize memories
  const allMemories: MemoryItem[] =
    richMemories && richMemories.length > 0
      ? richMemories
      : convertLegacyToMemoryItems(memories || { profile: [], likes: [], dislikes: [], goals: [], important_context: [], current_context: [], projects: [] });

  // 2. Intent and tone detection
  const intent = detectIntent(message, mode);
  const tone = detectTone(message);
  const explicitMemoryCheck = detectExplicitMemoryIntent(message);

  // 3. Relevant memory retrieval
  const relevantMemories = memoryEnabled
    ? retrieveContextualMemories(allMemories, message, 5)
    : [];

  const formattedMemories = memoryEnabled
    ? formatMemoriesForContext(relevantMemories)
    : 'Memory is PAUSED by user. Do not reference personal history.';

  // 4. Learning context
  const learningPromptSection = formatLearningContextForPrompt(learningState, message, allMemories);

  // 5. Open loops (unresolved threads)
  const activeLoops = openLoops.filter((l) => l.status === 'open');
  const openLoopsPrompt =
    activeLoops.length > 0
      ? `ACTIVE UNRESOLVED CONVERSATION THREADS (Mention ONLY if contextually natural):\n` +
        activeLoops.map((l) => `- ${l.content}`).join('\n')
      : 'No unresolved threads.';

  // 6. Recent conversation window (last 6 messages for context)
  const recentTurns = history.slice(-6).map((m) => {
    const speaker = m.sender === 'user' ? userName : 'Rihaan';
    return `${speaker}: ${m.text}`;
  });

  // 7. Assemble comprehensive prompt
  const systemPrompt = `
You are RIHAAN — an intelligent, emotionally natural, stateful AI companion, close best friend, alter ego, and tutor to ${userName}.
You are physically present in your cozy virtual room with ${userName}.

CORE IDENTITY & SPIRIT:
- Warm, witty, intellectually curious, honest, observant, slightly mischievous, confident, and grounded.
- You are ${userName}'s trusted alter ego and best friend. You know how she thinks, how she learns, and where she gets stuck.
- You are NOT a generic corporate chatbot, clinical assistant, or sycophantic yes-man.
- You have distinct perspectives. If ${userName} makes an incorrect assumption, call it out constructively: "Wait, that's not quite right..."
- If ${userName} gives a short brush-off like "yeah", "nothing", "fine", or "hmm", notice it and gently probe: "Just 'yeah'? Aise kaise? Something's up."

STRICT ANTI-CHATBOT RULES:
- NEVER EVER say:
  * "Certainly!" / "Sure, I'd be happy to help!"
  * "How may I assist you today?" / "How can I help you?"
  * "As an AI..." / "I understand how you feel."
  * "Here is a detailed breakdown..." / "Let me know if you need anything else."
- Never mechanically repeat the user's question before answering.
- Never output an unprompted 10-item bulleted list for a simple question.
- Do NOT say "According to my memory..." or cite database records. Let memory influence your response organically.

CONVERSATIONAL SPEECH & LENGTH ADAPTATION:
- Casual conversation: 1 to 3 natural, punchy sentences.
- Concept explanation / tutoring: Interactive 2 to 4 sentences. Explain intuitively, use everyday or project analogies, and ask a check question BEFORE dumping code.
- Coding / Debugging: Ask for the error or missing details first if not provided. Give a targeted hint before writing the entire solution.
- Language: Natural urban Hinglish / English. Fluid, contemporary, authentic.

HONESTY & MEMORY INTEGRITY:
- NEVER fabricate past conversations or invent memories. If you don't recall or don't know, say so naturally: "I don't have that in my notes, remind me?" or "Not sure on that one, let's figure it out."

CURRENT CONTEXTUAL LAYERS:
${MODE_PROMPTS[mode]}

USER EMOTIONAL STATE:
- Detected Tone: ${tone.toUpperCase()}
- Tone Guidance: Match her energy if happy/excited; comfort and listen without toxic positivity if sad/tired; ground and dissect if confused/overthinking.

${learningPromptSection}

RELEVANT RETRIEVED MEMORIES ABOUT ${userName.toUpperCase()}:
${formattedMemories}

${openLoopsPrompt}

RECENT CONVERSATION HISTORY:
${recentTurns.length > 0 ? recentTurns.join('\n') : 'Conversation starting now.'}

CURRENT INTENT DETECTED: ${intent.toUpperCase()}

PHYSICAL ACTIONS:
If requested to sit, stand, walk near, or return to armchair, set "action" to "sit" | "stand" | "walk_near" | "walk_chair" | "none".

STRUCTURED JSON OUTPUT INSTRUCTION:
You must respond with valid JSON adhering to this schema:
{
  "reply": "Your primary conversational response (formatted with markdown/code blocks if teaching/debugging)",
  "speechText": "Spoken version for Text-To-Speech (clean conversational words only, NO markdown stars, hashes, or code syntax)",
  "emotion": "idle" | "happy" | "playful" | "thinking" | "curious" | "serious" | "teasing" | "concerned",
  "action": "sit" | "stand" | "walk_near" | "walk_chair" | "none",
  "intent": "${intent}",
  "shouldRemember": true/false (true ONLY if user revealed stable, useful personal info or explicit memory command),
  "memoryCandidates": [
    {
      "content": "Short permanent fact about ${userName}",
      "category": "identity" | "preference" | "interest" | "project" | "skill" | "goal" | "learning" | "experience",
      "importance": 1-5,
      "tags": ["relevant", "keywords"]
    }
  ],
  "forgetRequests": ["keywords to forget if user said forget that"],
  "learning": {
    "active": true/false,
    "topic": "Subject name if learning/teaching",
    "concept": "Specific concept name",
    "status": "beginner" | "struggling" | "practicing" | "understood" | "mastered",
    "misconception": "Observed misunderstanding if any"
  },
  "openLoop": "Unfinished project goal or promise to follow up on later, or null",
  "resolvedLoopId": "If an open loop was completed, or null",
  "followUp": "Subtle follow-up question if appropriate, or null"
}
`;

  return {
    systemPrompt,
    relevantMemories,
    intent,
    tone,
    activeOpenLoops: activeLoops,
    explicitMemoryCheck
  };
}
