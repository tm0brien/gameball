import type { AnimatableNumber, FormulaValue, SceneConfig, SceneObject } from 'engine/types'

import { compileShotChart } from './shot-chart'
import type { BasketballConfig, FormationPosition, TeamConfig } from './types'

// ─── NBA court constants (feet) ───────────────────────────────────────────────

const COURT_W = 94
const COURT_H = 50
const BASKET_X = 41.75        // from center (basket = 5.25ft inside baseline)
const BASKET_Y = 0
const PAINT_TOP_X = 28        // free throw line (19ft from baseline)
const PAINT_HALF_W = 8        // paint is 16ft wide
const FT_CIRCLE_R = 6
const TP_RADIUS = 23.75       // three-point arc radius
const TP_CORNER_Y = 22        // corner three-point line y value
const TP_CORNER_DX = Math.sqrt(TP_RADIUS ** 2 - TP_CORNER_Y ** 2) // ≈ 8.95
const TP_CORNER_X = BASKET_X - TP_CORNER_DX                       // ≈ 32.8
const RESTRICTED_R = 4
const BACKBOARD_X = 43
const BACKBOARD_HALF = 3

// Three-point arc angles in canvas space (Y is flipped: positive Y is downward)
// Right basket: arc sweeps through -π (left = court-facing) counterclockwise
const RIGHT_TP_START = Math.atan2(-TP_CORNER_Y, -TP_CORNER_DX)   // ≈ -1.959 rad
const RIGHT_TP_END   = Math.atan2( TP_CORNER_Y, -TP_CORNER_DX)   // ≈ +1.959 rad
// Left basket: arc sweeps through 0 (right = court-facing) clockwise
const LEFT_TP_START  = Math.atan2(-TP_CORNER_Y,  TP_CORNER_DX)   // ≈ -1.183 rad
const LEFT_TP_END    = Math.atan2( TP_CORNER_Y,  TP_CORNER_DX)   // ≈ +1.183 rad

const PAD = 40  // canvas padding (px)

// ─── Coordinate transform helpers ────────────────────────────────────────────

// Returns a formula string for the scale factor (world feet → canvas pixels)
function scaleStr(courtW: number, courtH: number, pad = PAD): string {
    return `min((width-${pad})/${courtW},(height-${pad})/${courtH})`
}

function fv(expr: string): FormulaValue { return { formula: expr } }

// Helpers that produce AnimatableNumber formula values for a given court scale string
function makeCoord(S: string, originX = 'width/2', originY = 'height/2') {
    return {
        // World X → canvas X
        x: (wx: number): AnimatableNumber => wx === 0 ? fv(originX) : fv(`${originX}+${wx}*${S}`),
        // World Y → canvas Y (Y-axis is flipped)
        y: (wy: number): AnimatableNumber => wy === 0 ? fv(originY) : fv(`${originY}-${wy}*${S}`),
        // World length → canvas pixels
        w: (wl: number): AnimatableNumber => fv(`${wl}*${S}`),
        // Scale string (for arc radii etc.)
        S
    }
}

function makeFull() {
    return makeCoord(scaleStr(COURT_W, COURT_H))
}

// Half court: right side (x: 0 to 47), centered at x=23.5
function makeHalf() {
    const S = scaleStr(COURT_W / 2, COURT_H)
    return makeCoord(S, `width/2+(0-23.5)*${S}`, 'height/2')
}

// ─── Formation positions (world coords, right half) ──────────────────────────

const FORMATIONS: Record<string, FormationPosition[]> = {
    // Offense
    '5-out': [
        { x: 19, y: 0 },   // PG top of key
        { x: 25, y: 17 },  // SG right wing
        { x: 25, y: -17 }, // SF left wing
        { x: 36, y: 22 },  // PF right corner
        { x: 36, y: -22 }  // C left corner
    ],
    '4-1': [
        { x: 19, y: 0 },
        { x: 27, y: 14 },
        { x: 27, y: -14 },
        { x: 36, y: 21 },
        { x: 37, y: 0 }   // post
    ],
    // Defense
    'man-to-man': [
        { x: 20, y: 1 },
        { x: 26, y: 15 },
        { x: 26, y: -15 },
        { x: 37, y: 21 },
        { x: 37, y: -21 }
    ],
    'zone-2-3': [
        { x: 26, y: 7 },
        { x: 26, y: -7 },
        { x: 36, y: 18 },
        { x: 39, y: 0 },
        { x: 36, y: -18 }
    ],
    'zone-3-2': [
        { x: 25, y: 15 },
        { x: 22, y: 0 },
        { x: 25, y: -15 },
        { x: 37, y: 9 },
        { x: 37, y: -9 }
    ]
}

