import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SkeletonLine, SkeletonCard, SkeletonList } from '../Skeleton'

describe('Skeleton Components', () => {
    it('renders SkeletonLine with custom dimensions', () => {
        const { container } = render(<SkeletonLine width="50%" height="2rem" />)
        const el = container.querySelector('.skeleton')
        expect(el).toBeInTheDocument()
        expect(el).toHaveStyle({ width: '50%', height: '2rem' })
    })

    it('renders SkeletonCard', () => {
        const { container } = render(<SkeletonCard />)
        expect(container.querySelector('.skeleton--card')).toBeInTheDocument()
    })

    it('renders SkeletonList with default 3 items', () => {
        const { container } = render(<SkeletonList />)
        expect(container.querySelectorAll('.skeleton--card')).toHaveLength(3)
    })

    it('renders SkeletonList with custom count', () => {
        const { container } = render(<SkeletonList count={5} />)
        expect(container.querySelectorAll('.skeleton--card')).toHaveLength(5)
    })
})
