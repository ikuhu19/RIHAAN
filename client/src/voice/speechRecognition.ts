// Web Speech API - True Continuous Speech Recognition Service for Vihaan with Diagnostic Logging

export interface SpeechRecognitionHandlers {
  onStart?: () => void;
  onInterim?: (transcript: string) => void;
  onSpeechFinal?: (transcript: string) => void;
  onError?: (error: string, friendlyMessage?: string) => void;
  onEnd?: () => void;
}

export class VihaanSpeechRecognizer {
  private recognition: any = null;
  private isListening = false;
  private shouldBeListening = false;
  private handlers: SpeechRecognitionHandlers = {};
  private currentLanguage = 'en-IN'; // Indian English / Hinglish default
  private silenceTimer: any = null;
  private currentTranscript = '';
  private mediaStream: MediaStream | null = null;
  private restartDelayTimer: any = null;
  private SpeechRecognitionClass: any = null;

  constructor() {
    this.SpeechRecognitionClass =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (this.SpeechRecognitionClass) {
      console.log('[VOICE DEBUG] SpeechRecognition available: YES');
    } else {
      console.error('[VOICE DEBUG] SpeechRecognition available: NO (Not supported in this browser)');
    }
  }

  // Request microphone permission once and keep mediaStream active for the whole session
  public async requestSessionMicrophone(): Promise<{ success: boolean; errorType?: string; message?: string }> {
    console.log('[VOICE DEBUG] requesting microphone:');

    if (typeof window !== 'undefined') {
      console.log('[VOICE DEBUG] secure context:', window.isSecureContext, `(origin: ${window.location.origin})`);
      console.log('[VOICE DEBUG] navigator.mediaDevices:', Boolean(navigator?.mediaDevices));
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = 'Microphone API (navigator.mediaDevices.getUserMedia) is not available. Ensure you are using HTTPS or http://localhost.';
      console.error('[VOICE DEBUG]', msg);
      return { success: false, errorType: 'NotSupported', message: msg };
    }

    try {
      if (!this.mediaStream) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const tracks = this.mediaStream.getAudioTracks();
        console.log('[VOICE DEBUG] microphone stream: active, track:', tracks[0]?.label || 'Default Audio');
      }
      localStorage.setItem('vihaan_mic_granted', 'true');
      return { success: true };
    } catch (err: any) {
      console.error('[VOICE DEBUG] microphone permission error:', err.name, err.message);
      localStorage.removeItem('vihaan_mic_granted');

      let userMsg = 'Microphone access failed.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        userMsg = 'Microphone permission was denied. Please allow microphone access in your browser site settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        userMsg = 'No microphone was found on this device. Please connect an audio input device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        userMsg = 'The microphone is being used or blocked by another application (e.g. Teams, Zoom, or another browser tab).';
      } else if (err.name === 'SecurityError') {
        userMsg = 'Microphone blocked by browser security policy. Microphone requires HTTPS or http://localhost.';
      }

