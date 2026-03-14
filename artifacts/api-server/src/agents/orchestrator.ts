import { db, evaluationsTable, requirementResultsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { fetchJiraTicket } from "./jiraAgent.js";
import { fetchGithubPR } from "./githubAgent.js";
import { evaluateRequirement, synthesizeVerdict } from "./evaluatorAgent.js";

export type EvaluationEvent =
  | { type: "step"; message: string }
  | { type: "error"; message: string }
  | { type: "done"; evaluationId: string };

export async function runEvaluation(
  evaluationId: string,
  jiraTicketUrl: string,
  githubPrUrl: string,
  jiraEmail: string,
  jiraApiToken: string,
  githubToken: string,
  onEvent: (event: EvaluationEvent) => void
): Promise<void> {
  try {
    await db.update(evaluationsTable)
      .set({ status: "running", overallVerdict: "running" })
      .where(eq(evaluationsTable.id, evaluationId));

    onEvent({ type: "step", message: "Fetching Jira ticket..." });
    const ticket = await fetchJiraTicket(jiraTicketUrl, jiraEmail, jiraApiToken);
    onEvent({ type: "step", message: `Jira ticket loaded: [${ticket.key}] ${ticket.summary}` });
    onEvent({ type: "step", message: `Issue type: ${ticket.issueType} | Priority: ${ticket.priority}` });
    onEvent({ type: "step", message: `Found ${ticket.requirements.length} requirements to evaluate` });

    await db.update(evaluationsTable)
      .set({
        jiraTicketKey: ticket.key,
        jiraTicketSummary: ticket.summary,
      })
      .where(eq(evaluationsTable.id, evaluationId));

    onEvent({ type: "step", message: "Fetching GitHub Pull Request..." });
    const pr = await fetchGithubPR(githubPrUrl, githubToken);
    onEvent({ type: "step", message: `PR loaded: #${pr.number} - ${pr.title}` });
    onEvent({ type: "step", message: `Changed files: ${pr.files.length} | Commits: ${pr.commits.length}` });

    await db.update(evaluationsTable)
      .set({ prTitle: pr.title })
      .where(eq(evaluationsTable.id, evaluationId));

    onEvent({ type: "step", message: "Starting AI evaluation of requirements..." });

    const requirementResults = [];
    for (let i = 0; i < ticket.requirements.length; i++) {
      const req = ticket.requirements[i];
      onEvent({ type: "step", message: `Evaluating requirement ${i + 1}/${ticket.requirements.length}: "${req.slice(0, 80)}..."` });

      const result = await evaluateRequirement(req, ticket, pr, i);
      requirementResults.push(result);

      const emoji = result.verdict === "pass" ? "✅" : result.verdict === "partial" ? "⚠️" : "❌";
      onEvent({ type: "step", message: `${emoji} Requirement ${i + 1}: ${result.verdict.toUpperCase()} (confidence: ${Math.round(result.confidenceScore * 100)}%)` });

      const reqId = `${evaluationId}-req-${i}`;
      await db.insert(requirementResultsTable).values({
        id: reqId,
        evaluationId,
        requirement: result.requirement,
        verdict: result.verdict,
        reasoning: result.reasoning,
        evidence: result.evidence,
        confidenceScore: result.confidenceScore,
      });
    }

    const overallVerdict = synthesizeVerdict(requirementResults);
    const passingCount = requirementResults.filter((r) => r.verdict === "pass").length;
    const partialCount = requirementResults.filter((r) => r.verdict === "partial").length;
    const failingCount = requirementResults.filter((r) => r.verdict === "fail").length;

    onEvent({ type: "step", message: `Evaluation complete! Pass: ${passingCount} | Partial: ${partialCount} | Fail: ${failingCount}` });
    onEvent({ type: "step", message: `Overall verdict: ${overallVerdict.toUpperCase()}` });

    await db.update(evaluationsTable)
      .set({
        overallVerdict,
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(evaluationsTable.id, evaluationId));

    onEvent({ type: "done", evaluationId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    onEvent({ type: "error", message: `Evaluation failed: ${message}` });

    await db.update(evaluationsTable)
      .set({
        status: "failed",
        overallVerdict: "fail",
        errorMessage: message,
      })
      .where(eq(evaluationsTable.id, evaluationId));

    throw err;
  }
}
