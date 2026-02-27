import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    const next = searchParams.get('next') ?? '/dashboard';
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');

    // Si Supabase envió un error (ej: link expirado)
    if (error) {
        const errorMsg = error_description || error;
        return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent(errorMsg)}`
        );
    }

    const supabase = await createClient();

    // Flow 1: PKCE code exchange
    if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError) {
            return NextResponse.redirect(`${origin}${next}`);
        }
        console.error('Code exchange failed:', exchangeError.message);
    }

    // Flow 2: Token hash verification (older magic link flow)
    if (token_hash && type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as 'magiclink' | 'email',
        });
        if (!verifyError) {
            return NextResponse.redirect(`${origin}${next}`);
        }
        console.error('Token verify failed:', verifyError.message);
    }

    // Fallback: redirigir al login con error
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
