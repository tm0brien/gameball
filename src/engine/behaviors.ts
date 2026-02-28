import type { AgentObject, AgentState, BehaviorConfig, ZoneConfig } from './types'

// ─── Vector helpers ───────────────────────────────────────────────────────────

interface Vec2 { x: number; y: number }

function add(a: Vec2, b: Vec2): Vec2 { return { x: a.x + b.x, y: a.y + b.y } }
function sub(a: Vec2, b: Vec2): Vec2 { return { x: a.x - b.x, y: a.y - b.y } }
function scale(v: Vec2, s: number): Vec2 { return { x: v.x * s, y: v.y * s } }
function length(v: Vec2): number { return Math.sqrt(v.x * v.x + v.y * v.y) }
function normalize(v: Vec2): Vec2 {
    const len = length(v)
    return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len }
}
function clampMag(v: Vec2, max: number): Vec2 {
    const len = length(v)
    return len > max ? scale(normalize(v), max) : v
}
function dist(a: Vec2, b: Vec2): number { return length(sub(a, b)) }
function zero(): Vec2 { return { x: 0, y: 0 } }

// ─── Target resolution ────────────────────────────────────────────────────────

function resolveTarget(
    target: string | { x: number; y: number },
    agentSnapshots: ReadonlyMap<string, AgentState>,
    resolvedObjects: Record<string, { x: number; y: number }>
): Vec2 | null {
    if (typeof target !== 'string') return target
    const snap = agentSnapshots.get(target)
    if (snap) return { x: snap.x, y: snap.y }
    const obj = resolvedObjects[target]
    return obj ? { x: obj.x, y: obj.y } : null
}

// ─── Steering behaviors ───────────────────────────────────────────────────────

function seek(state: AgentState, target: Vec2, maxSpeed: number): Vec2 {
    const desired = scale(normalize(sub(target, state)), maxSpeed)
    return sub(desired, { x: state.vx, y: state.vy })
}

function flee(state: AgentState, target: Vec2, maxSpeed: number, radius?: number): Vec2 {
    if (radius !== undefined && dist(state, target) > radius) return zero()
    const desired = scale(normalize(sub(state, target)), maxSpeed)
    return sub(desired, { x: state.vx, y: state.vy })
}

function arrive(state: AgentState, target: Vec2, maxSpeed: number, slowRadius: number): Vec2 {
    const d = dist(state, target)
    if (d < 1) return zero()
    const speed = d < slowRadius ? maxSpeed * (d / slowRadius) : maxSpeed
    const desired = scale(normalize(sub(target, state)), speed)
    return sub(desired, { x: state.vx, y: state.vy })
}

function pursue(state: AgentState, targetState: AgentState, maxSpeed: number): Vec2 {
    const d = dist(state, targetState)
    const t = d / (maxSpeed + 0.001)
    const future = { x: targetState.x + targetState.vx * t, y: targetState.y + targetState.vy * t }
    return seek(state, future, maxSpeed)
}

function evade(state: AgentState, targetState: AgentState, maxSpeed: number, radius?: number): Vec2 {
    if (radius !== undefined && dist(state, targetState) > radius) return zero()
    const d = dist(state, targetState)
    const t = d / (maxSpeed + 0.001)
    const future = { x: targetState.x + targetState.vx * t, y: targetState.y + targetState.vy * t }
    return flee(state, future, maxSpeed)
}

// Mutates state.wanderAngle — called with the per-agent mutable copy
function wander(state: AgentState, strength: number, speedMult: number, maxSpeed: number): Vec2 {
    state.wanderAngle += (Math.random() - 0.5) * strength
    const vel = normalize({ x: state.vx, y: state.vy })
    const circleCenter = add(state, scale(vel, 40))
    const displacement = { x: Math.cos(state.wanderAngle) * 30, y: Math.sin(state.wanderAngle) * 30 }
    return seek(state, add(circleCenter, displacement), maxSpeed * speedMult)
}

function separate(
    state: AgentState,
    id: string,
    agentSnapshots: ReadonlyMap<string, AgentState>,
    radius: number,
    maxSpeed: number
): Vec2 {
    let steer = zero()
    let count = 0
    for (const [otherId, other] of agentSnapshots) {
        if (otherId === id) continue
        const d = dist(state, other)
        if (d > 0 && d < radius) {
            steer = add(steer, scale(normalize(sub(state, other)), 1 / d))
            count++
        }
    }
    if (count === 0) return zero()
    steer = scale(steer, 1 / count)
    return sub(scale(normalize(steer), maxSpeed), { x: state.vx, y: state.vy })
}

function align(
    state: AgentState,
    id: string,
    agentSnapshots: ReadonlyMap<string, AgentState>,
    radius: number,
    maxSpeed: number
): Vec2 {
    let sum = zero()
    let count = 0
    for (const [otherId, other] of agentSnapshots) {
        if (otherId === id) continue
        if (dist(state, other) < radius) {
            sum = add(sum, { x: other.vx, y: other.vy })
            count++
        }
    }
    if (count === 0) return zero()
    sum = scale(sum, 1 / count)
    return sub(scale(normalize(sum), maxSpeed), { x: state.vx, y: state.vy })
}

