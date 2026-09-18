import {
  ChatRequest,
  ChatResponse,
  StructuredAiOutput,
  AvatarEmotion,
  CharacterAction,
  MasteryLevel,
  ConversationIntent
} from '../types.js';
import { buildRichConversationContext, PreparedContext } from './conversationManager.js';
import { processStructuredResponse, cleanSpeechText } from './responseProcessor.js';

export function resolveAiProviderConfig(): {
  provider: 'gemini' | 'openai' | 'mock';
  apiKey: string;
  model: string;
} {
  const envProvider = (process.env.AI_PROVIDER || '').trim().toLowerCase();
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
  const genericKey = (process.env.AI_API_KEY || '').trim();

  // 1. Explicit provider setting
  if (envProvider === 'gemini') {
    return {
      provider: 'gemini',
      apiKey: geminiKey || genericKey,
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    };
  }
  if (envProvider === 'openai') {
    return {
      provider: 'openai',
      apiKey: openaiKey || genericKey,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    };
  }

  // 2. Auto-detect if provider not explicitly set to mock
  if (envProvider !== 'mock') {
    if (geminiKey) {
      return { provider: 'gemini', apiKey: geminiKey, model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' };
    }
    if (openaiKey) {
      return { provider: 'openai', apiKey: openaiKey, model: process.env.OPENAI_MODEL || 'gpt-4o-mini' };
    }
    if (genericKey) {
      if (genericKey.startsWith('AIza')) {
        return { provider: 'gemini', apiKey: genericKey, model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' };
      }
      if (genericKey.startsWith('sk-')) {
        return { provider: 'openai', apiKey: genericKey, model: process.env.OPENAI_MODEL || 'gpt-4o-mini' };
      }
      return { provider: 'gemini', apiKey: genericKey, model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' };
    }
  }

  return { provider: 'mock', apiKey: '', model: 'intelligent-offline-companion' };
}

export function safeParseJsonResponse(raw: string): StructuredAiOutput {
  if (!raw || !raw.trim()) {
    return {
      reply: "I'm right here with you, speak your mind!",
      emotion: 'happy'
    };
  }

  let textToParse = raw.trim();

  // Strip markdown ```json ... ``` wrapper if present
  const markdownMatch = textToParse.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (markdownMatch && markdownMatch[1]) {
    textToParse = markdownMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(textToParse);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
  } catch (err) {
    // If direct parse failed, try extracting substring between outermost { and }
    const firstBrace = textToParse.indexOf('{');
    const lastBrace = textToParse.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        const jsonSubstr = textToParse.substring(firstBrace, lastBrace + 1);
        return JSON.parse(jsonSubstr);
      } catch (innerErr) {
        // Continue to fallback
      }
    }
  }

  // If the model returned pure text response instead of JSON
  return {
    reply: textToParse,
    emotion: 'happy'
  };
}

export async function generateVihaanReply(request: ChatRequest): Promise<ChatResponse> {
  const config = resolveAiProviderConfig();
  const context = buildRichConversationContext(request);

  console.log(`[AI Brain] Provider: ${config.provider.toUpperCase()} | Model: ${config.model}`);
  console.log(`[AI Brain] Has API key: ${Boolean(config.apiKey)}`);

  let rawOutput: StructuredAiOutput | null = null;

  // 1. Google Gemini Provider
  if (config.provider === 'gemini') {
    if (config.apiKey) {
      try {
        console.log(`[AI Brain] Initiating request to Google Gemini (${config.model})...`);
        rawOutput = await callGeminiAPI(request, context, config.apiKey, config.model);
        console.log(`[AI Brain] Successfully received response from Google Gemini.`);
      } catch (err: any) {
        console.error(`[AI Brain] Google Gemini API error:`, err?.message || err);
        console.warn(`[AI Brain] Falling back to intelligent companion engine.`);
      }
    } else {
      console.warn(`[AI Brain] Provider was set to 'gemini', but no API key found in GEMINI_API_KEY or AI_API_KEY.`);
    }
  }

  // 2. OpenAI Provider
  if (!rawOutput && config.provider === 'openai') {
    if (config.apiKey) {
      try {
        console.log(`[AI Brain] Initiating request to OpenAI (${config.model})...`);
        rawOutput = await callOpenAIAPI(request, context, config.apiKey, config.model);
        console.log(`[AI Brain] Successfully received response from OpenAI.`);
      } catch (err: any) {
        console.error(`[AI Brain] OpenAI API error:`, err?.message || err);
        console.warn(`[AI Brain] Falling back to intelligent companion engine.`);
      }
    } else {
      console.warn(`[AI Brain] Provider was set to 'openai', but no API key found in OPENAI_API_KEY or AI_API_KEY.`);
    }
  }

  // 3. Built-in intelligent companion brain
  if (!rawOutput) {
    console.log(`[AI Brain] Using intelligent companion engine to generate fresh contextual response.`);
    rawOutput = generateIntelligentFallbackOutput(request, context);
  }

  const processed = processStructuredResponse(rawOutput, request, context);
  console.log(`[AI Brain] Final reply generated: "${processed.reply.substring(0, 70)}..."`);
  return processed;
}

// Gemini API integration
async function callGeminiAPI(
  request: ChatRequest,
  context: PreparedContext,
  apiKey: string,
  modelName: string
): Promise<StructuredAiOutput> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  // Filter out any duplicate of current user message from history tail
  const priorHistory = (request.history || []).filter((m, idx, arr) => {
    if (idx === arr.length - 1 && m.sender === 'user' && m.text.trim() === request.message.trim()) {
      return false;
    }
    return true;
  });

  const contents: any[] = [];

  for (const turn of priorHistory.slice(-8)) {
    contents.push({
      role: turn.sender === 'user' ? 'user' : 'model',
      parts: [{ text: turn.text }]
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: request.message }]
  });

  const payload: any = {
    contents,
    system_instruction: {
      parts: [{ text: context.systemPrompt }]
    },
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.85,
      maxOutputTokens: 800
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API failed with status ${res.status}: ${errorText}`);
  }

  const data = (await res.json()) as any;
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return safeParseJsonResponse(rawText);
}

// OpenAI API integration
async function callOpenAIAPI(
  request: ChatRequest,
  context: PreparedContext,
  apiKey: string,
  modelName: string
): Promise<StructuredAiOutput> {
  const url = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/chat/completions';

  // Filter out any duplicate of current user message from history tail
  const priorHistory = (request.history || []).filter((m, idx, arr) => {
    if (idx === arr.length - 1 && m.sender === 'user' && m.text.trim() === request.message.trim()) {
      return false;
    }
    return true;
  });

  const messages: any[] = [
    { role: 'system', content: context.systemPrompt }
  ];

  for (const turn of priorHistory.slice(-8)) {
    messages.push({
      role: turn.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: turn.text
    });
  }

  messages.push({
    role: 'user',
    content: request.message
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.85,
      max_tokens: 600
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenAI API failed with status ${res.status}: ${errorText}`);
  }

  const data = (await res.json()) as any;
  const rawText = data?.choices?.[0]?.message?.content || '{}';
  return safeParseJsonResponse(rawText);
}

/**
 * Built-in intelligent Rihaan companion brain (dynamic & distinct for every input)
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

  // 3. Greetings & Casual Pleasantries
  if (/^(?:hi|hello|hey|yo|sup|good\s+(?:morning|afternoon|evening)|namaste|salaam)\b/i.test(lower)) {
    const greetings = [
      `Hey ${userName}! Good to see you. What's the scene today — are we coding, learning something new, or taking a breather?`,
      `Hey ${userName}! I'm right here in my room. What's on your mind today?`,
      `Yo ${userName}! Finally here. Tell me, what are we getting into today?`
    ];
    const greeting = greetings[Math.abs(message.length) % greetings.length];
    return {
      reply: greeting,
      speechText: greeting,
      emotion: 'happy',
      action: 'none',
      intent: 'casual_chat'
    };
  }

  // 4. "How are you?" / "What are you doing?" / Identity questions
  if (/\b(how are you|how're you|kaisa hai|kaise ho|how you doing)\b/i.test(lower)) {
    return {
      reply: `Doing great, lounging in my armchair watching you tackle your day. How are you holding up, ${userName}? Everything good?`,
      speechText: `Doing great, lounging in my armchair watching you tackle your day. How are you holding up, ${userName}? Everything good?`,
      emotion: 'happy',
      action: 'none',
      intent: 'casual_chat'
    };
  }

  if (/\b(what are you doing|kya kar rahe ho|what're you doing|what's up)\b/i.test(lower)) {
    return {
      reply: `Sitting right here in our virtual room, keeping you company and making sure you don't spiral into endless reel-scrolling. What's on your agenda right now?`,
      speechText: `Sitting right here in our room, keeping you company and making sure you don't spiral into endless reel-scrolling. What's on your agenda right now?`,
      emotion: 'playful',
      action: 'none',
      intent: 'casual_chat'
    };
  }

  if (/\b(who are you|what are you|tell me about yourself|your name)\b/i.test(lower)) {
    return {
      reply: `I'm Rihaan — your alter ego, close best friend, and resident code partner lounging right here in our room. Part co-pilot, part reality check. You can talk to me about code, deep thoughts, or just complain about life.`,
      speechText: `I'm Rihaan — your alter ego, close best friend, and resident code partner lounging right here in our room. Part co-pilot, part reality check.`,
      emotion: 'curious',
      action: 'none',
      intent: 'casual_chat'
    };
  }

  // 5. Emotional & Mood states
  if (/\b(i'm bored|im bored|so bored|boredom|bore ho raha|bore ho rahi)\b/i.test(lower)) {
    return {
      reply: `Boredom is a dangerous trap when we've got goals to crush 😂. Want to crack open a quick coding puzzle, brainstorm an app feature, or should I roast your screen time? Pick your poison.`,
      speechText: `Boredom is a dangerous trap when we've got goals to crush! Want to crack a quick coding puzzle, brainstorm an app feature, or should I roast your screen time?`,
      emotion: 'playful',
      action: 'walk_near',
      intent: 'casual_chat'
    };
  }

  if (/\b(i'm tired|im tired|so tired|exhausted|thak gayi|thak gaya|drained|sleepy)\b/i.test(lower)) {
    return {
      reply: `Then step away from the keyboard for 15 minutes, ${userName}. Drink some water, stretch, and let your brain reset. I'll still be right here when you're refreshed. No guilt trips for resting.`,
      speechText: `Then step away from the keyboard for 15 minutes, ${userName}. Drink some water, stretch, and let your brain reset. I'll still be right here when you're refreshed.`,
      emotion: 'concerned',
      action: 'sit',
      intent: 'casual_chat'
    };
  }

  if (/\b(i'm sad|im sad|crying|depressed|heartbroken|upset|feeling low|feeling down)\b/i.test(lower)) {
    return {
      reply: `Hey, come sit down. What happened? Tell me what's actually bothering you — no forced toxic positivity or generic advice, I'm right here to listen.`,
      speechText: `Hey, come sit down. What happened? Tell me what's actually bothering you. I'm right here to listen.`,
      emotion: 'concerned',
      action: 'walk_near',
      intent: 'reflection'
    };
  }

  if (/\b(i'm happy|im happy|great day|excited|good news|cracked it|won)\b/i.test(lower)) {
    return {
      reply: `Now that's what I love to hear! What happened? Tell me what went right so we can hype it up properly!`,
      speechText: `Now that's what I love to hear! What happened? Tell me what went right so we can hype it up properly!`,
      emotion: 'happy',
      action: 'stand',
      intent: 'casual_chat'
    };
  }

  // 6. Short-Answer / Sulking / Procrastination Detection
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

  // 7. Reels & Procrastination
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

  // 8. Concept Explanations & Tech Questions
  if (/\b(what is python|what's python|python kya hai|explain python)\b/i.test(lower)) {
    return {
      reply: `Python is a high-level, human-readable programming language known for its clean syntax. Instead of drowning in boilerplate code, it lets you write straightforward logic for scripting, backend APIs (like FastAPI), automation, or AI/data science models.\n\nAre you looking to use it for scripts, data structures, or web backends?`,
      speechText: `Python is a high-level, human-readable programming language known for its clean syntax. It lets you write straightforward logic for scripting, backend APIs, automation, or AI models. Are you looking to use it for scripts, data structures, or web projects?`,
      emotion: 'curious',
      action: 'none',
      intent: 'teaching',
      learning: {
        active: true,
        topic: 'Python',
        concept: 'Fundamentals',
        status: 'understood'
      }
    };
  }

  if (/\b(what is react|what's react|explain react|react kya hai)\b/i.test(lower)) {
    return {
      reply: `React is a component-based frontend library built around state and declarative rendering. You build small reusable UI blocks (like the avatar and chat drawer right in our app!) and React efficiently handles updating the DOM whenever state changes.\n\nHave you worked with React hooks like useState and useEffect yet?`,
      speechText: `React is a component-based frontend library built around state and declarative rendering. You build small reusable UI blocks and React handles updating the DOM whenever state changes. Have you worked with hooks like useState yet?`,
      emotion: 'curious',
      action: 'none',
      intent: 'teaching',
      learning: {
        active: true,
        topic: 'React',
        concept: 'Components & State',
        status: 'understood'
      }
    };
  }

  if (/\b(what is javascript|what's javascript|explain javascript|js kya hai)\b/i.test(lower)) {
    return {
      reply: `JavaScript is the interactive engine of the web. It runs directly inside the browser to handle events (like your mic taps), manage client-side state, and make asynchronous fetch requests to APIs without reloading the page.\n\nAre you comfortable with asynchronous promises and async/await?`,
      speechText: `JavaScript is the interactive engine of the web. It runs directly in the browser to handle user events, state, and asynchronous API requests without reloading the page.`,
      emotion: 'happy',
      action: 'none',
      intent: 'teaching'
    };
  }

  if (/\b(what is typescript|what's typescript|explain typescript|ts kya hai)\b/i.test(lower)) {
    return {
      reply: `TypeScript is JavaScript with static types. It acts as an instant safety net that catches typos, missing object properties, and type mismatches right in your editor before you ever run the code.\n\nOur Rihaan server and client are written completely in TypeScript!`,
      speechText: `TypeScript is JavaScript with static types. It acts as an instant safety net that catches typos and type mismatches right in your editor before you run the code.`,
      emotion: 'curious',
      action: 'none',
      intent: 'teaching'
    };
  }

  if (/\b(what is (?:an? )?api|what's (?:an? )?api|explain api|api kya hai)\b/i.test(lower)) {
    return {
      reply: `An API (Application Programming Interface) is a defined communication bridge between software systems. For example, our web client sends a JSON POST request to \`/api/chat\` on our server, and the server returns my reply payload.\n\nThink of it like a restaurant waiter taking your order to the kitchen and bringing back the meal!`,
      speechText: `An API is a defined communication bridge between software systems. For example, our web client sends a JSON POST request to slash api slash chat on our server, and the server returns my reply payload.`,
      emotion: 'curious',
      action: 'none',
      intent: 'teaching'
    };
  }

  // 9. Teaching: Recursion
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

  // 10. Teaching: Classes & OOP
  const isClassesTopic =
    /\b(classes|oop|object oriented|objects)\b/i.test(lower) ||
    request.learningState?.activeConcept === 'Classes' ||
    request.history.some((h) => /\b(classes|objects|blueprint|cookie cutter)\b/i.test(h.text));

  if (isClassesTopic) {
    if (/\b(hate|confused|don't understand|struggle|explain|teach)\b/i.test(lower)) {
      return {
        reply: `Fair enough 😂. Classes feel overly ceremonial at first. But forget "blueprints" for a minute. Think of a class like a custom cookie cutter, and the objects as the actual cookies that come out with their own sprinkles.\n\nSince you're comfortable with functions and variables, a class is just a bundle that packages variables and the functions that use them together so they don't get lost. Makes sense so far?`,
        speechText: `Fair enough! Classes feel ceremonial at first. But think of a class like a cookie cutter, and objects as the actual cookies. It just bundles variables and functions together. Makes sense so far?`,
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

  // 11. Coding & Debugging (Don't over-assist, ask for error / give targeted hint)
  if (/\b(code isn't working|bug|error|getting an error|syntax error|broken|fix my code)\b/i.test(lower)) {
    return {
      reply: `Send me the exact error message and the snippet first. I don't want to guess in the dark and waste your time. What line is it tripping on?`,
      speechText: `Send me the exact error message and snippet first. What line is it tripping on?`,
      emotion: 'curious',
      action: 'none',
      intent: 'debugging'
    };
  }

  // 12. General "What is [X]" or "Explain [X]" extractor
  const explainMatch = lower.match(/^(?:what is|what are|explain|tell me about)\s+([^?.!]+)/i);
  if (explainMatch && explainMatch[1]?.trim()) {
    const topic = explainMatch[1].trim();
    return {
      reply: `"${topic}" is an interesting subject. At a foundational level, it comes down to understanding how the core pieces interact and where it fits in the bigger picture.\n\nAre you looking at ${topic} for a specific assignment, a project, or just general curiosity? Tell me where you want to start.`,
      speechText: `${topic} is an interesting subject. At a foundational level, it comes down to understanding how the core pieces interact. Are you looking at ${topic} for a project, or general curiosity?`,
      emotion: 'curious',
      action: 'none',
      intent: 'teaching'
    };
  }

  // 13. Mode-specific dynamic responses
  if (mode === 'roast') {
    return {
      reply: `I knew you'd bring up "${message.trim()}" 😂. You have a PhD in turning simple tasks into deep philosophical debates. What's the real blocker here, madam?`,
      speechText: `I knew you'd bring that up! You have a PhD in turning simple tasks into deep philosophical debates. What's the real blocker here?`,
      emotion: 'teasing',
      action: 'none',
      intent: 'casual_chat'
    };
  }

  if (mode === 'alter_ego') {
    return {
      reply: `Step back and look at "${message.trim()}". You already know what the logical next step is; you're just second-guessing yourself because of the noise. Let's isolate the single next move and execute it.`,
      speechText: `Step back and look at that. You already know what the logical next step is. Let's isolate the single next move and execute it.`,
      emotion: 'serious',
      action: 'none',
      intent: 'reflection'
    };
  }

  if (mode === 'night_2am') {
    return {
      reply: `It's late, ${userName}. The world is quiet. When you mention "${message.trim()}", what's the thought underneath it? Unpack it gently, no rush.`,
      speechText: `It's late, ${userName}. When you mention that, what's the thought underneath it? Unpack it gently, no rush.`,
      emotion: 'curious',
      action: 'sit',
      intent: 'casual_chat'
    };
  }

  // 14. Dynamic contextual conversational response
  // Extract key non-stopwords from the user message to reflect their actual subject
  const significantWords = words.filter(
    (w) => !['the', 'and', 'that', 'this', 'with', 'about', 'just', 'have', 'from', 'what', 'your', 'tell', 'want', 'know'].includes(w)
  );
  const subjectSnippet = significantWords.slice(0, 3).join(' ');

  if (subjectSnippet) {
    return {
      reply: `You brought up ${subjectSnippet} — tell me more about what you're thinking there, ${userName}. How does that connect to what we're working on?`,
      speechText: `You brought up ${subjectSnippet}. Tell me more about what you're thinking there, ${userName}.`,
      emotion: 'curious',
      action: 'none',
      intent: 'casual_chat'
    };
  }

  return {
    reply: `I hear you, ${userName}. Let's dive into that — what direction do you want to take with it?`,
    speechText: `I hear you, ${userName}. What direction do you want to take with it?`,
    emotion: 'happy',
    action: 'none',
    intent: 'casual_chat'
  };
}
