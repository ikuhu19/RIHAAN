import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MemoryItem, LearningState, OpenLoopItem } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const MEMORIES_FILE = path.join(DATA_DIR, 'memories.json');
const LEARNING_FILE = path.join(DATA_DIR, 'learning.json');
const OPEN_LOOPS_FILE = path.join(DATA_DIR, 'open_loops.json');

// Ensure server/data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const SEED_MEMORIES: MemoryItem[] = [
  {
    id: 'mem_seed_profile_1',
    content: 'Name: Kuhu',
    category: 'identity',
    importance: 5,
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 7,
    source: 'explicit',
    confidence: 1.0,
    tags: ['name', 'kuhu', 'identity'],
    active: true
  },
  {
    id: 'mem_seed_profile_2',
    content: 'Prefers honest, straightforward advice and warm natural conversation',
    category: 'preference',
    importance: 4,
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 7,
    source: 'inferred',
    confidence: 0.9,
    tags: ['communication', 'style', 'honest', 'advice'],
    active: true
  },
  {
    id: 'mem_seed_companion',
    content: 'Rihaan is her close AI best friend & alter ego physically lounging in their virtual room',
    category: 'relationship',
    importance: 5,
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 7,
    source: 'explicit',
    confidence: 1.0,
    tags: ['rihaan', 'best_friend', 'alter_ego', 'room'],
    active: true
  },
  {
    id: 'mem_seed_project',
    content: 'Building RIHAAN: an interactive 3D companion and tutor web application with voice and memory',
    category: 'project',
    importance: 5,
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 5,
    source: 'explicit',
    confidence: 1.0,
    tags: ['rihaan', 'project', 'ai', 'companion', 'voice', '3d', 'threejs', 'react'],
    active: true
  },
  {
    id: 'mem_seed_goal',
    content: 'Mastering Python and data structures with consistent hands-on coding',
    category: 'goal',
    importance: 4,
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
    source: 'explicit',
    confidence: 0.95,
    tags: ['python', 'dsa', 'data_structures', 'programming', 'code', 'study', 'learning'],
    active: true
  }
];

export function loadAuthoritativeMemories(): MemoryItem[] {
  try {
    if (fs.existsSync(MEMORIES_FILE)) {
      const raw = fs.readFileSync(MEMORIES_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Seed initial memories if none exist
    saveAuthoritativeMemories(SEED_MEMORIES);
    return SEED_MEMORIES;
  } catch (err) {
    console.error('[MemoryStorage] Error loading memories from disk:', err);
    return SEED_MEMORIES;
  }
}

export function saveAuthoritativeMemories(memories: MemoryItem[]): void {
  try {
    const tempFile = `${MEMORIES_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(memories, null, 2), 'utf-8');
    fs.renameSync(tempFile, MEMORIES_FILE);
  } catch (err) {
    console.error('[MemoryStorage] Error saving memories to disk:', err);
  }
}

export function addAuthoritativeMemory(item: MemoryItem): MemoryItem[] {
  const current = loadAuthoritativeMemories();
  const updated = [item, ...current];
  saveAuthoritativeMemories(updated);
  return updated;
}

export function updateAuthoritativeMemory(id: string, updates: Partial<MemoryItem>): MemoryItem[] {
  const current = loadAuthoritativeMemories();
  const updated = current.map((m) => (m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m));
  saveAuthoritativeMemories(updated);
  return updated;
}

export function deactivateAuthoritativeMemory(id: string): MemoryItem[] {
  const current = loadAuthoritativeMemories();
  const updated = current.map((m) => (m.id === id ? { ...m, active: false, updatedAt: Date.now() } : m));
  saveAuthoritativeMemories(updated);
  return updated;
}

export function deleteAuthoritativeMemory(id: string): MemoryItem[] {
  const current = loadAuthoritativeMemories();
  const updated = current.filter((m) => m.id !== id);
  saveAuthoritativeMemories(updated);
  return updated;
}

export function clearAuthoritativeMemories(): MemoryItem[] {
  const empty: MemoryItem[] = [];
  saveAuthoritativeMemories(empty);
  return empty;
}

export function loadAuthoritativeLearning(): LearningState {
  try {
    if (fs.existsSync(LEARNING_FILE)) {
      const raw = fs.readFileSync(LEARNING_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[MemoryStorage] Error reading learning state:', err);
  }
  return { topics: {} };
}

export function saveAuthoritativeLearning(state: LearningState): void {
  try {
    const tempFile = `${LEARNING_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tempFile, LEARNING_FILE);
  } catch (err) {
    console.error('[MemoryStorage] Error saving learning state:', err);
  }
}

export function loadAuthoritativeOpenLoops(): OpenLoopItem[] {
  try {
    if (fs.existsSync(OPEN_LOOPS_FILE)) {
      const raw = fs.readFileSync(OPEN_LOOPS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[MemoryStorage] Error reading open loops:', err);
  }
  return [];
}

export function saveAuthoritativeOpenLoops(loops: OpenLoopItem[]): void {
  try {
    const tempFile = `${OPEN_LOOPS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(loops, null, 2), 'utf-8');
    fs.renameSync(tempFile, OPEN_LOOPS_FILE);
  } catch (err) {
    console.error('[MemoryStorage] Error saving open loops:', err);
  }
}