function cohere(
    state: AgentState,
    id: string,
    agentSnapshots: ReadonlyMap<string, AgentState>,
    radius: number,
    maxSpeed: number
): Vec2 {
    let center = zero()
    let count = 0
    for (const [otherId, other] of agentSnapshots) {
        if (otherId === id) continue
        if (dist(state, other) < radius) {
            center = add(center, { x: other.x, y: other.y })
            count++
        }
    }
    if (count === 0) return zero()
    return seek(state, scale(center, 1 / count), maxSpeed)
}

// Mutates state.pathIndex
function followPath(
    state: AgentState,
    path: Array<{ x: number; y: number }>,
    loop: boolean,
    maxSpeed: number
): Vec2 {
    if (path.length === 0) return zero()
    const target = path[state.pathIndex]
    if (dist(state, target) < 20) {
        const next = state.pathIndex + 1
        state.pathIndex = next >= path.length ? (loop ? 0 : state.pathIndex) : next
    }
    return seek(state, path[state.pathIndex], maxSpeed)
}

function maintainZone(state: AgentState, zone: ZoneConfig, maxSpeed: number): Vec2 {
    if (zone.shape === 'circle') {
        if (dist(state, zone) <= zone.radius) return zero()
        return seek(state, zone, maxSpeed)
    }
    const left = zone.x - zone.width / 2
    const right = zone.x + zone.width / 2
    const top = zone.y - zone.height / 2
    const bottom = zone.y + zone.height / 2
    const inside = state.x >= left && state.x <= right && state.y >= top && state.y <= bottom
    if (inside) return zero()
    const nearest = { x: Math.max(left, Math.min(right, state.x)), y: Math.max(top, Math.min(bottom, state.y)) }
    return seek(state, nearest, maxSpeed)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute the total clamped steering force for one agent this frame.
 *
 * `state` is a mutable per-agent copy — wander and follow_path behaviors
 * update `wanderAngle` and `pathIndex` in place so they propagate to the
 * next frame's AgentState.
 *
 * `agentSnapshots` is the read-only start-of-frame snapshot used for
 * neighbor-based behaviors (separate, align, cohere, pursue, evade).
 *
 * `behaviorsOverride` when provided replaces the agent's own behaviors array.
 * Pass `[]` to freeze the agent in place (damping brings it to rest).
 */
export function computeSteering(
    agent: AgentObject,
    agentId: string,
    state: AgentState,
    agentSnapshots: ReadonlyMap<string, AgentState>,
    resolvedObjects: Record<string, { x: number; y: number }>,
    behaviorsOverride?: BehaviorConfig[] | null
): Vec2 {
    const behaviors: BehaviorConfig[] = behaviorsOverride !== undefined
        ? (behaviorsOverride ?? [])
        : (agent.behaviors ?? [])

    if (behaviors.length === 0) return zero()

    const maxSpeed = agent.maxSpeed ?? 4.0
    const maxForce = agent.maxForce ?? 0.3
    let total = zero()

    for (const b of behaviors) {
        const w = b.weight ?? 1.0
        let f = zero()

        switch (b.type) {
            case 'seek': {
                const t = resolveTarget(b.target, agentSnapshots, resolvedObjects)
                if (t) f = seek(state, t, maxSpeed)
                break
            }
            case 'flee': {
                const t = resolveTarget(b.target, agentSnapshots, resolvedObjects)
                if (t) f = flee(state, t, maxSpeed, b.radius)
                break
            }
            case 'arrive': {
                const t = resolveTarget(b.target, agentSnapshots, resolvedObjects)
                if (t) f = arrive(state, t, maxSpeed, b.slowRadius ?? 60)
                break
            }
            case 'pursue': {
                const ts = agentSnapshots.get(b.target)
                if (ts) f = pursue(state, ts, maxSpeed)
                break
            }
            case 'evade': {
                const ts = agentSnapshots.get(b.target)
                if (ts) f = evade(state, ts, maxSpeed, b.radius)
                break
            }
            case 'wander':
                f = wander(state, b.strength ?? 0.4, b.speed ?? 1.0, maxSpeed)
                break
            case 'separate':
                f = separate(state, agentId, agentSnapshots, b.radius ?? 30, maxSpeed)
                break
            case 'align':
                f = align(state, agentId, agentSnapshots, b.radius ?? 50, maxSpeed)
                break
            case 'cohere':
                f = cohere(state, agentId, agentSnapshots, b.radius ?? 50, maxSpeed)
                break
            case 'follow_path':
                f = followPath(state, b.path, b.loop ?? false, maxSpeed)
                break
            case 'maintain_zone':
                f = maintainZone(state, b.zone, maxSpeed)
                break
            // Sports-specific behaviors
            case 'guard': {
                const ts = agentSnapshots.get(b.target)
                if (ts) f = arrive(state, { x: ts.x, y: ts.y }, maxSpeed, 20)
                break
            }
            case 'defend_zone':
                f = maintainZone(state, b.zone, maxSpeed)
                break
            case 'fast_break': {
                const t = resolveTarget(b.target, agentSnapshots, resolvedObjects)
                if (t) f = seek(state, t, maxSpeed)
                break
            }
            case 'set_screen': {
                const bh = agentSnapshots.get(b.ballHandler)
                if (bh) {
                    const screenPos = { x: bh.x + (b.offset?.x ?? 0), y: bh.y + (b.offset?.y ?? 0) }
                    f = arrive(state, screenPos, maxSpeed, 8)
                }
                break
            }
        }

        total = add(total, scale(f, w))
    }

    return clampMag(total, maxForce)
}
