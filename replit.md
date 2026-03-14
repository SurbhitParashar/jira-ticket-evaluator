# Jira Ticket Evaluator

## Overview

An AI-powered developer tool that evaluates whether a GitHub Pull Request satisfies the requirements of a linked Jira ticket. Built for the SimplifAI Hackathon.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (Wouter routing, React Query, react-hook-form, framer-motion)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **AI**: Anthropic Claude Sonnet (via Replit AI Integrations — no API key required)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Architecture

```
artifacts/
  simplifai-ui/         # React + Vite frontend (served at /)
  api-server/           # Express API server (served at /api)
    src/
      agents/
        jiraAgent.ts       # Fetches Jira tickets via REST API
        githubAgent.ts     # Fetches GitHub PRs via REST API
        evaluatorAgent.ts  # AI-powered per-requirement evaluation
        orchestrator.ts    # Multi-agent evaluation flow with SSE streaming
      routes/
        evaluations.ts     # CRUD + SSE stream endpoints
lib/
  api-spec/openapi.yaml # API contract (source of truth)
  api-client-react/     # Generated React Query hooks
  api-zod/              # Generated Zod schemas
  db/
    src/schema/
      evaluations.ts    # evaluations + requirement_results tables
  integrations-anthropic-ai/ # Anthropic client + batch utilities
```

## Key Features

- **Multi-agent AI evaluation**: Separate agents for Jira parsing, GitHub PR fetching, per-requirement evaluation, and verdict synthesis
- **Live SSE streaming**: Real-time evaluation progress shown in a terminal-style output
- **Structured verdicts**: Pass / Partial / Fail per requirement with evidence and confidence scores
- **Evaluation history**: Past evaluations stored in PostgreSQL

## Environment Variables

These are provided automatically by Replit:
- `DATABASE_URL` — PostgreSQL connection string
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` — Anthropic proxy URL
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — Anthropic proxy key

These must be provided by the user at evaluation time (via the form):
- Jira email, Jira API token
- GitHub personal access token

## API Endpoints

- `GET  /api/healthz` — health check
- `GET  /api/evaluations` — list evaluations
- `POST /api/evaluations` — create evaluation
- `GET  /api/evaluations/:id` — get evaluation detail
- `GET  /api/evaluations/:id/stream` — SSE stream for live progress

## Development

- `pnpm --filter @workspace/api-server run dev` — start API server
- `pnpm --filter @workspace/simplifai-ui run dev` — start frontend
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes
