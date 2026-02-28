/**
 * NBA Stats API client
 *
 * All requests go server-side (Next.js API routes). The NBA Stats API is public
 * but requires browser-like headers to avoid being blocked. It has no auth.
 *
 * Coordinate system:
 *   LOC_X — lateral position in tenths of feet, 0 = center under basket,
 *            negative = left, positive = right (when viewed from baseline)
 *   LOC_Y — depth in tenths of feet from basket, 0 = basket level,
 *            positive = toward half court
 *
 * Gameball transform (right basket, half court):
 *   world x = BASKET_X - LOC_Y / 10   (41.75 - depth from basket)
 *   world y = LOC_X / 10              (lateral, same axis)
 *
 * For the left basket (away team / full court):
 *   world x = -(BASKET_X - LOC_Y / 10)
 *   world y = -(LOC_X / 10)
 */

import type { Shot, ShotType } from './sports-plugin/types'

const BASE = 'https://stats.nba.com/stats'
const BASKET_X = 41.75   // feet from center court to basket

// Headers required by stats.nba.com to respond to server-side requests
const NBA_HEADERS: Record<string, string> = {
    'Host': 'stats.nba.com',
    'Referer': 'https://www.nba.com/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'x-nba-stats-origin': 'stats',
    'x-nba-stats-token': 'true',
    'Connection': 'keep-alive',
    'Origin': 'https://www.nba.com'
}

const TIMEOUT_MS = 12_000

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NBAPlayer {
    id: number
    name: string
    teamAbbreviation: string
    isActive: boolean
}

export interface NBAGame {
    id: string
    date: string
    home: string
    away: string
}