      return { success: false, errorType: err.name, message: userMsg };
    }
  }

  // Stop the microphone stream ONLY when session explicitly ends
  public stopSessionMicrophone(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
      console.log('[VOICE DEBUG] microphone stream: released');
    }
  }

  public isSupported(): boolean {
    return this.SpeechRecognitionClass !== null;
  }

  public setLanguage(lang: string): void {
    this.currentLanguage = lang === 'hi-IN' || lang === 'en-IN' ? lang : 'en-IN';
    if (this.recognition) {
      this.recognition.lang = this.currentLanguage;
    }
  }

  public getLanguage(): string {
    return this.currentLanguage;
  }

  // Create clean SpeechRecognition instance
  private createRecognitionInstance(): any {
    if (!this.SpeechRecognitionClass) {
      console.error('[VOICE DEBUG] Cannot create recognition: SpeechRecognitionClass is null');
      return null;
    }

    // Teardown any existing instance to prevent multiple listeners or stale audio IPC
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onspeechstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch (e) {
        // ignore
      }
      this.recognition = null;
    }

    const rec = new this.SpeechRecognitionClass();
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = this.currentLanguage;

    rec.onstart = () => {
      this.isListening = true;
      this.currentTranscript = '';
      console.log('[VOICE DEBUG] recognition started');
      this.handlers.onStart?.();
    };

    rec.onspeechstart = () => {
      console.log('[VOICE DEBUG] speech detected');
    };

    rec.onresult = (event: any) => {
      if (!this.shouldBeListening) return;

      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        const transcript = res[0]?.transcript || '';
        if (res.isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      const candidate = (finalText || interimText).trim();

      if (candidate) {
        this.currentTranscript = candidate;
        console.log('[VOICE DEBUG] interim transcript:', candidate);
        this.handlers.onInterim?.(candidate);

        // Fast silence detection: 800ms of quiet after speaking commits the speech
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => {
          if (this.shouldBeListening && this.currentTranscript.trim()) {
            const textToSend = this.currentTranscript.trim();
            this.currentTranscript = '';
            this.commitUserSpeech(textToSend);
          }
        }, 800);
      }

      if (finalText && finalText.trim()) {
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.currentTranscript = '';
        this.commitUserSpeech(finalText.trim());
      }
    };

    rec.onerror = (event: any) => {
      console.warn('[VOICE DEBUG] recognition error:', event.error);
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      let friendlyMsg = `Speech recognition error: ${event.error}`;
      if (event.error === 'not-allowed') {
        friendlyMsg = 'Speech recognition permission was denied by browser. Check URL site permissions.';
      } else if (event.error === 'audio-capture') {
        friendlyMsg = 'Microphone audio capture failed. Ensure your microphone is connected and selected.';
      } else if (event.error === 'network') {
        friendlyMsg = 'Speech recognition network error. Speech-to-text requires internet connectivity.';
      }

      this.handlers.onError?.(event.error, friendlyMsg);
    };

    rec.onend = () => {
      this.isListening = false;
      console.log('[VOICE DEBUG] recognition ended');

      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }

      // If browser ended recognition automatically (e.g. 60s timeout or silence) but we SHOULD be listening:
      if (this.shouldBeListening) {
        if (this.restartDelayTimer) clearTimeout(this.restartDelayTimer);
        this.restartDelayTimer = setTimeout(() => {
          if (this.shouldBeListening && !this.isListening) {
            console.log('[VOICE DEBUG] auto-restarting recognition after browser onend');
            this.startListening(this.handlers);
          }
        }, 200);
      } else {
        this.handlers.onEnd?.();
      }
    };

    return rec;
  }

  // Commit finalized user speech and immediately stop recognition so Vihaan does not hear himself
  private commitUserSpeech(text: string): void {
    console.log('[VOICE DEBUG] FINAL transcript:', text);
    this.stopListening();
    this.handlers.onSpeechFinal?.(text);
  }

  // Start continuous listening cycle
  public startListening(handlers: SpeechRecognitionHandlers): boolean {
    if (!this.SpeechRecognitionClass) {
      console.error('[VOICE DEBUG] Speech recognition not supported in this browser.');
      handlers.onError?.('not-supported', "Speech recognition isn't supported in this browser. Please use Google Chrome or Edge.");
      return false;
    }

    this.handlers = handlers;
    this.shouldBeListening = true;
    this.currentTranscript = '';

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.restartDelayTimer) {
      clearTimeout(this.restartDelayTimer);
      this.restartDelayTimer = null;
    }

    try {
      console.log('[VOICE DEBUG] recognition starting:');
      this.recognition = this.createRecognitionInstance();
      if (!this.recognition) return false;
      this.recognition.start();
      return true;
    } catch (err: any) {
      console.error('[VOICE DEBUG] recognition start exception:', err);
      if (this.shouldBeListening) {
        setTimeout(() => {
          if (this.shouldBeListening && !this.isListening) {
            this.startListening(handlers);
          }
        }, 300);
      }
      return false;
    }
  }

  // Stop listening when user finishes, or when Vihaan is thinking/speaking
  public stopListening(): void {
    this.shouldBeListening = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.restartDelayTimer) {
      clearTimeout(this.restartDelayTimer);
      this.restartDelayTimer = null;
    }

    if (this.recognition) {
      try {
        this.recognition.abort(); // Immediately halt capture pipeline
      } catch (e) {
        // ignore
      }
    }
    this.isListening = false;
  }

  public getActiveState(): boolean {
    return this.isListening;
  }
}

export const speechRecognizer = new VihaanSpeechRecognizer();
