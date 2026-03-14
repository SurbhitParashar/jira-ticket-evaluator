import { Router, type IRouter } from "express";
import { db, evaluationsTable, requirementResultsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateEvaluationBody, GetEvaluationParams, StreamEvaluationParams } from "@workspace/api-zod";
import { runEvaluation } from "../agents/orchestrator.js";
import { emitEvent, subscribeToEvaluation } from "../agents/eventBus.js";
import { randomUUID } from "crypto";

const router: IRouter = Router();

router.get("/evaluations", async (_req, res) => {
  try {
    const evaluations = await db
      .select()
      .from(evaluationsTable)
      .orderBy(desc(evaluationsTable.createdAt))
      .limit(50);
    res.json(evaluations);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: "internal_error", message });
  }
});

router.post("/evaluations", async (req, res) => {
  try {
    const body = CreateEvaluationBody.parse(req.body);
    const id = randomUUID();

    await db.insert(evaluationsTable).values({
      id,
      jiraTicketUrl: body.jiraTicketUrl,
      githubPrUrl: body.githubPrUrl,
      overallVerdict: "pending",
      status: "pending",
    });

    const evaluation = await db
      .select()
      .from(evaluationsTable)
      .where(eq(evaluationsTable.id, id))
      .then((rows) => rows[0]);

    runEvaluation(
      id,
      body.jiraTicketUrl,
      body.githubPrUrl,
      body.jiraEmail,
      body.jiraApiToken,
      body.githubToken,
      (event) => emitEvent(id, event)
    ).catch((err) => {
      emitEvent(id, { type: "error", message: err instanceof Error ? err.message : "Unknown error" });
    });

    res.status(201).json(evaluation);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("parse") || message.includes("validation")) {
      res.status(400).json({ error: "validation_error", message });
    } else {
      res.status(500).json({ error: "internal_error", message });
    }
  }
});

router.get("/evaluations/:id", async (req, res) => {
  try {
    const { id } = GetEvaluationParams.parse(req.params);
    const [evaluation, results] = await Promise.all([
      db.select().from(evaluationsTable).where(eq(evaluationsTable.id, id)).then((r) => r[0]),
      db.select().from(requirementResultsTable).where(eq(requirementResultsTable.evaluationId, id)),
    ]);

    if (!evaluation) {
      res.status(404).json({ error: "not_found", message: "Evaluation not found" });
      return;
    }

    res.json({
      ...evaluation,
      requirementResults: results.map((r) => ({
        id: r.id,
        requirement: r.requirement,
        verdict: r.verdict,
        reasoning: r.reasoning,
        evidence: r.evidence,
        confidenceScore: r.confidenceScore,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: "internal_error", message });
  }
});

router.get("/evaluations/:id/stream", async (req, res) => {
  try {
    const { id } = StreamEvaluationParams.parse(req.params);

    const existing = await db
      .select()
      .from(evaluationsTable)
      .where(eq(evaluationsTable.id, id))
      .then((r) => r[0]);

    if (!existing) {
      res.status(404).json({ error: "not_found", message: "Evaluation not found" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    if (existing.status === "completed" || existing.status === "failed") {
      res.write(`data: ${JSON.stringify({ type: "done", evaluationId: id })}\n\n`);
      res.end();
      return;
    }

    const unsubscribe = subscribeToEvaluation(id, (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      if (event.type === "done" || event.type === "error") {
        unsubscribe();
        res.end();
      }
    });

    req.on("close", () => {
      unsubscribe();
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
    res.end();
  }
});

export default router;
