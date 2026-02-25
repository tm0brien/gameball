import type { SceneConfig } from 'engine/types'

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

export const demos: Demo[] = [
    { id: 'solar-system', label: 'Solar System', scene: solarSystem },
    { id: 'lissajous',    label: 'Lissajous',    scene: lissajous },
    { id: 'ripples',      label: 'Ripples',       scene: ripples }
]
