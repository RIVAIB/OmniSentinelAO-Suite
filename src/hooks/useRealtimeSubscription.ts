'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Supabase requires T extends { [key: string]: any }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface UseRealtimeOptions<T extends AnyRow = AnyRow> {
    table: string;
    schema?: string;
    filter?: string;
    onInsert?: (row: T) => void;
    onUpdate?: (row: T) => void;
    onDelete?: (row: Partial<T>) => void;
}

/**
 * Generic Supabase Realtime subscription hook.
 * Automatically reconnects; cleans up on unmount.
 * T must satisfy {[key:string]: any} (Supabase requirement).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRealtimeSubscription<T extends AnyRow = AnyRow>(
    options: UseRealtimeOptions<T>
): void {
    const { table, schema = 'public', filter, onInsert, onUpdate, onDelete } = options;
    const onInsertRef = useRef(onInsert);
    const onUpdateRef = useRef(onUpdate);
    const onDeleteRef = useRef(onDelete);

    useEffect(() => { onInsertRef.current = onInsert; }, [onInsert]);
    useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);
    useEffect(() => { onDeleteRef.current = onDelete; }, [onDelete]);

    useEffect(() => {
        const supabase = createClient();
        const channelName = `rt-${table}-${filter ?? 'all'}-${Date.now()}`;

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes' as never,
                {
                    event: '*',
                    schema,
                    table,
                    ...(filter ? { filter } : {}),
                },
                (payload: RealtimePostgresChangesPayload<T>) => {
                    const ev = payload as { eventType: string } & typeof payload;
                    if (ev.eventType === 'INSERT' && onInsertRef.current) {
                        onInsertRef.current(payload.new as T);
                    }
                    if (ev.eventType === 'UPDATE' && onUpdateRef.current) {
                        onUpdateRef.current(payload.new as T);
                    }
                    if (ev.eventType === 'DELETE' && onDeleteRef.current) {
                        onDeleteRef.current(payload.old as Partial<T>);
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [table, schema, filter]);
}
