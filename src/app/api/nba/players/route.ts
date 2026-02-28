/**
 * GET /api/nba/players?search=curry&season=2024-25
 *
 * Returns a list of up to 8 matching active NBA players.
 * Used by the player search UI for autocomplete.
 *
 * The full player list is cached in-memory for 1 hour to avoid hammering the
 * NBA Stats API on every keystroke.
 */

import { fetchAllPlayers, type NBAPlayer } from 'lib/nba-api'
import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory cache: season → { players, expiresAt }
const cache = new Map<string, { players: NBAPlayer[]; expiresAt: number }>()
const TTL_MS = 60 * 60 * 1000  // 1 hour

async function getCachedPlayers(season: string): Promise<NBAPlayer[]> {
    const entry = cache.get(season)
    if (entry && entry.expiresAt > Date.now()) return entry.players

    const players = await fetchAllPlayers(season)
    cache.set(season, { players, expiresAt: Date.now() + TTL_MS })
    return players
}

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl
    const query = searchParams.get('search')?.trim() ?? ''
    const season = searchParams.get('season') ?? '2024-25'

    if (!query || query.length < 2) {
        return NextResponse.json({ players: [] })
    }

    const q = query.toLowerCase()

    // Try live API first (cached)
    try {
        const all = await getCachedPlayers(season)
        const matches = all
            .filter(p => p.name.toLowerCase().includes(q))
            .slice(0, 8)
        if (matches.length > 0) {
            return NextResponse.json({ players: matches })
        }
    } catch {
        // Fall through to sample players
    }

    // Fallback: sample players
    const { SAMPLE_PLAYERS } = await import('lib/nba-sample-shots')
    const sampleMatches = SAMPLE_PLAYERS
        .filter(p => p.name.toLowerCase().includes(q))
        .map(p => ({ id: p.id, name: p.name, teamAbbreviation: p.teamAbbreviation, isActive: true, isSample: true }))
        .slice(0, 8)

    return NextResponse.json({ players: sampleMatches })
}
