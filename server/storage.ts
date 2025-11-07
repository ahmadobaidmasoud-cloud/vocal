// Reference: javascript_database integration blueprint
import {
  surveys,
  questions,
  responses,
  answers,
  type Survey,
  type InsertSurvey,
  type Question,
  type InsertQuestion,
  type Response,
  type InsertResponse,
  type Answer,
  type InsertAnswer,
  type SurveyWithQuestions,
  type ResponseWithAnswers,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Surveys
  getAllSurveys(): Promise<Survey[]>;
  getSurvey(id: string): Promise<Survey | undefined>;
  getSurveyWithQuestions(id: string): Promise<SurveyWithQuestions | undefined>;
  createSurvey(survey: InsertSurvey): Promise<Survey>;
  updateSurvey(id: string, survey: Partial<InsertSurvey>): Promise<Survey>;
  deleteSurvey(id: string): Promise<void>;

  // Questions
  getQuestionsBySurvey(surveyId: string): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestion(id: string, question: Partial<InsertQuestion>): Promise<Question>;
  deleteQuestion(id: string): Promise<void>;
  updateQuestionsBatch(questions: (Partial<Question> & { id: string })[]): Promise<void>;

  // Responses
  getResponsesBySurvey(surveyId: string): Promise<ResponseWithAnswers[]>;
  createResponse(response: InsertResponse): Promise<Response>;

  // Answers
  createAnswer(answer: InsertAnswer): Promise<Answer>;
  createAnswersBatch(answers: InsertAnswer[]): Promise<Answer[]>;
}

export class DatabaseStorage implements IStorage {
  // Surveys
  async getAllSurveys(): Promise<Survey[]> {
    return await db.select().from(surveys).orderBy(desc(surveys.createdAt));
  }

  async getSurvey(id: string): Promise<Survey | undefined> {
    const [survey] = await db.select().from(surveys).where(eq(surveys.id, id));
    return survey || undefined;
  }

  async getSurveyWithQuestions(id: string): Promise<SurveyWithQuestions | undefined> {
    const [survey] = await db.select().from(surveys).where(eq(surveys.id, id));
    if (!survey) return undefined;

    const surveyQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.surveyId, id))
      .orderBy(questions.order);

    return {
      ...survey,
      questions: surveyQuestions,
    };
  }

  async createSurvey(insertSurvey: InsertSurvey): Promise<Survey> {
    const [survey] = await db
      .insert(surveys)
      .values(insertSurvey)
      .returning();
    return survey;
  }

  async updateSurvey(id: string, updateData: Partial<InsertSurvey>): Promise<Survey> {
    const [survey] = await db
      .update(surveys)
      .set(updateData)
      .where(eq(surveys.id, id))
      .returning();
    return survey;
  }

  async deleteSurvey(id: string): Promise<void> {
    await db.delete(surveys).where(eq(surveys.id, id));
  }

  // Questions
  async getQuestionsBySurvey(surveyId: string): Promise<Question[]> {
    return await db
      .select()
      .from(questions)
      .where(eq(questions.surveyId, surveyId))
      .orderBy(questions.order);
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const [newQuestion] = await db
      .insert(questions)
      .values(question)
      .returning();
    return newQuestion;
  }

  async updateQuestion(id: string, updateData: Partial<InsertQuestion>): Promise<Question> {
    const [question] = await db
      .update(questions)
      .set(updateData)
      .where(eq(questions.id, id))
      .returning();
    return question;
  }

  async deleteQuestion(id: string): Promise<void> {
    await db.delete(questions).where(eq(questions.id, id));
  }

  async updateQuestionsBatch(questionUpdates: (Partial<Question> & { id: string })[]): Promise<void> {
    for (const questionUpdate of questionUpdates) {
      const { id, ...data } = questionUpdate;
      await db
        .update(questions)
        .set(data)
        .where(eq(questions.id, id));
    }
  }

  // Responses
  async getResponsesBySurvey(surveyId: string): Promise<ResponseWithAnswers[]> {
    const surveyResponses = await db
      .select()
      .from(responses)
      .where(eq(responses.surveyId, surveyId))
      .orderBy(desc(responses.completedAt));

    const responsesWithAnswers: ResponseWithAnswers[] = [];

    for (const response of surveyResponses) {
      const responseAnswers = await db
        .select({
          id: answers.id,
          responseId: answers.responseId,
          questionId: answers.questionId,
          scoreValue: answers.scoreValue,
          textValue: answers.textValue,
          question: questions,
        })
        .from(answers)
        .leftJoin(questions, eq(answers.questionId, questions.id))
        .where(eq(answers.responseId, response.id));

      responsesWithAnswers.push({
        ...response,
        answers: responseAnswers.map(a => ({
          id: a.id,
          responseId: a.responseId,
          questionId: a.questionId,
          scoreValue: a.scoreValue,
          textValue: a.textValue,
          question: a.question!,
        })),
      });
    }

    return responsesWithAnswers;
  }

  async createResponse(response: InsertResponse): Promise<Response> {
    const [newResponse] = await db
      .insert(responses)
      .values(response)
      .returning();
    return newResponse;
  }

  // Answers
  async createAnswer(answer: InsertAnswer): Promise<Answer> {
    const [newAnswer] = await db
      .insert(answers)
      .values(answer)
      .returning();
    return newAnswer;
  }

  async createAnswersBatch(answersList: InsertAnswer[]): Promise<Answer[]> {
    if (answersList.length === 0) return [];
    
    const newAnswers = await db
      .insert(answers)
      .values(answersList)
      .returning();
    return newAnswers;
  }
}

export const storage = new DatabaseStorage();
