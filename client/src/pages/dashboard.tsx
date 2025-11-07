import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useRoute } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, BarChart3, Settings, ExternalLink, QrCode } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Survey } from '@shared/schema';

export default function DashboardPage() {
  const { data: surveys, isLoading } = useQuery<Survey[]>({
    queryKey: ['/api/surveys'],
  });

  const createSurveyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/surveys', {
        title: 'استبيان جديد',
        language: 'ar',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/surveys'] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="page-dashboard">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">VocalSurvey</h1>
          <p className="text-muted-foreground">إدارة الاستبيانات الصوتية</p>
        </div>

        {/* Create Button */}
        <div className="mb-6">
          <Button
            onClick={() => createSurveyMutation.mutate()}
            disabled={createSurveyMutation.isPending}
            size="lg"
            data-testid="button-create-survey"
          >
            <Plus className="w-5 h-5 mr-2" />
            إنشاء استبيان جديد
          </Button>
        </div>

        {/* Surveys Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="surveys-grid">
          {surveys?.map(survey => (
            <Card key={survey.id} className="hover-elevate" data-testid={`card-survey-${survey.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-1">{survey.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {survey.description || 'لا يوجد وصف'}
                    </CardDescription>
                  </div>
                  <Badge variant={survey.isActive ? 'default' : 'secondary'} data-testid={`badge-status-${survey.id}`}>
                    {survey.isActive ? 'نشط' : 'غير نشط'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <Link href={`/survey/${survey.id}/edit`}>
                    <Button variant="outline" size="sm" data-testid={`button-edit-${survey.id}`}>
                      <Settings className="w-4 h-4 mr-1" />
                      تحرير
                    </Button>
                  </Link>
                  <Link href={`/survey/${survey.id}/analytics`}>
                    <Button variant="outline" size="sm" data-testid={`button-analytics-${survey.id}`}>
                      <BarChart3 className="w-4 h-4 mr-1" />
                      التحليلات
                    </Button>
                  </Link>
                  <Link href={`/survey/${survey.id}`} target="_blank">
                    <Button variant="ghost" size="sm" data-testid={`button-view-${survey.id}`}>
                      <ExternalLink className="w-4 h-4 mr-1" />
                      معاينة
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}

          {surveys?.length === 0 && (
            <div className="col-span-full text-center py-12" data-testid="empty-state">
              <p className="text-muted-foreground mb-4">لا توجد استبيانات بعد</p>
              <Button onClick={() => createSurveyMutation.mutate()}>
                <Plus className="w-5 h-5 mr-2" />
                إنشاء أول استبيان
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
