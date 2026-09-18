// Modular Text-To-Speech Service for Vihaan with Chrome Bug Fixes & Guaranteed End Callbacks

export interface TTSSpeechHandlers {
  onStart?: () => void;
  onBoundary?: (charIndex: number) => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

export interface TTSOptions extends TTSSpeechHandlers {
  lang?: string;
  rate?: number;
  pitch?: number;
}

export class VihaanTTSService {
  private synth: SpeechSynthesis | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isMutedState = false;
  private isSpeakingState = false;
  private volume = 1.0;
  // Critical for Chrome: prevents Garbage Collection of active utterance mid-speech
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private keepAliveTimer: any = null;
  private safetyTimeout: any = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.initVoice();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.initVoice();
      }
    }
  }

  private initVoice(): void {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    if (!voices || voices.length === 0) return;

    // Preferred Indian English & Hindi natural male voices
    const preferredKeywords = [
      'ravi', // Microsoft Ravi (en-IN Male)
      'google हिन्दी', // Google Hindi
      'madhur', // Microsoft Madhur (hi-IN Male)
      'hemant', // Google Hindi male
      'google uk english male',
      'daniel',
      'george',
      'david',
      'guy',
      'natural'
    ];

    let matched = voices.find((v) =>
      preferredKeywords.some((keyword) => v.name.toLowerCase().includes(keyword))
    );

    // Fallback: any en-IN or hi-IN male voice
    if (!matched) {
      matched = voices.find(
        (v) =>
          (v.lang.startsWith('en-IN') || v.lang.startsWith('hi') || v.lang.startsWith('en')) &&
          !v.name.toLowerCase().includes('female') &&
          !v.name.toLowerCase().includes('zira') &&
          !v.name.toLowerCase().includes('susan') &&
          !v.name.toLowerCase().includes('kalpana')
      );
    }

    this.selectedVoice = matched || voices[0];
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synth ? this.synth.getVoices() : [];
  }

  public setVoice(voice: SpeechSynthesisVoice): void {
    this.selectedVoice = voice;
  }

  public getSelectedVoice(): SpeechSynthesisVoice | null {
    return this.selectedVoice;
  }

  public speak(text: string, options?: TTSOptions): void {
    if (!this.synth || this.isMutedState) {
      options?.onEnd?.();
      return;
    }

    // Stop any existing speech before starting new one
    this.stop();

    // Clean text: strip emojis, asterisks, markdown, and sound effect artifacts
    const cleanText = text
      .replace(/[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F1E0}-\u{1F1FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/gu, '')
      .replace(/[*_#`~>]/g, '')
      .trim();

    if (!cleanText) {
      options?.onEnd?.();
      return;
    }

    console.log('[TTS] starting');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    this.activeUtterance = utterance; // Retain strong reference to prevent GC

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    // Warm, natural young adult cadence
    utterance.pitch = options?.pitch ?? 0.92;
    utterance.rate = options?.rate ?? 1.0;
    utterance.volume = this.volume;

    let hasEnded = false;
    const finishSpeech = (err?: any) => {
      if (hasEnded) return;
      hasEnded = true;

      this.cleanupKeepAlive();
      this.isSpeakingState = false;
      this.activeUtterance = null;

      console.log('[TTS] finished');

      if (err) {
        options?.onError?.(err);
      } else {
        options?.onEnd?.();
      }
    };

    utterance.onstart = () => {
      this.isSpeakingState = true;
      console.log('[TTS] speaking');
      options?.onStart?.();

      // Chrome long-utterance keep-alive heartbeat
      this.cleanupKeepAlive();
      this.keepAliveTimer = setInterval(() => {
        if (this.isSpeakingState && this.synth && this.synth.speaking) {
          this.synth.pause();
          this.synth.resume();
        }
      }, 4500);

      // Safety timeout in case browser never dispatches onend (approx 400ms per word + 3s buffer)
      const wordCount = cleanText.split(/\s+/).length;
      const expectedDurationMs = Math.max(3000, wordCount * 500 + 3500);
      this.safetyTimeout = setTimeout(() => {
        if (!hasEnded && this.isSpeakingState) {
          console.warn('[VOICE] Safety timer triggered TTS completion fallback.');
          finishSpeech();
        }
      }, expectedDurationMs);
    };

    utterance.onboundary = (event) => {
      options?.onBoundary?.(event.charIndex);
    };

    utterance.onend = () => {
      finishSpeech();
    };

    utterance.onerror = (err) => {
      console.warn('[VOICE] TTS error:', err);
      finishSpeech(err);
    };

    try {
      this.synth.speak(utterance);
    } catch (e) {
      console.error('[VOICE] synth.speak threw exception:', e);
      finishSpeech(e);
    }
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  private cleanupKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
    if (this.safetyTimeout) {
      clearTimeout(this.safetyTimeout);
      this.safetyTimeout = null;
    }
  }

  public stop(): void {
    this.cleanupKeepAlive();
    this.isSpeakingState = false;
    this.activeUtterance = null;
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        // ignore
      }
    }
  }

  public toggleMute(): boolean {
    this.isMutedState = !this.isMutedState;
    if (this.isMutedState) {
      this.stop();
    }
    return this.isMutedState;
  }

  public isSpeaking(): boolean {
    return this.isSpeakingState;
  }

  public isMuted(): boolean {
    return this.isMutedState;
  }

  public setMuted(muted: boolean): void {
    this.isMutedState = muted;
    if (muted) {
      this.stop();
    }
  }
}

export const ttsService = new VihaanTTSService();
