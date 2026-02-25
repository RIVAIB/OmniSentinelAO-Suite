import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@/lib/types/messages';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { User, Shield, Target } from 'lucide-react';
import { CrossCheckBadge } from './CrossCheckBadge';

interface MessageBubbleProps {
    message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const isRichard = message.role === 'richard';
    const isClaude = message.role === 'claude';
    const isGemini = message.role === 'gemini';

    const getRoleIcon = () => {
        if (isRichard) return <User className="h-4 w-4" />;
        if (isClaude) return <Shield className="h-4 w-4 text-purple-400" />;
        if (isGemini) return <Target className="h-4 w-4 text-blue-400" />;
        return null;
    };

    const getRoleLabel = () => {
        if (isRichard) return 'Richard';
        if (isClaude) return 'Claude ⚡ Engineer';
        if (isGemini) return 'Gemini 🎯 Strategist';
        return 'System';
    };

    return (
        <div className={cn(
            "flex flex-col gap-2 mb-6",
            isRichard ? "items-start" : "items-end"
        )}>
            <div className="flex items-center gap-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {isRichard ? (
                    <>{getRoleIcon()} {getRoleLabel()}</>
                ) : (
                    <>{getRoleLabel()} {getRoleIcon()}</>
                )}
            </div>

            <div className={cn(
                "relative max-w-[85%] rounded-2xl p-4 shadow-sm transition-all",
                isRichard && "bg-secondary text-secondary-foreground rounded-tl-none border border-border/50",
                isClaude && "bg-purple-900/15 text-foreground border border-purple-500/30 rounded-tr-none",
                isGemini && "bg-blue-900/15 text-foreground border border-blue-500/30 rounded-tr-none"
            )}>
                {message.cross_check_status && (
                    <div className="mb-3">
                        <CrossCheckBadge
                            status={message.cross_check_status}
                            detail={message.cross_check_detail}
                        />
                    </div>
                )}

                <div className="prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                    </ReactMarkdown>
                </div>

                <div className="mt-3 text-[10px] text-muted-foreground/60 flex items-center gap-2">
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    );
}