export const BASKETBALL_FORMATIONS = FORMATIONS

// ─── Court objects ────────────────────────────────────────────────────────────

function buildCourt(variant: 'full' | 'half', courtColor: string, lineColor: string): SceneObject[] {
    const c = variant === 'half' ? makeHalf() : makeFull()
    const isHalf = variant === 'half'
    const totalW = isHalf ? COURT_W / 2 : COURT_W
    const objects: SceneObject[] = []

    // Court surface + boundary
    objects.push({
        id: 'court_surface', type: 'rect',
        x: c.x(isHalf ? 23.5 : 0), y: c.y(0),
        width: c.w(totalW), height: c.w(COURT_H),
        fill: courtColor, stroke: lineColor, strokeWidth: 2,
        layer: 0
    })

    // Half-court line (only on full court)
    if (!isHalf) {
        objects.push({
            id: 'court_halfline', type: 'line',
            x: c.x(0), y: c.y(-COURT_H / 2),
            x2: c.x(0), y2: c.y(COURT_H / 2),
            stroke: lineColor, strokeWidth: 2, layer: 1
        })
        // Center circle
        objects.push({
            id: 'court_center_circle', type: 'arc',
            x: c.x(0), y: c.y(0),
            radiusX: c.w(FT_CIRCLE_R),
            startAngle: 0, endAngle: Math.PI * 2,
            fill: null, stroke: lineColor, strokeWidth: 2, layer: 1
        })
    }

    // Paint areas and markings for each side
    const sides: Array<{ suffix: string; sign: 1 | -1 }> = isHalf
        ? [{ suffix: 'r', sign: 1 }]
        : [{ suffix: 'r', sign: 1 }, { suffix: 'l', sign: -1 }]

    for (const { suffix, sign } of sides) {
        const bx = sign * BASKET_X
        const paintCenterX = sign * (BASKET_X - (BASKET_X - PAINT_TOP_X) / 2)  // midpoint of paint depth

        // Paint (key)
        objects.push({
            id: `court_paint_${suffix}`, type: 'rect',
            x: c.x(paintCenterX), y: c.y(0),
            width: c.w(BASKET_X - PAINT_TOP_X), height: c.w(PAINT_HALF_W * 2),
            fill: shadeColor(courtColor, -8), stroke: lineColor, strokeWidth: 2, layer: 1
        })

        // Free throw circle
        objects.push({
            id: `court_ft_circle_${suffix}`, type: 'arc',
            x: c.x(sign * PAINT_TOP_X), y: c.y(0),
            radiusX: c.w(FT_CIRCLE_R),
            startAngle: 0, endAngle: Math.PI * 2,
            fill: null, stroke: lineColor, strokeWidth: 2, layer: 1
        })

        // Three-point corner lines (y = ±TP_CORNER_Y, from baseline inward to arc junction)
        for (const ySide of [1, -1]) {
            const cornerY = ySide * TP_CORNER_Y
            objects.push({
                id: `court_tp_corner_${suffix}_${ySide > 0 ? 't' : 'b'}`, type: 'line',
                x: c.x(sign * COURT_W / 2), y: c.y(cornerY),
                x2: c.x(sign * TP_CORNER_X), y2: c.y(cornerY),
                stroke: lineColor, strokeWidth: 2, layer: 1
            })
        }

        // Three-point arc
        objects.push({
            id: `court_tp_arc_${suffix}`, type: 'arc',
            x: c.x(bx), y: c.y(BASKET_Y),
            radiusX: c.w(TP_RADIUS),
            startAngle: sign > 0 ? RIGHT_TP_START : LEFT_TP_START,
            endAngle: sign > 0 ? RIGHT_TP_END : LEFT_TP_END,
            counterclockwise: sign > 0 ? true : false,
            fill: null, stroke: lineColor, strokeWidth: 2, layer: 1
        })

        // Restricted area arc
        objects.push({
            id: `court_restricted_${suffix}`, type: 'arc',
            x: c.x(bx), y: c.y(BASKET_Y),
            radiusX: c.w(RESTRICTED_R),
            startAngle: sign > 0 ? -Math.PI / 2 : Math.PI / 2,
            endAngle: sign > 0 ? Math.PI / 2 : -Math.PI / 2,
            counterclockwise: sign > 0 ? true : false,
            fill: null, stroke: lineColor, strokeWidth: 1.5, layer: 1
        })

        // Backboard
        objects.push({
            id: `court_backboard_${suffix}`, type: 'line',
            x: c.x(sign * BACKBOARD_X), y: c.y(BACKBOARD_HALF),
            x2: c.x(sign * BACKBOARD_X), y2: c.y(-BACKBOARD_HALF),
            stroke: lineColor, strokeWidth: 3, layer: 1
        })

        // Rim
        objects.push({
            id: `court_rim_${suffix}`, type: 'ellipse',
            x: c.x(bx), y: c.y(BASKET_Y),
            width: c.w(1.5), height: c.w(1.5),
            fill: null, stroke: '#e05820', strokeWidth: 2, layer: 2
        })
    }

    return objects
}

