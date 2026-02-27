import { NextResponse } from 'next/server';

// ─── Response Types ──────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
    success: true;
    data: T;
    meta?: PaginationMeta;
}

export interface ApiError {
    success: false;
    error: string;
    code: string;
    details?: unknown;
}

export interface PaginationMeta {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Success Helpers ─────────────────────────────────────────────────────────

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
    return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T): NextResponse<ApiSuccess<T>> {
    return NextResponse.json({ success: true, data }, { status: 201 });
}

export function paginated<T>(
    data: T[],
    meta: PaginationMeta
): NextResponse<ApiSuccess<T[]>> {
    return NextResponse.json({ success: true, data, meta }, { status: 200 });
}

// ─── Parse Pagination Params ─────────────────────────────────────────────────

export function parsePagination(searchParams: URLSearchParams): {
    page: number;
    pageSize: number;
    from: number;
    to: number;
} {
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(
        100,
        Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10))
    );
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    return { page, pageSize, from, to };
}
