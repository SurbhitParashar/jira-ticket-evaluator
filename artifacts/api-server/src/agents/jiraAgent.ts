import { DEMO_JIRA_URL, DEMO_TICKET } from "./demoData.js";

export interface JiraTicket {
  key: string;
  summary: string;
  description: string;
  acceptanceCriteria: string[];
  requirements: string[];
  issueType: string;
  priority: string;
  status: string;
}

function extractText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  if (n.type === "text") return (n.text as string) || "";
  if (Array.isArray(n.content)) {
    return (n.content as unknown[]).map(extractText).join(" ");
  }
  return "";
}

function parseDescriptionNode(node: unknown): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  return extractText(node);
}

function extractAcceptanceCriteria(descriptionAdf: unknown): string[] {
  const text = parseDescriptionNode(descriptionAdf);
  const lines = text.split(/\n|\r/).map((l: string) => l.trim()).filter(Boolean);
  const acKeywords = /accept|criteria|given|when|then|should|must|requirement/i;
  const criteria: string[] = [];
  let inAcSection = false;

  for (const line of lines) {
    if (acKeywords.test(line)) {
      inAcSection = true;
    }
    if (inAcSection && line.length > 10) {
      criteria.push(line);
    }
  }

  if (criteria.length === 0) {
    return lines.filter((l: string) => l.length > 15).slice(0, 10);
  }

  return criteria.slice(0, 15);
}

export async function fetchJiraTicket(
  jiraTicketUrl: string,
  email: string,
  apiToken: string
): Promise<JiraTicket> {
  if (jiraTicketUrl === DEMO_JIRA_URL || jiraTicketUrl.includes("demo.atlassian.net") || jiraTicketUrl.startsWith("demo://")) {
    return DEMO_TICKET;
  }

  const urlMatch = jiraTicketUrl.match(/https?:\/\/([^/]+)\/browse\/([A-Z][A-Z0-9]+-\d+)/);
  if (!urlMatch) {
    throw new Error(`Invalid Jira ticket URL: ${jiraTicketUrl}`);
  }

  const [, domain, ticketKey] = urlMatch;
  const apiUrl = `https://${domain}/rest/api/3/issue/${ticketKey}`;

  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");
  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Jira API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    key: string;
    fields: {
      summary: string;
      description: unknown;
      issuetype: { name: string };
      priority: { name: string };
      status: { name: string };
      customfield_10016?: unknown;
    };
  };

  const { fields } = data;
  const fullDescription = parseDescriptionNode(fields.description);
  const acceptanceCriteria = extractAcceptanceCriteria(fields.description);

  const requirements = acceptanceCriteria.length > 0
    ? acceptanceCriteria
    : fullDescription.split(/\n|\r/).map((l) => l.trim()).filter((l) => l.length > 15).slice(0, 8);

  return {
    key: data.key,
    summary: fields.summary,
    description: fullDescription.slice(0, 2000),
    acceptanceCriteria,
    requirements,
    issueType: fields.issuetype?.name || "Unknown",
    priority: fields.priority?.name || "Unknown",
    status: fields.status?.name || "Unknown",
  };
}
