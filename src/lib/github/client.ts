// src/lib/github/client.ts
// Shared GitHub REST API client — single source of truth for all GitHub tool calls.
// Used by both the MCP executor (War Room) and the CLAUD Telegram handler.

const GITHUB_API = 'https://api.github.com';

function githubHeaders(): HeadersInit {
    return { Authorization: `token ${process.env.GITHUB_TOKEN}` };
}

/**
 * Base fetch wrapper — checks response.ok and throws with status context.
 * All GitHub functions go through this; callers never touch raw fetch.
 */
async function ghFetch<T>(url: string): Promise<T> {
    const res = await fetch(url, { headers: githubHeaders() });
    if (!res.ok) {
        const body = await res.text().catch(() => res.statusText);
        throw new Error(`GitHub API ${res.status} — ${url}: ${body}`);
    }
    return res.json() as Promise<T>;
}

// ─── Typed response shapes ─────────────────────────────────────────────────

interface GHRepo {
    name: string;
    description: string | null;
    updated_at: string;
    private: boolean;
}

interface GHContent {
    content?: string;
    message?: string;
}

interface GHCommit {
    sha: string;
    commit: { message: string; author: { name: string; date: string } };
}

interface GHPR {
    number: number;
    title: string;
    state: string;
    user: { login: string };
    created_at: string;
}

// ─── Public functions ──────────────────────────────────────────────────────

export async function githubListRepos(username: string) {
    const repos = await ghFetch<GHRepo[]>(
        `${GITHUB_API}/users/${username}/repos?type=all&sort=updated&per_page=50`
    );
    return repos.map(r => ({
        name: r.name,
        description: r.description,
        updated_at: r.updated_at,
        private: r.private,
    }));
}

export async function githubReadFile(owner: string, repo: string, path: string) {
    const data = await ghFetch<GHContent>(
        `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`
    );
    if (data.message) throw new Error(`GitHub: ${data.message}`);
    return { content: data.content ? Buffer.from(data.content, 'base64').toString() : '' };
}

export async function githubListFiles(owner: string, repo: string, path: string) {
    return ghFetch<unknown>(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`);
}

export async function githubListCommits(owner: string, repo: string, limit = 10) {
    const commits = await ghFetch<GHCommit[]>(
        `${GITHUB_API}/repos/${owner}/${repo}/commits?per_page=${limit}`
    );
    return commits.map(c => ({
        sha: c.sha.slice(0, 7),
        message: c.commit.message.split('\n')[0],
        author: c.commit.author.name,
        date: c.commit.author.date,
    }));
}

export async function githubListPRs(
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open'
) {
    const prs = await ghFetch<GHPR[]>(
        `${GITHUB_API}/repos/${owner}/${repo}/pulls?state=${state}&per_page=20`
    );
    return prs.map(pr => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: pr.user.login,
        created_at: pr.created_at,
    }));
}
