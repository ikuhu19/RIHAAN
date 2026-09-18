# 🪶 VIHAAN — Interactive AI Companion & Alter Ego

> *"I'm here. What's on your mind today, yaar?"*

**VIHAAN** is an interactive, voice-enabled AI companion, personal best friend, and alter ego. Built with an original fictional character design, natural male voice interaction, an animated avatar engine, structured long-term memory, and 5 distinct personality modes, Vihaan feels like a consistent and lifelike friend sitting right on your screen.

---

## 🌟 Key Features

1. **Original Character Design**: An original fictional young adult Indian male aesthetic featuring soft masculine features, dark naturally curly hair, expressive eyes, and an elegant peacock-teal and gold traditional bandhgala.
2. **Real Voice Conversation**:
   - 🎙️ **Microphone Input & Live STT**: Speak naturally via Web Speech API with real-time transcription feedback.
   - 🗣️ **Natural Male Speech Synthesis**: Calibrated voice pitch and rate with conversational pauses.
   - 🔊 **Voice Controls**: Play, Pause, Stop Speaking, Replay, and Mute buttons.
3. **Animated Avatar Engine**:
   - **Idle Breathing**: Organic sine-wave chest and shoulder movement.
   - **Natural Blinking**: Dynamic eyelid overlay with realistic random blink intervals (2.5s–5.5s).
   - **Lip-Sync Speech Animation**: Fluid mouth movements synchronized with voice speech playback.
   - **8 Avatar States**: `IDLE`, `LISTENING`, `THINKING`, `SPEAKING`, `HAPPY`, `SAD`, `SURPRISED`, and `PLAYFUL`.
   - **Atmospheric Celestial Effects**: Glowing aura, listening soundwave pulses, and starry sparkles.
4. **5 Personality Modes**:
   - 🪞 **Alter Ego**: Clearer, wiser, grounded inner self that helps cut through indecision and mental clutter.
   - 🫂 **Best Friend**: Warm, casual, teasing, emotionally intelligent companion.
   - 🔥 **Roast Mode**: Playfully witty and sarcastic banter (affectionate teasing, never toxic).
   - 📚 **Study Mode**: Gentle accountability partner focused on manageable sprints (e.g. "Give me 20 focused minutes").
   - 🌙 **2 AM Mode**: Soft, calm, reflective, and philosophical midnight heart-to-hearts.
5. **Structured Long-Term Memory System**:
   - Automatically detects and categorizes facts from conversation:
     - ⭐ `Preferences & Dislikes`
     - 🎯 `Goals & Milestones`
     - 💡 `Interests & Passions`
     - 📌 `Important Context`
     - 📝 `Discovered Facts`
   - Memory Vault modal allows viewing, adding, deleting, and clearing memories.
   - Vihaan remembers context across conversations (e.g., upcoming exams or favourite topics).
6. **Chat Drawer & Session History**:
   - Switch seamlessly between 🎙️ **Talk Mode** and ⌨️ **Type Mode**.
   - Multiple conversation sessions, timestamped history, and quick topic starters.

---

## 📁 Project Architecture

```
rihaan/
├── client/                     # Frontend (React 18 + Vite + TypeScript)
│   ├── public/
│   │   └── vihaan_portrait.jpg # Original character artwork asset
│   ├── src/
│   │   ├── avatar/
│   │   │   └── AvatarEngine.tsx # Canvas/SVG animation (breathing, blinking, lip-sync, aura)
│   │   ├── components/
│   │   │   ├── Header.tsx       # Mode switcher, mute toggle, memory & history triggers
│   │   │   ├── VoiceBar.tsx     # Mic trigger, live transcription, playback controls
│   │   │   ├── ChatDrawer.tsx   # Text conversation drawer & quick starter chips
│   │   │   ├── MemoryModal.tsx  # Structured memory management vault
│   │   │   └── SessionDrawer.tsx# Past conversation sessions manager
│   │   ├── memory/
│   │   │   └── memoryStore.ts   # LocalStorage memory persistence & merge logic
│   │   ├── services/
│   │   │   ├── api.ts           # Backend communicator with smart offline fallback
│   │   │   └── storage.ts       # Session history storage
│   │   ├── voice/
│   │   │   ├── speechRecognition.ts # Web Speech Recognition wrapper
│   │   │   └── speechSynthesis.ts   # Speech Synthesis & male voice tuning
│   │   ├── index.css            # Dark celestial/peacock luxury styling & animations
│   │   ├── App.tsx              # Main orchestrator component
│   │   └── types.ts             # TypeScript interfaces
│   └── package.json
├── server/                     # Backend API (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── services/
│   │   │   ├── ai.ts            # Modular AI provider (Gemini / OpenAI / Smart Brain)
│   │   │   └── memoryExtractor.ts # Regex & semantic rule-based memory extractor
│   │   ├── personality.ts       # Vihaan system prompt & 5 mode instructions
│   │   ├── types.ts             # Server data models
│   │   └── index.ts             # Express API routes (/api/chat, /api/health, /api/memory)
│   ├── .env.example             # Documented environment variables
│   └── package.json
└── README.md
```

