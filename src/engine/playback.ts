/**
 * Data-driven playback: event processing and keyframe interpolation.
 *
 * Called once per frame, before resolveScene, to inject behavior overrides and
 * keyframe positions into the agent states map. resolveScene then uses those
 * injected values instead of the object's static behaviors/position.
 */

import type { AgentState, BehaviorConfig, CourtTransform, GameEvent, Keyframe } from './types'

// ─── Coordinate transform ─────────────────────────────────────────────────────

/**
 * Convert real-world coordinates (feet for basketball) to canvas pixels.
 * Uses the same transform logic as the formula strings in basketball.ts.
 */
export function worldToCanvas(
    wx: number,
    wy: number,
    transform: CourtTransform,
    canvasW: number,
    canvasH: number
): { x: number; y: number } {
    const pad = 40
    const courtW = transform.variant === 'half' ? 47 : 94
    const courtH = 50
    const scale = Math.min((canvasW - pad) / courtW, (canvasH - pad) / courtH)
    // For half court, x=0 (center) maps to left of visible area (origin shifted by 23.5ft)
    const ox = transform.variant === 'half' ? canvasW / 2 - 23.5 * scale : canvasW / 2
    return { x: ox + wx * scale, y: canvasH / 2 - wy * scale }
}

// ─── Event processing ─────────────────────────────────────────────────────────

/**
 * Apply all events whose frame matches the current frame.
 * Mutates agentStates in place by injecting behaviorOverride values.
 */
export function processEvents(
    events: GameEvent[],
    frame: number,
    agentStates: Map<string, AgentState>,
    transform: CourtTransform | undefined,
    canvasW: number,
    canvasH: number
): void {
    for (const event of events) {
        if (event.frame !== frame) continue
        applyEvent(event, agentStates, transform, canvasW, canvasH)
    }
}

function setBehaviorOverride(
    agentStates: Map<string, AgentState>,
    id: string,
    behaviors: BehaviorConfig[]
): void {
    const state = agentStates.get(id)
    if (state) {
        state.behaviorOverride = behaviors
    } else {
        // Agent not yet in states — create a placeholder; positions will come from object spec
        agentStates.set(id, { x: 0, y: 0, vx: 0, vy: 0, wanderAngle: 0, pathIndex: 0, behaviorOverride: behaviors })
    }
}

function applyEvent(
    event: GameEvent,
    agentStates: Map<string, AgentState>,
    transform: CourtTransform | undefined,
    canvasW: number,
    canvasH: number
): void {
    switch (event.type) {
        case 'possession': {
            const agentId = event.agent as string
            const ballId = (event.ball as string | undefined) ?? 'ball'
            setBehaviorOverride(agentStates, ballId, [
                { type: 'arrive', target: agentId, slowRadius: 6, weight: 1.0 }
            ])
            break
        }
        case 'pass': {
            const to = event.to as string
            const ballId = 'ball'
            // Ball flies to recipient; mark recipient as having possession
            setBehaviorOverride(agentStates, ballId, [
                { type: 'fast_break', target: to, weight: 1.0 }
            ])
            break
        }
        case 'shot': {
            const ballId = 'ball'
            const wx = event.x as number | undefined
            const wy = event.y as number | undefined
            if (wx !== undefined && wy !== undefined && transform) {
                const canvasPos = worldToCanvas(wx, wy, transform, canvasW, canvasH)
                setBehaviorOverride(agentStates, ballId, [
                    { type: 'fast_break', target: canvasPos, weight: 1.0 }
                ])
            }
            break
        }
        case 'timeout': {
            // All agents hold position: inject empty behavior override so damping brings them to rest
            for (const state of agentStates.values()) {
                state.behaviorOverride = []
            }
            break
        }
        // Other event types (score, foul, etc.) don't require physics changes — ignored for now
    }
}

// ─── Keyframe processing ──────────────────────────────────────────────────────

/**
 * For each agent that has keyframe data, inject an interpolated canvas position
 * into its AgentState. resolveScene will skip steering physics for those agents.
 */
export function processKeyframes(
    keyframes: Keyframe[],
    frame: number,
    agentStates: Map<string, AgentState>,
    transform: CourtTransform,
    canvasW: number,
    canvasH: number
): void {
    const byAgent = groupByAgent(keyframes)

    for (const [agentId, frames] of byAgent) {
        const worldPos = interpolateKeyframe(frames, frame)
        if (!worldPos) continue

        const canvasPos = worldToCanvas(worldPos.x, worldPos.y, transform, canvasW, canvasH)
        const state = agentStates.get(agentId)
        if (state) {
            state.keyframePos = canvasPos
        } else {
            agentStates.set(agentId, {
                x: canvasPos.x, y: canvasPos.y, vx: 0, vy: 0,
                wanderAngle: 0, pathIndex: 0,
                keyframePos: canvasPos
            })
        }
    }
}

function groupByAgent(keyframes: Keyframe[]): Map<string, Keyframe[]> {
    const map = new Map<string, Keyframe[]>()
    for (const kf of keyframes) {
        let arr = map.get(kf.agent)
        if (!arr) { arr = []; map.set(kf.agent, arr) }
        arr.push(kf)
    }
    // Sort each agent's keyframes by frame
    for (const arr of map.values()) arr.sort((a, b) => a.frame - b.frame)
    return map
}

function interpolateKeyframe(
    frames: Keyframe[],
    frame: number
): { x: number; y: number } | null {
    if (frames.length === 0) return null

    // Before first keyframe — hold first position
    if (frame <= frames[0].frame) return { x: frames[0].x, y: frames[0].y }

    // After last keyframe — agent falls back to behaviors (return null)
    if (frame > frames[frames.length - 1].frame) return null

    // Find bracketing keyframes
    let lo = 0
    for (let i = 0; i < frames.length - 1; i++) {
        if (frames[i].frame <= frame && frames[i + 1].frame >= frame) { lo = i; break }
    }
    const a = frames[lo]
    const b = frames[lo + 1]
    if (a.frame === b.frame) return { x: a.x, y: a.y }

    const t = (frame - a.frame) / (b.frame - a.frame)
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

// ─── NBA Stats API transform ──────────────────────────────────────────────────

const BASKET_X = 41.75  // feet from center court to the basket (NBA court)

/**
 * Convert NBA Stats API shot coordinates to Gameball basketball world coordinates.
 *
 * NBA Stats LOC_X / LOC_Y are in tenths of feet, measured from the basket:
 *   LOC_X — lateral (0 = center under basket, negative = left, positive = right)
 *   LOC_Y — depth toward half court (0 = at basket level, positive = toward center)
 *
 * Gameball coordinate system (feet, origin at center court):
 *   x — baseline to baseline (-47 to +47), positive toward right basket
 *   y — sideline to sideline (-25 to +25)
 *
 * For the right basket (home team, positive x side):
 *   world x = BASKET_X - LOC_Y / 10
 *   world y = LOC_X / 10
 *
 * For the left basket (away team, negative x side):
 *   world x = -(BASKET_X - LOC_Y / 10)
 *   world y = -(LOC_X / 10)
 */
export function transformNBAStatsShot(
    locX: number,
    locY: number,
    side: 'right' | 'left' = 'right'
): { x: number; y: number } {
    const wx = BASKET_X - locY / 10
    const wy = locX / 10
    return side === 'right' ? { x: wx, y: wy } : { x: -wx, y: -wy }
}
