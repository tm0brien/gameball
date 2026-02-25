import Root from 'components/Root'
import type { Viewport } from 'next'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Next.js template',
    description: 'A templated repo for rapid development of Next.js apps.'
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1
}

export default function Page() {
    return <Root />
}
