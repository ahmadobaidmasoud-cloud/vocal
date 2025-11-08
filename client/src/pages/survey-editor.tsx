import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, 
  Plus, 
  Trash2, 
  GripVertical, 
  ArrowLeft,
  QrCode,
  ExternalLink,
  Copy,
  Volume2
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { SurveyWithQuestions, InsertQuestion } from '@shared/schema';

export default function SurveyEditorPage() {
  const [, params] = useRoute('/survey/:id/edit');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const surveyId = params?.id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [introText, setIntroText] = useState('');
  const [introVoiceUrl, setIntroVoiceUrl] = useState('');
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const [primaryColor, setPrimaryColor] = useState('#22C55E');
  const [logoUrl, setLogoUrl] = useState('');
  const [settings, setSettings] = useState({
    voiceEnabled: true,
    autoAdvance: true,
    allowReplay: true,
    showProgressBar: true,
  });
  const [questions, setQuestions] = useState<(InsertQuestion & { id?: string; voiceUrl?: string })[]>([]);

  const { data: survey, isLoading } = useQuery<SurveyWithQuestions>({
    queryKey: ['/api/surveys', surveyId],
    enabled: !!surveyId,
  });

  useEffect(() => {
    if (survey) {
      setTitle(survey.title);
      setDescription(survey.description || '');
      setIntroText(survey.introText || '');
      setIntroVoiceUrl(survey.introVoiceUrl || '');
      setLanguage(survey.language as 'ar' | 'en');
      setPrimaryColor(survey.primaryColor || '#22C55E');
      setLogoUrl(survey.logoUrl || '');
      setSettings(survey.settings);
      setQuestions(survey.questions.map(q => ({
        ...q,
        surveyId: survey.id,
        voiceUrl: q.voiceUrl || undefined,
      })) as (InsertQuestion & { id?: string; voiceUrl?: string })[]);
    }
  }, [survey]);

  const updateSurveyMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('PATCH', `/api/surveys/${surveyId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/surveys', surveyId] });
      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Saved',
        description: language === 'ar' ? 'تم حفظ التغييرات بنجاح' : 'Changes saved successfully',
      });
    },
  });

  const handleSave = () => {
    updateSurveyMutation.mutate({
      title,
      description,
      introText,
      introVoiceUrl,
      language,
      primaryColor,
      logoUrl,
      settings,
      questions,
    });
  };

  // Generate TTS audio for intro or questions
  const generateQuestionAudio = async (text: string, lang: 'ar' | 'en'): Promise<string> => {
    const response = await fetch(`/api/surveys/${surveyId}/generate-intro-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language: lang }),
    });
    if (!response.ok) throw new Error('Failed to generate audio');
    const data = await response.json();
    return data.voiceUrl;
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        surveyId: surveyId!,
        order: questions.length,
        text: language === 'ar' ? 'سؤال جديد' : 'New Question',
        type: 'score_5',
        required: true,
        voiceUrl: undefined,
      },
    ]);
  };

  const updateQuestion = (index: number, updates: Partial<InsertQuestion>) => {
    const newQuestions = [...questions];
    const updated = { ...newQuestions[index], ...updates };
    // Clean null values to undefined for type safety
    if (updated.voiceUrl === null) updated.voiceUrl = undefined;
    newQuestions[index] = updated as (InsertQuestion & { id?: string; voiceUrl?: string });
    setQuestions(newQuestions);
  };

  const deleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, order: i })));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;

    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    newQuestions[index].order = index;
    newQuestions[newIndex].order = newIndex;
    setQuestions(newQuestions);
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/survey/${surveyId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: language === 'ar' ? 'تم النسخ' : 'Copied',
      description: language === 'ar' ? 'تم نسخ رابط المشاركة' : 'Share link copied to clipboard',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isRTL = language === 'ar';

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'} data-testid="page-survey-editor">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isRTL ? 'رجوع' : 'Back'}
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{isRTL ? 'تحرير الاستبيان' : 'Edit Survey'}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={copyShareLink} data-testid="button-copy-link">
              <Copy className="w-4 h-4 mr-2" />
              {isRTL ? 'نسخ الرابط' : 'Copy Link'}
            </Button>
            <Button onClick={handleSave} disabled={updateSurveyMutation.isPending} data-testid="button-save">
              <Save className="w-4 h-4 mr-2" />
              {updateSurveyMutation.isPending ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="questions" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="questions" data-testid="tab-questions">{isRTL ? 'الأسئلة' : 'Questions'}</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">{isRTL ? 'الإعدادات' : 'Settings'}</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-4">
            {/* Introduction Text Section */}
            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? 'نص المقدمة' : 'Introduction Text'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="introText">{isRTL ? 'نص ترحيبي يظهر قبل بداية الاستبيان' : 'Welcome text shown before survey starts'}</Label>
                  <Textarea
                    id="introText"
                    value={introText}
                    onChange={(e) => setIntroText(e.target.value)}
                    placeholder={isRTL ? 'أدخل نص ترحيبي...' : 'Enter welcome text...'}
                    className="mt-1"
                    rows={4}
                    data-testid="textarea-intro"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!introText.trim()) {
                      toast({
                        title: isRTL ? 'خطأ' : 'Error',
                        description: isRTL ? 'الرجاء إدخال نص المقدمة أولاً' : 'Please enter intro text first',
                        variant: 'destructive',
                      });
                      return;
                    }
                    try {
                      const audioUrl = await generateQuestionAudio(introText, language);
                      if (audioUrl) {
                        setIntroVoiceUrl(audioUrl);
                        toast({
                          title: isRTL ? 'تم' : 'Success',
                          description: isRTL ? 'تم توليد الصوت للمقدمة' : 'Intro voice generated',
                        });
                      }
                    } catch (error) {
                      toast({
                        title: isRTL ? 'خطأ' : 'Error',
                        description: isRTL ? 'فشل توليد الصوت' : 'Failed to generate voice',
                        variant: 'destructive',
                      });
                    }
                  }}
                  data-testid="button-generate-intro-voice"
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  {isRTL ? 'توليد صوت المقدمة' : 'Generate Intro Voice'}
                </Button>
              </CardContent>
            </Card>

            {/* Questions List */}
            <div className="space-y-4" data-testid="questions-list">
              {questions.map((question, index) => (
                <Card key={index} data-testid={`question-card-${index}`}>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col gap-1 mt-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveQuestion(index, 'up')}
                          disabled={index === 0}
                          data-testid={`button-move-up-${index}`}
                        >
                          <GripVertical className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveQuestion(index, 'down')}
                          disabled={index === questions.length - 1}
                          data-testid={`button-move-down-${index}`}
                        >
                          <GripVertical className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <Label>{isRTL ? 'نص السؤال' : 'Question Text'}</Label>
                          <Textarea
                            value={question.text}
                            onChange={(e) => updateQuestion(index, { text: e.target.value })}
                            className="mt-1"
                            data-testid={`input-question-text-${index}`}
                          />
                        </div>
                        <div>
                          <Label>{isRTL ? 'نوع السؤال' : 'Question Type'}</Label>
                          <Select
                            value={question.type}
                            onValueChange={(value: any) => updateQuestion(index, { type: value })}
                          >
                            <SelectTrigger className="mt-1" data-testid={`select-question-type-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="score_5">{isRTL ? 'تقييم 1-5' : 'Score 1-5'}</SelectItem>
                              <SelectItem value="score_10">{isRTL ? 'تقييم 1-10' : 'Score 1-10'}</SelectItem>
                              <SelectItem value="text">{isRTL ? 'نص' : 'Text'}</SelectItem>
                              <SelectItem value="both">{isRTL ? 'نص + تقييم' : 'Text + Score'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteQuestion(index)}
                        data-testid={`button-delete-${index}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>

            {/* Add Question Button */}
            <Button
              variant="outline"
              onClick={addQuestion}
              className="w-full border-dashed"
              data-testid="button-add-question"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isRTL ? 'إضافة سؤال' : 'Add Question'}
            </Button>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? 'معلومات أساسية' : 'Basic Information'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">{isRTL ? 'عنوان الاستبيان' : 'Survey Title'}</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1"
                    data-testid="input-title"
                  />
                </div>
                <div>
                  <Label htmlFor="description">{isRTL ? 'الوصف' : 'Description'}</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1"
                    data-testid="textarea-description"
                  />
                </div>
                <div>
                  <Label htmlFor="language">{isRTL ? 'اللغة' : 'Language'}</Label>
                  <Select value={language} onValueChange={(value: any) => setLanguage(value)}>
                    <SelectTrigger className="mt-1" data-testid="select-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="color">{isRTL ? 'اللون الرئيسي' : 'Primary Color'}</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="color"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-20 h-10"
                      data-testid="input-color"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="logo">{isRTL ? 'رابط الشعار' : 'Logo URL'}</Label>
                  <Input
                    id="logo"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1"
                    data-testid="input-logo"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? 'إعدادات متقدمة' : 'Advanced Settings'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="voice">{isRTL ? 'تفعيل التسجيل الصوتي' : 'Enable Voice Recording'}</Label>
                  <Switch
                    id="voice"
                    checked={settings.voiceEnabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, voiceEnabled: checked })}
                    data-testid="switch-voice"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto">{isRTL ? 'الانتقال التلقائي' : 'Auto Advance'}</Label>
                  <Switch
                    id="auto"
                    checked={settings.autoAdvance}
                    onCheckedChange={(checked) => setSettings({ ...settings, autoAdvance: checked })}
                    data-testid="switch-auto-advance"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="replay">{isRTL ? 'السماح بإعادة السؤال' : 'Allow Replay'}</Label>
                  <Switch
                    id="replay"
                    checked={settings.allowReplay}
                    onCheckedChange={(checked) => setSettings({ ...settings, allowReplay: checked })}
                    data-testid="switch-replay"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="progress">{isRTL ? 'إظهار شريط التقدم' : 'Show Progress Bar'}</Label>
                  <Switch
                    id="progress"
                    checked={settings.showProgressBar}
                    onCheckedChange={(checked) => setSettings({ ...settings, showProgressBar: checked })}
                    data-testid="switch-progress"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
