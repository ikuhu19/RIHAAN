// Voice Diagnostics & Hardware/Browser Verification Engine

export interface EnvironmentDiagnostics {
  isSecureContext: boolean;
  origin: string;
  isLocalhost: boolean;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  hasSpeechRecognition: boolean;
  speechEngineName: string;
  permissionState: 'granted' | 'prompt' | 'denied' | 'unsupported';
  audioDevices: { deviceId: string; label: string; kind: string }[];
  diagnosisSummary: string;
}

export interface MicrophoneTestResult {
  success: boolean;
  message: string;
  deviceLabel?: string;
  errorType?: string;
  rawError?: string;
}

export class VoiceDiagnostics {
  public static async runEnvironmentCheck(): Promise<EnvironmentDiagnostics> {
    const isSecureContext = typeof window !== 'undefined' ? Boolean(window.isSecureContext) : false;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    const hasMediaDevices = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices);
    const hasGetUserMedia = Boolean(hasMediaDevices && navigator.mediaDevices.getUserMedia);

    const SpeechRec =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;
    const hasSpeechRecognition = Boolean(SpeechRec);
    const speechEngineName = (window as any)?.SpeechRecognition
      ? 'Standard SpeechRecognition'
      : (window as any)?.webkitSpeechRecognition
      ? 'webkitSpeechRecognition (Blink/Chromium)'
      : 'None (Unsupported)';

