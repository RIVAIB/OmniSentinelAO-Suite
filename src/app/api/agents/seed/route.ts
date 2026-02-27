// src/app/api/agents/seed/route.ts
import { createClient } from '@/lib/supabase/server';
import { RIVAIB_AGENTS } from '@/data/agents';
import { ok } from '@/lib/api/response';
import { dbError, serverError } from '@/lib/api/errors';

export async function POST() {
  try {
    const supabase = await createClient();

    // Fetch existing agent names to avoid duplicates (no UNIQUE constraint required)
    const { data: existing } = await supabase
      .from('agents')
      .select('name');

    const existingNames = new Set((existing ?? []).map((a: { name: string }) => a.name));

    const toInsert = RIVAIB_AGENTS
      .filter((a) => !existingNames.has(a.name))
      .map((a) => ({
        name: a.name,
        type: a.type,
        status: a.status,
        config: { ...(a.config ?? {}), accentColor: a.accentColor, icon: a.icon },
      }));

    if (toInsert.length === 0) {
      return ok({ seeded: 0, message: 'All agents already exist', agents: existing });
    }

    const { data, error } = await supabase
      .from('agents')
      .insert(toInsert)
      .select('id, name, status');

    if (error) {
      return dbError(error);
    }

    return ok({ seeded: data?.length ?? 0, agents: data });
  } catch (err) {
    return serverError(err);
  }
}
