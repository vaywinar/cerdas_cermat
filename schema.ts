import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for players and admin
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  isAdmin: true,
});

// Players schema
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sessionId: text("session_id").notNull().unique(),
  score: integer("score").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPlayerSchema = createInsertSchema(players).pick({
  name: true,
  sessionId: true,
});

// Questions schema
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  type: text("type").notNull(), // 'multiple_choice' or 'short_answer'
  category: text("category").notNull(),
  options: jsonb("options"), // For multiple choice questions
  correctAnswer: text("correct_answer").notNull(),
  points: integer("points").notNull(),
  wrongAnswerPenalty: integer("wrong_answer_penalty").notNull(),
});

export const insertQuestionSchema = createInsertSchema(questions).pick({
  text: true,
  type: true,
  category: true,
  options: true,
  correctAnswer: true,
  points: true,
  wrongAnswerPenalty: true,
});

// Game sessions schema
export const gameSessions = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  round: integer("round").notNull(), // 1 or 2
  mode: text("mode").notNull(), // 'auto' or 'manual'
  status: text("status").notNull(), // 'waiting', 'active', 'completed'
  currentQuestionId: integer("current_question_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGameSessionSchema = createInsertSchema(gameSessions).pick({
  round: true,
  mode: true,
  status: true,
  currentQuestionId: true,
});

// Player answers schema
export const playerAnswers = pgTable("player_answers", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  questionId: integer("question_id").notNull(),
  answer: text("answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  pointsAwarded: integer("points_awarded").notNull(),
  timeToAnswer: integer("time_to_answer"), // In milliseconds
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPlayerAnswerSchema = createInsertSchema(playerAnswers).pick({
  playerId: true,
  questionId: true,
  answer: true,
  isCorrect: true,
  pointsAwarded: true,
  timeToAnswer: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Player = typeof players.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

export type GameSession = typeof gameSessions.$inferSelect;
export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;

export type PlayerAnswer = typeof playerAnswers.$inferSelect;
export type InsertPlayerAnswer = z.infer<typeof insertPlayerAnswerSchema>;
