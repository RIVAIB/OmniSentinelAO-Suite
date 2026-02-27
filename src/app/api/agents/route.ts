import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreateAgentSchema, AgentFiltersSchema } from '@/lib/api/validation';
import { ok, created, paginated } from '@/lib/api/response';
import { validationError, dbError, serverError, conflict } from '@/lib/api/errors';

// GET /api/agents - List all agents with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Parse filters
    const filtersResult = AgentFiltersSchema.safeParse({
      status: searchParams.get('status') || undefined,
      type: searchParams.get('type') || undefined,
    });
    if (!filtersResult.success) {
      return validationError(filtersResult.error.issues);
    }
    const filters = filtersResult.data;

    // Build query
    let query = supabase
      .from('agents')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.type) query = query.eq('type', filters.type);

    const { data, error, count } = await query;

    if (error) return dbError(error);

    const total = count ?? 0;
    return paginated(data ?? [], {
      page: 1,
      pageSize: total,
      total,
      totalPages: 1,
    });
  } catch (err) {
    return serverError(err);
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const parsed = CreateAgentSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues);
    }

    // Check for duplicate name
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('name', parsed.data.name)
      .maybeSingle();

    if (existing) {
      return conflict(`Agent with name "${parsed.data.name}" already exists`);
    }

    const { data, error } = await supabase
      .from('agents')
      .insert(parsed.data as never)
      .select()
      .single();

    if (error) return dbError(error);

    return created(data);
  } catch (err) {
    return serverError(err);
  }
}
