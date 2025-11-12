import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download } from 'lucide-react';
import type { SurveyWithQuestions, ResponseWithAnswers } from '@shared/schema';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

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
  const totalResponses = responses?.length || 0;

  const handleExportToExcel = () => {
    if (!survey || !responses || responses.length === 0) return;

    const headers = [
      isRTL ? 'رقم المشارك' : 'ID',
      ...survey.questions.map((_, index) => isRTL ? `س${index + 1}` : `Q${index + 1}`)
    ];

    const rows = responses.map((response, responseIndex) => {
      const answersMap = new Map(response.answers.map(a => [a.questionId, a]));
      
      const row = [
        responseIndex + 1,
        ...survey.questions.map((question) => {
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
          
          return displayValue;
        })
      ];
      
      return row;
    });

    const data = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, isRTL ? 'الردود' : 'Responses');

    const filename = `${survey.title}_${isRTL ? 'الردود' : 'responses'}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

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
          <Button variant="outline" onClick={handleExportToExcel} disabled={totalResponses === 0} data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            {isRTL ? 'تصدير' : 'Export'}
          </Button>
        </div>

        {/* Responses Table */}
          {totalResponses > 0 && (
            <Card data-testid="card-responses-table">
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
                          <TableHead
                            key={question.id}
                            className="min-w-[150px]"
                            data-testid={`table-header-q${index + 1}`}
                          >
                            {isRTL ? `س${index + 1}` : `Q${index + 1}`}
                          </TableHead>
                        ))}
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
                            {survey.questions.map((question, questionIndex) => {
                              const answer = answersMap.get(question.id);

                              let displayValue = '-';
                              if (question.type === 'both' && answer) {
                                const score = answer.scoreValue;
                                const text = answer.textValue || null;
                                if (score !== null && score !== undefined && text !== null) {
                                  displayValue = `${score} – ${text}`;
                                } else if (score !== null && score !== undefined) {
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
                                  data-testid={`table-cell-response-${responseIndex + 1}-q${questionIndex + 1}`}
                                  title={displayValue}
                                >
                                  {displayValue}
                                </TableCell>
                              );
                            })}
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