---

## 🧠 How the AI & Memory Work (Beginner Guide)

### 1. The Conversational Loop
1. When you speak into the microphone, the browser's `SpeechRecognition` converts your audio waves into text.
2. The text is sent via `POST /api/chat` to the backend along with the **active mode**, recent **conversation history**, and stored **memories**.
3. The server constructs a system prompt that gives Vihaan his personality, injects the memory context, and asks the AI to return a JSON object with `{ "reply": "...", "emotion": "..." }`.
4. While the server is processing, the avatar enters the `THINKING` state with rotating golden halo sparkles.
5. Once received, `SpeechSynthesis` speaks the reply using a natural male voice while the `AvatarEngine` moves the lips and displays audio soundbars.

### 2. The Structured Memory System
Instead of saving hundreds of irrelevant messages permanently into a prompt, Vihaan uses a **structured memory model**:
```json
{
  "preferences": ["Loves sushi", "Prefers honest feedback"],
  "goals": ["Exam in Computer Graphics on Friday"],
  "interests": ["Coding & technology"],
  "important_context": ["Studying BCA"],
  "conversation_facts": []
}
```
- `memoryExtractor.ts` scans user messages for phrases like `"my goal is"`, `"i have an exam in"`, `"i love"`, or `"i prefer"`.
- When detected, they are automatically categorized and stored in `localStorage`.
- During any future chat or mode, these memories are injected into the prompt so Vihaan can refer back to them naturally without prompt clutter.

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js (v18 or v22 installed)
- Google Chrome, Microsoft Edge, or any modern browser with Web Speech API support.

### Step 1: Start the Backend Server
```bash
cd server
npm install
npm run dev
```
The server will start on `http://localhost:3001`.

### Step 2: Start the Frontend Client
In a new terminal:
```bash
cd client
npm install
npm run dev
```
Open your browser and visit: **`http://localhost:5173`**.

---

## ⚙️ Environment Variables & API Providers

The project works **100% out of the box** using the built-in smart conversational engine even without an API key!

To connect external AI providers, edit `server/.env`:

```env
PORT=3001

# Choose: 'gemini', 'openai', or 'mock'
AI_PROVIDER=gemini

# Your API Key (from Google AI Studio or OpenAI)
AI_API_KEY=your_api_key_here

# Optional external TTS/STT keys (if replacing browser Web Speech API)
TTS_API_KEY=
STT_API_KEY=
```

### How to Switch Providers:
- To use **Google Gemini**: Set `AI_PROVIDER=gemini` and enter your Gemini API key in `AI_API_KEY`.
- To use **OpenAI**: Set `AI_PROVIDER=openai` and enter your OpenAI key in `AI_API_KEY`.
- To use **Offline Smart Brain**: Leave `AI_PROVIDER=mock`.

---

## 🔮 Future Enhancements
- Web Audio API AnalyserNode for frequency-based reactive mouth waveform visualizer.
- Three.js / Live2D / ReadyPlayerMe 3D avatar rig support.
- IndexedDB storage for long-term multi-device sync.
- Cloud TTS integration with ElevenLabs or Cartesia for ultra-realistic conversational latency.
