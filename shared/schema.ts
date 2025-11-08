import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Surveys table
export const surveys = pgTable("surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  introText: text("intro_text"), // Introduction text shown before first question
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 7 }).default("#22C55E"),
  isActive: boolean("is_active").default(true).notNull(),
  language: varchar("language", { length: 5 }).default("ar").notNull(), // ar or en
  settings: jsonb("settings").$type<{
    voiceEnabled: boolean;
    autoAdvance: boolean;
    allowReplay: boolean;
    showProgressBar: boolean;
  }>().default({
    voiceEnabled: true,
    autoAdvance: true,
    allowReplay: true,
    showProgressBar: true,
  }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Questions table
export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
  order: integer("order").notNull(),
  text: text("text").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // score_5, score_10, text, both
  voiceUrl: text("voice_url"), // URL to TTS audio file
  required: boolean("required").default(true).notNull(),
});

// Responses table (one per survey completion)
export const responses = pgTable("responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  duration: integer("duration"), // in seconds
});

// Answers table (individual question answers)
export const answers = pgTable("answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  responseId: varchar("response_id").notNull().references(() => responses.id, { onDelete: "cascade" }),
  questionId: varchar("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  scoreValue: integer("score_value"), // 1-5 or 1-10
  textValue: text("text_value"),
});

// Relations
export const surveysRelations = relations(surveys, ({ many }) => ({
  questions: many(questions),
  responses: many(responses),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [questions.surveyId],
    references: [surveys.id],
  }),
  answers: many(answers),
}));

export const responsesRelations = relations(responses, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [responses.surveyId],
    references: [surveys.id],
  }),
  answers: many(answers),
}));

export const answersRelations = relations(answers, ({ one }) => ({
  response: one(responses, {
    fields: [answers.responseId],
    references: [responses.id],
  }),
  question: one(questions, {
    fields: [answers.questionId],
    references: [questions.id],
  }),
}));

// Insert schemas
export const insertSurveySchema = createInsertSchema(surveys).omit({
  id: true,
  createdAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
}).extend({
  type: z.enum(["score_5", "score_10", "text", "both"]),
});

export const insertResponseSchema = createInsertSchema(responses).omit({
  id: true,
  completedAt: true,
});

export const insertAnswerSchema = createInsertSchema(answers).omit({
  id: true,
});

// Select types
export type Survey = typeof surveys.$inferSelect;
export type InsertSurvey = z.infer<typeof insertSurveySchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type Response = typeof responses.$inferSelect;
export type InsertResponse = z.infer<typeof insertResponseSchema>;

export type Answer = typeof answers.$inferSelect;
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;

// Extended types for frontend
export type SurveyWithQuestions = Survey & {
  questions: Question[];
};

export type ResponseWithAnswers = Response & {
  answers: (Answer & { question: Question })[];
};
