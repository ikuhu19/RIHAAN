import { ChatMessage, PersonalityMode, MemoryStore, AvatarEmotion, CharacterAction } from '../types';

export interface ChatApiResponse {
  reply: string;
  emotion: AvatarEmotion;
  action?: CharacterAction;
  extractedMemories?: Partial<MemoryStore>;
}

export async function sendChatMessage(
  message: string,
  history: ChatMessage[],
  mode: PersonalityMode,
  memories: MemoryStore,
  memoryEnabled: boolean = true
): Promise<ChatApiResponse> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, mode, memories, memoryEnabled })
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.warn('Backend /api/chat unreachable, using local fallback:', error);
    return getLocalClientFallback(message, mode, memories, memoryEnabled);
  }
}

function getLocalClientFallback(
  message: string,
  mode: PersonalityMode,
  memories: MemoryStore,
  memoryEnabled: boolean = true
): ChatApiResponse {
  const lower = message.toLowerCase().trim();
  const wordCount = lower.split(/\s+/).filter(Boolean).length;
  let reply = "I'm right here with you, Kuhu. Speak your mind!";
  let emotion: AvatarEmotion = 'happy';
  let action: CharacterAction = 'none';

  const studyTopic = (memoryEnabled && (memories.goals?.[0] || memories.projects?.[0])) || 'Python';

  // Command detection for character action
  if (lower.includes('sit down') || lower.includes('baith jao') || lower.includes('go sit') || lower.includes('chair')) {
    reply = "Haan baba, chair par aakar baith raha hoon. Relax, I'm comfortable. Ab batao, kya chal raha hai?";
    emotion = 'happy';
    action = 'sit';
    return { reply, emotion, action };
  }

  if (lower.includes('come here') || lower.includes('idhar aao') || lower.includes('come closer')) {
    reply = "Coming right there! Haan Kuhu, I'm right in front of you. Tell me, what's on your mind?";
    emotion = 'happy';
    action = 'walk_near';
    return { reply, emotion, action };
  }

  if (lower.includes('stand up') || lower.includes('khade ho jao')) {
    reply = "Alright, standing up! Stretching a bit. Tell me, what are we planning now?";
    emotion = 'playful';
    action = 'stand';
    return { reply, emotion, action };
  }

  // SCENARIO TEST 1: Brevity / Short-Answer Detection ("Yeah", "Nothing", "Hmm", etc.)
  const shortAffirmations = ['yeah', 'yes', 'yep', 'hmm', 'kuch nahi', 'nothing', 'theek hai', 'fine', 'nahi', 'kaha', 'ok', 'okay'];
  if (wordCount <= 2 && shortAffirmations.some((w) => lower === w || lower.startsWith(w))) {
    reply = "Hmm... bas 'yeah'? Aise kaise chalega madam? Kuch toh hua hai, bata mujhe. You only give one-word answers when you're either exhausted or sulking.";
    emotion = 'thinking';
    return { reply, emotion, action };
  }

  // SCENARIO TEST 9: Reel Scrolling
  if (lower.includes('reels for') || lower.includes('scrolling reels') || (mode === 'roast' && (lower.includes('reels') || lower.includes('scroll')))) {
    reply = "Three hours? Seriously Kuhu? 😭 You could have mastered an entire topic in that time, but instead your algorithm now knows your exact dopamine weaknesses. Put the phone face-down right now.";
    emotion = 'playful';
    return { reply, emotion, action };
  }

  // SCENARIO TEST 2: Disagreement / Procrastination
  if (lower.includes('study tomorrow') || lower.includes('kal padh') || lower.includes('kal karungi') || lower.includes('do it tomorrow')) {
    reply = "Kal kabhi nahi aata Kuhu! You said that yesterday too 😭 Look, don't sit for four hours. Let's just do twenty solid minutes right now, and then you're free. Deal?";
    emotion = 'playful';
    action = 'walk_near';
    return { reply, emotion, action };
  }

  // SCENARIO TEST 3: Memory recall
  if (lower.includes("don't know what to study") || lower.includes('what should i study') || lower.includes('kya padhu')) {
    if (memoryEnabled) {
      reply = `You're asking me? What about ${studyTopic} that you planned to finish? Open that chapter right now, let's knock out one topic together.`;
    } else {
      reply = "Since memory is off, pick whatever is most urgent or terrifying right now and let's do 20 minutes on it together.";
    }
    emotion = 'playful';
    action = 'walk_near';
    return { reply, emotion, action };
  }

  // Refusal to study
  if (lower.includes('mann nahi') || lower.includes('padhai nahi') || lower.includes('nahi padhna') || lower.includes("don't want to study") || lower.includes('not in the mood to study')) {
    if (memoryEnabled) {
      reply = `You're still avoiding ${studyTopic}? 😭 You told me earlier that you'd finish that topic! Look, I'm not telling you to sit for four exhausting hours. Let's just do one single topic for twenty solid minutes, and then you can procrastinate with a clear conscience. Deal?`;
    } else {
      reply = "Twenty focused minutes right now beats feeling guilty the entire evening. Grab your notes and let's do just one quick sprint.";
    }
    emotion = 'playful';
    action = 'walk_near';
    return { reply, emotion, action };
  }

  // SCENARIO TEST 7: Bad day / Emotional tone match
  if (lower.includes('worst day') || lower.includes('everything went wrong') || lower.includes('crying')) {
    reply = "Arre Kuhu... aaram se baitho pehle. Deep breath lo. Paani piya? Tell me what happened, you don't have to put on a brave face around me.";
    emotion = 'sad';
    return { reply, emotion, action };
  }

  // SCENARIO TEST 8: 2 AM Mode
  if (mode === 'night_2am') {
    reply = "The whole city is quiet right now, Kuhu. Don't stress yourself over things you can't solve at two in the morning. Just breathe and tell me what's lingering on your mind.";
    emotion = 'idle';
    return { reply, emotion, action };
  }

  // Boredom
  if (lower.includes('bored') || lower.includes('bore ho rahi')) {
    reply = "Bored? In a world where you have a thousand unread notifications, three half-started playlists, and pending tasks? 😭 Don't just stare at the ceiling. Tell me, if you could teleport anywhere right this second without anyone asking questions, where are we landing?";
    emotion = 'playful';
    action = 'walk_near';
    return { reply, emotion, action };
  }

  // Something random
  if (lower.includes('something random') || lower.includes('random thought') || lower.includes('kuch random')) {
    reply = "Okay, random thought I had earlier: why is it that whenever we decide to 'get our life together', it always has to start on a Monday or 'kal se'? Like, Thursday afternoon ko life improve karna illegal hai kya? 😭 What do you think?";
    emotion = 'playful';
    return { reply, emotion, action };
  }

  // Good night
  if (lower.includes('good night') || lower.includes('goodnight') || lower.includes('sone ja rahi') || lower.includes('going to sleep') || lower.includes('bye')) {
    reply = "Good night Kuhu. Rakh do ab phone side mein, don't start scrolling reels again under your blanket. Sleep well, we'll pick up this drama tomorrow. 🌙";
    emotion = 'happy';
    action = 'sit';
    return { reply, emotion, action };
  }

  // Mode responses
  if (mode === 'roast') {
    reply = "Look at you trying to distract me. You've been negotiating with your textbook for the last two hours, Kuhu. 😭 Open that topic before I start grading your excuses.";
    emotion = 'playful';
  } else if (mode === 'study') {
    reply = `Let's focus. No giant mountains, just twenty solid minutes on ${studyTopic} right now.`;
    emotion = 'idle';
  } else if (mode === 'alter_ego') {
    reply = "I'm your clearer mind talking, Kuhu. Let's strip away the anxiety for a second. If you weren't scared of failing, what decision would you make right now?";
    emotion = 'thinking';
  } else {
    reply = "Arre Kuhu, I'm listening yaar. Speak your mind—whether it's serious, random, or completely unhinged!";
    emotion = 'happy';
  }

  return { reply, emotion, action };
}
