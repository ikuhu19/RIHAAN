import React, { useState, useEffect } from 'react';
import { X, Mic, Volume2, ShieldCheck, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { VoiceDiagnostics, EnvironmentDiagnostics, MicrophoneTestResult } from '../voice/voiceDiagnostics';

interface VoiceDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceDiagnosticsModal: React.FC<VoiceDiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const [envInfo, setEnvInfo] = useState<EnvironmentDiagnostics | null>(null);
  const [micTestResult, setMicTestResult] = useState<MicrophoneTestResult | null>(null);
  const [isTestingMic, setIsTestingMic] = useState(false);

  // Speech Recognition Test States
  const [isTestingSpeech, setIsTestingSpeech] = useState(false);
  const [speechTestTranscript, setSpeechTestTranscript] = useState('');
  const [speechTestStatus, setSpeechTestStatus] = useState<string>('Ready to test');
  const [speechTestLang, setSpeechTestLang] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const [activeSpeechController, setActiveSpeechController] = useState<{ stop: () => void } | null>(null);

  // Load environment diagnostics on mount or open
  useEffect(() => {
    if (isOpen) {
      VoiceDiagnostics.runEnvironmentCheck().then((info) => {
        setEnvInfo(info);
      });
    }
    return () => {
      if (activeSpeechController) {
        activeSpeechController.stop();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Run hardware mic test
  const handleTestMicrophone = async () => {
    setIsTestingMic(true);
    setMicTestResult(null);
    try {
      const res = await VoiceDiagnostics.testMicrophoneHardware();
      setMicTestResult(res);
      // Refresh environment details after requesting permission
      const updated = await VoiceDiagnostics.runEnvironmentCheck();
      setEnvInfo(updated);
    } catch (e: any) {
      setMicTestResult({
        success: false,
        message: `Microphone test exception: ${e.message}`,
        errorType: e.name
      });
    } finally {
      setIsTestingMic(false);
    }
  };

  // Run standalone speech recognition test
  const handleTestSpeech = () => {
    if (isTestingSpeech && activeSpeechController) {
      activeSpeechController.stop();
      setIsTestingSpeech(false);
      setSpeechTestStatus('Stopped');
      return;
    }

    setSpeechTestTranscript('');
    setSpeechTestStatus('Listening... Speak now into your microphone');
    setIsTestingSpeech(true);

    const controller = VoiceDiagnostics.testSpeechRecognitionEngine(speechTestLang, {
      onListening: () => {
        setSpeechTestStatus('Listening... (Microphone active)');
      },
      onInterim: (text) => {
        setSpeechTestTranscript(text);
      },
      onFinal: (text) => {
        setSpeechTestTranscript(text);
        setSpeechTestStatus(`Recognized: "${text}"`);
        setIsTestingSpeech(false);
      },
      onError: (msg, type) => {
        setSpeechTestStatus(`Error (${type}): ${msg}`);
        setIsTestingSpeech(false);
      },
      onEnd: () => {
        setIsTestingSpeech(false);
      }
    });

    setActiveSpeechController(controller);
  };

  return (
    <div className="voice-diag-backdrop" onClick={onClose}>
      <div className="voice-diag-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="voice-diag-header">
          <div className="flex items-center gap-2">
            <Mic className="text-teal-400" size={22} />
            <h2 className="voice-diag-title">Voice & Hardware Diagnostics</h2>
          </div>
          <button className="voice-diag-close-btn" onClick={onClose} id="close-diag-modal-btn">
            <X size={20} />
          </button>
        </div>

        <div className="voice-diag-body">
          {/* 1. Environment & Security Check */}
          <div className="diag-section">
            <h3 className="diag-section-title">
              <ShieldCheck size={16} className="text-amber-400" />
              1. Browser & Security Context
            </h3>
            {envInfo ? (
              <div className="diag-grid">
                <div className="diag-item">
                  <span className="diag-key">Origin:</span>
                  <span className="diag-val font-mono">{envInfo.origin}</span>
                </div>
                <div className="diag-item">
                  <span className="diag-key">Secure Context:</span>
                  <span className={`diag-val ${envInfo.isSecureContext ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {envInfo.isSecureContext ? '✅ Secure (HTTPS/localhost)' : '❌ Insecure Context (APIs blocked)'}
                  </span>
                </div>
                <div className="diag-item">
                  <span className="diag-key">SpeechRecognition API:</span>
                  <span className={`diag-val ${envInfo.hasSpeechRecognition ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {envInfo.hasSpeechRecognition ? `✅ ${envInfo.speechEngineName}` : '❌ Not supported in this browser'}
                  </span>
                </div>
                <div className="diag-item">
                  <span className="diag-key">Microphone Permission:</span>
                  <span className="diag-val capitalize font-semibold text-teal-300">
                    {envInfo.permissionState}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Checking environment...</p>
            )}
          </div>

          {/* 2. Standalone Hardware Microphone Test */}
          <div className="diag-section">
            <h3 className="diag-section-title">
              <Mic size={16} className="text-teal-400" />
              2. Test Microphone Access (getUserMedia)
            </h3>
            <p className="diag-hint">
              Confirms whether your operating system and browser allow microphone capture.
            </p>

            <div className="flex items-center gap-3 mt-2">
              <button
                className="diag-action-btn"
                onClick={handleTestMicrophone}
                disabled={isTestingMic}
                id="btn-test-mic-hardware"
              >
                {isTestingMic ? <RefreshCw className="animate-spin" size={16} /> : <Mic size={16} />}
                <span>🎙️ TEST MICROPHONE</span>
              </button>
            </div>

            {micTestResult && (
              <div className={`diag-result-card ${micTestResult.success ? 'success' : 'error'}`}>
                {micTestResult.success ? (
                  <div className="flex items-start gap-2">
                    <CheckCircle className="text-emerald-400 shrink-0 mt-0.5" size={18} />
                    <div>
                      <strong className="text-emerald-300">Microphone Working!</strong>
                      <p className="text-xs text-slate-300 mt-0.5">{micTestResult.message}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="text-rose-400 shrink-0 mt-0.5" size={18} />
                    <div>
                      <strong className="text-rose-300">Error: {micTestResult.errorType}</strong>
                      <p className="text-xs text-rose-200 mt-0.5">{micTestResult.message}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Standalone Speech Recognition Test */}
          <div className="diag-section">
            <h3 className="diag-section-title">
              <Volume2 size={16} className="text-amber-400" />
              3. Test Speech Recognition (SpeechRecognition)
            </h3>
            <p className="diag-hint">
              Tests speech-to-text directly without calling the AI or TTS.
            </p>

            {/* Language Selector */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-400">Dialect:</span>
              <button
                className={`text-xs px-2.5 py-1 rounded border ${speechTestLang === 'en-IN' ? 'border-teal-400 bg-teal-500/20 text-white' : 'border-slate-700 bg-slate-800 text-slate-400'}`}
                onClick={() => setSpeechTestLang('en-IN')}
              >
                🇮🇳 English / Hinglish (en-IN)
              </button>
              <button
                className={`text-xs px-2.5 py-1 rounded border ${speechTestLang === 'hi-IN' ? 'border-teal-400 bg-teal-500/20 text-white' : 'border-slate-700 bg-slate-800 text-slate-400'}`}
                onClick={() => setSpeechTestLang('hi-IN')}
              >
                🇮🇳 Hindi (hi-IN)
              </button>
            </div>

            <div className="flex items-center gap-3 mt-3">
              <button
                className={`diag-action-btn ${isTestingSpeech ? 'listening-active' : ''}`}
                onClick={handleTestSpeech}
                id="btn-test-speech-rec"
              >
                <Volume2 size={16} />
                <span>{isTestingSpeech ? '🛑 Stop Test' : '🗣️ TEST SPEECH RECOGNITION'}</span>
              </button>
              <span className="text-xs text-slate-300 font-medium">{speechTestStatus}</span>
            </div>

            {/* Live Transcript Display */}
            <div className="diag-transcript-box mt-3">
              <span className="diag-transcript-label">Transcript:</span>
              <p className="diag-transcript-text">
                {speechTestTranscript || <span className="text-slate-500 italic">Say "Hello Vihaan" or "Vihaan aaj kya kar raha hai?"</span>}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
