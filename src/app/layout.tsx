import './globals.css'
import 'material-symbols/sharp.css'

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import StyledComponentsRegistry from './registry'

const inter = Inter({
    subsets: ['latin'],
    display: 'swap'
})

export const metadata: Metadata = {
    title: 'Gameball',
    description: 'A declarative, JSON-first framework for 2D simulations and sports visualizations.'
}

export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en" className={inter.className}>
            <body>
                <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
            </body>
        </html>
    )
}
