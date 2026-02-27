import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CreateMissionSchema, MissionFiltersSchema } from '@/lib/api/validation';
import { created, paginated } from '@/lib/api/response';
import { validationError, dbError, serverError } from '@/lib/api/errors';

// GET /api/missions - List all missions with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const filtersResult = MissionFiltersSchema.safeParse({
      status: searchParams.get('status') || undefined,
      priority_min: searchParams.get('priority_min') || undefined,
      priority_max: searchParams.get('priority_max') || undefined,
    });
    if (!filtersResult.success) {
      return validationError(filtersResult.error.issues);
    }
    const filters = filtersResult.data;

    let query = supabase
      .from('missions')
      .select('*', { count: 'exact' })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.status) query = query.eq('status', filters.status);
    if (filters.priority_min) query = query.gte('priority', filters.priority_min);
    if (filters.priority_max) query = query.lte('priority', filters.priority_max);

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

// POST /api/missions - Create a new mission
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const parsed = CreateMissionSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error.issues);
    }

    const { data, error } = await supabase
      .from('missions')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(parsed.data as any)
      .select()
      .single() as unknown as { data: { id: string; title: string } | null; error: unknown };

    if (error) return dbError(error);
    if (!data) return dbError({ message: 'Failed to create mission', details: '', hint: '', code: '500' });

    return created(data);
  } catch (err) {
    return serverError(err);
  }
}
