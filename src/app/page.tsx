import Root from 'components/Root'
import type { Viewport } from 'next'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Gameball',
    description: 'A declarative, JSON-first framework for 2D simulations and sports visualizations.'
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1
}

export default function Page() {
    return <Root />
}
