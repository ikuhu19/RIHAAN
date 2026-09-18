// Time-aware personalized greeting generator for Vihaan with Phase 3 variations

export interface GreetingResult {
  text: string;
  emotion: 'happy' | 'playful' | 'idle';
  posture: 'sitting' | 'standing';
  action: 'stand' | 'sit' | 'none';
}

let lastGreetingIndex = -1;

export function generateVihaanGreeting(userName = 'Kuhu'): GreetingResult {
  const hour = new Date().getHours();

  let pool: GreetingResult[] = [];

  // Morning: 5:00 - 11:59
  if (hour >= 5 && hour < 12) {
    pool = [
      {
        text: `Good morning, ${userName}. Finally awake? 😭 Batao, aaj ka kya plan hai?`,
        emotion: 'playful',
        posture: 'sitting',
        action: 'stand'
      },
      {
        text: `Morning, ${userName}. Kya scene hai today? Ready for the day or starting with procrastination?`,
        emotion: 'happy',
        posture: 'sitting',
        action: 'stand'
      },
      {
        text: `Good morning ${userName} ☀️ Finally aa gayi? Come, baitho. Chai ya coffee hui?`,
        emotion: 'happy',
        posture: 'sitting',
        action: 'none'
      }
    ];
  } else if (hour >= 12 && hour < 17) {
    // Afternoon: 12:00 - 16:59
    pool = [
      {
        text: `Arre ${userName}, lunch hua? You look like you need a breather, baitho pehle.`,
        emotion: 'happy',
        posture: 'sitting',
        action: 'stand'
      },
      {
        text: `Accha madam aa gayi. 😭 Batao, college kaisa raha ab tak? Sab theek?`,
        emotion: 'playful',
        posture: 'sitting',
        action: 'none'
      },
      {
        text: `Hey ${userName}, come sit. I was wondering what you're up to this afternoon. Kya chal raha hai?`,
        emotion: 'happy',
        posture: 'sitting',
        action: 'none'
      }
    ];
  } else if (hour >= 17 && hour < 21) {
    // Evening: 17:00 - 20:59
    pool = [
      {
        text: `Hey ${userName}. How was your day? I've been waiting to hear all the stories.`,
        emotion: 'happy',
        posture: 'sitting',
        action: 'stand'
      },
      {
        text: `Arre ${userName}! Finally free? Batao, how was your day? Sab theek na?`,
        emotion: 'happy',
        posture: 'sitting',
        action: 'stand'
      },
      {
        text: `${userName}! Finally. Kahan thi itni der se? 😭 Come, tell me everything from today.`,
        emotion: 'playful',
        posture: 'sitting',
        action: 'stand'
      }
    ];
  } else if (hour >= 21 && hour < 24) {
    // Night: 21:00 - 23:59
    pool = [
      {
        text: `Accha madam, abhi tak awake? Still scrolling or actually doing something useful? 😭`,
        emotion: 'playful',
        posture: 'sitting',
        action: 'none'
      },
      {
        text: `Hey ${userName}. The whole day is finally over. Aaram se baitho and relax now.`,
        emotion: 'happy',
        posture: 'sitting',
        action: 'none'
      },
      {
        text: `Arre ${userName}, raat ho gayi. Batao, what's lingering on your mind before sleep?`,
        emotion: 'idle',
        posture: 'sitting',
        action: 'none'
      }
    ];
  } else {
    // Very Late: 0:00 - 4:59
    pool = [
      {
        text: `${userName}... it's late. What are you doing? 😭 Should you not be asleep right now?`,
        emotion: 'idle',
        posture: 'sitting',
        action: 'none'
      },
      {
        text: `Kuhu... it's quite late. What are you still doing awake? Come, tell me what's on your mind.`,
        emotion: 'idle',
        posture: 'sitting',
        action: 'none'
      },
      {
        text: `Hey ${userName}. The whole world is asleep, and it's just you and me here. Everything okay, yaar?`,
        emotion: 'idle',
        posture: 'sitting',
        action: 'none'
      }
    ];
  }

  // Ensure we don't repeat the exact same consecutive greeting
  let selectedIndex = Math.floor(Math.random() * pool.length);
  if (selectedIndex === lastGreetingIndex && pool.length > 1) {
    selectedIndex = (selectedIndex + 1) % pool.length;
  }
  lastGreetingIndex = selectedIndex;

  return pool[selectedIndex];
}
