import type { SceneConfig } from 'engine/types'
import { compile } from './sports-plugin'
import type { ShotChartConfig } from './sports-plugin'

export interface Demo {
    id: string
    label: string
    scene: SceneConfig
}

const solarSystem: SceneConfig = {
    background: '#05050f',
    fps: 60,
    objects: [
        // Orbit rings
        {
            id: 'ring1', type: 'ellipse',
            x: { formula: 'width / 2' }, y: { formula: 'height / 2' },
            width: { formula: 'min(width, height) * 0.44' },
            height: { formula: 'min(width, height) * 0.44' },
            fill: null, stroke: '#ffffff', strokeWidth: 1,
            opacity: 0.07, layer: 0
        },
        {
            id: 'ring2', type: 'ellipse',
            x: { formula: 'width / 2' }, y: { formula: 'height / 2' },
            width: { formula: 'min(width, height) * 0.72' },
            height: { formula: 'min(width, height) * 0.72' },
            fill: null, stroke: '#ffffff', strokeWidth: 1,
            opacity: 0.07, layer: 0
        },
        {
            id: 'ring3', type: 'ellipse',
            x: { formula: 'width / 2' }, y: { formula: 'height / 2' },
            width: { formula: 'min(width, height) * 0.96' },
            height: { formula: 'min(width, height) * 0.7' },
            fill: null, stroke: '#ffffff', strokeWidth: 1,
            opacity: 0.07, layer: 0
        },
        // Sun glow
        {
            id: 'sun_glow', type: 'ellipse',
            x: { formula: 'width / 2' }, y: { formula: 'height / 2' },
            width: { formula: '72 + 10 * sin(frame * 0.04)' },
            height: { formula: '72 + 10 * sin(frame * 0.04)' },
            fill: '#f5a020', stroke: null,
            opacity: { formula: '0.18 + 0.06 * sin(frame * 0.04)' },
            layer: 1
        },
        // Sun
        {
            id: 'sun', type: 'ellipse',
            x: { formula: 'width / 2' }, y: { formula: 'height / 2' },
            width: 44, height: 44,
            fill: '#f9d060', stroke: '#f5a020', strokeWidth: 2,
            opacity: 1, layer: 2
        },
        // Planet 1 — blue, inner orbit
        {
            id: 'p1', type: 'ellipse',
            x: { formula: 'width / 2 + cos(frame * 0.022) * min(width, height) * 0.22' },
            y: { formula: 'height / 2 + sin(frame * 0.022) * min(width, height) * 0.22' },
            width: 16, height: 16,
            fill: '#4a9eff', stroke: null, opacity: 1, layer: 3,
            trail: { length: 55, color: '#4a9eff', opacity: 0.5, width: 2 }
        },
        // Planet 1 moon
        {
            id: 'm1', type: 'ellipse',
            parent: 'p1',
            x: { formula: 'objects.p1.x + cos(frame * 0.1) * 24' },
            y: { formula: 'objects.p1.y + sin(frame * 0.1) * 24' },
            width: 5, height: 5,
            fill: '#8ab8f0', stroke: null, opacity: 0.9, layer: 3
        },
        // Planet 2 — orange-red, outer orbit, elliptical
        {
            id: 'p2', type: 'ellipse',
            x: { formula: 'width / 2 + cos(frame * 0.012 + 1.2) * min(width, height) * 0.36' },
            y: { formula: 'height / 2 + sin(frame * 0.012 + 1.2) * min(width, height) * 0.26' },
            width: 24, height: 24,
            fill: '#e05838', stroke: null, opacity: 1, layer: 3,
            trail: { length: 80, color: '#e05838', opacity: 0.45, width: 2 }
        },
        // Planet 2 moon
        {
            id: 'm2', type: 'ellipse',
            parent: 'p2',
            x: { formula: 'objects.p2.x + cos(frame * 0.07 + 0.5) * 32' },
            y: { formula: 'objects.p2.y + sin(frame * 0.07 + 0.5) * 32' },
            width: 7, height: 7,
            fill: '#d09080', stroke: null, opacity: 0.85, layer: 3
        },
        // Planet 3 — purple, retrograde, outermost
        {
            id: 'p3', type: 'ellipse',
            x: { formula: 'width / 2 + cos(-frame * 0.008 + 3.5) * min(width, height) * 0.48' },
            y: { formula: 'height / 2 + sin(-frame * 0.008 + 3.5) * min(width, height) * 0.35' },
            width: 19, height: 19,
            fill: '#9b7fe8', stroke: null, opacity: 1, layer: 3,
            trail: { length: 60, color: '#9b7fe8', opacity: 0.4, width: 1.5 }
        }
    ]
}

