import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateVihaanReply, resolveAiProviderConfig } from './services/ai.js';
import { extractMemoriesFromText } from './services/memoryExtractor.js';
import { ChatRequest } from './types.js';

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

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const reqStart = Date.now();
  try {
    const chatReq: ChatRequest = req.body;

    if (!chatReq || !chatReq.message || !chatReq.message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const config = resolveAiProviderConfig();
    console.log(`\n========================================`);
    console.log(`[Chat Pipeline] Incoming user message: "${chatReq.message}"`);
    console.log(`[Chat Pipeline] Active mode: ${chatReq.mode || 'best_friend'}`);
    console.log(`[Chat Pipeline] History count: ${chatReq.history?.length || 0} messages`);
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
});