    // Check browser permission state
    let permissionState: 'granted' | 'prompt' | 'denied' | 'unsupported' = 'unsupported';
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      try {
        const queryResult = await navigator.permissions.query({ name: 'microphone' as any });
        permissionState = queryResult.state as any;
      } catch (e) {
        permissionState = 'unsupported';
      }
    }

    // Enumerate detected audio devices
    let audioDevices: { deviceId: string; label: string; kind: string }[] = [];
    if (hasMediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        audioDevices = devices
          .filter((d) => d.kind === 'audioinput')
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || 'Default Audio Input Device',
            kind: d.kind
          }));
      } catch (e) {
        // may require permission to label
      }
    }

    // Detailed debug logs
    console.log('[VOICE DEBUG] secure context:', isSecureContext, `(origin: ${origin})`);
    console.log('[VOICE DEBUG] navigator.mediaDevices:', hasMediaDevices ? 'Available' : 'NOT Available');
    console.log('[VOICE DEBUG] SpeechRecognition available:', hasSpeechRecognition ? speechEngineName : 'NO');
    console.log('[VOICE DEBUG] microphone permission:', permissionState);
    console.log('[VOICE DEBUG] detected audio input devices count:', audioDevices.length);

    let diagnosisSummary = 'All voice components supported.';
    if (!isSecureContext && !isLocalhost) {
      diagnosisSummary = 'Insecure context: Microphone & Speech APIs require HTTPS or http://localhost.';
    } else if (!hasSpeechRecognition) {
      diagnosisSummary = 'Speech recognition is not supported in this browser. Please use Chrome or Edge.';
    } else if (permissionState === 'denied') {
      diagnosisSummary = 'Microphone permission has been denied in browser site settings.';
    }

    return {
      isSecureContext,
      origin,
      isLocalhost,
      hasMediaDevices,
      hasGetUserMedia,
      hasSpeechRecognition,
      speechEngineName,
      permissionState,
      audioDevices,
      diagnosisSummary
    };
  }

  // Standalone Hardware Microphone Test
  public static async testMicrophoneHardware(): Promise<MicrophoneTestResult> {
    console.log('[VOICE DEBUG] requesting microphone hardware test...');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        success: false,
        errorType: 'NotSupportedError',
        message: 'navigator.mediaDevices.getUserMedia is not available in this browser.'
      };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tracks = stream.getAudioTracks();
      const firstTrack = tracks[0];
      const deviceLabel = firstTrack ? firstTrack.label || 'Microphone Audio Track Active' : 'Default Microphone';

      console.log('[VOICE DEBUG] microphone stream: active, label:', deviceLabel);

      // Stop test stream tracks after verifying hardware connectivity
      tracks.forEach((t) => t.stop());

      return {
        success: true,
        message: `Microphone working (${deviceLabel})`,
        deviceLabel
      };
    } catch (err: any) {
      console.error('[VOICE DEBUG] microphone test error:', err.name, err.message);

      let humanMessage = 'Microphone access failed.';
      switch (err.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          humanMessage = 'Microphone permission was denied. Please enable microphone permission in your browser URL bar / site settings.';
          break;
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          humanMessage = 'No microphone was found on this device. Please connect a microphone.';
          break;
        case 'NotReadableError':
        case 'TrackStartError':
          humanMessage = 'The microphone is being used or blocked by another application (e.g. Zoom, Teams, or another tab).';
          break;
        case 'OverconstrainedError':
          humanMessage = 'The requested audio constraints cannot be satisfied by the hardware.';
          break;
        case 'SecurityError':
          humanMessage = 'Microphone access is blocked by browser security policy. Use HTTPS or http://localhost.';
          break;
        case 'AbortError':
          humanMessage = 'Microphone access was aborted by the operating system.';
          break;
        default:
          humanMessage = `Microphone error: ${err.name} - ${err.message}`;
      }

      return {
        success: false,
        errorType: err.name,
        rawError: err.message,
        message: humanMessage
      };
    }
  }

  // Standalone Speech Recognition Engine Test (Zero AI call)
  public static testSpeechRecognitionEngine(
    lang = 'en-IN',
    callbacks: {
      onListening?: () => void;
      onInterim?: (text: string) => void;
      onFinal?: (text: string) => void;
      onError?: (errMessage: string, errType: string) => void;
      onEnd?: () => void;
    }
  ): { stop: () => void } {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      callbacks.onError?.('Speech recognition is not supported in this browser. Please use Google Chrome or Edge.', 'NotSupported');
      return { stop: () => {} };
    }

    console.log('[VOICE DEBUG] recognition starting (test mode, lang: ' + lang + ')');
    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = lang;

    rec.onstart = () => {
      console.log('[VOICE DEBUG] recognition started (test mode)');
      callbacks.onListening?.();
    };

    rec.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = 0; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          final += item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }
      if (final.trim()) {
        console.log('[VOICE DEBUG] test mode FINAL transcript:', final.trim());
        callbacks.onFinal?.(final.trim());
      } else if (interim.trim()) {
        console.log('[VOICE DEBUG] test mode interim transcript:', interim.trim());
        callbacks.onInterim?.(interim.trim());
      }
    };

    rec.onerror = (event: any) => {
      console.warn('[VOICE DEBUG] recognition error (test mode):', event.error);
      let msg = `Speech error: ${event.error}`;
      if (event.error === 'not-allowed') {
        msg = 'Speech recognition permission denied. Please allow microphone access for this site in your browser.';
      } else if (event.error === 'audio-capture') {
        msg = 'No audio detected. Check your microphone settings.';
      } else if (event.error === 'no-speech') {
        msg = 'No speech was heard. Speak closer to the microphone.';
      } else if (event.error === 'network') {
        msg = 'Speech recognition network error. Chrome speech service requires an active internet connection.';
      }
      callbacks.onError?.(msg, event.error);
    };

    rec.onend = () => {
      console.log('[VOICE DEBUG] recognition ended (test mode)');
      callbacks.onEnd?.();
    };

    try {
      rec.start();
    } catch (e: any) {
      console.error('[VOICE DEBUG] rec.start exception:', e);
      callbacks.onError?.(`Failed to start recognition: ${e.message}`, 'Exception');
    }

    return {
      stop: () => {
        try {
          rec.abort();
        } catch (e) {}
      }
    };
  }
}
