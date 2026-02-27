'use client';

interface PageLoaderProps {
    /** Number of skeleton card rows to show */
    rows?: number;
    /** Show a top header skeleton */
    showHeader?: boolean;
}

function SkeletonBox({ w, h, rounded = 'rounded-lg' }: { w: string; h: string; rounded?: string }) {
    return (
        <div
            className={`${w} ${h} ${rounded} animate-pulse`}
            style={{ background: 'rgba(255,255,255,0.05)' }}
        />
    );
}

export default function PageLoader({ rows = 5, showHeader = true }: PageLoaderProps) {
    return (
        <div className="p-6 space-y-6">
            {showHeader && (
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <SkeletonBox w="w-48" h="h-7" rounded="rounded-xl" />
                        <SkeletonBox w="w-32" h="h-4" />
                    </div>
                    <SkeletonBox w="w-28" h="h-9" rounded="rounded-xl" />
                </div>
            )}

            {/* Filter bar skeleton */}
            <div className="flex gap-3">
                <SkeletonBox w="flex-1" h="h-10" rounded="rounded-xl" />
                <SkeletonBox w="w-20" h="h-10" rounded="rounded-xl" />
                <SkeletonBox w="w-20" h="h-10" rounded="rounded-xl" />
            </div>

            {/* Rows */}
            <div className="space-y-3">
                {Array.from({ length: rows }).map((_, i) => (
                    <div
                        key={i}
                        className="glass-panel p-4 flex items-center gap-4 animate-pulse"
                        style={{ animationDelay: `${i * 60}ms` }}
                    >
                        <SkeletonBox w="w-10" h="h-10" rounded="rounded-xl" />
                        <div className="flex-1 space-y-2">
                            <SkeletonBox w="w-1/3" h="h-3" />
                            <SkeletonBox w="w-2/3" h="h-3" />
                        </div>
                        <SkeletonBox w="w-16" h="h-6" rounded="rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}
