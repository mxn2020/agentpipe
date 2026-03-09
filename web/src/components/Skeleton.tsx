/**
 * Reusable skeleton loading components.
 */

export function SkeletonLine({ width = '100%', height = '1rem' }: { width?: string; height?: string }) {
    return <div className="skeleton skeleton--line" style={{ width, height }} />
}

export function SkeletonCard() {
    return (
        <div className="skeleton skeleton--card">
            <SkeletonLine width="60%" height="1.4rem" />
            <SkeletonLine width="80%" />
            <SkeletonLine width="40%" />
        </div>
    )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
    return (
        <div className="skeleton-list">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    )
}

export function SkeletonProfile() {
    return (
        <div className="profile-page animate-fade-in">
            <div style={{ marginBottom: 'var(--space-xl)' }}>
                <SkeletonLine width="40%" height="2.5rem" />
            </div>
            <div className="profile-grid">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>
        </div>
    )
}
