/**
 * Sample NBA shot data for 8 well-known players.
 * Used as a fallback when the NBA Stats API is unavailable.
 *
 * Coordinates are in Gameball world feet (origin = center court, right basket).
 * Shot distributions reflect each player's known tendencies.
 */

import type { Shot } from './sports-plugin/types'

export interface SamplePlayer {
    id: number
    name: string
    teamAbbreviation: string
    shots: Shot[]
}

// ─── Shot data ────────────────────────────────────────────────────────────────

const curry: Shot[] = [
    // Q1 — classic Curry, threes everywhere
    { x: 22.5, y: 8.0,   made: true,  shotType: 'three-pointer', quarter: 1, gameClock: '11:20' },
    { x: 24.0, y: -1.5,  made: true,  shotType: 'three-pointer', quarter: 1, gameClock: '10:44' },
    { x: 22.0, y: -8.5,  made: false, shotType: 'three-pointer', quarter: 1, gameClock: '9:31' },
    { x: 38.5, y: 2.0,   made: true,  shotType: 'layup',         quarter: 1, gameClock: '8:02' },
    { x: 30.0, y: 12.0,  made: false, shotType: 'mid-range',     quarter: 1, gameClock: '6:55' },
    { x: 21.8, y: 14.0,  made: true,  shotType: 'three-pointer', quarter: 1, gameClock: '5:21' },
    { x: 23.0, y: -14.0, made: true,  shotType: 'three-pointer', quarter: 1, gameClock: '3:48' },
    { x: 28.5, y: 5.0,   made: false, shotType: 'mid-range',     quarter: 1, gameClock: '2:11' },
    // Q2
    { x: 22.0, y: 3.5,   made: true,  shotType: 'three-pointer', quarter: 2, gameClock: '11:44' },
    { x: 35.0, y: -8.0,  made: true,  shotType: 'mid-range',     quarter: 2, gameClock: '10:12' },
    { x: 21.5, y: -6.0,  made: false, shotType: 'three-pointer', quarter: 2, gameClock: '8:55' },
    { x: 24.5, y: 10.0,  made: true,  shotType: 'three-pointer', quarter: 2, gameClock: '7:30' },
    { x: 40.0, y: 1.0,   made: true,  shotType: 'layup',         quarter: 2, gameClock: '6:01' },
    { x: 22.8, y: -11.5, made: true,  shotType: 'three-pointer', quarter: 2, gameClock: '4:39' },
    { x: 29.0, y: -4.0,  made: false, shotType: 'mid-range',     quarter: 2, gameClock: '3:15' },
    { x: 21.2, y: 1.0,   made: true,  shotType: 'three-pointer', quarter: 2, gameClock: '1:50' },
    // Q3
    { x: 22.0, y: 13.5,  made: true,  shotType: 'three-pointer', quarter: 3, gameClock: '11:00' },
    { x: 38.0, y: -3.0,  made: false, shotType: 'layup',         quarter: 3, gameClock: '9:21' },
    { x: 23.5, y: -0.5,  made: true,  shotType: 'three-pointer', quarter: 3, gameClock: '7:44' },
    { x: 32.0, y: 9.0,   made: false, shotType: 'mid-range',     quarter: 3, gameClock: '5:58' },
    { x: 21.8, y: -14.0, made: true,  shotType: 'three-pointer', quarter: 3, gameClock: '4:20' },
    // Q4 — clutch time
    { x: 22.5, y: 7.0,   made: true,  shotType: 'three-pointer', quarter: 4, gameClock: '9:30' },
    { x: 24.0, y: -3.5,  made: false, shotType: 'three-pointer', quarter: 4, gameClock: '7:11' },
    { x: 22.0, y: 0.0,   made: true,  shotType: 'three-pointer', quarter: 4, gameClock: '5:02' },
    { x: 40.5, y: 2.0,   made: true,  shotType: 'layup',         quarter: 4, gameClock: '3:44' },
    { x: 21.5, y: -8.0,  made: true,  shotType: 'three-pointer', quarter: 4, gameClock: '1:58' },
    { x: 22.8, y: 11.0,  made: true,  shotType: 'three-pointer', quarter: 4, gameClock: '0:38' },
]

