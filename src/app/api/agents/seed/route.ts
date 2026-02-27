// src/app/api/agents/seed/route.ts
import { createClient } from '@/lib/supabase/server';
import { RIVAIB_AGENTS } from '@/data/agents';
import { ok } from '@/lib/api/response';
import { dbError, serverError } from '@/lib/api/errors';

export async function POST() {
  try {
    const supabase = await createClient();

    const toInsert = RIVAIB_AGENTS.map((a) => ({
      name: a.name,
      type: a.type,
      status: a.status,
      config: a.config ?? {},
    }));

    const { data, error } = await supabase
      .from('agents')
      .upsert(toInsert, { onConflict: 'name' })
      .select('id, name, status');

    if (error) {
      return dbError(error);
    }

    return ok({ seeded: data?.length ?? 0, agents: data });
  } catch (err) {
    return serverError(err);
  }
}
