import { createClient } from '@/lib/supabase/server';
import {
    githubListRepos,
    githubReadFile,
    githubListFiles,
    githubListCommits,
    githubListPRs,
} from '@/lib/github/client';

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

            case 'github_read_file':
                result = await githubReadFile(args.owner, args.repo, args.path);
                break;

            case 'github_list_files':
                result = await githubListFiles(args.owner, args.repo, args.path);
                break;

            case 'github_list_repos':
                result = await githubListRepos(args.username);
                break;

            case 'github_list_commits':
                result = await githubListCommits(args.owner, args.repo, args.limit);
                break;

            case 'github_list_prs':
                result = await githubListPRs(args.owner, args.repo, args.state);
                break;

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
