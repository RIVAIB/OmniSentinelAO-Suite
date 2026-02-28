import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');

    // Cookie fallback: set client-side before navigating to /login.
    // More reliable than localStorage — survives mobile webviews and Chrome Custom Tabs.
    const rawCookie = request.cookies.get('postAuthRedirect')?.value;
    const cookieDest = rawCookie ? decodeURIComponent(rawCookie) : null;

    // Priority: ?next= param > cookie fallback > /auth/redirect (localStorage fallback page)
    const next = searchParams.get('next') ?? cookieDest ?? '/auth/redirect';

    // Si Supabase envió un error (ej: link expirado)
    if (error) {
        const errorMsg = error_description || error;
        return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent(errorMsg)}`
        );
    }

    const supabase = await createClient();

    const redirectWithCookieClear = (url: string) => {
        const response = NextResponse.redirect(url);
        // Clear the postAuthRedirect cookie after use
        response.cookies.set('postAuthRedirect', '', { path: '/', maxAge: 0 });
        return response;
    };

    // Flow 1: PKCE code exchange
    if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError) {
            return redirectWithCookieClear(`${origin}${next}`);
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
            return redirectWithCookieClear(`${origin}${next}`);
        }
        console.error('Token verify failed:', verifyError.message);
    }

    // Fallback: redirigir al login con error
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
