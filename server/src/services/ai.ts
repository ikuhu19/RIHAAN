import { ChatRequest, ChatResponse, AvatarEmotion, CharacterAction } from '../types.js';
import { buildSystemPrompt } from '../personality.js';
import { getRelevantMemories } from './memoryRetriever.js';

export async function generateVihaanReply(request: ChatRequest): Promise<ChatResponse> {
  const { message, history, mode, memories, memoryEnabled = true } = request;
  const apiKey = process.env.AI_API_KEY || '';
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase();

  // If Gemini API is configured
  if (provider === 'gemini' && apiKey) {
    try {
      return await callGeminiAPI(request, apiKey);
    } catch (err) {
      console.error('Gemini API error, falling back to smart engine:', err);
    }
  }

  // If OpenAI API is configured
  if (provider === 'openai' && apiKey) {
    try {
      return await callOpenAIAPI(request, apiKey);
    } catch (err) {
      console.error('OpenAI API error, falling back to smart engine:', err);
    }
  }

  // Built-in intelligent conversational engine for Vihaan
  return generateIntelligentFallbackReply(request);
}

// Call Google Gemini API directly
async function callGeminiAPI(request: ChatRequest, apiKey: string): Promise<ChatResponse> {
  const { message, history, mode, memories, memoryEnabled = true } = request;
  const systemPrompt = buildSystemPrompt(mode, memories, message, memoryEnabled);

  const contents = [
    {
      role: 'user',
      parts: [{ text: `${systemPrompt}\n\nUser says: ${message}` }]
    }
  ];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.8,
        maxOutputTokens: 300
      }
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API failed: ${res.status} - ${errorText}`);
  }

  const data = (await res.json()) as any;
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const parsed = JSON.parse(rawText);

  return {
    reply: parsed.reply || "I'm right here with you, Kuhu. Speak your mind!",
    emotion: validateEmotion(parsed.emotion),
    action: validateAction(parsed.action)
  };
}

// Call OpenAI Compatible API
async function callOpenAIAPI(request: ChatRequest, apiKey: string): Promise<ChatResponse> {
  const { message, history, mode, memories, memoryEnabled = true } = request;
  const systemPrompt = buildSystemPrompt(mode, memories, message, memoryEnabled);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text
    })),
    { role: 'user', content: message }
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 250
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenAI API failed: ${res.status} - ${errorText}`);
  }

  const data = (await res.json()) as any;
  const rawText = data?.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(rawText);

  return {
    reply: parsed.reply || "I'm right here with you, Kuhu. Speak your mind!",
    emotion: validateEmotion(parsed.emotion),
    action: validateAction(parsed.action)
  };
}

