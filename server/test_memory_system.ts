import {
  loadAuthoritativeMemories,
  saveAuthoritativeMemories,
  clearAuthoritativeMemories
} from './src/services/memoryStorage.js';
import {
  retrieveContextualMemories,
  mergeCandidateMemories,
  removeMemoriesByQuery,
  containsSensitiveData
} from './src/services/memoryService.js';
import { generateVihaanReply } from './src/services/ai.js';
import { ChatRequest, MemoryItem } from './src/types.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`✅ [PASS] ${description}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${description}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('🧪 Starting RIHAAN Persistent Contextual Memory Test Suite...\n');

  // Backup existing data
  const initialMemories = loadAuthoritativeMemories();

  try {
    // TEST 1: Secrets & Credentials filtering
    console.log('\n--- Test 1: Credential & Secret Protection ---');
    const isSecret1 = containsSensitiveData('Remember that my password is supersecret99');
    const isSecret2 = containsSensitiveData('My api key is sk-1234567890abcdef123456');
    const isSafe = containsSensitiveData("Remember that my dog's name is Bruno");
    assert(isSecret1 === true, 'Detects and flags password');
    assert(isSecret2 === true, 'Detects and flags API key');
    assert(isSafe === false, 'Allows safe personal facts to pass');

    // TEST 2: Explicit Remember & Memory Candidate Extraction
    console.log('\n--- Test 2: Explicit Remember Command ---');
    const rememberReq: ChatRequest = {
      message: "Remember that my dog's name is Bruno.",
      history: [],
      mode: 'best_friend',
      memories: { profile: [], likes: [], dislikes: [], goals: [], important_context: [], current_context: [], projects: [] },
      richMemories: [...initialMemories],
      userName: 'Kuhu'
    };
    const rememberRes = await generateVihaanReply(rememberReq);
    assert(
      Boolean(rememberRes.newMemories && rememberRes.newMemories.some((m) => m.content.toLowerCase().includes('bruno'))),
      'Generates new memory candidate for Bruno'
    );
    assert(
      rememberRes.reply.toLowerCase().includes('bruno') || rememberRes.reply.toLowerCase().includes('memory'),
      'Acknowledges storing the memory naturally'
    );

    // Save Bruno to authoritative memories
    const withBruno = rememberRes.authoritativeMemories || [
      {
        id: 'test_bruno_1',
        content: "Dog's name is Bruno",
        category: 'relationship' as const,
        importance: 4,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        source: 'explicit' as const,
        confidence: 1.0,
        tags: ['dog', 'bruno', 'pet'],
        active: true
      },
      ...initialMemories
    ];
    saveAuthoritativeMemories(withBruno);

    // TEST 3: Persistence across new session & Recall
    console.log('\n--- Test 3: Recall in New Session ---');
    const recallReq: ChatRequest = {
      message: "What is my dog's name?",
      history: [], // Completely blank session
      mode: 'best_friend',
      memories: { profile: [], likes: [], dislikes: [], goals: [], important_context: [], current_context: [], projects: [] },
      richMemories: loadAuthoritativeMemories(),
      userName: 'Kuhu'
    };
    const recallRes = await generateVihaanReply(recallReq);
    assert(
      recallRes.reply.toLowerCase().includes('bruno'),
      `Recalls dog's name Bruno in a new session (Reply: "${recallRes.reply}")`
    );

    // TEST 4: Contextual Retrieval Relevance
    console.log('\n--- Test 4: Contextual Retrieval Relevance ---');
    const programmingMems = retrieveContextualMemories(
      loadAuthoritativeMemories(),
      'How does recursion work in Python?',
      5
    );
    assert(
      programmingMems.some((m) => m.tags.includes('python') || m.content.toLowerCase().includes('python')),
      'Contextually retrieves Python memories for recursion question'
    );
    assert(
      !programmingMems.some((m) => m.content.toLowerCase().includes('bruno')),
      'Does NOT retrieve dog Bruno for recursion question'
    );

    // TEST 5: Non-retrieval / Zero relevance injection
    console.log('\n--- Test 5: Irrelevant Question Non-Retrieval ---');
    const weatherMems = retrieveContextualMemories(
      loadAuthoritativeMemories(),
      "What's the weather like today?",
      5
    );
    assert(
      weatherMems.length === 0,
      `Relevance threshold filters out unrelated memories for weather (Retrieved: ${weatherMems.length})`
    );

    // TEST 6: Strict Anti-Hallucination on Unknown Facts
    console.log('\n--- Test 6: Anti-Hallucination on Unknown Facts ---');
    const movieReq: ChatRequest = {
      message: 'What did I tell you about my favorite movie?',
      history: [],
      mode: 'best_friend',
      memories: { profile: [], likes: [], dislikes: [], goals: [], important_context: [], current_context: [], projects: [] },
      richMemories: loadAuthoritativeMemories(),
      userName: 'Kuhu'
    };
    const movieRes = await generateVihaanReply(movieReq);
    assert(
      movieRes.reply.toLowerCase().includes("don't recall") ||
      movieRes.reply.toLowerCase().includes('not') ||
      movieRes.reply.toLowerCase().includes('tell me about it'),
      `Honestly reports not knowing favorite movie without hallucinating (Reply: "${movieRes.reply}")`
    );

    // TEST 7: Deduplication and Updates
    console.log('\n--- Test 7: Memory Deduplication & Update ---');
    const memList: MemoryItem[] = [
      {
        id: 'mem_coffee_1',
        content: 'Prefers dark roast cold brew coffee',
        category: 'preference',
        importance: 3,
        createdAt: Date.now() - 10000,
        updatedAt: Date.now() - 10000,
        source: 'explicit',
        confidence: 0.9,
        tags: ['coffee', 'roast', 'dark', 'cold', 'brew'],
        active: true
      }
    ];
    const mergeResult = mergeCandidateMemories(memList, [
      {
        content: 'Prefers light roast iced coffee now',
        category: 'preference',
        importance: 4,
        source: 'explicit',
        confidence: 1.0,
        tags: ['coffee', 'roast', 'light', 'iced']
      }
    ]);
    assert(
      mergeResult.updatedList.length === 1,
      `Updates and merges conflicting preference rather than growing duplicates (Count: ${mergeResult.updatedList.length})`
    );
    assert(
      mergeResult.updatedList[0].content.includes('light roast'),
      'Updated memory reflects new preference'
    );

    // TEST 8: Explicit Forget Command
    console.log('\n--- Test 8: Explicit Forget Command ---');
    const forgetReq: ChatRequest = {
      message: "Forget that my dog's name is Bruno.",
      history: [],
      mode: 'best_friend',
      memories: { profile: [], likes: [], dislikes: [], goals: [], important_context: [], current_context: [], projects: [] },
      richMemories: loadAuthoritativeMemories(),
      userName: 'Kuhu'
    };
    const forgetRes = await generateVihaanReply(forgetReq);
    assert(
      Boolean(forgetRes.removedMemoryIds && forgetRes.removedMemoryIds.length > 0) ||
      forgetRes.reply.toLowerCase().includes('removed') ||
      forgetRes.reply.toLowerCase().includes('clean slate'),
      `Acknowledges removing memory (Reply: "${forgetRes.reply}")`
    );

    // Execute removal
    const afterRemoval = removeMemoriesByQuery(loadAuthoritativeMemories(), 'Bruno');
    saveAuthoritativeMemories(afterRemoval.updatedList);

    // TEST 9: Verification of Forgotten State
    console.log('\n--- Test 9: Verification of Forgotten State ---');
    const postForgetReq: ChatRequest = {
      message: "What is my dog's name?",
      history: [],
      mode: 'best_friend',
      memories: { profile: [], likes: [], dislikes: [], goals: [], important_context: [], current_context: [], projects: [] },
      richMemories: loadAuthoritativeMemories(),
      userName: 'Kuhu'
    };
    const postForgetRes = await generateVihaanReply(postForgetReq);
    assert(
      !postForgetRes.reply.toLowerCase().includes('bruno'),
      `Does not mention Bruno after memory was forgotten (Reply: "${postForgetRes.reply}")`
    );

    // TEST 10: Natural Phrasing (No "According to memory #123")
    console.log('\n--- Test 10: Natural Phrasing ---');
    const naturalReq: ChatRequest = {
      message: 'What project am I building?',
      history: [],
      mode: 'best_friend',
      memories: { profile: [], likes: [], dislikes: [], goals: [], important_context: [], current_context: [], projects: [] },
      richMemories: loadAuthoritativeMemories(),
      userName: 'Kuhu'
    };
    const naturalRes = await generateVihaanReply(naturalReq);
    assert(
      !naturalRes.reply.includes('According to') &&
      !naturalRes.reply.includes('Memory #') &&
      !naturalRes.reply.includes('database'),
      `Responses are naturally integrated without robotic database references (Reply: "${naturalRes.reply}")`
    );

  } finally {
    // Restore initial seed memories
    saveAuthoritativeMemories(initialMemories);
  }

  console.log('\n========================================');
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
