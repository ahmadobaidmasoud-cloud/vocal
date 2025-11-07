import { useEffect, useState, useCallback } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  ChevronLeft, 
  ChevronRight, 
  Send,
  RotateCcw 
} from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVoiceCommands, VOICE_COMMANDS, extractNumberFromTranscript } from '@/hooks/useVoiceCommands';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { SurveyWithQuestions, InsertResponse, InsertAnswer } from '@shared/schema';

export default function ResponderPage() {
  const [, params] = useRoute('/survey/:id');
  const surveyId = params?.id;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { scoreValue?: number; textValue?: string }>>({});
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const { data: survey, isLoading } = useQuery<SurveyWithQuestions>({
    queryKey: ['/api/surveys', surveyId],
    enabled: !!surveyId,
  });

  const { 
    transcript, 
    partialTranscript,
    confidence,
    isListening, 
    isSupported,
    error: speechError,
    startListening, 
    stopListening, 
    resetTranscript 
  } = useSpeechRecognition(survey?.language === 'en' ? 'en-US' : 'ar-SA');

  const submitResponseMutation = useMutation({
    mutationFn: async (data: { response: InsertResponse; answers: InsertAnswer[] }) => {
      return apiRequest('POST', '/api/responses', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/surveys', surveyId, 'analytics'] });
    },
  });

  const currentQuestion = survey?.questions?.[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === (survey?.questions?.length || 0) - 1;
  const progress = survey ? ((currentQuestionIndex + 1) / survey.questions.length) * 100 : 0;
  const isRTL = survey?.language === 'ar';

  // Auto-play TTS when question changes
  useEffect(() => {
    if (currentQuestion?.voiceUrl && !isMuted && survey?.settings.voiceEnabled) {
      playTTS(currentQuestion.voiceUrl);
    }
  }, [currentQuestion?.id, isMuted]);

  const playTTS = useCallback((url: string) => {
    if (audioElement) {
      audioElement.pause();
    }
    const audio = new Audio(url);
    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => {
      setIsPlaying(false);
      if (survey?.settings.voiceEnabled && currentQuestion) {
        handleAutoStartListening();
      }
    };
    audio.onerror = () => setIsPlaying(false);
    audio.play();
    setAudioElement(audio);
  }, [audioElement, survey, currentQuestion]);

  const handleAutoStartListening = useCallback(() => {
    if (!isSupported || !survey?.settings.voiceEnabled) return;
    
    setTimeout(() => {
      resetTranscript();
      startListening();
    }, 300);
  }, [isSupported, survey, startListening, resetTranscript]);

  // Navigation handlers (defined before voice commands)
  const handleNext = () => {
    if (currentQuestion?.type === 'text' || currentQuestion?.type === 'both') {
      if (!currentQuestion) return;
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: { textValue: transcript }
      }));
    }
    stopListening();
    resetTranscript();
    setCurrentQuestionIndex(prev => Math.min(prev + 1, (survey?.questions.length || 1) - 1));
  };

  const handlePrevious = () => {
    stopListening();
    resetTranscript();
    setCurrentQuestionIndex(prev => Math.max(prev - 1, 0));
  };

  // Voice commands
  useVoiceCommands(
    transcript,
    [
      {
        keywords: VOICE_COMMANDS.next[isRTL ? 'ar' : 'en'],
        action: () => {
          if (!isLastQuestion) {
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
          if (isLastQuestion) {
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

  // Auto-detect score from voice
  useEffect(() => {
    if (currentQuestion && (currentQuestion.type === 'score_5' || currentQuestion.type === 'score_10')) {
      const maxScore = currentQuestion.type === 'score_5' ? 5 : 10;
      const detectedNumber = extractNumberFromTranscript(transcript, maxScore);
      
      if (detectedNumber !== null) {
        handleScoreSelect(detectedNumber);
        if (survey?.settings.autoAdvance) {
          setTimeout(() => {
            if (!isLastQuestion) {
              handleNext();
            }
          }, 500);
        }
      }
    }
  }, [transcript, currentQuestion]);

  const handleScoreSelect = (score: number) => {
    if (!currentQuestion) return;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: { scoreValue: score }
    }));
    stopListening();
    resetTranscript();
  };

  const handleTextSave = () => {
    if (!currentQuestion) return;
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: { textValue: transcript }
    }));
    stopListening();
    resetTranscript();
  };

  const handleSubmit = async () => {
    if (!survey || !surveyId) return;

    const answersList: InsertAnswer[] = survey.questions.map(q => ({
      responseId: '', // Will be set by backend
      questionId: q.id,
      scoreValue: answers[q.id]?.scoreValue || null,
      textValue: answers[q.id]?.textValue || null,
    }));

    await submitResponseMutation.mutateAsync({
      response: { surveyId },
      answers: answersList,
    });

    // Show success message
    alert(isRTL ? 'تم إرسال الإجابات بنجاح!' : 'Responses submitted successfully!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center" data-testid="loading-responder">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md" data-testid="error-not-found">
          <h1 className="text-3xl font-bold mb-4">{isRTL ? 'الاستبيان غير موجود' : 'Survey Not Found'}</h1>
          <p className="text-muted-foreground">{isRTL ? 'عذراً، لم نتمكن من العثور على هذا الاستبيان' : 'Sorry, we could not find this survey'}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-background p-4"
      dir={isRTL ? 'rtl' : 'ltr'}
      data-testid="page-responder"
    >
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        {survey.settings.showProgressBar && (
          <div className="mb-6" data-testid="progress-bar">
            <Progress value={progress} className="h-1" />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {isRTL ? `السؤال ${currentQuestionIndex + 1} من ${survey.questions.length}` : `Question ${currentQuestionIndex + 1} of ${survey.questions.length}`}
            </p>
          </div>
        )}

        {/* Question Card */}
        <div className="bg-card border border-card-border rounded-2xl shadow-xl p-8 md:p-12 animate-slide-in" data-testid={`question-card-${currentQuestionIndex}`}>
          {/* Logo */}
          {survey.logoUrl && (
            <div className="flex justify-center mb-6">
              <img src={survey.logoUrl} alt="Logo" className="h-12 object-contain" data-testid="survey-logo" />
            </div>
          )}

          {/* Question Text */}
          <h2 className="text-xl md:text-2xl font-semibold text-card-foreground mb-8 text-center" data-testid="question-text">
            {currentQuestion?.text}
          </h2>

          {/* Voice Status Indicators */}
          <div className="flex justify-center gap-2 mb-6 flex-wrap">
            {isListening && (
              <Badge variant="default" className="animate-pulse-slow" data-testid="badge-recording">
                <Mic className="w-3 h-3 mr-1" />
                {isRTL ? 'يسجل الآن...' : 'Recording now...'}
                {confidence > 0 && (
                  <span className="ml-2 text-xs opacity-80">
                    {Math.round(confidence * 100)}%
                  </span>
                )}
              </Badge>
            )}
            {speechError && (
              <Badge variant="destructive" data-testid="badge-error">
                {isRTL ? 'لم أسمع جيداً' : "Didn't hear well"}
              </Badge>
            )}
            {isPlaying && (
              <Badge variant="secondary" data-testid="badge-playing">
                <Volume2 className="w-3 h-3 mr-1" />
                {isRTL ? 'يشغل الصوت...' : 'Playing...'}
              </Badge>
            )}
          </div>

          {/* Answer Input */}
          <div className="mb-8">
            {currentQuestion?.type === 'score_5' && (
              <div className="flex justify-center gap-3 md:gap-4 flex-wrap" data-testid="score-buttons-5">
                {[1, 2, 3, 4, 5].map(score => (
                  <button
                    key={score}
                    onClick={() => {
                      handleScoreSelect(score);
                      if (survey.settings.autoAdvance && !isLastQuestion) {
                        setTimeout(handleNext, 300);
                      }
                    }}
                    className={`w-14 h-14 md:w-18 md:h-18 rounded-full text-2xl md:text-3xl font-bold transition-all
                      ${answers[currentQuestion.id]?.scoreValue === score
                        ? 'bg-primary text-primary-foreground scale-110 shadow-lg'
                        : 'bg-muted text-muted-foreground hover-elevate'
                      }`}
                    data-testid={`button-score-${score}`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            )}

            {currentQuestion?.type === 'score_10' && (
              <div className="flex justify-center gap-2 md:gap-3 flex-wrap" data-testid="score-buttons-10">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                  <button
                    key={score}
                    onClick={() => {
                      handleScoreSelect(score);
                      if (survey.settings.autoAdvance && !isLastQuestion) {
                        setTimeout(handleNext, 300);
                      }
                    }}
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full text-lg md:text-xl font-bold transition-all
                      ${answers[currentQuestion.id]?.scoreValue === score
                        ? 'bg-primary text-primary-foreground scale-110 shadow-lg'
                        : 'bg-muted text-muted-foreground hover-elevate'
                      }`}
                    data-testid={`button-score-${score}`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            )}

            {(currentQuestion?.type === 'text' || currentQuestion?.type === 'both') && (
              <div className="space-y-2">
                <Textarea
                  value={transcript}
                  onChange={(e) => {}}
                  placeholder={isRTL ? 'قل إجابتك أو اكتبها هنا...' : 'Speak your answer or type here...'}
                  className="min-h-32 md:min-h-40 text-base resize-none"
                  data-testid="textarea-answer"
                />
                {partialTranscript && (
                  <p className="text-sm text-muted-foreground italic px-2" data-testid="partial-transcript">
                    {isRTL ? 'يكتب: ' : 'Typing: '}
                    <span className="text-primary">{partialTranscript}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Audio Controls */}
          <div className="flex justify-center gap-2 mb-6">
            {survey.settings.allowReplay && currentQuestion?.voiceUrl && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => playTTS(currentQuestion.voiceUrl!)}
                data-testid="button-replay"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
            
            {survey.settings.voiceEnabled && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
                data-testid="button-mute-toggle"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="px-8 py-4 text-lg font-semibold"
              data-testid="button-previous"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              {isRTL ? 'السابق' : 'Previous'}
            </Button>

            {!isLastQuestion ? (
              <Button
                variant="default"
                onClick={handleNext}
                className="px-8 py-4 text-lg font-semibold"
                data-testid="button-next"
              >
                {isRTL ? 'التالي' : 'Next'}
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <Button
                variant="default"
                onClick={handleSubmit}
                disabled={submitResponseMutation.isPending}
                className="px-8 py-4 text-lg font-semibold"
                data-testid="button-submit"
              >
                {submitResponseMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
                    {isRTL ? 'جاري الإرسال...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    {isRTL ? 'إرسال' : 'Submit'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Live Transcript Display (for debugging) */}
        {transcript && (
          <div className="mt-4 text-xs text-muted-foreground text-center" data-testid="transcript-display">
            {isRTL ? 'تسجيل صوتي:' : 'Transcript:'} {transcript}
          </div>
        )}
      </div>
    </div>
  );
}
