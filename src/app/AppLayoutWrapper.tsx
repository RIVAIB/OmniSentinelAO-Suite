'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { Toaster } from '@/components/ui/sonner';

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';

    if (isLoginPage) {
        return (
            <>
                {children}
                <Toaster position="top-center" />
            </>
        );
    }

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 min-w-0 overflow-y-auto">
                {children}
            </main>
            <Toaster position="top-center" />
        </div>
    );
}
