import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateQuestionAudio } from "./services/elevenlabs";
import { generateSpeechmaticsJWT } from "./services/speechmatics-jwt";
import { 
  insertSurveySchema, 
  insertQuestionSchema, 
  insertResponseSchema, 
  insertAnswerSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // ============================================
  // SPEECHMATICS JWT TOKEN
  // ============================================
  
  // Generate temporary JWT for browser-based STT
  app.post("/api/speechmatics/token", async (req: Request, res: Response) => {
    try {
      const token = generateSpeechmaticsJWT(60); // 60 minutes
      res.json({ token, expiresIn: 3600 });
    } catch (error: any) {
      console.error('Error generating Speechmatics token:', error);
      res.status(500).json({ error: error.message || 'Failed to generate token' });
    }
  });

  // ============================================
  // SURVEYS CRUD
  // ============================================

  // Get all surveys
  app.get("/api/surveys", async (req: Request, res: Response) => {
    try {
      const surveys = await storage.getAllSurveys();
      res.json(surveys);
    } catch (error) {
      console.error('Error getting surveys:', error);
      res.status(500).json({ error: 'Failed to get surveys' });
    }
  });

  // Get single survey with questions
  app.get("/api/surveys/:id", async (req: Request, res: Response) => {
    try {
      const survey = await storage.getSurveyWithQuestions(req.params.id);
      if (!survey) {
        return res.status(404).json({ error: 'Survey not found' });
      }
      res.json(survey);
    } catch (error) {
      console.error('Error getting survey:', error);
      res.status(500).json({ error: 'Failed to get survey' });
    }
  });

  // Create survey
  app.post("/api/surveys", async (req: Request, res: Response) => {
    try {
      const validatedData = insertSurveySchema.parse(req.body);
      const survey = await storage.createSurvey(validatedData);
      res.json(survey);
    } catch (error: any) {
      console.error('Error creating survey:', error);
      res.status(400).json({ error: error.message || 'Failed to create survey' });
    }
  });

  // Update survey (with questions batch update)
  app.patch("/api/surveys/:id", async (req: Request, res: Response) => {
    try {
      const { questions: questionUpdates, ...surveyData } = req.body;

      // Update survey basic data
      if (Object.keys(surveyData).length > 0) {
        await storage.updateSurvey(req.params.id, surveyData);
      }

      // Update questions if provided
      if (questionUpdates && Array.isArray(questionUpdates)) {
        // Get current survey to preserve language if not in update
        const currentSurvey = await storage.getSurvey(req.params.id);
        const surveyLanguage = (surveyData.language || currentSurvey?.language || 'ar') as 'ar' | 'en';
        
        // Delete questions not in the update list
        const existingQuestions = await storage.getQuestionsBySurvey(req.params.id);
        const updateIds = new Set(questionUpdates.filter(q => q.id).map(q => q.id));
        for (const existing of existingQuestions) {
          if (!updateIds.has(existing.id)) {
            await storage.deleteQuestion(existing.id);
          }
        }

        // Create or update questions
        for (const questionUpdate of questionUpdates) {
          if (questionUpdate.id) {
            // Update existing question
            const { id, ...data } = questionUpdate;
            await storage.updateQuestion(id, data);
          } else {
            // Create new question
            const validatedQuestion = insertQuestionSchema.parse({
              ...questionUpdate,
              surveyId: req.params.id,
            });
            
            const newQuestion = await storage.createQuestion(validatedQuestion);
            
            // Generate TTS audio for new question
            if (surveyData.settings?.voiceEnabled !== false) {
              try {
                const audioUrl = await generateQuestionAudio(validatedQuestion.text, surveyLanguage);
                if (audioUrl) {
                  await storage.updateQuestion(newQuestion.id, { voiceUrl: audioUrl });
                }
              } catch (error) {
                console.error('TTS generation failed for question:', error);
                // Continue even if TTS fails
              }
            }
          }
        }
      }

      const updatedSurvey = await storage.getSurveyWithQuestions(req.params.id);
      res.json(updatedSurvey);
    } catch (error: any) {
      console.error('Error updating survey:', error);
      res.status(400).json({ error: error.message || 'Failed to update survey' });
    }
  });

  // Delete survey
  app.delete("/api/surveys/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteSurvey(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting survey:', error);
      res.status(500).json({ error: 'Failed to delete survey' });
    }
  });

  // ============================================
  // RESPONSES & ANSWERS
  // ============================================

  // Get responses for a survey (for analytics)
  app.get("/api/surveys/:id/responses", async (req: Request, res: Response) => {
    try {
      const responses = await storage.getResponsesBySurvey(req.params.id);
      res.json(responses);
    } catch (error) {
      console.error('Error getting responses:', error);
      res.status(500).json({ error: 'Failed to get responses' });
    }
  });

  // Submit response with answers
  app.post("/api/responses", async (req: Request, res: Response) => {
    try {
      const { response: responseData, answers: answersData } = req.body;

      // Validate response
      const validatedResponse = insertResponseSchema.parse(responseData);

      // Create response
      const newResponse = await storage.createResponse(validatedResponse);

      // Create answers
      const answersWithResponseId = answersData.map((answer: any) => ({
        ...answer,
        responseId: newResponse.id,
      }));

      const validatedAnswers = answersWithResponseId.map((a: any) => 
        insertAnswerSchema.parse(a)
      );

      await storage.createAnswersBatch(validatedAnswers);

      res.json({ success: true, responseId: newResponse.id });
    } catch (error: any) {
      console.error('Error submitting response:', error);
      res.status(400).json({ error: error.message || 'Failed to submit response' });
    }
  });

  // Note: WebSocket support is available for future server-side STT
  // For MVP, we use browser's Web Speech API (Chrome, Safari, Edge)
  // which provides excellent Arabic & English STT without server costs

  return httpServer;
}