const lebron: Shot[] = [
    { x: 40.5, y: 1.5,  made: true,  shotType: 'dunk',          quarter: 1, gameClock: '11:30' },
    { x: 39.0, y: -4.0, made: true,  shotType: 'layup',         quarter: 1, gameClock: '10:01' },
    { x: 33.0, y: 8.0,  made: true,  shotType: 'mid-range',     quarter: 1, gameClock: '8:44' },
    { x: 22.5, y: 14.0, made: false, shotType: 'three-pointer', quarter: 1, gameClock: '7:20' },
    { x: 34.5, y: -7.0, made: true,  shotType: 'mid-range',     quarter: 1, gameClock: '5:55' },
    { x: 41.0, y: 3.0,  made: true,  shotType: 'layup',         quarter: 1, gameClock: '4:11' },
    { x: 28.0, y: 10.5, made: false, shotType: 'mid-range',     quarter: 1, gameClock: '2:48' },
    { x: 40.0, y: -2.0, made: true,  shotType: 'dunk',          quarter: 2, gameClock: '11:05' },
    { x: 22.0, y: -14.0,made: true,  shotType: 'three-pointer', quarter: 2, gameClock: '9:30' },
    { x: 35.0, y: 5.0,  made: false, shotType: 'mid-range',     quarter: 2, gameClock: '8:01' },
    { x: 39.5, y: 0.5,  made: true,  shotType: 'layup',         quarter: 2, gameClock: '6:44' },
    { x: 33.0, y: -9.0, made: true,  shotType: 'mid-range',     quarter: 2, gameClock: '5:10' },
    { x: 24.0, y: 7.0,  made: false, shotType: 'three-pointer', quarter: 2, gameClock: '3:31' },
    { x: 40.8, y: 2.0,  made: true,  shotType: 'dunk',          quarter: 3, gameClock: '10:45' },
    { x: 34.0, y: 10.0, made: true,  shotType: 'mid-range',     quarter: 3, gameClock: '9:00' },
    { x: 39.0, y: -3.5, made: false, shotType: 'layup',         quarter: 3, gameClock: '7:22' },
    { x: 22.5, y: 0.0,  made: true,  shotType: 'three-pointer', quarter: 3, gameClock: '5:44' },
    { x: 35.5, y: -6.0, made: true,  shotType: 'mid-range',     quarter: 3, gameClock: '4:05' },
    { x: 41.0, y: 1.0,  made: true,  shotType: 'layup',         quarter: 4, gameClock: '10:20' },
    { x: 30.0, y: 11.0, made: false, shotType: 'mid-range',     quarter: 4, gameClock: '8:40' },
    { x: 22.0, y: -7.5, made: true,  shotType: 'three-pointer', quarter: 4, gameClock: '6:55' },
    { x: 39.8, y: 0.0,  made: true,  shotType: 'layup',         quarter: 4, gameClock: '4:30' },
    { x: 34.0, y: 8.0,  made: true,  shotType: 'mid-range',     quarter: 4, gameClock: '2:15' },
    { x: 22.8, y: 4.5,  made: false, shotType: 'three-pointer', quarter: 4, gameClock: '0:45' },
]

