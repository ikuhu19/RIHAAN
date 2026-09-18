import {
  LearningState,
  LearningTopic,
  LearningConcept,
  MasteryLevel,
  MemoryItem
} from '../types.js';

export const DEFAULT_LEARNING_STATE: LearningState = {
  topics: {
    Python: {
      topic: 'Python',
      currentGoal: 'Master fundamentals, data structures, and build practical projects',
      concepts: {
        Variables: {
          name: 'Variables',
          status: 'understood',
          lastPracticed: Date.now() - 86400000 * 3,
          attemptsCount: 3,
          notes: 'Solid on basics and types'
        },
        Functions: {
          name: 'Functions',
          status: 'understood',
          lastPracticed: Date.now() - 86400000 * 2,
          attemptsCount: 4,
          notes: 'Understands arguments and returns'
        },
        Dictionaries: {
          name: 'Dictionaries',
          status: 'practicing',
          lastPracticed: Date.now() - 86400000,
          attemptsCount: 2,
          notes: 'Comfortable with key-value access, needs practice with nested structures'
        },
        Classes: {
          name: 'Classes',
          status: 'struggling',
          lastPracticed: Date.now() - 86400000,
          attemptsCount: 2,
          notes: 'Finds OOP and self confusing; prefers procedural style',
          misconceptions: ['Thinks classes are just dictionaries with functions']
        },
        Recursion: {
          name: 'Recursion',
          status: 'struggling',
          lastPracticed: Date.now() - 86400000 * 4,
          attemptsCount: 2,
          notes: 'Gets stuck on the base case exit condition and call stack order',
          misconceptions: ['Views recursion as an infinite loop rather than shrinking problem']
        }
      }
    }
  },
  activeTopic: 'Python',
  activeConcept: 'Classes'
};

/**
 * Format active learning context for inclusion into Rihaan's system prompt.
 * Supplies specific pedagogical instructions to the LLM.
 */
export function formatLearningContextForPrompt(
  state: LearningState = DEFAULT_LEARNING_STATE,
  userMessage: string = '',
  memories: MemoryItem[] = []
): string {
  const lines: string[] = [];

  // Identify active project for contextual analogies
  const projectMemory = memories.find((m) => m.active && m.category === 'project');
  const projectContext = projectMemory ? projectMemory.content : 'a hands-on coding project';

  lines.push(`ACTIVE LEARNING CONTEXT:`);
  lines.push(`- Anchor Project for Analogies: "${projectContext}"`);

  // Detect which topic the user might be referring to
  const lower = userMessage.toLowerCase();
  let matchedTopic: LearningTopic | null = null;

  for (const topicKey of Object.keys(state.topics)) {
    if (lower.includes(topicKey.toLowerCase())) {
      matchedTopic = state.topics[topicKey];
      break;
    }
  }

  if (!matchedTopic && state.activeTopic && state.topics[state.activeTopic]) {
    matchedTopic = state.topics[state.activeTopic];
  }

  if (matchedTopic) {
    lines.push(`- Current Subject: ${matchedTopic.topic} (${matchedTopic.currentGoal || 'Skill progression'})`);

    const struggling: string[] = [];
    const practicing: string[] = [];
    const understood: string[] = [];

    for (const [name, concept] of Object.entries(matchedTopic.concepts)) {
      if (concept.status === 'struggling') {
        const mis = concept.misconceptions?.length ? ` (Misconception: ${concept.misconceptions[0]})` : '';
        struggling.push(`${name}${mis}`);
      } else if (concept.status === 'practicing' || concept.status === 'beginner') {
        practicing.push(name);
      } else if (concept.status === 'understood' || concept.status === 'mastered') {
        understood.push(name);
      }
    }

    if (understood.length > 0) {
      lines.push(`  * Mastered/Understood: ${understood.join(', ')} -> DO NOT waste time re-explaining these basics; build directly from them.`);
    }
    if (practicing.length > 0) {
      lines.push(`  * In Progress / Practicing: ${practicing.join(', ')}`);
    }
    if (struggling.length > 0) {
      lines.push(`  * Struggles With: ${struggling.join(', ')} -> CRITICAL: If discussing this, DO NOT dump a textbook definition. Use an intuitive analogy from everyday life or the project "${projectContext}", and ask an interactive check question first.`);
    }
  }

  lines.push(`PEDAGOGICAL DIRECTIVES:`);
  lines.push(`1. Never give away full code solutions instantly when asked for help; offer a high-leverage hint or ask the user what a specific line does first.`);
  lines.push(`2. If the user expresses confusion ("I still don't get it", "what?"), immediately PIVOT to a completely different explanation style.`);
  lines.push(`3. When introducing a new concept, link it to their actual project: ${projectContext}.`);

  return lines.join('\n');
}

/**
 * Updates learning state based on structured learning observations from conversation.
 */
export function updateLearningProgress(
  state: LearningState,
  learningUpdate?: {
    active: boolean;
    topic?: string;
    concept?: string;
    status?: MasteryLevel;
    difficulty?: 'easy' | 'medium' | 'hard';
    misconception?: string;
  }
): LearningState {
  if (!learningUpdate || !learningUpdate.topic || !learningUpdate.concept) {
    return state;
  }

  const { topic, concept, status, misconception } = learningUpdate;
  const nextTopics = { ...state.topics };

  if (!nextTopics[topic]) {
    nextTopics[topic] = {
      topic,
      concepts: {}
    };
  }

  const topicObj = { ...nextTopics[topic] };
  const existingConcept = topicObj.concepts[concept] || {
    name: concept,
    status: 'beginner' as MasteryLevel,
    lastPracticed: Date.now(),
    attemptsCount: 0
  };

  const updatedMisconceptions = [...(existingConcept.misconceptions || [])];
  if (misconception && !updatedMisconceptions.includes(misconception)) {
    updatedMisconceptions.push(misconception);
  }

  topicObj.concepts = {
    ...topicObj.concepts,
    [concept]: {
      ...existingConcept,
      status: status || existingConcept.status,
      lastPracticed: Date.now(),
      attemptsCount: existingConcept.attemptsCount + 1,
      misconceptions: updatedMisconceptions
    }
  };

  nextTopics[topic] = topicObj;

  return {
    ...state,
    topics: nextTopics,
    activeTopic: topic,
    activeConcept: concept
  };
}
