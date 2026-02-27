import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UpdateAgentSchema } from '@/lib/api/validation';
import { ok } from '@/lib/api/response';
import { validationError, notFound, dbError, serverError } from '@/lib/api/errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/agents/[id]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return notFound(`Agent ${id}`);
      return dbError(error);
    }

    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

// PATCH /api/agents/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json();

    const parsed = UpdateAgentSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues);
    }

    const updateData = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('agents')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return notFound(`Agent ${id}`);
      return dbError(error);
    }

    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}

// DELETE /api/agents/[id] — soft delete
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('agents')
      .update({ status: 'inactive', updated_at: new Date().toISOString() } as never)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return notFound(`Agent ${id}`);
      return dbError(error);
    }

    return ok(data);
  } catch (err) {
    return serverError(err);
  }
}