const durant: Shot[] = [
    { x: 32.5, y: 8.0,  made: true,  shotType: 'mid-range',     quarter: 1, gameClock: '11:10' },
    { x: 22.5, y: -8.5, made: true,  shotType: 'three-pointer', quarter: 1, gameClock: '9:44' },
    { x: 34.0, y: -10.0,made: true,  shotType: 'mid-range',     quarter: 1, gameClock: '8:05' },
    { x: 29.5, y: 0.0,  made: false, shotType: 'mid-range',     quarter: 1, gameClock: '6:30' },
    { x: 22.0, y: 14.0, made: true,  shotType: 'three-pointer', quarter: 1, gameClock: '4:55' },
    { x: 36.5, y: 7.0,  made: true,  shotType: 'mid-range',     quarter: 1, gameClock: '3:20' },
    { x: 31.0, y: -6.0, made: false, shotType: 'mid-range',     quarter: 2, gameClock: '11:40' },
    { x: 22.5, y: 3.0,  made: true,  shotType: 'three-pointer', quarter: 2, gameClock: '10:00' },
    { x: 35.0, y: -8.5, made: true,  shotType: 'mid-range',     quarter: 2, gameClock: '8:25' },
    { x: 40.5, y: 2.0,  made: true,  shotType: 'layup',         quarter: 2, gameClock: '6:50' },
    { x: 30.5, y: 9.5,  made: false, shotType: 'mid-range',     quarter: 2, gameClock: '5:10' },
    { x: 22.0, y: -14.0,made: true,  shotType: 'three-pointer', quarter: 2, gameClock: '3:35' },
    { x: 33.0, y: 5.0,  made: true,  shotType: 'mid-range',     quarter: 3, gameClock: '11:15' },
    { x: 22.8, y: -4.0, made: true,  shotType: 'three-pointer', quarter: 3, gameClock: '9:30' },
    { x: 36.0, y: -11.0,made: true,  shotType: 'mid-range',     quarter: 3, gameClock: '7:45' },
    { x: 29.0, y: 7.5,  made: false, shotType: 'mid-range',     quarter: 3, gameClock: '6:00' },
    { x: 23.0, y: 10.0, made: true,  shotType: 'three-pointer', quarter: 3, gameClock: '4:20' },
    { x: 34.5, y: 3.0,  made: true,  shotType: 'mid-range',     quarter: 4, gameClock: '10:45' },
    { x: 22.5, y: -1.5, made: false, shotType: 'three-pointer', quarter: 4, gameClock: '9:00' },
    { x: 31.0, y: -8.0, made: true,  shotType: 'mid-range',     quarter: 4, gameClock: '7:15' },
    { x: 37.5, y: 6.0,  made: true,  shotType: 'mid-range',     quarter: 4, gameClock: '5:30' },
    { x: 22.0, y: 5.5,  made: true,  shotType: 'three-pointer', quarter: 4, gameClock: '3:45' },
    { x: 29.5, y: -3.0, made: false, shotType: 'mid-range',     quarter: 4, gameClock: '1:55' },
]

const giannis: Shot[] = [
    { x: 41.0, y: 2.0,  made: true,  shotType: 'dunk',          quarter: 1, gameClock: '11:00' },
    { x: 39.5, y: -3.5, made: true,  shotType: 'layup',         quarter: 1, gameClock: '9:15' },
    { x: 38.0, y: 4.5,  made: false, shotType: 'layup',         quarter: 1, gameClock: '7:30' },
    { x: 40.8, y: 1.0,  made: true,  shotType: 'dunk',          quarter: 1, gameClock: '5:50' },
    { x: 36.0, y: -6.0, made: true,  shotType: 'layup',         quarter: 1, gameClock: '4:10' },
    { x: 22.5, y: 8.0,  made: false, shotType: 'three-pointer', quarter: 1, gameClock: '2:30' },
    { x: 40.2, y: -1.5, made: true,  shotType: 'layup',         quarter: 2, gameClock: '11:20' },
    { x: 41.5, y: 3.0,  made: true,  shotType: 'dunk',          quarter: 2, gameClock: '9:40' },
    { x: 37.5, y: 5.5,  made: false, shotType: 'layup',         quarter: 2, gameClock: '7:55' },
    { x: 40.0, y: -2.0, made: true,  shotType: 'dunk',          quarter: 2, gameClock: '6:10' },
    { x: 35.0, y: 8.0,  made: false, shotType: 'mid-range',     quarter: 2, gameClock: '4:25' },
    { x: 41.0, y: 0.5,  made: true,  shotType: 'layup',         quarter: 2, gameClock: '2:40' },
    { x: 39.8, y: -4.0, made: true,  shotType: 'dunk',          quarter: 3, gameClock: '10:50' },
    { x: 40.5, y: 2.5,  made: true,  shotType: 'layup',         quarter: 3, gameClock: '9:05' },
    { x: 38.5, y: -1.0, made: false, shotType: 'layup',         quarter: 3, gameClock: '7:20' },
    { x: 41.2, y: 1.5,  made: true,  shotType: 'dunk',          quarter: 3, gameClock: '5:35' },
    { x: 36.5, y: 6.0,  made: true,  shotType: 'mid-range',     quarter: 3, gameClock: '3:50' },
    { x: 40.0, y: -3.5, made: true,  shotType: 'layup',         quarter: 4, gameClock: '10:10' },
    { x: 41.5, y: 2.0,  made: true,  shotType: 'dunk',          quarter: 4, gameClock: '8:25' },
    { x: 39.0, y: 4.0,  made: false, shotType: 'layup',         quarter: 4, gameClock: '6:40' },
    { x: 40.8, y: -1.0, made: true,  shotType: 'dunk',          quarter: 4, gameClock: '4:55' },
    { x: 38.0, y: -5.5, made: true,  shotType: 'layup',         quarter: 4, gameClock: '3:10' },
    { x: 41.0, y: 1.0,  made: true,  shotType: 'dunk',          quarter: 4, gameClock: '1:25' },
]

