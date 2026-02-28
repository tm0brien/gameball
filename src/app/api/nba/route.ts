/**
 * GET /api/nba?playerId=2544&season=2024-25&seasonType=Regular+Season&gameId=
 *
 * Returns shot chart data for a player, transformed to Gameball world coords.
 * All NBA Stats API requests happen server-side (no CORS issues).
 */

import { fetchPlayerShots } from 'lib/nba-api'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl

    const playerId = searchParams.get('playerId')
    if (!playerId || isNaN(Number(playerId))) {
        return NextResponse.json({ error: 'playerId (number) is required' }, { status: 400 })
    }

    const season = searchParams.get('season') ?? '2024-25'
    const rawType = searchParams.get('seasonType') ?? 'Regular Season'
    const seasonType = ['Regular Season', 'Playoffs', 'Pre Season'].includes(rawType)
        ? (rawType as 'Regular Season' | 'Playoffs' | 'Pre Season')
        : 'Regular Season'
    const gameId = searchParams.get('gameId') ?? ''
    const side = searchParams.get('side') === 'left' ? 'left' : 'right'

    try {
        const result = await fetchPlayerShots(Number(playerId), season, seasonType, gameId, side)
        return NextResponse.json(result)
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch shot data'
        // Distinguish NBA API errors (503/rate-limited) from not-found
        const status = msg.includes('not found') ? 404 : 502
        return NextResponse.json({ error: msg }, { status })
    }
}
