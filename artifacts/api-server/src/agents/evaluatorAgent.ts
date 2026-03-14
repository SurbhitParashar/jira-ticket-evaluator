import { anthropic } from "@workspace/integrations-anthropic-ai";
import type { JiraTicket } from "./jiraAgent.js";
import type { PullRequestData } from "./githubAgent.js";

export interface RequirementEvaluation {
  requirement: string;
  verdict: "pass" | "partial" | "fail";
  reasoning: string;
  evidence: string[];
  confidenceScore: number;
}

export async function evaluateRequirement(
  requirement: string,
  ticket: JiraTicket,
  pr: PullRequestData,
  index: number
): Promise<RequirementEvaluation> {
  const prompt = `You are a senior engineer performing a code review. Your task is to evaluate whether a specific requirement from a Jira ticket is satisfied by a GitHub Pull Request.

JIRA TICKET: ${ticket.key}
Type: ${ticket.issueType}
Summary: ${ticket.summary}
Priority: ${ticket.priority}

REQUIREMENT TO EVALUATE (${index + 1}):
"${requirement}"

PULL REQUEST #${pr.number}: ${pr.title}
Branch: ${pr.headBranch} → ${pr.baseBranch}
PR Description: ${pr.body.slice(0, 500)}

FILES CHANGED (${pr.files.length} files):
${pr.files.map((f) => `- ${f.filename} (+${f.additions}/-${f.deletions}) [${f.status}]`).join("\n")}

CODE DIFF (truncated):
${pr.diff.slice(0, 6000)}

COMMIT MESSAGES:
${pr.commits.map((c) => `- ${c.sha}: ${c.message}`).join("\n")}

Evaluate whether this specific requirement is satisfied. Respond with a valid JSON object only, no markdown:
{
  "verdict": "pass" | "partial" | "fail",
  "reasoning": "2-3 sentences explaining your verdict with specific references to the code",
  "evidence": ["specific file path or code snippet 1", "specific file path or code snippet 2"],
  "confidenceScore": 0.0 to 1.0
}

Rules:
- "pass": Requirement is clearly and fully satisfied
- "partial": Requirement is partially addressed but not complete
- "fail": Requirement is not addressed or contradicted
- Evidence must reference specific file names, function names, or line content from the diff
- Be concise but precise`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  const text = block.type === "text" ? block.text : "{}";

  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      verdict: "pass" | "partial" | "fail";
      reasoning: string;
      evidence: string[];
      confidenceScore: number;
    };
    return {
      requirement,
      verdict: parsed.verdict || "fail",
      reasoning: parsed.reasoning || "Unable to evaluate",
      evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
      confidenceScore: typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 0.5,
    };
  } catch {
    return {
      requirement,
      verdict: "fail",
      reasoning: "Failed to parse evaluation response",
      evidence: [],
      confidenceScore: 0,
    };
  }
}

export function synthesizeVerdict(
  results: RequirementEvaluation[]
): "pass" | "partial" | "fail" {
  if (results.length === 0) return "fail";
  const passing = results.filter((r) => r.verdict === "pass").length;
  const failing = results.filter((r) => r.verdict === "fail").length;
  const total = results.length;

  if (passing === total) return "pass";
  if (failing === total) return "fail";
  return "partial";
}
