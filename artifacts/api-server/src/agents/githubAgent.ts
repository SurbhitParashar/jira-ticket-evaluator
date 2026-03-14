export interface PullRequestData {
  title: string;
  body: string;
  state: string;
  number: number;
  author: string;
  baseBranch: string;
  headBranch: string;
  files: PullRequestFile[];
  commits: PullRequestCommit[];
  diff: string;
  comments: string[];
}

export interface PullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export interface PullRequestCommit {
  sha: string;
  message: string;
  author: string;
}

export async function fetchGithubPR(
  prUrl: string,
  githubToken: string
): Promise<PullRequestData> {
  const urlMatch = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!urlMatch) {
    throw new Error(`Invalid GitHub PR URL: ${prUrl}`);
  }

  const [, owner, repo, prNumber] = urlMatch;
  const apiBase = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
  const headers = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const [prRes, filesRes, commitsRes, commentsRes] = await Promise.all([
    fetch(apiBase, { headers }),
    fetch(`${apiBase}/files`, { headers }),
    fetch(`${apiBase}/commits`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`, { headers }),
  ]);

  if (!prRes.ok) {
    const text = await prRes.text();
    throw new Error(`GitHub PR API error ${prRes.status}: ${text}`);
  }

  const [pr, files, commits, comments] = await Promise.all([
    prRes.json() as Promise<{
      title: string;
      body: string;
      state: string;
      number: number;
      user: { login: string };
      base: { ref: string };
      head: { ref: string };
    }>,
    filesRes.json() as Promise<PullRequestFile[]>,
    commitsRes.json() as Promise<Array<{ sha: string; commit: { message: string; author: { name: string } } }>>,
    commentsRes.json() as Promise<Array<{ body: string }>>,
  ]);

  const fullDiff = (files as PullRequestFile[])
    .filter((f) => f.patch)
    .map((f) => `--- ${f.filename}\n${f.patch}`)
    .join("\n\n")
    .slice(0, 12000);

  return {
    title: pr.title,
    body: pr.body || "",
    state: pr.state,
    number: pr.number,
    author: pr.user?.login || "unknown",
    baseBranch: pr.base?.ref || "main",
    headBranch: pr.head?.ref || "unknown",
    files: (files as PullRequestFile[]).map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch?.slice(0, 1500),
    })),
    commits: (commits as Array<{ sha: string; commit: { message: string; author: { name: string } } }>).map((c) => ({
      sha: c.sha.slice(0, 8),
      message: c.commit.message,
      author: c.commit.author?.name || "unknown",
    })),
    diff: fullDiff,
    comments: (comments as Array<{ body: string }>).map((c) => c.body).slice(0, 5),
  };
}
