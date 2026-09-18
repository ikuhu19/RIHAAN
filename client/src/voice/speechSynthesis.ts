// Web Speech API - Speech Synthesis Service for Vihaan's Male Voice

export interface SpeechSynthesisHandlers {
  onStart?: () => void;
  onBoundary?: (charIndex: number) => void;
  onEnd?: () => void;
  onError?: (error: any) => void;
}

export class VihaanSpeechSynthesizer {
  private synth: SpeechSynthesis | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isMuted = false;
  private speaking = false;

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
    if (voices.length === 0) return;

    // Prefer calm natural male voices (Indian English, UK/US male)
    const preferredNames = [
      'ravi', // Microsoft Ravi (Indian English)
      'google uk english male',
      'daniel',
      'george',
      'david',
      'natural male',
      'english male',
      'guy'
    ];

    // Try finding best matching voice
    let matched = voices.find((v) =>
      preferredNames.some((name) => v.name.toLowerCase().includes(name))
    );

    // Fallback: any en-IN or en voice that doesn't say female
    if (!matched) {
      matched = voices.find(
        (v) =>
          (v.lang.startsWith('en-IN') || v.lang.startsWith('en')) &&
          !v.name.toLowerCase().includes('female') &&
          !v.name.toLowerCase().includes('zira') &&
          !v.name.toLowerCase().includes('susan')
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

  public speak(text: string, handlers?: SpeechSynthesisHandlers): void {
    if (!this.synth || this.isMuted) {
      handlers?.onEnd?.();
      return;
    }

    // Cancel any previous speech
    this.stop();

    // Clean emojis and markdown formatting from spoken speech for clean pronunciation
    const cleanText = text
      .replace(/[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{1F1E0}-\u{1F1FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/gu, '')
      .replace(/[*_#`~>]/g, '')
      .trim();

    if (!cleanText) {
      handlers?.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    // Natural calm tone tuning
    utterance.pitch = 0.95; // slightly lower pitch for warm masculine presence
    utterance.rate = 1.0;   // natural conversational speed

    utterance.onstart = () => {
      this.speaking = true;
      handlers?.onStart?.();
    };

    utterance.onboundary = (event) => {
      handlers?.onBoundary?.(event.charIndex);
    };

    utterance.onend = () => {
      this.speaking = false;
      handlers?.onEnd?.();
    };

    utterance.onerror = (err) => {
      this.speaking = false;
      handlers?.onError?.(err);
    };

    this.synth.speak(utterance);
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.speaking = false;
    }
  }

  public pause(): void {
    if (this.synth && this.speaking) {
      this.synth.pause();
    }
  }

  public resume(): void {
    if (this.synth) {
      this.synth.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stop();
    }
    return this.isMuted;
  }

  public isSpeaking(): boolean {
    return this.speaking;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const speechSynthesizer = new VihaanSpeechSynthesizer();