export interface ShotChartResult {
    player: string
    team: string
    season: string
    seasonType: string
    gameId?: string
    totalShots: number
    made: number
    missed: number
    shots: Shot[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function nbaFetch(path: string, params: Record<string, string | number>): Promise<unknown> {
    const url = new URL(`${BASE}/${path}`)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
        const res = await fetch(url.toString(), {
            headers: NBA_HEADERS,
            signal: controller.signal,
            // next: { revalidate: 3600 } // optional ISR caching
        })
        if (!res.ok) throw new Error(`NBA Stats API returned ${res.status}: ${res.statusText}`)
        return await res.json()
    } finally {
        clearTimeout(timer)
    }
}

/** Parse a resultSet (headers + rowSet) into an array of objects */
function parseResultSet(data: unknown, setIndex = 0): Record<string, unknown>[] {
    const rs = (data as { resultSets: Array<{ headers: string[]; rowSet: unknown[][] }> }).resultSets[setIndex]
    return rs.rowSet.map(row =>
        Object.fromEntries(rs.headers.map((h, i) => [h, row[i]]))
    )
}

function inferShotType(actionType: string, shotType: string): ShotType {
    const a = actionType.toLowerCase()
    if (a.includes('dunk')) return 'dunk'
    if (a.includes('layup') || a.includes('tip')) return 'layup'
    if (a.includes('floater') || a.includes('floating')) return 'floater'
    if (shotType.includes('3PT')) return 'three-pointer'
    if (a.includes('free throw')) return 'free-throw'
    return 'mid-range'
}

function transformShot(row: Record<string, unknown>, side: 'right' | 'left' = 'right'): Shot {
    const locX = row.LOC_X as number
    const locY = row.LOC_Y as number
    const made = (row.SHOT_MADE_FLAG as number) === 1

    const min = row.MINUTES_REMAINING as number
    const sec = row.SECONDS_REMAINING as number
    const gameClock = `${min}:${String(sec).padStart(2, '0')}`

    let worldX = BASKET_X - locY / 10
    let worldY = locX / 10
    if (side === 'left') { worldX = -worldX; worldY = -worldY }

    return {
        x: Math.round(worldX * 100) / 100,
        y: Math.round(worldY * 100) / 100,
        made,
        shotType: inferShotType(
            row.ACTION_TYPE as string,
            row.SHOT_TYPE as string
        ),
        player: (row.PLAYER_NAME as string).replace(/\s+/g, '.').toLowerCase(),
        quarter: row.PERIOD as number,
        gameClock
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch shot chart data for a player.
 * Returns shots already transformed to Gameball world coordinates (feet).
 */
export async function fetchPlayerShots(
    playerId: number,
    season = '2024-25',
    seasonType: 'Regular Season' | 'Playoffs' | 'Pre Season' = 'Regular Season',
    gameId = '',
    side: 'right' | 'left' = 'right'
): Promise<ShotChartResult> {
    const data = await nbaFetch('shotchartdetail', {
        PlayerID: playerId,
        Season: season,
        SeasonType: seasonType,
        GameID: gameId,
        TeamID: 0,
        Outcome: '',
        Location: '',
        Month: 0,
        SeasonSegment: '',
        DateFrom: '',
        DateTo: '',
        OpponentTeamID: 0,
        VsConference: '',
        VsDivision: '',
        Position: '',
        RookieYear: '',
        GameSegment: '',
        Period: 0,
        LastNGames: 0,
        ContextFilter: '',
        ContextMeasure: 'FGA'
    })

    const rows = parseResultSet(data, 0)
    if (rows.length === 0) throw new Error('No shot data found for this player/season')

    const shots = rows.map(r => transformShot(r, side))
    const made = shots.filter(s => s.made).length
    const firstRow = rows[0]

    return {
        player: firstRow.PLAYER_NAME as string,
        team: firstRow.TEAM_NAME as string,
        season,
        seasonType,
        gameId: gameId || undefined,
        totalShots: shots.length,
        made,
        missed: shots.length - made,
        shots
    }
}

/** Fetch all current NBA players (active roster) */
export async function fetchAllPlayers(season = '2024-25'): Promise<NBAPlayer[]> {
    const data = await nbaFetch('commonallplayers', {
        LeagueID: '00',
        Season: season,
        IsOnlyCurrentSeason: 1
    })

    const rows = parseResultSet(data, 0)
    return rows
        .filter(r => (r.ROSTERSTATUS as number) === 1)  // active players only
        .map(r => ({
            id: r.PERSON_ID as number,
            name: r.DISPLAY_FIRST_LAST as string,
            teamAbbreviation: (r.TEAM_ABBREVIATION as string) || '',
            isActive: true
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
}

/** Search players by partial name (case-insensitive) */
export async function searchPlayers(query: string, season = '2024-25'): Promise<NBAPlayer[]> {
    const all = await fetchAllPlayers(season)
    const q = query.toLowerCase().trim()
    if (!q) return []
    return all
        .filter(p => p.name.toLowerCase().includes(q))
        .slice(0, 8)
}

/** Find the first player whose name matches (for agent tool use) */
export async function findPlayer(name: string, season = '2024-25'): Promise<NBAPlayer | null> {
    const results = await searchPlayers(name, season)
    return results[0] ?? null
}

/**
 * Look up a player and return their shot data.
 * Falls back to bundled sample data if the NBA Stats API is unreachable.
 */
export async function fetchShotsByName(
    playerName: string,
    season = '2024-25',
    seasonType: 'Regular Season' | 'Playoffs' | 'Pre Season' = 'Regular Season',
    gameId = ''
): Promise<ShotChartResult & { isSampleData?: boolean }> {
    // Try live API first
    try {
        const player = await findPlayer(playerName, season)
        if (player) {
            return fetchPlayerShots(player.id, season, seasonType, gameId)
        }
    } catch {
        // Fall through to sample data
    }

    // Fallback: bundled sample data
    const { findSamplePlayer } = await import('./nba-sample-shots')
    const sample = findSamplePlayer(playerName)
    if (!sample) {
        throw new Error(
            `Player "${playerName}" not found. The NBA Stats API is currently unavailable. ` +
            `Available sample players: Stephen Curry, LeBron James, Kevin Durant, ` +
            `Giannis Antetokounmpo, Luka Doncic, Nikola Jokic.`
        )
    }
    const made = sample.shots.filter(s => s.made).length
    return {
        player: sample.name,
        team: sample.teamAbbreviation,
        season,
        seasonType,
        totalShots: sample.shots.length,
        made,
        missed: sample.shots.length - made,
        shots: sample.shots,
        isSampleData: true
    }
}
