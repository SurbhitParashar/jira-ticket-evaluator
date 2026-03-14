import { pgTable, text, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const evaluationsTable = pgTable("evaluations", {
  id: text("id").primaryKey(),
  jiraTicketUrl: text("jira_ticket_url").notNull(),
  githubPrUrl: text("github_pr_url").notNull(),
  jiraTicketKey: text("jira_ticket_key"),
  jiraTicketSummary: text("jira_ticket_summary"),
  prTitle: text("pr_title"),
  overallVerdict: text("overall_verdict").notNull().default("pending"),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const requirementResultsTable = pgTable("requirement_results", {
  id: text("id").primaryKey(),
  evaluationId: text("evaluation_id").notNull().references(() => evaluationsTable.id, { onDelete: "cascade" }),
  requirement: text("requirement").notNull(),
  verdict: text("verdict").notNull(),
  reasoning: text("reasoning").notNull(),
  evidence: text("evidence").array().notNull().default([]),
  confidenceScore: real("confidence_score").notNull().default(0),
});

export const insertEvaluationSchema = createInsertSchema(evaluationsTable).omit({ createdAt: true });
export const insertRequirementResultSchema = createInsertSchema(requirementResultsTable);

export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;
export type Evaluation = typeof evaluationsTable.$inferSelect;
export type InsertRequirementResult = z.infer<typeof insertRequirementResultSchema>;
export type RequirementResult = typeof requirementResultsTable.$inferSelect;