const luka: Shot[] = [
    { x: 23.0, y: -5.0, made: true,  shotType: 'three-pointer', quarter: 1, gameClock: '11:30' },
    { x: 35.5, y: 9.0,  made: false, shotType: 'mid-range',     quarter: 1, gameClock: '10:00' },
    { x: 22.0, y: 8.0,  made: true,  shotType: 'three-pointer', quarter: 1, gameClock: '8:22' },
    { x: 40.0, y: 2.5,  made: true,  shotType: 'layup',         quarter: 1, gameClock: '6:40' },
    { x: 28.5, y: -3.0, made: true,  shotType: 'mid-range',     quarter: 1, gameClock: '5:01' },
    { x: 22.5, y: -13.5,made: false, shotType: 'three-pointer', quarter: 1, gameClock: '3:20' },
    { x: 23.0, y: 1.5,  made: true,  shotType: 'three-pointer', quarter: 2, gameClock: '11:45' },
    { x: 34.0, y: -8.0, made: true,  shotType: 'mid-range',     quarter: 2, gameClock: '10:05' },
    { x: 22.5, y: 12.0, made: false, shotType: 'three-pointer', quarter: 2, gameClock: '8:20' },
    { x: 38.5, y: 4.0,  made: true,  shotType: 'floater',       quarter: 2, gameClock: '6:38' },
    { x: 22.0, y: -3.5, made: true,  shotType: 'three-pointer', quarter: 2, gameClock: '4:55' },
    { x: 31.0, y: 7.0,  made: false, shotType: 'mid-range',     quarter: 2, gameClock: '3:15' },
    { x: 22.8, y: -9.0, made: true,  shotType: 'three-pointer', quarter: 3, gameClock: '11:00' },
    { x: 36.0, y: 5.5,  made: true,  shotType: 'mid-range',     quarter: 3, gameClock: '9:18' },
    { x: 23.0, y: 6.0,  made: false, shotType: 'three-pointer', quarter: 3, gameClock: '7:35' },
    { x: 40.5, y: 1.0,  made: true,  shotType: 'layup',         quarter: 3, gameClock: '5:50' },
    { x: 22.5, y: 14.0, made: true,  shotType: 'three-pointer', quarter: 3, gameClock: '4:08' },
    { x: 29.0, y: -5.0, made: true,  shotType: 'mid-range',     quarter: 4, gameClock: '10:25' },
    { x: 22.0, y: 2.5,  made: true,  shotType: 'three-pointer', quarter: 4, gameClock: '8:40' },
    { x: 35.5, y: -10.0,made: false, shotType: 'mid-range',     quarter: 4, gameClock: '6:55' },
    { x: 23.5, y: -7.0, made: true,  shotType: 'three-pointer', quarter: 4, gameClock: '5:10' },
    { x: 22.0, y: 0.0,  made: false, shotType: 'three-pointer', quarter: 4, gameClock: '3:25' },
    { x: 24.0, y: 9.5,  made: true,  shotType: 'three-pointer', quarter: 4, gameClock: '1:40' },
]

