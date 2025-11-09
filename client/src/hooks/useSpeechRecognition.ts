import { useState, useEffect, useCallback, useRef } from 'react';
import { SpeechmaticsService, TranscriptPayload } from '@/services/speechmatics';

export interface TaggedTranscript {
  questionId: string;
  text: string;
  confidence: number;
  isFinal: boolean;
}

interface UseSpeechRecognitionReturn {
  transcript: TaggedTranscript | null;
  partialTranscript: TaggedTranscript | null;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  startListening: (questionId: string) => Promise<void>;
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
  const [transcript, setTranscript] = useState<TaggedTranscript | null>(null);
  const [partialTranscript, setPartialTranscript] = useState<TaggedTranscript | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
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

  const startListening = useCallback(async (questionId: string) => {
    if (!isSupported || isListening) return;

    setError(null);
    setTranscript(null);
    setPartialTranscript(null);

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

      // Create new Speechmatics service with questionId + callbacks
      serviceRef.current = new SpeechmaticsService({
        questionId, // ← Capture question ID in service instance
        language: lang,
        jwt: token,
        onPartialTranscript: (payload: TranscriptPayload) => {
          setPartialTranscript({
            questionId: payload.questionId,
            text: cleanVoiceTranscript(payload.text),
            confidence: payload.confidence,
            isFinal: false,
          });
        },
        onFinalTranscript: (payload: TranscriptPayload) => {
          setTranscript({
            questionId: payload.questionId,
            text: cleanVoiceTranscript(payload.text),
            confidence: payload.confidence,
            isFinal: true,
          });
          setPartialTranscript(null); // Clear partial when we get final
        },
        onError: (errorMessage) => {
          console.error('Speechmatics error:', errorMessage);
          setError(errorMessage);
          setIsListening(false);
        },
        onSessionStarted: () => {
          console.log(`🎤 Recording started for question: ${questionId}`);
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
    setTranscript(null);
    setPartialTranscript(null);
    if (serviceRef.current) {
      serviceRef.current.reset();
    }
  }, []);

  return {
    transcript,
    partialTranscript,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
