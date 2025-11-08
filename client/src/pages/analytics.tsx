import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download, Users, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { SurveyWithQuestions, ResponseWithAnswers } from '@shared/schema';
import { format } from 'date-fns';

export default function AnalyticsPage() {
  const [, params] = useRoute('/survey/:id/analytics');
  const surveyId = params?.id;

  const { data: survey, isLoading: surveyLoading } = useQuery<SurveyWithQuestions>({
    queryKey: ['/api/surveys', surveyId],
    enabled: !!surveyId,
  });

  const { data: responses, isLoading: responsesLoading } = useQuery<ResponseWithAnswers[]>({
    queryKey: ['/api/surveys', surveyId, 'responses'],
    enabled: !!surveyId,
  });

  const isLoading = surveyLoading || responsesLoading;
  const isRTL = survey?.language === 'ar';

  // Calculate analytics
  const totalResponses = responses?.length || 0;
  const avgDuration = (responses?.reduce((sum, r) => sum + (r.duration || 0), 0) || 0) / Math.max(totalResponses, 1);

  // Question analytics
  const questionStats = survey?.questions.map(question => {
    const answers = responses?.flatMap(r => r.answers).filter(a => a.questionId === question.id) || [];
    const scoreAnswers = answers.filter(a => a.scoreValue !== null).map(a => a.scoreValue!);
    const textAnswers = answers.filter(a => a.textValue).map(a => a.textValue!);

    const avgScore = scoreAnswers.length > 0
      ? scoreAnswers.reduce((sum, score) => sum + score, 0) / scoreAnswers.length
      : 0;

    const scoreDistribution = Array.from({ length: question.type === 'score_10' ? 10 : 5 }, (_, i) => {
      const score = i + 1;
      return {
        score,
        count: scoreAnswers.filter(s => s === score).length,
      };
    });

    return {
      question,
      answersCount: answers.length,
      avgScore: avgScore.toFixed(1),
      scoreDistribution,
      textAnswers,
    };
  }) || [];

  const COLORS = ['#22C55E', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{isRTL ? 'الاستبيان غير موجود' : 'Survey Not Found'}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'} data-testid="page-analytics">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => window.history.back()} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isRTL ? 'رجوع' : 'Back'}
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{survey.title}</h1>
              <p className="text-sm text-muted-foreground">{isRTL ? 'التحليلات' : 'Analytics'}</p>
            </div>
          </div>
          <Button variant="outline" data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            {isRTL ? 'تصدير' : 'Export'}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="card-total-responses">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{isRTL ? 'إجمالي الردود' : 'Total Responses'}</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-responses">{totalResponses}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-avg-duration">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{isRTL ? 'متوسط الوقت' : 'Avg Duration'}</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-avg-duration">
                {Math.round(avgDuration / 60)} {isRTL ? 'دقيقة' : 'min'}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-completion-rate">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{isRTL ? 'معدل الإكمال' : 'Completion Rate'}</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-completion-rate">100%</div>
            </CardContent>
          </Card>

          <Card data-testid="card-questions">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{isRTL ? 'عدد الأسئلة' : 'Questions'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-questions-count">{survey.questions.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Question Analytics */}
        <div className="space-y-6">
          {questionStats.map((stat, index) => (
            <Card key={index} data-testid={`card-question-stats-${index}`}>
              <CardHeader>
                <CardTitle className="text-lg">{stat.question.text}</CardTitle>
                <CardDescription>
                  {isRTL ? `${stat.answersCount} إجابة` : `${stat.answersCount} responses`}
                  {stat.question.type !== 'text' && (
                    <Badge variant="secondary" className="ml-2">
                      {isRTL ? 'المتوسط:' : 'Avg:'} {stat.avgScore}
                    </Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(stat.question.type === 'score_5' || stat.question.type === 'score_10' || stat.question.type === 'both') && (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stat.scoreDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="score" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#22C55E" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {(stat.question.type === 'text' || stat.question.type === 'both') && stat.textAnswers.length > 0 && (
                  <div className="mt-4 space-y-2" data-testid={`text-answers-${index}`}>
                    <h4 className="font-medium text-sm">{isRTL ? 'الإجابات النصية:' : 'Text Responses:'}</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {stat.textAnswers.slice(0, 10).map((answer, i) => (
                        <div key={i} className="p-2 bg-muted rounded-lg text-sm" data-testid={`text-answer-${index}-${i}`}>
                          {answer}
                        </div>
                      ))}
                      {stat.textAnswers.length > 10 && (
                        <p className="text-xs text-muted-foreground">
                          {isRTL ? `و ${stat.textAnswers.length - 10} إجابة أخرى...` : `And ${stat.textAnswers.length - 10} more...`}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Responses Table */}
        {totalResponses > 0 && (
          <Card className="mt-8" data-testid="card-responses-table">
            <CardHeader>
              <CardTitle>{isRTL ? 'جدول الردود' : 'Responses Table'}</CardTitle>
              <CardDescription>
                {isRTL ? 'عرض تفصيلي لجميع الردود' : 'Detailed view of all responses'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table data-testid="table-responses">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold" data-testid="table-header-id">
                        {isRTL ? 'رقم المشارك' : 'ID'}
                      </TableHead>
                      {survey.questions.map((question, index) => (
                        <TableHead key={question.id} className="min-w-[150px]" data-testid={`table-header-q${index + 1}`}>
                          {isRTL ? `س${index + 1}` : `Q${index + 1}`}
                        </TableHead>
                      ))}
                      <TableHead className="min-w-[120px]" data-testid="table-header-date">
                        {isRTL ? 'التاريخ' : 'Date'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses?.map((response, responseIndex) => {
                      const answersMap = new Map(response.answers.map(a => [a.questionId, a]));
                      
                      return (
                        <TableRow key={response.id} data-testid={`table-row-${responseIndex + 1}`}>
                          <TableCell className="font-medium" data-testid={`table-cell-id-${responseIndex + 1}`}>
                            {responseIndex + 1}
                          </TableCell>
                          {survey.questions.map((question) => {
                            const answer = answersMap.get(question.id);
                            
                            let displayValue = '-';
                            if (question.type === 'both' && answer) {
                              const score = answer.scoreValue !== null && answer.scoreValue !== undefined ? answer.scoreValue : null;
                              const text = answer.textValue || null;
                              if (score !== null && text !== null) {
                                displayValue = `${score} – ${text}`;
                              } else if (score !== null) {
                                displayValue = String(score);
                              } else if (text !== null) {
                                displayValue = text;
                              }
                            } else if (answer?.scoreValue !== null && answer?.scoreValue !== undefined) {
                              displayValue = String(answer.scoreValue);
                            } else if (answer?.textValue) {
                              displayValue = answer.textValue;
                            }
                            
                            return (
                              <TableCell 
                                key={question.id} 
                                className="max-w-[200px] truncate"
                                data-testid={`table-cell-response-${responseIndex + 1}-q${survey.questions.indexOf(question) + 1}`}
                                title={displayValue}
                              >
                                {displayValue}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-sm text-muted-foreground" data-testid={`table-cell-date-${responseIndex + 1}`}>
                            {response.completedAt ? format(new Date(response.completedAt), 'yyyy-MM-dd HH:mm') : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {totalResponses === 0 && (
          <Card data-testid="empty-state-analytics">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{isRTL ? 'لا توجد ردود بعد' : 'No responses yet'}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
