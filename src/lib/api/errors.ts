import { NextResponse } from 'next/server';
import type { ApiError } from './response';

// ─── Error Codes ─────────────────────────────────────────────────────────────

export const ErrorCode = {
    // Client errors
    BAD_REQUEST: 'BAD_REQUEST',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    FORBIDDEN: 'FORBIDDEN',
    UNAUTHORIZED: 'UNAUTHORIZED',
    // Business logic
    INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
    CANNOT_DELETE: 'CANNOT_DELETE',
    // Server errors
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    SUPABASE_NOT_CONFIGURED: 'SUPABASE_NOT_CONFIGURED',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

// ─── Error Response Factory ──────────────────────────────────────────────────

function errorResponse(
    error: string,
    code: ErrorCodeType,
    status: number,
    details?: unknown
): NextResponse<ApiError> {
    return NextResponse.json(
        { success: false, error, code, ...(details ? { details } : {}) },
        { status }
    );
}

// ─── Shorthand Helpers ───────────────────────────────────────────────────────

export function badRequest(
    message = 'Solicitud inválida',
    details?: unknown
): NextResponse<ApiError> {
    return errorResponse(message, ErrorCode.BAD_REQUEST, 400, details);
}

export function validationError(
    details: unknown
): NextResponse<ApiError> {
    return errorResponse('Error de validación', ErrorCode.VALIDATION_ERROR, 400, details);
}

export function notFound(resource = 'Recurso'): NextResponse<ApiError> {
    return errorResponse(`${resource} no encontrado`, ErrorCode.NOT_FOUND, 404);
}

export function conflict(message: string): NextResponse<ApiError> {
    return errorResponse(message, ErrorCode.CONFLICT, 409);
}

export function forbidden(message = 'Acceso denegado'): NextResponse<ApiError> {
    return errorResponse(message, ErrorCode.FORBIDDEN, 403);
}

export function cannotDelete(reason: string): NextResponse<ApiError> {
    return errorResponse(reason, ErrorCode.CANNOT_DELETE, 409);
}

export function serverError(
    err?: unknown
): NextResponse<ApiError> {
    const message =
        err instanceof Error ? err.message : 'Error interno del servidor';
    console.error('[API] Internal error:', err);
    return errorResponse(message, ErrorCode.INTERNAL_ERROR, 500);
}

export function dbError(err?: unknown): NextResponse<ApiError> {
    console.error('[API] Database error:', err);
    return errorResponse(
        'Error de base de datos',
        ErrorCode.DATABASE_ERROR,
        500,
        err instanceof Error ? err.message : undefined
    );
}

export function notConfigured(): NextResponse<ApiError> {
    return errorResponse(
        'Supabase no está configurado. Crea .env.local con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        ErrorCode.SUPABASE_NOT_CONFIGURED,
        503
    );
}
