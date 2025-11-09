import { useEffect, useState, useCallback, useRef } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  Send,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCheck
} from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVoiceCommands, VOICE_COMMANDS, extractNumberFromTranscript } from '@/hooks/useVoiceCommands';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { SurveyWithQuestions, InsertResponse, InsertAnswer, Question } from '@shared/schema';

interface ConversationMessage {
  questionId: string;
  questionText: string;
  questionType: 'score_5' | 'score_10' | 'text' | 'both';
  answer?: {
    scoreValue?: number;
    textValue?: string;
  };
}

export default function ResponderPage() {
  const [, params] = useRoute('/survey/:id');
  const surveyId = params?.id;
  const { toast } = useToast();

  const [showingIntro, setShowingIntro] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [answers, setAnswers] = useState<Record<string, { scoreValue?: number; textValue?: string }>>({});
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [editableText, setEditableText] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [tutorialActive, setTutorialActive] = useState(false);
  const autoStartedRef = useRef<string | null>(null);
  const userStoppedManuallyRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Ref to track latest answers state (prevents stale state reads in rapid navigation)
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const { data: survey, isLoading } = useQuery<SurveyWithQuestions>({
    queryKey: ['/api/surveys', surveyId],
    enabled: !!surveyId,
  });

  const { 
    transcript: taggedTranscript, 
    partialTranscript: taggedPartialTranscript,
    isListening, 
    isSupported,
    error: speechError,
    isPrimed, // ✅ iOS Safari fix: Track if audio pipeline initialized
    primeOnce, // ✅ Initialize mic from user gesture
    startListening, 
    stopListening, 
    resetTranscript,
    muteAudio, // ✅ Mute mic during TTS
    unmuteAudio // ✅ Unmute mic after TTS
  } = useSpeechRecognition(survey?.language === 'en' ? 'en-US' : 'ar-SA');

  const submitResponseMutation = useMutation({
    mutationFn: async (data: { response: InsertResponse; answers: InsertAnswer[] }) => {
      return apiRequest('POST', '/api/responses', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/surveys', surveyId, 'analytics'] });
      setIsCompleted(true);
    },
  });

  const currentQuestion = survey?.questions?.[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === (survey?.questions?.length || 0) - 1;
  const isRTL = survey?.language === 'ar';

  // Check if current question has an answer (check persisted state first, then editable text)
  const hasAnswer = currentQuestion && (
    (currentQuestion.type === 'score_5' || currentQuestion.type === 'score_10') 
      ? !!answers[currentQuestion.id]?.scoreValue 
      : (currentQuestion.type === 'text' 
          ? (!!answers[currentQuestion.id]?.textValue || !!editableText.trim())
          : (currentQuestion.type === 'both' 
              ? (!!answers[currentQuestion.id]?.scoreValue || !!answers[currentQuestion.id]?.textValue || !!editableText.trim())
              : false))
  );

  // Auto-scroll to bottom when new message appears
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, currentQuestionIndex]);

  // Check if we should show intro
  useEffect(() => {
    if (survey) {
      setShowingIntro(!!survey.introText && survey.introText.trim().length > 0);
    }
  }, [survey]);

  // Auto-play intro TTS when intro screen is shown
  useEffect(() => {
    if (showingIntro && survey?.introVoiceUrl && !isMuted && survey?.settings.voiceEnabled) {
      playTTS(survey.introVoiceUrl);
    }
  }, [showingIntro, survey?.introVoiceUrl, isMuted]);

  // Auto-play TTS when question changes (but not during intro)
  useEffect(() => {
    if (!showingIntro && currentQuestion?.voiceUrl && !isMuted && survey?.settings.voiceEnabled) {
      playTTS(currentQuestion.voiceUrl);
    }
  }, [currentQuestion?.id, isMuted, showingIntro]);

  const playTTS = useCallback(async (url: string) => {
    if (audioElement) {
      audioElement.pause();
    }
    
    // ✅ iOS Safari fix: Mute mic during TTS playback
    muteAudio();
    
    const audio = new Audio(url);
    audio.onplay = () => setIsPlaying(true);
    audio.onended = async () => {
      setIsPlaying(false);
      
      // ✅ iOS Safari fix: Unmute mic after TTS, then auto-start listening
      if (survey?.settings.voiceEnabled && currentQuestion && isPrimed) {
        await unmuteAudio();
        setTimeout(() => {
          handleAutoStartListening();
        }, 200); // Small delay for audio context to resume
      }
    };
    audio.onerror = async () => {
      setIsPlaying(false);
      // ✅ CRITICAL: Unmute mic even if TTS fails (prevent permanent mute)
      if (survey?.settings.voiceEnabled && isPrimed) {
        await unmuteAudio();
      }
    };
    audio.play();
    setAudioElement(audio);
  }, [audioElement, survey, currentQuestion, isPrimed, muteAudio, unmuteAudio]);

  const handleAutoStartListening = useCallback(() => {
    if (!isSupported || !survey?.settings.voiceEnabled || !currentQuestion) return;
    
    // ✅ iOS Safari fix: Don't auto-start until audio pipeline is primed
    if (!isPrimed) {
      console.log('⏸️ Auto-start blocked - audio pipeline not primed yet');
      return;
    }
    
    setTimeout(() => {
      resetTranscript();
      startListening(currentQuestion.id);
      autoStartedRef.current = currentQuestion.id;
    }, 0);
  }, [isSupported, survey, currentQuestion, startListening, resetTranscript, isPrimed]);

  // When question changes, load saved answer and reset flags
  useEffect(() => {
    if (!currentQuestion) return;
    
    userStoppedManuallyRef.current = false;
    autoStartedRef.current = null;
    
    // Hydrate editableText from saved answer (if navigating back to a previously answered question)
    const savedAnswer = answers[currentQuestion.id];
    if (savedAnswer?.textValue) {
      setEditableText(savedAnswer.textValue);
    } else {
      setEditableText('');
    }
  }, [currentQuestion?.id, answers]);

  // Sync transcript to editable text, but ONLY if transcript belongs to current question
  // Tagged transcript prevents late STT from previous question corrupting new question
  useEffect(() => {
    if (currentQuestion && 
        taggedTranscript?.questionId === currentQuestion.id && 
        taggedTranscript?.text) {
      setEditableText(taggedTranscript.text);
    }
  }, [taggedTranscript, currentQuestion]);


  // Fallback: Auto-start recording for questions without TTS or when TTS fails (but not during intro)
  useEffect(() => {
    if (showingIntro || !currentQuestion || !survey?.settings.voiceEnabled) return;
    
    const shouldFallbackStart = !currentQuestion.voiceUrl || isMuted;
    const hasNotStartedYet = autoStartedRef.current !== currentQuestion.id;
    const userDidNotStopManually = !userStoppedManuallyRef.current;
    
    if (shouldFallbackStart && !isListening && !isPlaying && hasNotStartedYet && userDidNotStopManually) {
      const timer = setTimeout(() => {
        handleAutoStartListening();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentQuestion?.id, isMuted, isListening, isPlaying, survey, handleAutoStartListening, showingIntro]);

  // Navigation handlers
  const handleNext = async () => {
    if (!currentQuestion) return;
    
    // For text/both questions, update answersRef synchronously BEFORE reading it
    if (currentQuestion.type === 'text' || currentQuestion.type === 'both') {
      const newAnswers = {
        ...answersRef.current,
        [currentQuestion.id]: { 
          ...answersRef.current[currentQuestion.id],
          textValue: editableText 
        }
      };
      answersRef.current = newAnswers; // ← Synchronous update
      setAnswers(newAnswers);          // ← State update for re-render
    }
    
    // Now read from answersRef (guaranteed to have latest values)
    const latestAnswers = answersRef.current;
    
    // Save current answer to conversation history
    const currentAnswer = {
      scoreValue: latestAnswers[currentQuestion.id]?.scoreValue,
      textValue: latestAnswers[currentQuestion.id]?.textValue
    };

    setConversationHistory(prev => [
      ...prev,
      {
        questionId: currentQuestion.id,
        questionText: currentQuestion.text,
        questionType: currentQuestion.type as 'score_5' | 'score_10' | 'text' | 'both',
        answer: currentAnswer
      }
    ]);

    await stopListening(); // ✅ Await to ensure clean teardown before next question
    resetTranscript();
    setCurrentQuestionIndex(prev => Math.min(prev + 1, (survey?.questions.length || 1) - 1));
  };

  const handlePrevious = async () => {
    if (currentQuestionIndex === 0) return;
    
    // ALWAYS save current answer to answersRef BEFORE navigating (prevents data loss for both score AND text)
    if (currentQuestion) {
      const currentAnswer = answersRef.current[currentQuestion.id] || {};
      
      // Explicitly copy scoreValue from answers state (handles rapid score changes before backward nav)
      if (currentQuestion.type === 'score_5' || currentQuestion.type === 'score_10' || currentQuestion.type === 'both') {
        const latestScore = answers[currentQuestion.id]?.scoreValue;
        if (latestScore !== undefined) {
          currentAnswer.scoreValue = latestScore;
        }
      }
      
      // Save textValue for text/both questions (including empty string to handle deletions)
      if (currentQuestion.type === 'text' || currentQuestion.type === 'both') {
        currentAnswer.textValue = editableText;
      }
      
      const newAnswers = {
        ...answersRef.current,
        [currentQuestion.id]: currentAnswer
      };
      answersRef.current = newAnswers; // ← Synchronous update
      setAnswers(newAnswers);
    }
    
    // Update conversationHistory by removing the previous question's entry
    // (currentQuestionIndex-1 because current question hasn't been added to history yet)
    setConversationHistory(prev => {
      const newHistory = [...prev];
      const indexToRemove = currentQuestionIndex - 1;
      if (indexToRemove >= 0 && indexToRemove < newHistory.length) {
        newHistory.splice(indexToRemove, 1);
      }
      return newHistory;
    });
    
    await stopListening(); // ✅ Await to ensure clean teardown before previous question
    resetTranscript();
    setCurrentQuestionIndex(prev => Math.max(prev - 1, 0));
  };

  // ✅ iOS Safari fix: Prime audio pipeline from user gesture
  const handleTutorialStart = async () => {
    if (!survey?.settings.voiceEnabled) return;
    setTutorialActive(true);
    resetTranscript();
    try {
      // Prime audio pipeline (getUserMedia called here from user gesture!)
      await primeOnce();
      
      // Start listening for tutorial
      await startListening('tutorial');
    } catch (error) {
      console.error('Tutorial mic error:', error);
      setTutorialActive(false);
      alert(isRTL 
        ? '❌ لم نتمكن من الوصول للميكروفون. يمكنك المتابعة بالكتابة.'
        : '❌ Could not access microphone. You can continue by typing.'
      );
    }
  };

  // Tutorial: Complete and start survey
  const handleTutorialComplete = async () => {
    setTutorialActive(false);
    await stopListening(); // ✅ Await to ensure clean teardown
    resetTranscript();
    setShowingIntro(false);
  };

  // Tutorial voice command: Listen for "next" to complete tutorial
  useVoiceCommands(
    tutorialActive && taggedTranscript?.questionId === 'tutorial' ? (taggedTranscript?.text ?? '') : '',
    [
      {
        keywords: VOICE_COMMANDS.next[isRTL ? 'ar' : 'en'],
        action: handleTutorialComplete,
      },
    ],
    isRTL ? 'ar' : 'en'
  );

  // Voice commands (only process if transcript belongs to current question)
  useVoiceCommands(
    taggedTranscript?.questionId === currentQuestion?.id ? (taggedTranscript?.text ?? '') : '',
    [
      {
        keywords: VOICE_COMMANDS.next[isRTL ? 'ar' : 'en'],
        action: () => {
          if (!hasAnswer) return;
          if (isLastQuestion) {
            handleSubmit();
          } else {
            handleNext();
          }
        },
      },
      {
        keywords: VOICE_COMMANDS.previous[isRTL ? 'ar' : 'en'],
        action: handlePrevious,
      },
      {
        keywords: VOICE_COMMANDS.submit[isRTL ? 'ar' : 'en'],
        action: () => {
          if (isLastQuestion && hasAnswer) {
            handleSubmit();
          }
        },
      },
      {
        keywords: VOICE_COMMANDS.repeat[isRTL ? 'ar' : 'en'],
        action: () => {
          if (currentQuestion?.voiceUrl) {
            playTTS(currentQuestion.voiceUrl);
          }
        },
      },
    ],
    isRTL ? 'ar' : 'en'
  );

  // Auto-detect score from voice (only if transcript belongs to current question)
  useEffect(() => {
    if (currentQuestion && 
        taggedTranscript?.questionId === currentQuestion.id &&
        taggedTranscript?.text &&
        (currentQuestion.type === 'score_5' || currentQuestion.type === 'score_10' || currentQuestion.type === 'both')) {
      const maxScore = currentQuestion.type === 'score_10' ? 10 : 5;
      const detectedNumber = extractNumberFromTranscript(taggedTranscript.text, maxScore);
      
      if (detectedNumber !== null) {
        handleScoreSelect(detectedNumber);
      }
    }
  }, [taggedTranscript, currentQuestion]);

  const handleScoreSelect = (score: number) => {
    if (!currentQuestion) return;
    
    // Update both ref AND state synchronously to prevent stale reads in rapid navigation
    const newAnswers = {
      ...answersRef.current,
      [currentQuestion.id]: { 
        ...answersRef.current[currentQuestion.id],
        scoreValue: score 
      }
    };
    answersRef.current = newAnswers; // ← Synchronous update BEFORE any navigation
    setAnswers(newAnswers);          // ← State update for re-render
    
    stopListening();
    resetTranscript();

    // Auto-advance if enabled
    if (survey?.settings.autoAdvance) {
      setTimeout(() => {
        if (isLastQuestion) {
          handleSubmit();
        } else {
          handleNext();
        }
      }, 500);
    }
  };

  const handleSubmit = async () => {
    if (!survey || !surveyId) return;
    
    // Use answersRef to get latest state (prevents stale state in rapid clicks/auto-advance)
    const latestAnswers = answersRef.current;
    const finalAnswers = { ...latestAnswers };
    
    // Ensure current question's answer is captured in the snapshot
    if (currentQuestion) {
      const currentAnswer = finalAnswers[currentQuestion.id] || {};
      
      // Capture text for text/both questions (from editableText input)
      if (currentQuestion.type === 'text' || currentQuestion.type === 'both') {
        currentAnswer.textValue = editableText || currentAnswer.textValue;
      }
      
      finalAnswers[currentQuestion.id] = currentAnswer;
    }

    const answersList: InsertAnswer[] = survey.questions.map(q => ({
      responseId: '',
      questionId: q.id,
      scoreValue: finalAnswers[q.id]?.scoreValue || null,
      textValue: finalAnswers[q.id]?.textValue || null,
    }));

    await submitResponseMutation.mutateAsync({
      response: { surveyId },
      answers: answersList,
    });
  };

  const toggleMic = async () => {
    if (!survey?.settings.voiceEnabled) return;

    if (isListening) {
      // إيقاف التسجيل
      await stopListening();
      userStoppedManuallyRef.current = true;
    } else {
      // بدء التسجيل
      userStoppedManuallyRef.current = false;
      
      // ✨ إذا ما تم priming قبل → اعملها الآن (أول ضغطة في التوتوريال)
      if (!isPrimed) {
        try {
          await primeOnce();
        } catch (error) {
          console.error('Failed to prime microphone:', error);
          alert(isRTL 
            ? '❌ لم نتمكن من الوصول للميكروفون'
            : '❌ Could not access microphone');
          return;
        }
      }
      
      // بعد priming نجح → ابدأ التسجيل
      const questionId = tutorialActive ? 'tutorial' : (currentQuestion?.id || 'manual');
      await startListening(questionId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center" data-testid="loading-responder">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md" data-testid="error-not-found">
          <h1 className="text-3xl font-bold mb-4">{isRTL ? 'الاستبيان غير موجود' : 'Survey Not Found'}</h1>
          <p className="text-gray-600">{isRTL ? 'عذراً، لم نتمكن من العثور على هذا الاستبيان' : 'Sorry, we could not find this survey'}</p>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-gray-50 p-4"
        dir={isRTL ? 'rtl' : 'ltr'}
        data-testid="page-thank-you"
      >
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
            {survey.logoUrl && (
              <div className="flex justify-center mb-6">
                <img src={survey.logoUrl} alt="Logo" className="h-16 object-contain" data-testid="survey-logo-complete" />
              </div>
            )}

            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCheck className="w-10 h-10 text-green-500" />
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900" data-testid="thank-you-title">
              {isRTL ? 'شكراً لك!' : 'Thank You!'}
            </h1>
            <p className="text-lg text-gray-600 mb-8" data-testid="thank-you-message">
              {isRTL 
                ? 'تم تسجيل ردك بنجاح. نقدر وقتك ومساهمتك.'
                : 'Your response has been recorded successfully. We appreciate your time and contribution.'}
            </p>

            <Button
              variant="outline"
              onClick={() => window.close()}
              data-testid="button-close"
            >
              {isRTL ? 'إغلاق' : 'Close'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (showingIntro) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-gray-50 p-4"
        dir={isRTL ? 'rtl' : 'ltr'}
        data-testid="page-intro"
      >
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            {survey.logoUrl && (
              <div className="flex justify-center mb-6">
                <img src={survey.logoUrl} alt="Logo" className="h-16 object-contain" data-testid="intro-logo" />
              </div>
            )}

            <h1 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900 text-center" data-testid="intro-title">
              {survey.title}
            </h1>

            <p className="text-lg text-gray-600 mb-8 text-center whitespace-pre-wrap" data-testid="intro-text">
              {survey.introText}
            </p>

            {isPlaying && (
              <div className="flex justify-center mb-4">
                <Badge className="bg-green-100 text-green-700 animate-pulse">
                  <Volume2 className="w-3 h-3 mr-1" />
                  {isRTL ? 'يُشغّل الصوت...' : 'Playing Audio...'}
                </Badge>
              </div>
            )}

            {/* Tutorial Mode UI */}
            {tutorialActive && (
              <div className="mb-6 space-y-4">
                {isListening ? (
                  <div className="text-center space-y-3">
                    <Badge className="bg-red-500 text-white animate-pulse text-base px-4 py-2">
                      <Mic className="w-4 h-4 mr-2" />
                      {isRTL ? '🎙️ يسجل الآن...' : '🎙️ Recording...'}
                    </Badge>
                    
                    <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6">
                      <p className="text-green-700 font-bold text-xl mb-2">
                        {isRTL ? '✅ ممتاز! الميكروفون جاهز' : '✅ Great! Microphone Ready'}
                      </p>
                      <p className="text-green-600 text-lg">
                        {isRTL ? '💬 قل كلمة "التالي" للمتابعة' : '💬 Say "Next" to continue'}
                      </p>
                      {taggedPartialTranscript?.text && (
                        <p className="text-gray-500 mt-3 text-sm">
                          {isRTL ? 'سمعتك تقول:' : 'I heard:'} "{taggedPartialTranscript.text}"
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <Badge className="bg-yellow-100 text-yellow-700 animate-pulse">
                      {isRTL ? '⏳ جاري الاتصال...' : '⏳ Connecting...'}
                    </Badge>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-center gap-3">
              {!tutorialActive ? (
                <>
                  <Button
                    onClick={survey.settings.voiceEnabled ? handleTutorialStart : () => setShowingIntro(false)}
                    className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-xl"
                    data-testid="button-start"
                  >
                    {survey.settings.voiceEnabled 
                      ? (isRTL ? '🎤 اختبر الميكروفون' : '🎤 Test Microphone')
                      : (isRTL ? 'ابدأ الآن' : 'Start Now')
                    }
                  </Button>

                  {survey.settings.voiceEnabled && (
                    <Button
                      variant="outline"
                      onClick={() => setIsMuted(!isMuted)}
                      className="px-4"
                      data-testid="button-toggle-sound"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleTutorialComplete}
                  className="px-6 py-3"
                  data-testid="button-skip-tutorial"
                >
                  {isRTL ? 'تخطي (بدون صوت)' : 'Skip (No Voice)'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main chat interface
  return (
    <div 
      className="min-h-screen bg-gray-50 flex flex-col"
      dir={isRTL ? 'rtl' : 'ltr'}
      data-testid="page-chat"
    >
      {/* Header with logo and mute */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          {survey.logoUrl && (
            <img src={survey.logoUrl} alt="Logo" className="h-8 md:h-10 object-contain" data-testid="chat-logo" />
          )}
          <div className="flex items-center gap-2">
            {survey.settings.voiceEnabled && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
                data-testid="button-mute"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Conversation history */}
          {conversationHistory.map((msg, idx) => (
            <div key={idx} className="space-y-2">
              {/* Question bubble */}
              <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className="max-w-[85%] md:max-w-[75%] bg-[#D4F4DD] rounded-2xl px-4 py-3 md:px-5 md:py-4 shadow-sm"
                  data-testid={`history-question-${idx}`}
                >
                  <p className="text-gray-900 font-medium text-base md:text-lg leading-relaxed">
                    {msg.questionText}
                  </p>
                </div>
              </div>

              {/* Answer bubble/badge */}
              <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                {msg.answer?.scoreValue && (
                  <div className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-semibold text-sm" data-testid={`history-answer-${idx}`}>
                    {msg.answer.scoreValue}
                  </div>
                )}
                {msg.answer?.textValue && (
                  <div className="max-w-[85%] bg-gray-200 text-gray-900 rounded-2xl px-4 py-3 shadow-sm" data-testid={`history-answer-text-${idx}`}>
                    <p className="text-base">{msg.answer.textValue}</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Current active question */}
          {currentQuestion && (
            <div className="space-y-4">
              {/* Current question bubble */}
              <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div 
                  className="max-w-[85%] md:max-w-[75%] bg-[#D4F4DD] rounded-2xl px-4 py-3 md:px-5 md:py-4 shadow-sm"
                  data-testid="active-question"
                >
                  <p className="text-gray-900 font-medium text-base md:text-lg leading-relaxed">
                    {currentQuestion.text}
                  </p>
                  
                  {/* Playing/Recording indicators */}
                  {isPlaying && (
                    <Badge className="bg-green-600 text-white mt-2 text-xs">
                      <Volume2 className="w-3 h-3 mr-1" />
                      {isRTL ? 'يُشغّل...' : 'Playing...'}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Answer input area */}
              <div className="bg-white rounded-2xl shadow-md p-4 space-y-3">
                {/* Score capsules */}
                {(currentQuestion.type === 'score_5' || currentQuestion.type === 'score_10' || currentQuestion.type === 'both') && (
                  <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
                    {Array.from({ length: currentQuestion.type === 'score_10' ? 10 : 5 }, (_, i) => i + 1).map((score) => (
                      <button
                        key={score}
                        onClick={() => handleScoreSelect(score)}
                        className={`
                          min-w-[60px] h-[60px] md:min-w-[72px] md:h-[72px] rounded-full
                          transition-all active:scale-95
                          ${answers[currentQuestion.id]?.scoreValue === score
                            ? 'bg-green-500 text-white border-2 border-green-500'
                            : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-green-400 hover:shadow-md'
                          }
                          text-2xl md:text-3xl font-bold
                        `}
                        data-testid={`score-${score}`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                )}

                {/* Text input */}
                {(currentQuestion.type === 'text' || currentQuestion.type === 'both') && (
                  <div className="relative">
                    <Textarea
                      value={editableText}
                      onChange={(e) => setEditableText(e.target.value)}
                      placeholder={isRTL ? 'اكتب إجابتك أو تحدث...' : 'Type your answer or speak...'}
                      className="min-h-[80px] resize-none text-base border-2 border-gray-300 focus:border-green-500 rounded-xl pr-12"
                      data-testid="input-text"
                    />
                    
                    {/* Microphone button */}
                    {survey.settings.voiceEnabled && (
                      <button
                        onClick={toggleMic}
                        className={`
                          absolute top-3 ${isRTL ? 'left-3' : 'right-3'}
                          w-10 h-10 rounded-full flex items-center justify-center
                          transition-all
                          ${isListening 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : 'bg-green-500 text-white hover:bg-green-600'
                          }
                        `}
                        data-testid="button-mic"
                      >
                        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                      </button>
                    )}

                    {/* Recording indicator */}
                    {isListening && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-red-500 text-white text-xs animate-pulse">
                          <div className="w-2 h-2 rounded-full bg-white mr-1 animate-pulse"></div>
                          {isRTL ? 'يسجل الآن...' : 'Recording...'}
                        </Badge>
                        {taggedPartialTranscript?.questionId === currentQuestion?.id && taggedPartialTranscript?.text && (
                          <span className="text-xs text-gray-500 italic">{taggedPartialTranscript.text}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Bottom navigation bar */}
      <div className="bg-white border-t border-gray-200 shadow-lg sticky bottom-0">
        <div className="max-w-2xl mx-auto p-3 md:p-4">
          <div className="flex gap-3">
            {/* Previous button - only show if not on first question */}
            {currentQuestionIndex > 0 && (
              <Button
                onClick={handlePrevious}
                variant="outline"
                className="flex-1 border-2 border-gray-300 hover:bg-gray-50 px-6 py-3 rounded-xl text-base font-semibold flex items-center justify-center gap-2"
                data-testid="button-previous"
              >
                <ArrowLeft className="w-5 h-5" />
                {isRTL ? 'السابق' : 'Previous'}
              </Button>
            )}
            
            {/* Next/Submit button */}
            <Button
              onClick={() => {
                if (isLastQuestion) {
                  handleSubmit();
                } else {
                  handleNext();
                }
              }}
              disabled={!hasAnswer || submitResponseMutation.isPending}
              className={`${currentQuestionIndex > 0 ? 'flex-1' : 'w-full'} bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl text-base font-semibold flex items-center justify-center gap-2`}
              data-testid="button-next"
            >
              {submitResponseMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {isLastQuestion 
                    ? (isRTL ? 'إرسال' : 'Submit')
                    : (isRTL ? 'التالي' : 'Next')
                  }
                  {isLastQuestion ? <Send className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
