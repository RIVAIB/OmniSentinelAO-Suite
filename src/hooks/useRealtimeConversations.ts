'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ConversationLive {
    id: string;
    channel: string;
    contact_id: string;
    status: string;
    messages: Array<{ role: string; content: string; timestamp: string; agentName?: string }>;
    created_at: string;
    updated_at: string;
    agents?: { name: string } | null;
    metadata?: { contactName?: string };
}

interface UseRealtimeConversationsOptions {
    status?: string;
    limit?: number;
}

/**
 * Subscribe to the conversations table in real-time.
 * Returns a live-updating array sorted by updated_at DESC.
 */
export function useRealtimeConversations(options: UseRealtimeConversationsOptions = {}) {
    const { status, limit = 50 } = options;
    const [conversations, setConversations] = useState<ConversationLive[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        const supabase = createClient();
        let query = supabase
            .from('conversations')
            .select('*, agents(name)')
            .order('updated_at', { ascending: false })
            .limit(limit);

        if (status) query = query.eq('status', status);

        const { data, error: err } = await query;
        if (err) {
            setError(err.message);
        } else {
            setConversations((data ?? []) as ConversationLive[]);
        }
        setLoading(false);
    }, [status, limit]);

    useEffect(() => {
        fetchAll();

        // ── Realtime subscription ─────────────────────────────────────────────
        const supabase = createClient();
        const channel = supabase
            .channel('conversations-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'conversations' },
                () => {
                    // On any INSERT or UPDATE, re-fetch the list to stay sorted.
                    fetchAll();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchAll]);

    return { conversations, loading, error, refresh: fetchAll };
}
