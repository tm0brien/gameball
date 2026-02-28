/**
 * POST /api/nba/compile
 * Body: { shots: Shot[], player: string, variant?: "half"|"full", mode?: "animated"|"static" }
 *
 * Compiles a Gameball shot chart scene from raw shot data.
 * Called by the NBA player search UI after fetching player shots.
 */

import { compile } from 'lib/sports-plugin'
import type { Shot } from 'lib/sports-plugin/types'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    let body: { shots?: Shot[]; player?: string; variant?: string; mode?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const shots = body.shots
    if (!Array.isArray(shots) || shots.length === 0) {
        return NextResponse.json({ error: 'shots array is required' }, { status: 400 })
    }

    const variant = body.variant === 'full' ? 'full' : 'half'
    const mode = body.mode === 'static' ? 'static' : 'animated'
    const effectiveMode = mode === 'animated' && shots.length > 100 ? 'static' : mode

    try {
        const scene = compile({
            sport: 'basketball',
            court: { variant, color: '#c8a96e', lineColor: '#f0f0e8' },
            shotChart: {
                shots,
                mode: effectiveMode as 'animated' | 'static',
                playbackSpeed: 8,
                madeColor: '#4ade80',
                missedColor: '#f87171',
                dotRadius: 4,
                showFlash: effectiveMode === 'animated'
            }
        })

        return NextResponse.json({ scene, shotCount: shots.length, mode: effectiveMode })
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Compile failed' },
            { status: 500 }
        )
    }
}
