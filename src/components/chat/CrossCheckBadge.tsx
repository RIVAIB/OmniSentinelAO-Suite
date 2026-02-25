'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { CrossCheckStatus } from '@/lib/types/messages';
import { cn } from '@/lib/utils';

interface CrossCheckBadgeProps {
    status: CrossCheckStatus;
    detail?: string;
    className?: string;
}

export function CrossCheckBadge({ status, detail, className }: CrossCheckBadgeProps) {
    if (status === 'validated') {
        return (
            <Badge
                variant="outline"
                className={cn(
                    "text-green-400 border-green-500/30 bg-green-500/10 flex items-center gap-1.5 py-1 transition-all animate-in fade-in slide-in-from-top-1",
                    className
                )}
            >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="font-bold tracking-tight">✅ VALIDATED</span>
                {detail && <span className="text-muted-foreground ml-1 font-normal">— {detail}</span>}
            </Badge>
        );
    }

    if (status === 'contradiction_found') {
        return (
            <Badge
                variant="outline"
                className={cn(
                    "text-amber-400 border-amber-500/30 bg-amber-500/10 flex items-center gap-1.5 py-1 transition-all animate-in fade-in slide-in-from-top-1",
                    className
                )}
            >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-bold tracking-tight">⚠️ CONTRADICTION</span>
                {detail && <span className="text-muted-foreground ml-1 font-normal">— {detail}</span>}
            </Badge>
        );
    }

    return null;
}
