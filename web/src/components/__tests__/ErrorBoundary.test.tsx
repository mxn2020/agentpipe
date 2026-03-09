import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary'

describe('ErrorBoundary', () => {
    it('renders children when no error', () => {
        render(<ErrorBoundary><div>Hello World</div></ErrorBoundary>)
        expect(screen.getByText('Hello World')).toBeInTheDocument()
    })

    it('shows error UI when child throws', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
        function ThrowingChild(): React.ReactNode { throw new Error('Test error') }
        render(<ErrorBoundary><ThrowingChild /></ErrorBoundary>)
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
        consoleSpy.mockRestore()
    })

    it('shows reload button on error', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
        function ThrowingChild(): React.ReactNode { throw new Error('Boom') }
        render(<ErrorBoundary><ThrowingChild /></ErrorBoundary>)
        expect(screen.getByText('Try Again')).toBeInTheDocument()
        consoleSpy.mockRestore()
    })
})
