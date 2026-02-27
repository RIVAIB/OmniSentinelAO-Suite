'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventType =
    | 'agent_heartbeat'
    | 'agent_started'
    | 'agent_stopped'
    | 'mission_created'
    | 'mission_started'
    | 'mission_completed'
    | 'mission_failed'
    | 'step_started'
    | 'step_completed'
    | 'step_failed'
    | 'agent_message'
    | 'agent_thought'
    | 'error';

export interface LiveEvent {
    id: string;
    type: EventType;
    agent_id?: string | null;
    mission_id?: string | null;
    step_id?: string | null;
    payload: Record<string, unknown>;
    created_at: string;
    agents?: { id: string; name: string } | null;
}

const MAX_EVENTS = 100;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRealtimeEvents(initialLimit = 50): {
    events: LiveEvent[];
    clear: () => void;
} {
    const [events, setEvents] = useState<LiveEvent[]>([]);
    const hasFetched = useRef(false);

    // Initial fetch
    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const supabase = createClient();
        supabase
            .from('events')
            .select('*, agents(id, name)')
            .order('created_at', { ascending: false })
            .limit(initialLimit)
            .then(({ data }) => {
                if (data) {
                    setEvents([...(data as LiveEvent[])].reverse());
                }
            });
    }, [initialLimit]);

    // Realtime subscription
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel('live-feed-events')
            .on(
                'postgres_changes' as never,
                { event: 'INSERT', schema: 'public', table: 'events' },
                (payload: { new: unknown }) => {
                    const newEvent = payload.new as LiveEvent;
                    setEvents((prev) => {
                        const updated = [...prev, newEvent];
                        return updated.length > MAX_EVENTS
                            ? updated.slice(updated.length - MAX_EVENTS)
                            : updated;
                    });
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const clear = () => setEvents([]);

    return { events, clear };
}
