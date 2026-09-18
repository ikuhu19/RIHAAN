import {
  ChatRequest,
  ChatResponse,
  StructuredAiOutput,
  AvatarEmotion,
  CharacterAction,
  MasteryLevel
} from '../types.js';
import { buildRichConversationContext, PreparedContext } from './conversationManager.js';
import { processStructuredResponse, cleanSpeechText } from './responseProcessor.js';

export async function generateVihaanReply(request: ChatRequest): Promise<ChatResponse> {
  const apiKey = process.env.AI_API_KEY || '';
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();
  const context = buildRichConversationContext(request);

  // 1. Google Gemini Provider
  if (provider === 'gemini' && apiKey) {
    try {
      const rawOutput = await callGeminiAPI(request, context, apiKey);
      return processStructuredResponse(rawOutput, request, context);
    } catch (err) {
      console.error('Gemini API error, falling back to intelligent brain:', err);
    }
  }

  // 2. OpenAI Provider
  if (provider === 'openai' && apiKey) {
    try {
      const rawOutput = await callOpenAIAPI(request, context, apiKey);
      return processStructuredResponse(rawOutput, request, context);
    } catch (err) {
      console.error('OpenAI API error, falling back to intelligent brain:', err);
    }
  }

  // 3. Built-in intelligent companion brain (works fully offline)
  const fallbackOutput = generateIntelligentFallbackOutput(request, context);
  return processStructuredResponse(fallbackOutput, request, context);
}

// Gemini API integration
async function callGeminiAPI(
  request: ChatRequest,
  context: PreparedContext,
  apiKey: string
): Promise<StructuredAiOutput> {
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = [
    {
      role: 'user',
      parts: [
        {
          text: `${context.systemPrompt}\n\nUser (${request.userName || 'Kuhu'}) says: "${request.message}"\n\nGenerate your structured JSON response.`
        }
      ]
    }
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.8,
        maxOutputTokens: 600
      }
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API failed with status ${res.status}: ${errorText}`);
  }

  const data = (await res.json()) as any;
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(rawText);
}

// OpenAI API integration
async function callOpenAIAPI(
  request: ChatRequest,
  context: PreparedContext,
  apiKey: string
): Promise<StructuredAiOutput> {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const url = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions';

  const messages = [
    { role: 'system', content: context.systemPrompt },
    ...request.history.slice(-6).map((m) => ({
      role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text
    })),
    { role: 'user', content: request.message }
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 500
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenAI API failed with status ${res.status}: ${errorText}`);
  }

  const data = (await res.json()) as any;
  const rawText = data?.choices?.[0]?.message?.content || '{}';
  return JSON.parse(rawText);
}

/**
 * Built-in intelligent Rihaan offline conversational & pedagogical brain.
 * Provides rich, context-aware, stateful interaction even without an external API key.
 */