const jokic: Shot[] = [
    { x: 37.0, y: 5.0,  made: true,  shotType: 'mid-range',     quarter: 1, gameClock: '11:05' },
    { x: 35.5, y: -8.0, made: true,  shotType: 'mid-range',     quarter: 1, gameClock: '9:20' },
    { x: 22.0, y: -14.0,made: false, shotType: 'three-pointer', quarter: 1, gameClock: '7:35' },
    { x: 40.0, y: 3.0,  made: true,  shotType: 'layup',         quarter: 1, gameClock: '5:50' },
    { x: 33.0, y: 9.5,  made: true,  shotType: 'mid-range',     quarter: 1, gameClock: '4:05' },
    { x: 36.5, y: -6.5, made: false, shotType: 'mid-range',     quarter: 2, gameClock: '11:20' },
    { x: 22.5, y: 14.0, made: true,  shotType: 'three-pointer', quarter: 2, gameClock: '9:35' },
    { x: 38.5, y: 4.0,  made: true,  shotType: 'mid-range',     quarter: 2, gameClock: '7:50' },
    { x: 35.0, y: -11.0,made: true,  shotType: 'mid-range',     quarter: 2, gameClock: '6:05' },
    { x: 40.5, y: 1.5,  made: false, shotType: 'layup',         quarter: 2, gameClock: '4:20' },
    { x: 34.0, y: 7.0,  made: true,  shotType: 'mid-range',     quarter: 3, gameClock: '11:15' },
    { x: 22.0, y: -5.0, made: true,  shotType: 'three-pointer', quarter: 3, gameClock: '9:30' },
    { x: 37.5, y: -9.0, made: false, shotType: 'mid-range',     quarter: 3, gameClock: '7:45' },
    { x: 39.8, y: 2.0,  made: true,  shotType: 'layup',         quarter: 3, gameClock: '6:00' },
    { x: 33.5, y: 10.0, made: true,  shotType: 'mid-range',     quarter: 3, gameClock: '4:15' },
    { x: 35.0, y: -7.0, made: true,  shotType: 'mid-range',     quarter: 4, gameClock: '10:30' },
    { x: 22.5, y: 3.5,  made: false, shotType: 'three-pointer', quarter: 4, gameClock: '8:45' },
    { x: 38.0, y: 5.5,  made: true,  shotType: 'mid-range',     quarter: 4, gameClock: '7:00' },
    { x: 40.2, y: -2.0, made: true,  shotType: 'layup',         quarter: 4, gameClock: '5:15' },
    { x: 34.5, y: -9.5, made: true,  shotType: 'mid-range',     quarter: 4, gameClock: '3:30' },
    { x: 22.0, y: 11.5, made: true,  shotType: 'three-pointer', quarter: 4, gameClock: '1:45' },
]

// ─── Lookup table ─────────────────────────────────────────────────────────────

export const SAMPLE_PLAYERS: SamplePlayer[] = [
    { id: 201939, name: 'Stephen Curry',         teamAbbreviation: 'GSW', shots: curry },
    { id: 2544,   name: 'LeBron James',           teamAbbreviation: 'LAL', shots: lebron },
    { id: 201142, name: 'Kevin Durant',           teamAbbreviation: 'PHX', shots: durant },
    { id: 203507, name: 'Giannis Antetokounmpo',  teamAbbreviation: 'MIL', shots: giannis },
    { id: 1629029,name: 'Luka Doncic',            teamAbbreviation: 'DAL', shots: luka },
    { id: 203999, name: 'Nikola Jokic',           teamAbbreviation: 'DEN', shots: jokic },
]

/** Find by name (case-insensitive partial match) */
export function findSamplePlayer(query: string): SamplePlayer | null {
    const q = query.toLowerCase().trim()
    return SAMPLE_PLAYERS.find(p =>
        p.name.toLowerCase().includes(q) ||
        p.name.toLowerCase().split(' ').some(part => part.startsWith(q))
    ) ?? null
}
