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
        <>
            <Sidebar />
            <main className="flex-1 relative overflow-hidden flex flex-col min-h-screen">
                {children}
            </main>
            <Toaster position="top-center" />
        </>
    );
}
