# SimplifAI — Jira Ticket Evaluator

> **SimplifAI Hackathon Project**  
> An AI-powered multi-agent system that evaluates whether a GitHub Pull Request actually satisfies the requirements in a Jira ticket — with per-requirement verdicts, code evidence, and confidence scores.

---

## What It Does

Paste a Jira ticket URL and a GitHub PR URL. SimplifAI's agent pipeline will:

1. **Fetch the Jira ticket** — extracts structured requirements from the description, acceptance criteria, and subtasks
2. **Fetch the GitHub PR** — pulls the diff, changed files, commit messages, and PR description
3. **Evaluate each requirement** — Claude Sonnet independently judges every requirement against the actual code changes
4. **Synthesize a verdict** — aggregates into an overall Pass / Partial / Fail with reasoning

Everything streams live to the UI so you can watch the agents work in real time.

---

## Demo

Click **"Try Demo"** on the home page — no credentials needed. It runs a pre-loaded mock Jira ticket and GitHub PR through the full AI pipeline instantly.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    React Frontend                    │
│  Form → SSE stream → Live terminal + result cards   │
└────────────────────────┬────────────────────────────┘
                         │ REST + SSE
┌────────────────────────▼────────────────────────────┐
│                   Express API Server                 │
│                                                      │
│  POST /evaluations      → create & trigger pipeline │
│  GET  /evaluations/:id  → fetch result              │
│  GET  /evaluations/:id/stream → live SSE events     │
└──────────────┬───────────────────────────────────────┘
               │
       ┌───────▼────────┐
       │   Orchestrator  │
       └───┬────┬────┬──┘
           │    │    │
    ┌──────▼─┐ ┌▼──────┐ ┌──────────────┐
    │  Jira  │ │GitHub │ │  Evaluator   │
    │ Agent  │ │ Agent │ │   Agent ×N   │
    └──────┬─┘ └▼──────┘ │ (Claude per  │
           │    │         │  requirement)│
           └────┤         └──────┬───────┘
                │                │
         ┌──────▼────────────────▼──────┐
         │         PostgreSQL DB         │
         │  evaluations + results tables │
         └──────────────────────────────┘
```

### Key Agents

| Agent | File | Role |
|---|---|---|
| **Orchestrator** | `agents/orchestrator.ts` | Sequences the pipeline, emits SSE events |
| **Jira Agent** | `agents/jiraAgent.ts` | Fetches ticket via Jira REST API, parses requirements |
| **GitHub Agent** | `agents/githubAgent.ts` | Fetches PR diff, files, commits via GitHub REST API |
| **Evaluator Agent** | `agents/evaluatorAgent.ts` | Claude Sonnet — one call per requirement, structured output |
| **Event Bus** | `agents/eventBus.ts` | In-memory SSE bridge with history replay |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Node.js, Express, TypeScript |
| AI | Anthropic Claude Sonnet (`claude-sonnet-4-6`) |
| Database | PostgreSQL + Drizzle ORM |
| API Contract | OpenAPI 3.0, Zod schemas, generated React Query hooks |
| Streaming | Server-Sent Events (SSE) |
| Monorepo | pnpm workspaces |

---

## Project Structure

```
/
├── artifacts/
│   ├── api-server/          # Express backend + AI agents
│   │   └── src/
│   │       ├── agents/      # jiraAgent, githubAgent, evaluatorAgent, orchestrator
│   │       └── routes/      # evaluations CRUD + SSE stream
│   └── simplifai-ui/        # React frontend
│       └── src/
│           ├── pages/       # Home (form) + EvaluationDetail (results)
│           ├── components/  # TerminalOutput, RequirementCard, etc.
│           └── hooks/       # use-sse, use-evaluations (React Query)
├── lib/
│   ├── db/                  # Drizzle schema + migrations
│   ├── api-spec/            # OpenAPI spec + codegen
│   ├── api-zod/             # Shared Zod validation schemas
│   └── api-client-react/    # Generated React Query hooks
└── .env.example
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- A PostgreSQL database
- A [Jira API token](https://id.atlassian.com/manage-profile/security/api-tokens)
- A [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` scope
- An Anthropic API key (or use [Replit AI Integrations](https://replit.com) — no key needed)

### Setup

```bash
# Install dependencies
pnpm install

# Copy env file and fill in values
cp .env.example .env

# Push database schema
pnpm --filter @workspace/db run push

# Start everything
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/simplifai-ui run dev
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Anthropic API base URL (auto-set on Replit) |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Anthropic API key (auto-set on Replit) |

User credentials (Jira email, Jira API token, GitHub token) are entered in the form and sent per-request — they are never stored server-side.

---

## How Evaluation Works

1. **Requirement extraction** — the Jira agent parses ticket description fields, acceptance criteria lists, and subtasks into discrete, evaluable requirement strings.

2. **PR context assembly** — the GitHub agent fetches the full unified diff, per-file change stats, commit messages, and PR body. The diff is truncated at 6 000 characters to stay within context limits.

3. **Per-requirement LLM call** — each requirement gets its own Claude Sonnet call with the full ticket context and PR diff. The prompt instructs the model to act as a senior engineer doing code review, and to return structured JSON with:
   - `verdict`: `pass` | `partial` | `fail`
   - `reasoning`: explanation of the decision
   - `evidence`: specific code snippets or file paths supporting the verdict
   - `confidenceScore`: 0–1 float

4. **Verdict synthesis** — a final Claude call aggregates the per-requirement results into an overall verdict and summary.

5. **Live streaming** — all steps emit SSE events to the frontend via an in-memory event bus, with history replay so late-connecting clients catch up.

---

## Demo Mode

Set the following URLs in the form (or click **Try Demo**) to run without any credentials:

- **Jira URL:** `https://demo.atlassian.net/browse/DEMO-123`
- **GitHub PR URL:** `https://github.com/demo-org/rate-limit-demo/pull/42`

The backend detects these URLs and returns pre-built mock data, then still runs the full AI evaluation pipeline against it.

---

## Built For

SimplifAI Hackathon — theme: *"AI agents that reduce engineering toil"*
