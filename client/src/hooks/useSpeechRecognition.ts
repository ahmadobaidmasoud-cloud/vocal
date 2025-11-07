import { useState, useEffect, useCallback, useRef } from 'react';
import { SpeechmaticsService } from '@/services/speechmatics';

interface UseSpeechRecognitionReturn {
  transcript: string;
  partialTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  confidence: number;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

/**
 * Clean voice transcript from punctuation and extra spaces
 * Removes: periods, commas, exclamations, question marks, colons, semicolons
 * Normalizes: multiple spaces into single space
 */
function cleanVoiceTranscript(text: string): string {
  return text
    .replace(/[.,!?;:]/g, '')  // Remove all punctuation marks
    .replace(/\s+/g, ' ')      // Convert multiple spaces to single space
    .trim();                   // Remove leading/trailing spaces
}

export function useSpeechRecognition(language: string = 'ar-SA'): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const serviceRef = useRef<SpeechmaticsService | null>(null);

  useEffect(() => {
    // Speechmatics is supported if we can access backend
    setIsSupported(true);

    return () => {
      if (serviceRef.current) {
        serviceRef.current.stop();
      }
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported || isListening) return;

    setError(null);
    setTranscript('');
    setPartialTranscript('');
    setConfidence(0);

    try {
      // Fetch temporary JWT token from backend (secure!)
      const response = await fetch('/api/speechmatics/token', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to get speech recognition token');
      }

      const { token } = await response.json();

      // Determine language code
      const lang = language.startsWith('ar') ? 'ar' : 'en';

      // Create new Speechmatics service with secure JWT token
      serviceRef.current = new SpeechmaticsService({
        language: lang,
        jwt: token,
        onPartialTranscript: (text, conf) => {
          setPartialTranscript(cleanVoiceTranscript(text));
          setConfidence(conf);
        },
        onFinalTranscript: (text, conf) => {
          setTranscript(cleanVoiceTranscript(text));
          setConfidence(conf);
          setPartialTranscript(''); // Clear partial when we get final
        },
        onError: (errorMessage) => {
          console.error('Speechmatics error:', errorMessage);
          setError(errorMessage);
          setIsListening(false);
        },
        onSessionStarted: () => {
          console.log('🎤 Recording started');
          setIsListening(true);
        },
        onSessionEnded: () => {
          console.log('🛑 Recording ended');
          setIsListening(false);
        },
      });

      await serviceRef.current.start();

    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setError(err.message || 'Failed to start');
      setIsListening(false);
    }
  }, [isSupported, isListening, language]);

  const stopListening = useCallback(() => {
    if (serviceRef.current && isListening) {
      serviceRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setPartialTranscript('');
    setConfidence(0);
    if (serviceRef.current) {
      serviceRef.current.reset();
    }
  }, []);

  return {
    transcript,
    partialTranscript,
    isListening,
    isSupported,
    confidence,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
