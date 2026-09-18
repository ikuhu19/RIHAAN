import {
  ChatRequest,
  ChatResponse,
  StructuredAiOutput,
  AvatarEmotion,
  CharacterAction,
  MemoryItem,
  OpenLoopItem,
  LearningState
} from '../types.js';
import {
  mergeCandidateMemories,
  removeMemoriesByQuery,
  convertMemoryItemsToLegacy,
  convertLegacyToMemoryItems
} from './memoryService.js';
import { updateLearningProgress } from './learningService.js';
import { PreparedContext } from './conversationManager.js';

export function cleanSpeechText(visualReply: string): string {
  return visualReply
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, 'Here is the code block.')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove bold/italics
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bullet dashes
    .replace(/^\s*[-*+]\s+/gm, '')
    // Remove numbered lists (1. )
    .replace(/^\s*\d+\.\s+/gm, '')
    // Clean excessive spaces/newlines
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function validateEmotion(emotion?: string): AvatarEmotion {
  const valid: AvatarEmotion[] = [
    'idle',
    'listening',
    'thinking',
    'speaking',
    'happy',
    'sad',
    'surprised',
    'playful',
    'curious',
    'serious',
    'teasing',
    'concerned'
  ];
  if (emotion && valid.includes(emotion as AvatarEmotion)) {
    return emotion as AvatarEmotion;
  }
  return 'happy';
}

export function validateAction(action?: string): CharacterAction {
  const valid: CharacterAction[] = ['sit', 'stand', 'walk_near', 'walk_chair', 'none'];
  if (action && valid.includes(action as CharacterAction)) {
    return action as CharacterAction;
  }
  return 'none';
}

export function processStructuredResponse(
  rawOutput: Partial<StructuredAiOutput>,
  request: ChatRequest,
  context: PreparedContext
): ChatResponse {
  const {
    message,
    memories,
    richMemories,
    learningState = { topics: {} },
    openLoops = [],
    memoryEnabled = true,
    userName = 'Kuhu'
  } = request;

  const reply = rawOutput.reply || `I'm right here with you, ${userName}.`;
  const speechText = rawOutput.speechText ? cleanSpeechText(rawOutput.speechText) : cleanSpeechText(reply);
  const emotion = validateEmotion(rawOutput.emotion);
  const action = validateAction(rawOutput.action);
  const intent = rawOutput.intent || context.intent;

  let currentMemories: MemoryItem[] =
    richMemories && richMemories.length > 0
      ? [...richMemories]
      : convertLegacyToMemoryItems(memories || { profile: [], likes: [], dislikes: [], goals: [], important_context: [], current_context: [], projects: [] });

  let newItems: MemoryItem[] = [];
  let removedIds: string[] = [];

  // Process Explicit Remember if user commanded
  if (memoryEnabled && context.explicitMemoryCheck.isExplicitRemember && context.explicitMemoryCheck.targetText) {
    const explicitMerge = mergeCandidateMemories(currentMemories, [
      {
        content: context.explicitMemoryCheck.targetText,
        category: context.explicitMemoryCheck.category || 'identity',
        importance: 5,
        source: 'explicit',
        confidence: 1.0
      }
    ]);
    currentMemories = explicitMerge.updatedList;
    newItems.push(...explicitMerge.newItems);
  }

  // Process Explicit Forget if user commanded
  if (context.explicitMemoryCheck.isExplicitForget && context.explicitMemoryCheck.targetText) {
    const removal = removeMemoriesByQuery(currentMemories, context.explicitMemoryCheck.targetText);
    currentMemories = removal.updatedList;
    removedIds.push(...removal.removedIds);
  }

  // Process LLM-suggested candidate memories if memory is enabled
  if (memoryEnabled && rawOutput.memoryCandidates && rawOutput.memoryCandidates.length > 0) {
    const merge = mergeCandidateMemories(currentMemories, rawOutput.memoryCandidates);
    currentMemories = merge.updatedList;
    newItems.push(...merge.newItems);
  }

  // Process LLM-suggested forget requests
  if (rawOutput.forgetRequests && rawOutput.forgetRequests.length > 0) {
    for (const forgetQuery of rawOutput.forgetRequests) {
      const removal = removeMemoriesByQuery(currentMemories, forgetQuery);
      currentMemories = removal.updatedList;
      removedIds.push(...removal.removedIds);
    }
  }

  // Process Learning Progress
  let updatedLearningState: LearningState = { ...learningState };
  if (rawOutput.learning && rawOutput.learning.active) {
    updatedLearningState = updateLearningProgress(learningState, rawOutput.learning);
  }

  // Process Open Loops
  let updatedOpenLoops: OpenLoopItem[] = [...openLoops];
  if (rawOutput.openLoop && rawOutput.openLoop.trim()) {
    const loopContent = rawOutput.openLoop.trim();
    if (!updatedOpenLoops.some((l) => l.content.toLowerCase() === loopContent.toLowerCase() && l.status === 'open')) {
      updatedOpenLoops.push({
        id: `loop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        content: loopContent,
        topic: rawOutput.learning?.topic,
        status: 'open',
        createdAt: Date.now()
      });
    }
  }

  if (rawOutput.resolvedLoopId) {
    updatedOpenLoops = updatedOpenLoops.map((l) =>
      l.id === rawOutput.resolvedLoopId ? { ...l, status: 'resolved' } : l
    );
  }

  return {
    reply,
    speechText,
    emotion,
    action,
    intent,
    extractedMemories: convertMemoryItemsToLegacy(currentMemories),
    newMemories: newItems,
    removedMemoryIds: removedIds,
    updatedLearningState,
    updatedOpenLoops,
    followUp: rawOutput.followUp || null,
    authoritativeMemories: currentMemories
  };
}
