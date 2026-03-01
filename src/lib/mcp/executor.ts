import { createClient } from '@/lib/supabase/server';

export async function executeMCPTool(sessionId: string, toolName: string, args: any) {
    const supabase = await createClient();

    // 1. Log the tool call start
    const { data: log, error: logError } = await supabase
        .from('mcp_logs')
        .insert({
            session_id: sessionId,
            tool_name: toolName,
            input: args,
            status: 'pending'
        })
        .select()
        .single();

    if (logError) {
        console.error('Error logging MCP tool:', logError);
        return { error: "Failed to log tool execution" };
    }

    try {
        let result;

        // 2. Route to specific tool implementation
        switch (toolName) {
            case 'create_mission_task':
                // Mock implementation for Phase 5
                // In reality, this would call another table or service
                result = {
                    success: true,
                    taskId: Math.random().toString(36).substr(2, 9),
                    message: `Tarea "${args.title}" creada y asignada a ${args.agent_assigned || 'Mission Control'}`
                };
                break;

            case 'post_technical_update':
                result = {
                    success: true,
                    updateId: Date.now(),
                    message: `Actualización de tipo ${args.update_type} publicada en el feed.`
                };
                break;

            case 'github_read_file': {
                const { owner, repo, path } = args;
                const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                    headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }
                });
                const data = await response.json();
                result = { content: data.content ? Buffer.from(data.content, 'base64').toString() : data };
                break;
            }

            case 'github_list_files': {
                const { owner, repo, path } = args;
                const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                    headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }
                });
                result = await response.json();
                break;
            }

            case 'github_list_repos': {
                const { username } = args;
                const response = await fetch(
                    `https://api.github.com/users/${username}/repos?type=all&sort=updated&per_page=50`,
                    { headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` } }
                );
                const repos = await response.json() as Array<{ name: string; description: string; updated_at: string; private: boolean }>;
                result = repos.map(r => ({
                    name: r.name,
                    description: r.description,
                    updated_at: r.updated_at,
                    private: r.private,
                }));
                break;
            }

            case 'github_list_commits': {
                const { owner, repo, limit = 10 } = args;
                const response = await fetch(
                    `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${limit}`,
                    { headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` } }
                );
                const commits = await response.json() as Array<{ sha: string; commit: { message: string; author: { name: string; date: string } } }>;
                result = commits.map(c => ({
                    sha: c.sha.slice(0, 7),
                    message: c.commit.message.split('\n')[0],
                    author: c.commit.author.name,
                    date: c.commit.author.date,
                }));
                break;
            }

            case 'github_list_prs': {
                const { owner, repo, state = 'open' } = args;
                const response = await fetch(
                    `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&per_page=20`,
                    { headers: { Authorization: `token ${process.env.GITHUB_TOKEN}` } }
                );
                const prs = await response.json() as Array<{ number: number; title: string; state: string; user: { login: string }; created_at: string }>;
                result = prs.map(pr => ({
                    number: pr.number,
                    title: pr.title,
                    state: pr.state,
                    author: pr.user.login,
                    created_at: pr.created_at,
                }));
                break;
            }

            case 'vercel_deployment_status': {
                const { projectId } = args;
                const response = await fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1`, {
                    headers: { 'Authorization': `Bearer ${process.env.VERCEL_TOKEN}` }
                });
                const data = await response.json();
                result = data.deployments?.[0] || { error: 'No deployments found' };
                break;
            }

            default:
                throw new Error(`Tool ${toolName} not implemented`);
        }

        // 3. Update log with success
        await supabase
            .from('mcp_logs')
            .update({
                output: result,
                status: 'success'
            })
            .eq('id', log.id);

        return result;

    } catch (error: any) {
        // 4. Update log with failure
        await supabase
            .from('mcp_logs')
            .update({
                output: { error: error.message },
                status: 'failure'
            })
            .eq('id', log.id);

        return { error: error.message };
    }
}
