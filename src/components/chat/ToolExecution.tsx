'use client';

import { Terminal, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolExecutionProps {
    toolName: string;
    args: any;
    status: 'pending' | 'success' | 'failure';
    result?: any;
}

export function ToolExecution({ toolName, args, status, result }: ToolExecutionProps) {
    return (
        <div className="my-4 rounded-lg border bg-slate-950/50 overflow-hidden text-[11px] font-mono">
            <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b">
                <div className="flex items-center gap-2 text-slate-300">
                    <Terminal className="h-3.5 w-3.5" />
                    <span className="uppercase tracking-widest font-bold">MCP TOOL: {toolName}</span>
                </div>
                <div>
                    {status === 'pending' && <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />}
                    {status === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                    {status === 'failure' && <XCircle className="h-3.5 w-3.5 text-red-500" />}
                </div>
            </div>

            <div className="p-3 space-y-2">
                <div className="space-y-1">
                    <div className="text-slate-500 uppercase text-[9px]">Input Arguments:</div>
                    <pre className="text-purple-300/90 whitespace-pre-wrap">
                        {JSON.stringify(args, null, 2)}
                    </pre>
                </div>

                {(status === 'success' || status === 'failure') && result && (
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                        <div className="text-slate-500 uppercase text-[9px]">Output Result:</div>
                        <pre className={cn(
                            "whitespace-pre-wrap",
                            status === 'success' ? "text-green-400/90" : "text-red-400/90"
                        )}>
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}