const lissajous: SceneConfig = {
    background: '#050510',
    fps: 60,
    objects: [
        {
            id: 'cursor', type: 'ellipse',
            x: { formula: 'width / 2 + sin(frame * 0.027) * width * 0.38' },
            y: { formula: 'height / 2 + sin(frame * 0.041 + PI / 2) * height * 0.38' },
            width: 10, height: 10,
            fill: '#4affcc', stroke: null, opacity: 1, layer: 2,
            trail: { length: 400, color: '#4affcc', opacity: 0.7, width: 1.5 }
        },
        {
            id: 'cursor2', type: 'ellipse',
            x: { formula: 'width / 2 + sin(frame * 0.019 + 1) * width * 0.3' },
            y: { formula: 'height / 2 + sin(frame * 0.031 + PI / 3) * height * 0.3' },
            width: 7, height: 7,
            fill: '#ff6ef7', stroke: null, opacity: 0.8, layer: 2,
            trail: { length: 300, color: '#ff6ef7', opacity: 0.5, width: 1 }
        }
    ]
}

const ripples: SceneConfig = {
    background: '#020810',
    fps: 60,
    objects: [
        // Center point
        {
            id: 'center', type: 'ellipse',
            x: { formula: 'width / 2' }, y: { formula: 'height / 2' },
            width: 8, height: 8,
            fill: '#4a9eff', stroke: null, opacity: 1, layer: 2
        },
        // 4 ripple rings offset by phase
        ...[0, 0.25, 0.5, 0.75].map((phase, i) => ({
            id: `ripple${i}`, type: 'ellipse' as const,
            x: { formula: 'width / 2' }, y: { formula: 'height / 2' },
            width: { formula: `(mod(frame * 0.008 + ${phase}, 1)) * min(width, height) * 0.9` },
            height: { formula: `(mod(frame * 0.008 + ${phase}, 1)) * min(width, height) * 0.9` },
            fill: null,
            stroke: '#4a9eff',
            strokeWidth: 1.5,
            opacity: { formula: `(1 - mod(frame * 0.008 + ${phase}, 1)) * 0.7` },
            layer: 1
        })),
        // Labels
        {
            id: 'label', type: 'text',
            x: { formula: 'width / 2' }, y: { formula: 'height - 32' },
            text: 'ripples',
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fill: '#4a9eff',
            opacity: 0.35,
            layer: 3
        }
    ]
}

const BOID_COUNT = 40

const boidColors = ['#4a9eff', '#4affcc', '#ff6ef7', '#f9d060', '#e05838']

const boids: SceneConfig = {
    background: '#05050f',
    fps: 60,
    objects: [
        // Subtle boundary indicator
        {
            id: 'boundary', type: 'rect',
            x: { formula: 'width / 2' }, y: { formula: 'height / 2' },
            width: { formula: 'width - 40' }, height: { formula: 'height - 40' },
            fill: null, stroke: '#ffffff', strokeWidth: 1,
            opacity: 0.06, layer: 0
        },
        // Label
        {
            id: 'label', type: 'text',
            x: { formula: 'width / 2' }, y: { formula: 'height - 20' },
            text: 'boids — separation · alignment · cohesion',
            fontSize: 12,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fill: '#4a9eff',
            opacity: 0.3,
            layer: 3
        },
        // Boids
        ...Array.from({ length: BOID_COUNT }, (_, i) => ({
            id: `boid${i}`,
            type: 'agent' as const,
            x: 100 + (i % 8) * 80,
            y: 80 + Math.floor(i / 8) * 80,
            width: 10,
            height: 10,
            fill: boidColors[i % boidColors.length],
            stroke: null,
            opacity: 0.85,
            layer: 2,
            mass: 1.0,
            maxSpeed: 3.0,
            maxForce: 0.15,
            edges: 'wrap' as const,
            vx: (Math.cos(i * 0.8) * 2),
            vy: (Math.sin(i * 0.8) * 2),
            behaviors: [
                { type: 'separate' as const, radius: 28, weight: 1.5 },
                { type: 'align' as const,    radius: 60, weight: 1.0 },
                { type: 'cohere' as const,   radius: 80, weight: 0.8 },
                { type: 'wander' as const,   strength: 0.2, speed: 0.4, weight: 0.3 }
            ],
            trail: { length: 18, color: boidColors[i % boidColors.length], opacity: 0.25, width: 1.5 }
        }))
    ]
}

