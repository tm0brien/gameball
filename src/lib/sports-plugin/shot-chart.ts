/**
 * Shot chart compiler — takes a ShotChartConfig and emits SceneObjects:
 *   - One dot per made shot (filled circle)
 *   - One ring per missed shot (stroked circle, no fill)
 *   - An optional flash ring that briefly expands on appearance (animated mode)
 *
 * All objects use formula-based positions so they scale with the canvas.
 * In animated mode each shot has a `visible` formula that reveals it at
 * the correct playback frame.
 *
 * Coordinate system: basketball world coords → canvas pixels via the same
 * formula helpers used in basketball.ts.
 */

import type { FormulaValue, SceneObject } from 'engine/types'
import type { ShotChartConfig, Shot } from './types'

const PAD = 40
const DEFAULT_FPS = 60
const DEFAULT_PLAYBACK_SPEED = 10     // game-seconds per playback-second
const DEFAULT_INTERVAL = 90           // frames between shots when no timing data
const DEFAULT_DOT_RADIUS = 4
const DEFAULT_MADE_COLOR = '#4ade80'
const DEFAULT_MISSED_COLOR = '#f87171'
const FLASH_DURATION = 24             // frames the flash ring lives
const FLASH_MAX_SCALE = 3.0           // how much bigger the flash ring gets

// ─── Coordinate helpers ───────────────────────────────────────────────────────

function scaleStr(courtW: number, courtH: number): string {
    return `min((width-${PAD})/${courtW},(height-${PAD})/${courtH})`
}

function fv(expr: string): FormulaValue { return { formula: expr } }

function makeCoord(S: string, variant: 'full' | 'half') {
    const ox = variant === 'half' ? `(width/2-23.5*${S})` : 'width/2'
    return {
        x: (wx: number) => wx === 0 ? fv(ox) : fv(`${ox}+${wx}*${S}`),
        y: (wy: number) => wy === 0 ? fv('height/2') : fv(`height/2-${wy}*${S}`),
        r: (wr: number) => fv(`${wr}*${S}`)
    }
}

// ─── Timing ───────────────────────────────────────────────────────────────────

function shotAppearFrame(
    shot: Shot,
    index: number,
    playbackSpeed: number,
    fps: number
): number {
    if (shot.quarter !== undefined && shot.gameClock !== undefined) {
        const parts = shot.gameClock.split(':').map(Number)
        const clockSeconds = parts[0] * 60 + (parts[1] ?? 0)
        const gameSeconds = (shot.quarter - 1) * 720 + (720 - clockSeconds)
        return Math.round((gameSeconds / playbackSpeed) * fps)
    }
    return index * DEFAULT_INTERVAL
}

// ─── Compiler ─────────────────────────────────────────────────────────────────

export function compileShotChart(
    config: ShotChartConfig,
    courtVariant: 'full' | 'half' = 'half'
): SceneObject[] {
    const {
        shots,
        mode = 'animated',
        playbackSpeed = DEFAULT_PLAYBACK_SPEED,
        fps = DEFAULT_FPS,
        madeColor = DEFAULT_MADE_COLOR,
        missedColor = DEFAULT_MISSED_COLOR,
        dotRadius = DEFAULT_DOT_RADIUS,
        showFlash = true
    } = config

    const courtW = courtVariant === 'half' ? 47 : 94
    const courtH = 50
    const S = scaleStr(courtW, courtH)
    const coord = makeCoord(S, courtVariant)

    const objects: SceneObject[] = []

    for (let i = 0; i < shots.length; i++) {
        const shot = shots[i]
        const appearFrame = mode === 'animated'
            ? shotAppearFrame(shot, i, playbackSpeed, fps)
            : 0

        const cx = coord.x(shot.x)
        const cy = coord.y(shot.y)
        const r = coord.r(dotRadius / 20)   // dotRadius is in px; we use a small world-unit size
        const rPx = fv(`${dotRadius}`)       // fixed pixel radius, looks consistent at any scale

        const visible = mode === 'animated' ? fv(`frame>=${appearFrame}`) : true

        if (shot.made) {
            // Solid filled dot
            objects.push({
                id: `shot_${i}_made`,
                type: 'ellipse',
                x: cx,
                y: cy,
                width: fv(`${dotRadius * 2}`),
                height: fv(`${dotRadius * 2}`),
                fill: madeColor,
                stroke: null,
                opacity: 0.85,
                visible,
                layer: 5
            })
        } else {
            // Ring — no fill, stroked
            objects.push({
                id: `shot_${i}_missed`,
                type: 'ellipse',
                x: cx,
                y: cy,
                width: fv(`${dotRadius * 2}`),
                height: fv(`${dotRadius * 2}`),
                fill: null,
                stroke: missedColor,
                strokeWidth: 1.5,
                opacity: 0.85,
                visible,
                layer: 5
            })
        }

        // Flash ring: expands from dot size and fades out on appearance
        if (mode === 'animated' && showFlash) {
            const endFrame = appearFrame + FLASH_DURATION
            objects.push({
                id: `shot_${i}_flash`,
                type: 'ellipse',
                x: cx,
                y: cy,
                // Grows from dotRadius*2 to dotRadius*2*FLASH_MAX_SCALE over FLASH_DURATION frames
                width: fv(`${dotRadius * 2} * (1 + ${FLASH_MAX_SCALE - 1} * min(1, max(0, (frame - ${appearFrame}) / ${FLASH_DURATION})))`),
                height: fv(`${dotRadius * 2} * (1 + ${FLASH_MAX_SCALE - 1} * min(1, max(0, (frame - ${appearFrame}) / ${FLASH_DURATION})))`),
                fill: null,
                stroke: shot.made ? madeColor : missedColor,
                strokeWidth: 1,
                // Fades from 0.7 to 0 over FLASH_DURATION frames
                opacity: fv(`max(0, 0.7 * (1 - (frame - ${appearFrame}) / ${FLASH_DURATION}))`),
                visible: fv(`frame>=${appearFrame} && frame<${endFrame}`),
                layer: 4
            })
        }
    }

    return objects
}
