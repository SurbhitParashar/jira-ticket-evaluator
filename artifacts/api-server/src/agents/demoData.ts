import type { JiraTicket } from "./jiraAgent.js";
import type { PullRequestData } from "./githubAgent.js";

export const DEMO_JIRA_URL = "https://demo.atlassian.net/browse/DEMO-123";
export const DEMO_GITHUB_PR_URL = "https://github.com/demo-org/rate-limit-demo/pull/42";

export const DEMO_PR: PullRequestData = {
  title: "feat: add express-rate-limit middleware to API routes",
  body: `## Summary
Adds rate limiting to all /api/* routes using express-rate-limit.

## Changes
- Installed express-rate-limit package
- Created reusable rate limiter factory with configurable windows and max requests
- Applied default limiter (100 req/15min) to all API routes
- Added custom limiter (10 req/min) for auth endpoints
- Added X-RateLimit-* headers to all responses
- Added 429 response handler with Retry-After header

## Testing
- Added unit tests for rate limiter middleware
- Added integration tests for 429 behavior
- All existing tests pass

Fixes DEMO-123`,
  state: "open",
  number: 42,
  author: "dev-contributor",
  baseBranch: "main",
  headBranch: "feat/rate-limiting",
  files: [
    { filename: "package.json", status: "modified", additions: 2, deletions: 0, patch: `+    "express-rate-limit": "^7.1.5",` },
    {
      filename: "src/middleware/rateLimiter.ts",
      status: "added",
      additions: 45,
      deletions: 0,
      patch: `+import rateLimit from 'express-rate-limit';
+
+export const defaultLimiter = rateLimit({
+  windowMs: 15 * 60 * 1000, // 15 minutes
+  max: 100,
+  standardHeaders: true, // Return X-RateLimit-* headers
+  legacyHeaders: false,
+  handler: (req, res) => {
+    res.status(429).json({
+      error: 'Too Many Requests',
+      message: 'Rate limit exceeded. Please try again later.',
+      retryAfter: res.getHeader('Retry-After'),
+    });
+  },
+});
+
+export const authLimiter = rateLimit({
+  windowMs: 60 * 1000, // 1 minute
+  max: 10,
+  standardHeaders: true,
+  legacyHeaders: false,
+});`,
    },
    {
      filename: "src/app.ts",
      status: "modified",
      additions: 4,
      deletions: 0,
      patch: `+import { defaultLimiter } from './middleware/rateLimiter';
+
 app.use(express.json());
+app.use('/api', defaultLimiter);
 app.use('/api', router);`,
    },
    {
      filename: "src/routes/auth.ts",
      status: "modified",
      additions: 3,
      deletions: 0,
      patch: `+import { authLimiter } from '../middleware/rateLimiter';
+
+router.post('/login', authLimiter, loginHandler);`,
    },
    {
      filename: "tests/rateLimiter.test.ts",
      status: "added",
      additions: 62,
      deletions: 0,
      patch: `+describe('Rate Limiter Middleware', () => {
+  it('should allow requests under the limit', async () => {
+    const res = await request(app).get('/api/health');
+    expect(res.status).toBe(200);
+    expect(res.headers['x-ratelimit-limit']).toBe('100');
+    expect(res.headers['x-ratelimit-remaining']).toBeDefined();
+  });
+
+  it('should return 429 when limit is exceeded', async () => {
+    // exhaust the limit
+    for (let i = 0; i < 101; i++) await request(app).get('/api/health');
+    const res = await request(app).get('/api/health');
+    expect(res.status).toBe(429);
+    expect(res.body.error).toBe('Too Many Requests');
+  });
+
+  it('should include Retry-After header on 429', async () => {
+    const res = await request(app).get('/api/health');
+    expect(res.headers['retry-after']).toBeDefined();
+  });
+});`,
    },
    {
      filename: "README.md",
      status: "modified",
      additions: 12,
      deletions: 0,
      patch: `+## Rate Limiting
+
+All API endpoints are rate-limited to **100 requests per 15 minutes** per IP.
+Auth endpoints have a stricter limit of **10 requests per minute**.
+
+### Response Headers
+| Header | Description |
+|--------|-------------|
+| X-RateLimit-Limit | Maximum requests allowed |
+| X-RateLimit-Remaining | Requests remaining |
+| X-RateLimit-Reset | Timestamp when window resets |`,
    },
  ],
  commits: [
    { sha: "a1b2c3d4", message: "feat: add express-rate-limit package", author: "dev-contributor" },
    { sha: "e5f6g7h8", message: "feat: create configurable rate limiter middleware", author: "dev-contributor" },
    { sha: "i9j0k1l2", message: "feat: apply rate limiting to all /api routes", author: "dev-contributor" },
    { sha: "m3n4o5p6", message: "test: add unit and integration tests for rate limiting", author: "dev-contributor" },
    { sha: "q7r8s9t0", message: "docs: update README with rate limit information", author: "dev-contributor" },
  ],
  diff: `--- src/middleware/rateLimiter.ts
+import rateLimit from 'express-rate-limit';
+export const defaultLimiter = rateLimit({ windowMs: 15*60*1000, max: 100, standardHeaders: true });
+export const authLimiter = rateLimit({ windowMs: 60*1000, max: 10, standardHeaders: true });

--- src/app.ts
+import { defaultLimiter } from './middleware/rateLimiter';
+app.use('/api', defaultLimiter);

--- tests/rateLimiter.test.ts
+it('returns 429 when limit exceeded', ...);
+it('includes X-RateLimit headers', ...);`,
  comments: [
    "LGTM! The rate headers are correctly implemented. The 429 handler returning Retry-After is a nice touch.",
    "Should we consider adding rate limiting per API key as well for authenticated routes?",
  ],
};

export const DEMO_TICKET: JiraTicket = {
  key: "DEMO-123",
  summary: "Add rate limiting middleware to API endpoints",
  description:
    "We need to add rate limiting to our public API endpoints to prevent abuse and ensure fair usage across all clients. " +
    "This should be configurable per-route and should return appropriate HTTP 429 responses when limits are exceeded.",
  acceptanceCriteria: [
    "Rate limiting middleware is implemented and applied to all /api routes",
    "Returns HTTP 429 Too Many Requests when limit is exceeded",
    "Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset) are included in all responses",
    "Configurable limits per route (default: 100 requests per 15 minutes)",
    "Unit tests cover rate limiting logic",
    "Documentation updated with rate limit information",
  ],
  requirements: [
    "Rate limiting middleware is implemented and applied to all /api routes",
    "Returns HTTP 429 Too Many Requests when limit is exceeded",
    "Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset) are included in all responses",
    "Configurable limits per route (default: 100 requests per 15 minutes)",
    "Unit tests cover rate limiting logic",
    "Documentation updated with rate limit information",
  ],
  issueType: "Feature Request",
  priority: "High",
  status: "In Review",
};