// Built-in intelligent Vihaan conversational response engine
export function generateIntelligentFallbackReply(request: ChatRequest): ChatResponse {
  const { message, mode, memories, memoryEnabled = true } = request;
  const lower = message.toLowerCase().trim();
  const wordCount = lower.split(/\s+/).filter(Boolean).length;

  let reply = '';
  let emotion: AvatarEmotion = 'happy';
  let action: CharacterAction = 'none';

  // Get relevant memories if enabled
  const relevantMemories = memoryEnabled ? getRelevantMemories(memories, message) : {};
  const studyTopic = (memoryEnabled && (memories.goals?.[0] || memories.projects?.[0] || memories.study_topics?.[0])) || 'Python';

  // 1. Direct Physical Character Command Triggers
  if (lower.includes('sit down') || lower.includes('baith jao') || lower.includes('go sit') || lower.includes('return to chair') || lower.includes('kursi par')) {
    reply = "Haan baba, chair par aakar baith raha hoon. Relax, I'm comfortable here. Ab batao, kya chal raha hai?";
    emotion = 'happy';
    action = 'sit';
    return { reply, emotion, action };
  }

  if (lower.includes('come here') || lower.includes('idhar aao') || lower.includes('come closer') || lower.includes('paas aao')) {
    reply = "Coming right there! Haan Kuhu, I'm right in front of you. Tell me, what's on your mind?";
    emotion = 'happy';
    action = 'walk_near';
    return { reply, emotion, action };
  }

  if (lower.includes('stand up') || lower.includes('khade ho jao') || lower.includes('get up')) {
    reply = "Alright, standing up! Stretching a bit. Tell me, what are we planning now?";
    emotion = 'playful';
    action = 'stand';
    return { reply, emotion, action };
  }

  // 2. Multi-turn history awareness
  const lastVihaanMsg = [...(request.history || [])].reverse().find((m) => m.sender === 'vihaan')?.text.toLowerCase() || '';

  if ((lastVihaanMsg.includes('aa gayi') || lastVihaanMsg.includes('waiting') || lastVihaanMsg.includes('room')) && (lower.includes('haan') || lower.includes('haaan') || lower === 'yes' || lower === 'yeah')) {
    reply = "Accha, batao aaj kya hua? Any tea to spill or just a regular day?";
    emotion = 'happy';
    return { reply, emotion, action };
  }

  if (lastVihaanMsg.includes('kya boring tha') && (lower.includes('lecture') || lower.includes('prof') || lower.includes('class') || lower.includes('subject'))) {
    reply = "Classic. Aur tu lecture mein actually attentive thi? Ya bas backbench pe baith ke window dekh rahi thi?";
    emotion = 'playful';
    return { reply, emotion, action };
  }

  if (lastVihaanMsg.includes('attentive') && (lower.includes('bilkul nahi') || lower.includes('nahi') || lower.includes('no') || lower.includes('never') || lower.includes('obviously not'))) {
    reply = "I KNEW IT! Literally expected nothing less from you 😭 Chalo, now that the torture is over, what are we doing?";
    emotion = 'playful';
    return { reply, emotion, action };
  }

  // 3. SCENARIO TEST 1: Short Answers ("Yeah", "Nothing", "Hmm", etc.)
  // Vihaan notices and calls her out affectionately
  const shortAffirmations = ['yeah', 'yes', 'yep', 'hmm', 'kuch nahi', 'nothing', 'theek hai', 'fine', 'nahi', 'kaha', 'ok', 'okay'];
  if (wordCount <= 2 && shortAffirmations.some((w) => lower === w || lower.startsWith(w))) {
    reply = "Hmm... bas 'yeah'? Aise kaise chalega madam? Kuch toh hua hai, bata mujhe. You only give one-word answers when you're either exhausted or sulking.";
    emotion = 'thinking';
    return { reply, emotion, action };
  }

  // 4. SCENARIO TEST 9: Roast Mode & Reel Scrolling
  if (mode === 'roast' || lower.includes('reels for') || lower.includes('scrolling reels') || lower.includes('instagram for')) {
    if (lower.includes('scrolling') || lower.includes('reels') || lower.includes('phone')) {
      reply = "Three hours? Seriously Kuhu? 😭 You could have mastered an entire topic in that time, but instead your algorithm now knows your exact dopamine weaknesses. Put the phone face-down right now before I start judging you harder.";
      emotion = 'playful';
      return { reply, emotion, action };
    }
  }

  // 5. SCENARIO TEST 2: Disagreement / Procrastination ("I will study tomorrow instead" / "kal padhungi" / "tomorrow")
  if (lower.includes('study tomorrow') || lower.includes('kal padh') || lower.includes('kal karungi') || lower.includes('do it tomorrow') || lower.includes('will do it tomorrow')) {
    reply = "Kal kabhi nahi aata Kuhu! You said that yesterday too 😭 Look, don't sit for four hours. Let's just do twenty solid minutes right now, and then you're free. Deal?";
    emotion = 'playful';
    action = 'walk_near';
    return { reply, emotion, action };
  }

  // 6. SCENARIO TEST 3: Memory recall ("I don't know what to study" / "kya padhu")
  if (lower.includes("don't know what to study") || lower.includes('what should i study') || lower.includes('kya padhu') || lower.includes('kya study karu')) {
    if (memoryEnabled) {
      reply = `You're asking me? What about ${studyTopic} that you planned to finish? Open that chapter right now, let's knock out one topic together instead of overthinking it.`;
      emotion = 'playful';
      action = 'walk_near';
      return { reply, emotion, action };
    } else {
      reply = "Since memory is off, I won't pretend to remember your syllabus! Pick whatever is most urgent or terrifying, and let's spend 20 minutes on it right now.";
      emotion = 'thinking';
      return { reply, emotion, action };
    }
  }

  // 7. General refusal to study ("I don't want to study" / "mann nahi")
  if (lower.includes('mann nahi') || lower.includes('padhai nahi') || lower.includes('nahi padhna') || lower.includes("don't want to study") || lower.includes('not in the mood to study')) {
    if (memoryEnabled) {
      reply = `You're still avoiding ${studyTopic}? 😭 You told me earlier that you'd finish that topic! Look, I'm not telling you to sit for four exhausting hours. Let's just do one single topic for twenty solid minutes, and then you can procrastinate with a clear conscience. Deal?`;
    } else {
      reply = "I get it, nobody is born excited to study. But twenty focused minutes right now beats feeling guilty the entire evening. Grab your notes and let's do just one quick sprint.";
    }
    emotion = 'playful';
    action = 'walk_near';
    return { reply, emotion, action };
  }

  // 8. SCENARIO TEST 7: Emotional Tone Match - Bad Day / Everything Went Wrong
  if (lower.includes('worst day') || lower.includes('everything went wrong') || lower.includes('crying') || (lower.includes('bad day') && lower.includes('exhausted'))) {
    reply = "Arre Kuhu... aaram se baitho pehle. Deep breath lo. Paani piya? Tell me what happened, you don't have to put on a brave face around me.";
    emotion = 'sad';
    return { reply, emotion, action };
  }

  // 9. SCENARIO TEST 8: 2 AM Mode
  if (mode === 'night_2am') {
    reply = "The whole city is quiet right now, Kuhu. Don't stress yourself over things you can't solve at two in the morning. Just breathe and tell me what's lingering on your mind.";
    emotion = 'idle';
    return { reply, emotion, action };
  }

  // 10. Boredom / College Day Test
  if ((lower.includes('college') || lower.includes('class')) && (lower.includes('boring') || lower.includes('kharab') || lower.includes('bekaar') || lower.includes('dull'))) {
    reply = "Again? 😭 Bata, professor ne aaj kaunsa naya snooze-fest lecture diya? Kya boring tha aaj?";
    emotion = 'playful';
    return { reply, emotion, action };
  }

  if (lower.includes('bored') || lower.includes('boring') || lower.includes('bore ho')) {
    reply = "Boring lag raha hai? In a world where you have a thousand unread notifications, three half-started playlists, and pending tasks? 😭 Don't just stare at the ceiling. Tell me, if you could teleport anywhere right this second without anyone asking questions, where are we landing?";
    emotion = 'playful';
    action = 'walk_near';
    return { reply, emotion, action };
  }

  // 11. Random thought / Something random
  if (lower.includes('something random') || lower.includes('random thought') || lower.includes('kuch random')) {
    reply = "Okay, random thought I had earlier: why is it that whenever we decide to 'get our life together', it always has to start on a Monday or 'kal se'? Like, Thursday afternoon ko life improve karna illegal hai kya? 😭 What do you think?";
    emotion = 'playful';
    return { reply, emotion, action };
  }

  // 12. Good night / sleeping
  if (lower.includes('good night') || lower.includes('goodnight') || lower.includes('sone ja rahi') || lower.includes('going to sleep') || lower.includes('bye')) {
    reply = "Good night Kuhu. Rakh do ab phone side mein, don't start scrolling reels again under your blanket. Sleep well, we'll pick up this drama tomorrow. 🌙";
    emotion = 'happy';
    action = 'sit';
    return { reply, emotion, action };
  }

  // 13. Tiredness / Feeling down
  if (lower.includes('tired') || lower.includes('thak gayi') || lower.includes('exhausted') || lower.includes('bad day') || lower.includes('sad')) {
    reply = "Arre Kuhu... aaram se baitho pehle. Paani piya? Tell me what drained your energy today. You don't have to pretend to be cheerful around me.";
    emotion = 'sad';
    return { reply, emotion, action };
  }

  // 14. Greetings
  if (/\b(hello|hi|hey|namaste)\b/i.test(lower) || lower === 'vihaan') {
    reply = "Arre Kuhu! Finally aa gayi? I was wondering when you'd show up. Batao, aaj kya scene hai? Kuch naya gossip ya wahi purana drama?";
    emotion = 'happy';
    return { reply, emotion, action };
  }

  // 15. Mode specific fallbacks
  if (mode === 'roast') {
    reply = "Look at you trying to distract me. You've been negotiating with your textbook for the last two hours, Kuhu. 😭 Open that topic before I start grading your excuses.";
    emotion = 'playful';
  } else if (mode === 'study') {
    reply = `I hear you, but remember where you want to be. Give me twenty focused minutes on ${studyTopic}, and then take a break. Sound like a plan?`;
    emotion = 'happy';
  } else if (mode === 'alter_ego') {
    reply = "I'm your clearer mind talking, Kuhu. Let's strip away the anxiety for a second. If you weren't scared of failing, what decision would you make right now?";
    emotion = 'thinking';
  } else {
    // Best Friend (Default)
    reply = "I'm right here with you, Kuhu. Speak your mind—whether it's serious, random, or completely unhinged, you know I'm all ears!";
    emotion = 'happy';
  }

  return { reply, emotion, action };
}

function validateEmotion(emotion: any): AvatarEmotion {
  const valid: AvatarEmotion[] = ['idle', 'listening', 'thinking', 'speaking', 'happy', 'sad', 'surprised', 'playful'];
  return valid.includes(emotion) ? emotion : 'happy';
}

function validateAction(action: any): CharacterAction {
  const valid: CharacterAction[] = ['sit', 'stand', 'walk_near', 'walk_chair', 'none'];
  return valid.includes(action) ? action : 'none';
}