// ─── Players and ball ─────────────────────────────────────────────────────────

function buildTeam(team: TeamConfig, courtVariant: 'full' | 'half', isHome: boolean): SceneObject[] {
    const c = courtVariant === 'half' ? makeHalf() : makeFull()
    const count = Math.min(team.players, 5)
    const formationName = team.formation ?? (isHome ? '5-out' : 'man-to-man')
    const positions = FORMATIONS[formationName] ?? FORMATIONS['5-out']
    const objects: SceneObject[] = []

    for (let i = 0; i < count; i++) {
        const pos = positions[i] ?? positions[0]
        // Away team mirrors to left side (negate x)
        const wx = isHome ? pos.x : -pos.x
        const wy = pos.y
        const playerId = `${team.id}.player${i + 1}`

        objects.push({
            id: playerId, type: 'agent',
            x: c.x(wx), y: c.y(wy),
            width: 16, height: 16,
            fill: team.color,
            stroke: null,
            opacity: 0.95,
            layer: 3,
            mass: 1.0,
            maxSpeed: 3.5,
            maxForce: 0.25,
            damping: 0.82,
            behaviors: []
        })
    }

    return objects
}

function buildBall(config: BasketballConfig, courtVariant: 'full' | 'half'): SceneObject {
    const c = courtVariant === 'half' ? makeHalf() : makeFull()
    const ballColor = config.ball?.color ?? '#ff8c00'
    const ballId = config.ball?.id ?? 'ball'
    const possession = config.ball?.possession ?? `${(config.teams ?? [])[0]?.id}.player1`

    // Initial ball position: near the first possession holder's formation spot
    const possessionFormation = FORMATIONS['5-out'][0]
    const bx = c.x(possessionFormation.x)
    const by = c.y(possessionFormation.y)

    return {
        id: ballId, type: 'agent',
        x: bx, y: by,
        width: 12, height: 12,
        fill: ballColor,
        stroke: '#cc6600',
        strokeWidth: 1.5,
        opacity: 1,
        layer: 4,
        mass: 0.3,
        maxSpeed: 9.0,
        maxForce: 1.2,
        damping: 0.75,
        behaviors: possession ? [{ type: 'arrive', target: possession, slowRadius: 6, weight: 1.0 }] : []
    }
}

// ─── Main compiler ────────────────────────────────────────────────────────────

export function compileBasketball(config: BasketballConfig): SceneConfig {
    const variant = config.court.variant ?? 'half'
    const courtColor = config.court.color ?? '#c8a96e'
    const lineColor = config.court.lineColor ?? '#ffffff'

    const courtObjects = buildCourt(variant, courtColor, lineColor)

    const teamObjects: SceneObject[] = []
    const teams = config.teams ?? []
    teams.forEach((team, i) => {
        teamObjects.push(...buildTeam(team, variant, i === 0))
    })

    const ballObject = config.ball !== undefined || teams.length > 0
        ? buildBall(config, variant)
        : null

    const shotChartObjects: SceneObject[] = config.shotChart
        ? compileShotChart(config.shotChart, variant)
        : []

    return {
        background: '#1a1a2e',
        width: 800,
        height: 600,
        fps: 60,
        objects: [
            ...courtObjects,
            ...teamObjects,
            ...(ballObject ? [ballObject] : []),
            ...shotChartObjects
        ],
        courtTransform: { sport: 'basketball', variant }
    }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

// Slightly darken/lighten a hex color for paint area
function shadeColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16)
    const r = Math.min(255, Math.max(0, (num >> 16) + percent))
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent))
    const b = Math.min(255, Math.max(0, (num & 0xff) + percent))
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
}
