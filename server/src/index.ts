import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateVihaanReply } from './services/ai.js';
import { extractMemoriesFromText } from './services/memoryExtractor.js';
import { ChatRequest } from './types.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health & status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    companion: 'RIHAAN',
    provider: process.env.AI_PROVIDER || 'mock',
    hasKey: !!process.env.AI_API_KEY
  });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const chatReq: ChatRequest = req.body;

    if (!chatReq || !chatReq.message) {
      return res.status(400).json({ error: 'Message is required' });
    }

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

    return res.json(response);
  } catch (error: any) {
    console.error('Error handling /api/chat:', error);
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
  console.log(`✨ Rihaan companion server listening on http://localhost:${PORT}`);
  console.log(`🤖 AI Provider: ${process.env.AI_PROVIDER || 'intelligent companion brain (offline)'}`);
});
