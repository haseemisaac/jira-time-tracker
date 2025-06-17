import { NextRequest, NextResponse } from 'next/server';

interface JiraIssue {
  key: string;
  fields?: {
    summary?: string;
  };
}

interface JiraWorklog {
  author: {
    name: string;
  };
  started: string;
  timeSpentSeconds: number;
}

interface WorklogEntry {
  key: string;
  started: string;
  timeSpentSeconds: number;
  date: string;
}

interface TicketInfo {
  key: string;
  summary: string;
}

export async function POST(request: NextRequest) {
  const jiraUrl = process.env.JIRA_URL;
  const token = process.env.JIRA_TOKEN;

  if (!jiraUrl || !token) {
    return NextResponse.json({ error: 'Missing JIRA configuration' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { username, days = 30 } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Search for issues with worklogs in the specified period
    const searchResponse = await fetch(`${jiraUrl}/rest/api/2/search`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jql: `worklogAuthor = "${username}" AND worklogDate >= -${days}d`,
        fields: ['key', 'summary'], // Also fetch the summary field
        maxResults: 1000,
      }),
    });

    if (!searchResponse.ok) {
      throw new Error(`Search failed: ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    const issues: JiraIssue[] = searchData.issues || [];

    // Create a map of ticket info
    const ticketInfoMap: Record<string, TicketInfo> = {};
    issues.forEach(issue => {
      ticketInfoMap[issue.key] = {
        key: issue.key,
        summary: issue.fields?.summary || 'No title available'
      };
    });

    // Fetch worklogs for each issue
    const worklogs: WorklogEntry[] = [];

    for (const issue of issues) {
      const worklogResponse = await fetch(
        `${jiraUrl}/rest/api/2/issue/${issue.key}/worklog`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (worklogResponse.ok) {
        const worklogData = await worklogResponse.json();
        const userWorklogs = worklogData.worklogs.filter(
          (w: JiraWorklog) => w.author.name === username
        );

        userWorklogs.forEach((w: JiraWorklog) => {
          worklogs.push({
            key: issue.key,
            started: w.started,
            timeSpentSeconds: w.timeSpentSeconds,
            date: w.started.split('T')[0], // Extract date part
          });
        });
      }
    }

    return NextResponse.json({ 
      worklogs,
      ticketInfo: ticketInfoMap 
    });
  } catch (error) {
    console.error('Error fetching worklogs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worklogs' },
      { status: 500 }
    );
  }
}