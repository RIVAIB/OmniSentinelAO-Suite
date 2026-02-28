'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Post-auth redirect page.
 * Reads `postAuthRedirect` from localStorage (set before navigating to /login)
 * and redirects there. Falls back to /dashboard.
 *
 * This page is the fallback when Supabase's PKCE flow doesn't preserve
 * the `?next=` query param in the emailRedirectTo URL.
 */
export default function AuthRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        // Read from localStorage (same-browser desktop) or cookie (mobile webviews)
        const lsDest = localStorage.getItem('postAuthRedirect');
        const cookieMatch = document.cookie.match(/postAuthRedirect=([^;]+)/);
        const cookieDest = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
        const dest = lsDest ?? cookieDest ?? '/dashboard';

        // Clean up both storage mechanisms
        localStorage.removeItem('postAuthRedirect');
        document.cookie = 'postAuthRedirect=; path=/; max-age=0';

        router.replace(dest);
    }, [router]);

    return null;
}
