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
        const dest = localStorage.getItem('postAuthRedirect') ?? '/dashboard';
        localStorage.removeItem('postAuthRedirect');
        router.replace(dest);
    }, [router]);

    return null;
}
