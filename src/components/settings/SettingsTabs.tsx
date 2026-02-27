'use client';

import { useRouter, usePathname } from 'next/navigation';

interface Tab {
    id: string;
    label: string;
}

interface SettingsTabsProps {
    tabs: Tab[];
    children: React.ReactNode;
    activeTab: string;
}

export function SettingsTabs({ tabs, children, activeTab }: SettingsTabsProps) {
    const router = useRouter();
    const pathname = usePathname();

    function navigate(tabId: string) {
        router.push(`${pathname}?tab=${tabId}`);
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Tab bar */}
            <div
                className="flex gap-1 p-1 rounded-xl self-start overflow-x-auto"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
                {tabs.map((tab) => {
                    const isActive = tab.id === activeTab;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => navigate(tab.id)}
                            className="px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                            style={{
                                background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                                border: isActive ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                            }}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            {children}
        </div>
    );
}
