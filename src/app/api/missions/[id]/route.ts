import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UpdateMissionSchema } from '@/lib/api/validation';
import { ok } from '@/lib/api/response';
import { validationError, notFound, dbError, serverError, badRequest } from '@/lib/api/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/missions/[id]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('*')
      .eq('id', id)
      .single();

    if (missionError) {
      if (missionError.code === 'PGRST116') return notFound(`Mission ${id}`);
      return dbError(missionError);
    }

    // Get mission steps with agent info
    const { data: steps, error: stepsError } = await supabase
      .from('mission_steps')
      .select('*, agent:agents(id, name, type)')
      .eq('mission_id', id)
      .order('step_order', { ascending: true });

    if (stepsError) console.error('Error fetching steps:', stepsError);

    return ok({ ...(mission as Record<string, unknown>), steps: steps ?? [] });
  } catch (err) {
    return serverError(err);
  }
}

// PATCH /api/missions/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const parsed = UpdateMissionSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues);
    }

    const updateData = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('missions')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return notFound(`Mission ${id}`);
      return dbError(error);
    }

    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/missions/[id] — only proposed missions
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: mission, error: fetchError } = await supabase
      .from('missions')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') return notFound(`Mission ${id}`);
      return dbError(fetchError);
    }

    const missionRecord = mission as { status: string };
    if (missionRecord.status !== 'proposed') {
      return badRequest(
        `Cannot delete mission with status "${missionRecord.status}". Only proposed missions can be deleted.`
      );
    }

    // Delete steps first
    await supabase.from('mission_steps').delete().eq('mission_id', id);

    const { error: deleteError } = await supabase.from('missions').delete().eq('id', id);
    if (deleteError) return dbError(deleteError);

    return ok({ id, deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
