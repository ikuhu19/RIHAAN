import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateVihaanReply, resolveAiProviderConfig } from './services/ai.js';
import { extractMemoriesFromText } from './services/memoryExtractor.js';
import {
  loadAuthoritativeMemories,
  saveAuthoritativeMemories,
  addAuthoritativeMemory,
  updateAuthoritativeMemory,
  deleteAuthoritativeMemory,
  clearAuthoritativeMemories,
  loadAuthoritativeLearning,
  saveAuthoritativeLearning,
  loadAuthoritativeOpenLoops,
  saveAuthoritativeOpenLoops
} from './services/memoryStorage.js';
import { ChatRequest, MemoryItem } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory first, and root directory as fallback
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Health & status endpoint
app.get('/api/health', (req, res) => {
  const config = resolveAiProviderConfig();
  res.json({
    status: 'ok',
    companion: 'RIHAAN',
    provider: config.provider,
    model: config.model,
    hasKey: Boolean(config.apiKey)
  });
});

// Authoritative Memory REST API
app.get('/api/memory', (req, res) => {
  try {
    const memories = loadAuthoritativeMemories();
    const learningState = loadAuthoritativeLearning();
    const openLoops = loadAuthoritativeOpenLoops();
    res.json({ memories, learningState, openLoops });
  } catch (err: any) {
    console.error('[Memory API] Error fetching memories:', err);
    res.status(500).json({ error: 'Failed to fetch memories', details: err?.message });
  }
});

app.post('/api/memory', (req, res) => {
  try {
    const { content, category = 'identity', importance = 3, tags = [] } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }
    const clean = content.trim();
    const newItem: MemoryItem = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      content: clean,
      category,
      importance,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      source: 'explicit',
      confidence: 1.0,
      tags: Array.isArray(tags) && tags.length > 0 ? tags : clean.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2),
      active: true
    };
    const updated = addAuthoritativeMemory(newItem);
    res.json({ memory: newItem, memories: updated });
  } catch (err: any) {
    console.error('[Memory API] Error adding memory:', err);
    res.status(500).json({ error: 'Failed to add memory', details: err?.message });
  }
});

app.put('/api/memory/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = updateAuthoritativeMemory(id, updates);
    res.json({ success: true, memories: updated });
  } catch (err: any) {
    console.error('[Memory API] Error updating memory:', err);
    res.status(500).json({ error: 'Failed to update memory', details: err?.message });
  }
});

app.delete('/api/memory/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updated = deleteAuthoritativeMemory(id);
    res.json({ success: true, id, memories: updated });
  } catch (err: any) {
    console.error('[Memory API] Error deleting memory:', err);
    res.status(500).json({ error: 'Failed to delete memory', details: err?.message });
  }
});

app.post('/api/memory/clear', (req, res) => {
  try {
    clearAuthoritativeMemories();
    res.json({ success: true, memories: [] });
  } catch (err: any) {
    console.error('[Memory API] Error clearing memories:', err);
    res.status(500).json({ error: 'Failed to clear memories', details: err?.message });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const reqStart = Date.now();
  try {
    const chatReq: ChatRequest = req.body;

    if (!chatReq || !chatReq.message || !chatReq.message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Hydrate authoritative server memories if not provided or empty
    if (!chatReq.richMemories || chatReq.richMemories.length === 0) {
      chatReq.richMemories = loadAuthoritativeMemories();
    }
    if (!chatReq.learningState) {
      chatReq.learningState = loadAuthoritativeLearning();
    }
    if (!chatReq.openLoops || chatReq.openLoops.length === 0) {
      chatReq.openLoops = loadAuthoritativeOpenLoops();
    }

    const config = resolveAiProviderConfig();
    console.log(`\n========================================`);
    console.log(`[Chat Pipeline] Incoming user message: "${chatReq.message}"`);
    console.log(`[Chat Pipeline] Active mode: ${chatReq.mode || 'best_friend'}`);
    console.log(`[Chat Pipeline] History count: ${chatReq.history?.length || 0} messages`);
    console.log(`[Chat Pipeline] Stored memories count: ${chatReq.richMemories.length}`);
    console.log(`[Chat Pipeline] Selected provider: ${config.provider} (${config.model})`);

    // 1. Generate Rihaan response via intelligent multi-layered pipeline
    const response = await generateVihaanReply(chatReq);

    // 2. Complement with regex pattern extraction if memory is active
    if (chatReq.memoryEnabled !== false) {
      const regexExtracted = extractMemoriesFromText(chatReq.message);
      response.extractedMemories = {
        ...(response.extractedMemories || {}),
        ...regexExtracted
      };
    }

    // 3. Persist authoritative memory mutations to server disk
    if (response.authoritativeMemories) {
      saveAuthoritativeMemories(response.authoritativeMemories);
    }
    if (response.updatedLearningState) {
      saveAuthoritativeLearning(response.updatedLearningState);
    }
    if (response.updatedOpenLoops) {
      saveAuthoritativeOpenLoops(response.updatedOpenLoops);
    }

    // Ensure client receives current authoritative state
    response.authoritativeMemories = loadAuthoritativeMemories();

    const duration = Date.now() - reqStart;
    console.log(`[Chat Pipeline] Completed in ${duration}ms. Returning response.`);
    console.log(`========================================\n`);

    return res.json(response);
  } catch (error: any) {
    console.error('[Chat Pipeline] Error handling /api/chat:', error);
    return res.status(500).json({
      error: 'Failed to generate response',
      details: error?.message || 'Unknown server error'
    });
  }
});

// Memory extraction endpoint
app.post('/api/memory/extract', (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text required' });
  }
  const memories = extractMemoriesFromText(text);
  res.json({ memories });
});

app.listen(PORT, () => {
  const config = resolveAiProviderConfig();
  console.log(`✨ Rihaan companion server listening on http://localhost:${PORT}`);
  console.log(`🤖 AI Provider: ${config.provider} (Model: ${config.model}, Key configured: ${Boolean(config.apiKey)})`);
  console.log(`🧠 Authoritative memories loaded: ${loadAuthoritativeMemories().length} items`);
});