const basketball = compile({
    sport: 'basketball',
    court: { variant: 'half', color: '#c8a96e', lineColor: '#f0f0e8' },
    teams: [
        { id: 'home', color: '#4a9eff', players: 5, formation: '5-out' },
        { id: 'away', color: '#e07040', players: 5, formation: 'zone-2-3' }
    ],
    ball: { color: '#ff8c00', possession: 'home.player1' }
})

// ─── Shot chart demo ─────────────────────────────────────────────────────────
// Realistic shot distribution for a guard-type player (20 shots, animated)

const shotChartData: ShotChartConfig = {
    mode: 'animated',
    playbackSpeed: 8,
    fps: 60,
    madeColor: '#4ade80',
    missedColor: '#f87171',
    dotRadius: 5,
    showFlash: true,
    shots: [
        // Q1 — opening burst
        { x: 40,   y:  1.5, made: true,  shotType: 'layup',         quarter: 1, gameClock: '10:44' },
        { x: 36,   y:  8,   made: false, shotType: 'mid-range',     quarter: 1, gameClock: '9:51' },
        { x: 22,   y:  -1,  made: true,  shotType: 'three-pointer', quarter: 1, gameClock: '8:29' },
        { x: 32,   y: -11,  made: true,  shotType: 'mid-range',     quarter: 1, gameClock: '7:13' },
        { x: 20,   y:  12,  made: false, shotType: 'three-pointer', quarter: 1, gameClock: '6:02' },
        // Q2
        { x: 39,   y:  3,   made: true,  shotType: 'layup',         quarter: 2, gameClock: '11:14' },
        { x: 26,   y: -14,  made: true,  shotType: 'three-pointer', quarter: 2, gameClock: '9:43' },
        { x: 34,   y:  9,   made: false, shotType: 'mid-range',     quarter: 2, gameClock: '8:07' },
        { x: 21,   y:  0,   made: true,  shotType: 'three-pointer', quarter: 2, gameClock: '6:38' },
        { x: 38,   y: -4,   made: false, shotType: 'floater',       quarter: 2, gameClock: '5:21' },
        { x: 28,   y:  11,  made: true,  shotType: 'mid-range',     quarter: 2, gameClock: '3:55' },
        { x: 24,   y: -8,   made: false, shotType: 'three-pointer', quarter: 2, gameClock: '2:14' },
        // Q3 — hot stretch
        { x: 22,   y:  14,  made: true,  shotType: 'three-pointer', quarter: 3, gameClock: '10:30' },
        { x: 22,   y: -14,  made: true,  shotType: 'three-pointer', quarter: 3, gameClock: '9:02' },
        { x: 37,   y:  6,   made: true,  shotType: 'mid-range',     quarter: 3, gameClock: '7:48' },
        { x: 41,   y: -2,   made: false, shotType: 'layup',         quarter: 3, gameClock: '6:17' },
        { x: 29,   y:  0,   made: true,  shotType: 'mid-range',     quarter: 3, gameClock: '4:44' },
        // Q4 — late game
        { x: 22,   y:  4,   made: false, shotType: 'three-pointer', quarter: 4, gameClock: '8:11' },
        { x: 35,   y: -9,   made: true,  shotType: 'mid-range',     quarter: 4, gameClock: '5:33' },
        { x: 22,   y: -12,  made: true,  shotType: 'three-pointer', quarter: 4, gameClock: '2:05' },
    ]
}

const shotChart = compile({
    sport: 'basketball',
    court: { variant: 'half', color: '#c8a96e', lineColor: '#f0f0e8' },
    shotChart: shotChartData
})

export const demos: Demo[] = [
    { id: 'solar-system', label: 'Solar System', scene: solarSystem },
    { id: 'lissajous',    label: 'Lissajous',    scene: lissajous },
    { id: 'ripples',      label: 'Ripples',       scene: ripples },
    { id: 'boids',        label: 'Boids',         scene: boids },
    { id: 'basketball',   label: 'Basketball',    scene: basketball },
    { id: 'shot-chart',   label: 'Shot Chart',    scene: shotChart }
]