export function generateIntelligentFallbackOutput(
  request: ChatRequest,
  context: PreparedContext
): StructuredAiOutput {
  const { message, mode, memories, userName = 'Kuhu' } = request;
  const lower = message.toLowerCase().trim();
  const words = lower.split(/\s+/).filter(Boolean);

  // 1. Physical Room Action Commands
  if (/\b(sit down|baith jao|go sit|chair)\b/i.test(lower)) {
    return {
      reply: `Haan baba, armchair par aakar baith gaya. Relax, I'm right here. Ab batao, what's on your mind?`,
      speechText: `Haan baba, armchair par aakar baith gaya. Relax, I'm right here. Ab batao, what's on your mind?`,
      emotion: 'happy',
      action: 'sit',
      intent: 'casual_chat'
    };
  }

  if (/\b(come here|idhar aao|come closer|stand near)\b/i.test(lower)) {
    return {
      reply: `Coming right over! Haan ${userName}, I'm standing right in front of you. Tell me what's going on.`,
      speechText: `Coming right over! Haan ${userName}, I'm standing right in front of you. Tell me what's going on.`,
      emotion: 'curious',
      action: 'walk_near',
      intent: 'casual_chat'
    };
  }

  if (/\b(stand up|khade ho jao)\b/i.test(lower)) {
    return {
      reply: `Alright, standing up and stretching. Ready for whatever we're tackling next. What's the plan?`,
      speechText: `Alright, standing up and stretching. Ready for whatever we're tackling next. What's the plan?`,
      emotion: 'playful',
      action: 'stand',
      intent: 'casual_chat'
    };
  }

  // 2. Explicit Memory Commands
  if (context.explicitMemoryCheck.isExplicitRemember && context.explicitMemoryCheck.targetText) {
    const fact = context.explicitMemoryCheck.targetText;
    return {
      reply: `Got it locked into memory: "${fact}". I won't forget that.`,
      speechText: `Got it locked into memory. I won't forget that.`,
      emotion: 'serious',
      action: 'none',
      intent: 'memory_request',
      shouldRemember: true,
      memoryCandidates: [
        {
          content: fact,
          category: context.explicitMemoryCheck.category || 'identity',
          importance: 5,
          tags: ['explicit', ...words.slice(0, 3)]
        }
      ]
    };
  }

  if (context.explicitMemoryCheck.isExplicitForget && context.explicitMemoryCheck.targetText) {
    const target = context.explicitMemoryCheck.targetText;
    return {
      reply: `Done. Removed any active memories about "${target}" from my records. Clean slate on that.`,
      speechText: `Done. Removed any active memories about ${target}.`,
      emotion: 'thinking',
      action: 'none',
      intent: 'memory_request',
      forgetRequests: [target]
    };
  }

  // 3. Short-Answer / Sulking / Procrastination Detection
  const shortResponses = ['yeah', 'yes', 'yep', 'hmm', 'kuch nahi', 'nothing', 'theek hai', 'fine', 'nahi', 'ok', 'okay'];
  if (words.length <= 2 && shortResponses.some((w) => lower === w || lower.startsWith(w))) {
    return {
      reply: `Hmm... bas '${message.trim()}'? Aise kaise chalega madam? You only pull out the one-word replies when you're drained or overthinking. Spill it.`,
      speechText: `Hmm... bas '${message.trim()}'? Aise kaise chalega madam? You only pull out the one-word replies when you're drained or overthinking. Spill it.`,
      emotion: 'teasing',
      action: 'none',
      intent: 'casual_chat'
    };
  }

  // 4. Procrastination & Reels
  if (/\b(reels?|scrolling|instagram|shorts|tiktok)\b/i.test(lower)) {
    return {
      reply: `Three hours scrolling reels? Seriously ${userName}? 😭 Put the phone face-down right now. We're doing 15 solid minutes of focus, and then you can take a breather. Deal?`,
      speechText: `Seriously ${userName}? Put the phone face-down right now. Let's do 15 solid minutes of focus first. Deal?`,
      emotion: 'playful',
      action: 'walk_near',
      intent: 'casual_chat'
    };
  }

  if (/\b(study tomorrow|kal padh|kal se|kal karungi|do it tomorrow|postpone)\b/i.test(lower)) {
    return {
      reply: `Kal kabhi nahi aata ${userName}! You said 'kal se' yesterday too. Look, don't sit for three hours. Let's just tackle one small concept right now. Deal?`,
      speechText: `Kal kabhi nahi aata ${userName}! Let's just tackle one small concept right now. Deal?`,
      emotion: 'teasing',
      action: 'walk_near',
      intent: 'casual_chat'
    };
  }

  // 5. Teaching: Recursion (User brief example scenario)
  const isRecursionTopic =
    /\b(recursion|recursive)\b/i.test(lower) ||
    request.learningState?.activeConcept === 'Recursion' ||
    request.history.some((h) => /\b(recursion|recursive|dolls?|base case)\b/i.test(h.text));

  if (isRecursionTopic) {
    if (/\b(don't understand|confused|hate|explain|teach|what is|still don't get)\b/i.test(lower)) {
      return {
        reply: `Okay, let's completely forget the dry textbook definition for a second. Think of it like looking into two facing mirrors, or opening nested Russian dolls until you reach the tiny solid one at the center.\n\nBefore I show you any code: what do you think would happen if a function kept calling itself forever without that tiny solid doll to stop it?`,
        speechText: `Okay, let's completely forget the dry textbook definition for a second. Think of it like Russian dolls that open up until you hit the solid one in the center. Before we write code, what do you think would happen if a function kept calling itself forever without a stopping point?`,
        emotion: 'curious',
        action: 'none',
        intent: 'teaching',
        learning: {
          active: true,
          topic: 'Python',
          concept: 'Recursion',
          status: 'struggling',
          misconception: 'Lacks intuition on the base-case termination condition'
        },
        followUp: 'What happens without a base case?'
      };
    }

    if (/\b(loop|infinite|crash|stack|overflow|stop|explode|forever)\b/i.test(lower)) {
      return {
        reply: `Spot on! It runs out of memory and crashes — that's literally what a Stack Overflow is. That stopping condition is called the **base case**. Once you define when to stop, the rest is just shrinking the problem each step. Ready to look at a 3-line example now?`,
        speechText: `Spot on! It crashes the stack. That stopping point is your base case. Once you know when to stop, the rest is just shrinking the problem. Ready for a quick three-line example?`,
        emotion: 'happy',
        action: 'none',
        intent: 'teaching',
        learning: {
          active: true,
          topic: 'Python',
          concept: 'Recursion',
          status: 'understood'
        }
      };
    }
  }

  // 6. Teaching: Classes & OOP (User brief example scenario)
  const isClassesTopic =
    /\b(classes|oop|object oriented|objects)\b/i.test(lower) ||
    request.learningState?.activeConcept === 'Classes' ||
    request.history.some((h) => /\b(classes|objects|blueprint|cookie cutter)\b/i.test(h.text));

  if (isClassesTopic) {
    if (/\b(hate|confused|don't understand|struggle|explain|teach)\b/i.test(lower)) {
      return {
        reply: `Fair enough 😂. Classes feel overly ceremonial at first. But forget "blueprints" for a minute. Think of a class like a custom cookie cutter, and the objects as the actual cookies that come out with their own sprinkles.\n\nSince you're comfortable with functions and variables, a class is just a bundle that packages variables and the functions that use them together so they don't get lost. Makes sense so far?`,
        speechText: `Fair enough! Classes feel ceremonial at first. But think of a class like a cookie cutter, and objects as the actual cookies. It's just a way to bundle variables and the functions that touch them together. Makes sense so far?`,
        emotion: 'playful',
        action: 'none',
        intent: 'teaching',
        learning: {
          active: true,
          topic: 'Python',
          concept: 'Classes',
          status: 'practicing'
        }
      };
    }
  }

  // 7. Coding & Debugging (Don't over-assist, ask for error / give targeted hint)
  if (/\b(code isn't working|bug|error|getting an error|syntax error|broken)\b/i.test(lower)) {
    return {
      reply: `Send me the exact error message and the snippet first. I don't want to guess in the dark and waste your time. What line is it tripping on?`,
      speechText: `Send me the exact error message and snippet first. What line is it tripping on?`,
      emotion: 'curious',
      action: 'none',
      intent: 'debugging'
    };
  }

  // 8. Mode-specific flair
  if (mode === 'roast') {
    return {
      reply: `I knew you'd say that 😂. You have a PhD in making excuses look like strategic contemplation. What's the real blocker here, madam?`,
      speechText: `I knew you'd say that. You have a PhD in making excuses look like strategic contemplation. What's the real blocker here?`,
      emotion: 'teasing',
      action: 'none',
      intent: 'casual_chat'
    };
  }

  if (mode === 'alter_ego') {
    return {
      reply: `Step back and breathe for a second. You already know what needs to be done here; you're just second-guessing yourself because of the noise. Let's isolate the single next logical move.`,
      speechText: `Step back and breathe for a second. You already know what needs to be done; you're just second-guessing yourself. Let's isolate the single next move.`,
      emotion: 'serious',
      action: 'none',
      intent: 'reflection'
    };
  }

  if (mode === 'night_2am') {
    return {
      reply: `It's late, ${userName}. The world is quiet. If this thought is keeping you awake, let's unpack it gently. No rush, no pressure.`,
      speechText: `It's late, ${userName}. If this thought is keeping you awake, let's unpack it gently. No rush, no pressure.`,
      emotion: 'curious',
      action: 'sit',
      intent: 'casual_chat'
    };
  }

  // 9. Natural contextual fallback
  const anchorMemory = context.relevantMemories[0]?.content;
  const memoryHint = anchorMemory ? ` (keeping your work on ${anchorMemory} in mind)` : '';

  return {
    reply: `I'm listening, ${userName}. Tell me more about that${memoryHint} — let's break it down together.`,
    speechText: `I'm listening, ${userName}. Tell me more about that, let's break it down together.`,
    emotion: 'happy',
    action: 'none',
    intent: 'casual_chat'
  };
}
