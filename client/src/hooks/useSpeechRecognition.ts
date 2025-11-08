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
  
  // ✅ OPTIMIZATION 1: Cache JWT token (1-hour TTL)
  const tokenRef = useRef<string | null>(null);
  const tokenExpiryRef = useRef<number>(0);

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
    if (!isSupported) return;

    setError(null);
    setTranscript(null);
    setPartialTranscript(null);

    try {
      // ✅ OPTIMIZATION 2 & 3: Reuse existing service + connection if available
      if (serviceRef.current && serviceRef.current.isRunning()) {
        console.log('♻️ Reusing existing Speechmatics session (ultra-fast!)');
        serviceRef.current.pause();
        serviceRef.current.updateQuestionId(questionId);
        serviceRef.current.resume();
        setIsListening(true);
        return;
      }

      // ✅ OPTIMIZATION 1: Reuse cached JWT token if valid
      const now = Date.now();
      let token = tokenRef.current;

      if (!token || now >= tokenExpiryRef.current) {
        console.log('🔑 Fetching new JWT token...');
        const response = await fetch('/api/speechmatics/token', {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('Failed to get speech recognition token');
        }

        const data = await response.json();
        token = data.token;
        
        // Cache token for 55 minutes (safe margin before 60min expiry)
        tokenRef.current = token;
        tokenExpiryRef.current = now + (55 * 60 * 1000);
        console.log('✅ JWT token cached (valid for 55min)');
      } else {
        console.log('♻️ Reusing cached JWT token');
      }

      // Determine language code
      const lang = language.startsWith('ar') ? 'ar' : 'en';

      // Create Speechmatics service ONCE (or reuse existing)
      if (!serviceRef.current) {
        console.log('🆕 Creating new Speechmatics service...');
        serviceRef.current = new SpeechmaticsService({
          questionId,
          language: lang,
          jwt: token!,
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
            setPartialTranscript(null);
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
      } else {
        // Service exists but was paused - just update and resume
        serviceRef.current.updateQuestionId(questionId);
        serviceRef.current.resume();
        setIsListening(true);
      }

    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setError(err.message || 'Failed to start');
      setIsListening(false);
    }
  }, [isSupported, language]);

  const stopListening = useCallback(() => {
    if (serviceRef.current && isListening) {
      // ✅ Use pause instead of stop (keep connection alive!)
      serviceRef.current.pause();
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
