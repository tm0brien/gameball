import type { ArcCommand, DrawCommand, EllipseCommand, LineCommand, RectCommand, TextCommand } from 'renderer/commands'

import { computeSteering } from './behaviors'
import { evalBoolean, evalColor, evalNumber, evalString, type EvalScope } from './evaluator'
import type {
    AgentObject,
    AgentState,
    ArcObject,
    EllipseObject,
    GroupObject,
    LineObject,
    RectObject,
    ResolvedObject,
    SceneConfig,
    SceneObject,
    TextObject
} from './types'

export interface ResolveResult {
    commands: DrawCommand[]
    objects: Record<string, ResolvedObject>
    agentStates: Map<string, AgentState>
}

function buildBaseScope(frame: number, t: number, width: number, height: number): EvalScope {
    return { frame, t, width, height, objects: {} }
}

// Topological sort — parents before children. Cycles fall back to source order.
function sortByDependency(objects: SceneObject[]): SceneObject[] {
    const byId = new Map(objects.map(o => [o.id, o]))
    const sorted: SceneObject[] = []
    const visited = new Set<string>()

    function visit(obj: SceneObject) {
        if (visited.has(obj.id)) return
        if (obj.parent) {
            const parent = byId.get(obj.parent)
            if (parent) visit(parent)
        }
        visited.add(obj.id)
        sorted.push(obj)
    }

    for (const obj of objects) visit(obj)
    return sorted
}

function resolveEllipse(obj: EllipseObject, scope: EvalScope): EllipseCommand {
    return {
        type: 'ellipse',
        objectId: obj.id,
        x: evalNumber(obj.x, 0, scope),
        y: evalNumber(obj.y, 0, scope),
        width: evalNumber(obj.width, 20, scope),
        height: evalNumber(obj.height, 20, scope),
        fill: evalColor(obj.fill, '#ffffff', scope),
        stroke: evalColor(obj.stroke, null, scope),
        strokeWidth: obj.strokeWidth ?? 1,
        opacity: evalNumber(obj.opacity, 1, scope),
        layer: obj.layer ?? 0
    }
}

function resolveRect(obj: RectObject, scope: EvalScope): RectCommand {
    return {
        type: 'rect',
        objectId: obj.id,
        x: evalNumber(obj.x, 0, scope),
        y: evalNumber(obj.y, 0, scope),
        width: evalNumber(obj.width, 20, scope),
        height: evalNumber(obj.height, 20, scope),
        fill: evalColor(obj.fill, '#ffffff', scope),
        stroke: evalColor(obj.stroke, null, scope),
        strokeWidth: obj.strokeWidth ?? 1,
        borderRadius: obj.borderRadius ?? 0,
        opacity: evalNumber(obj.opacity, 1, scope),
        layer: obj.layer ?? 0
    }
}

function resolveLine(obj: LineObject, scope: EvalScope): LineCommand {
    return {
        type: 'line',
        objectId: obj.id,
        x: evalNumber(obj.x, 0, scope),
        y: evalNumber(obj.y, 0, scope),
        x2: evalNumber(obj.x2, 0, scope),
        y2: evalNumber(obj.y2, 0, scope),
        stroke: evalColor(obj.stroke, '#ffffff', scope),
        strokeWidth: obj.strokeWidth ?? 1,
        opacity: evalNumber(obj.opacity, 1, scope),
        layer: obj.layer ?? 0
    }
}

function resolveText(obj: TextObject, scope: EvalScope): TextCommand {
    return {
        type: 'text',
        objectId: obj.id,
        x: evalNumber(obj.x, 0, scope),
        y: evalNumber(obj.y, 0, scope),
        text: evalString(obj.text, '', scope),
        fontSize: obj.fontSize ?? 16,
        fontFamily: obj.fontFamily ?? 'sans-serif',
        fill: evalColor(obj.fill, '#ffffff', scope),
        align: obj.align ?? 'center',
        opacity: evalNumber(obj.opacity, 1, scope),
        layer: obj.layer ?? 0
    }
}

// group has no visual output but still contributes to the objects scope
function resolveGroup(obj: GroupObject, scope: EvalScope): ResolvedObject {
    return {
        id: obj.id,
        type: 'group',
        x: evalNumber(obj.x, 0, scope),
        y: evalNumber(obj.y, 0, scope),
        opacity: evalNumber(obj.opacity, 1, scope),
        visible: evalBoolean(obj.visible, true, scope),
        layer: obj.layer ?? 0
    }
}

function resolveArc(obj: ArcObject, scope: EvalScope): ArcCommand {
    const rx = evalNumber(obj.radiusX, 20, scope)
    const ry = obj.radiusY !== undefined ? evalNumber(obj.radiusY, rx, scope) : rx
    return {
        type: 'arc',
        objectId: obj.id,
        x: evalNumber(obj.x, 0, scope),
        y: evalNumber(obj.y, 0, scope),
        radiusX: rx,
        radiusY: ry,
        startAngle: obj.startAngle,
        endAngle: obj.endAngle,
        counterclockwise: obj.counterclockwise ?? false,
        fill: evalColor(obj.fill, null, scope),
        stroke: evalColor(obj.stroke, '#ffffff', scope),
        strokeWidth: obj.strokeWidth ?? 1,
        opacity: evalNumber(obj.opacity, 1, scope),
        layer: obj.layer ?? 0
    }
}

function resolveAgent(obj: AgentObject, state: AgentState): EllipseCommand {
    return {
        type: 'ellipse',
        objectId: obj.id,
        x: state.x,
        y: state.y,
        width: obj.width ?? 16,
        height: obj.height ?? 16,
        fill: typeof obj.fill === 'object' && obj.fill && 'formula' in obj.fill ? '#ffffff' : (obj.fill as string | null) ?? '#ffffff',
        stroke: typeof obj.stroke === 'object' && obj.stroke && 'formula' in obj.stroke ? null : (obj.stroke as string | null) ?? null,
        strokeWidth: obj.strokeWidth ?? 1,
        opacity: typeof obj.opacity === 'number' ? obj.opacity : 1,
        layer: obj.layer ?? 0
    }
}

/**
 * Build the start-of-frame agent snapshot from either existing states (carry-forward)
 * or the object's initial x/y/vx/vy values. Called before the main resolution loop
 * so neighbor-based behaviors (separate, align, cohere) see consistent positions.
 *
 * Evaluates formula-based initial positions at frame 0 using the canvas dimensions,
 * enabling the sports plugin to place players at scale-adaptive positions.
 */
function buildAgentSnapshots(
    objects: SceneObject[],
    prevStates: Map<string, AgentState> | undefined,
    canvasWidth: number,
    canvasHeight: number
): Map<string, AgentState> {
    const snap = new Map<string, AgentState>()
    const initScope: EvalScope = { frame: 0, t: 0, width: canvasWidth, height: canvasHeight, objects: {} }
    for (const obj of objects) {
        if (obj.type !== 'agent') continue
        const prev = prevStates?.get(obj.id)
        snap.set(obj.id, prev ?? {
            x: evalNumber(obj.x, 0, initScope),
            y: evalNumber(obj.y, 0, initScope),
            vx: obj.vx ?? 0,
            vy: obj.vy ?? 0,
            wanderAngle: Math.random() * Math.PI * 2,
            pathIndex: 0
        })
    }
    return snap
}

export function resolveScene(
    config: SceneConfig,
    frame: number,
    t: number,
    canvasWidth: number,
    canvasHeight: number,
    prevAgentStates?: Map<string, AgentState>
): ResolveResult {
    const width = canvasWidth
    const height = canvasHeight
    const scope = buildBaseScope(frame, t, width, height)

    const ordered = sortByDependency(config.objects)

    // Snapshot of all agents at the start of this frame (read-only for neighbor queries)
    const agentSnapshots = buildAgentSnapshots(ordered, prevAgentStates, width, height)
    // Mutable map that accumulates each agent's post-integration state
    const nextAgentStates = new Map<string, AgentState>()

    const commands: DrawCommand[] = []
    const resolvedObjects: Record<string, ResolvedObject> = {}

    for (const obj of ordered) {
        // Build parent shorthand into scope
        const parentResolved = obj.parent ? resolvedObjects[obj.parent] : undefined
        const objectScope: EvalScope = {
            ...scope,
            objects: scope.objects,
            parent: parentResolved ? { x: parentResolved.x, y: parentResolved.y } : undefined
        }

        const visible = evalBoolean(obj.visible, true, objectScope)
        if (!visible) continue

        if (obj.type === 'ellipse') {
            const cmd = resolveEllipse(obj, objectScope)
            commands.push(cmd)
            const resolved: ResolvedObject = { id: obj.id, type: obj.type, x: cmd.x, y: cmd.y, opacity: cmd.opacity, visible: true, layer: cmd.layer }
            resolvedObjects[obj.id] = resolved
            scope.objects[obj.id] = { x: cmd.x, y: cmd.y, width: cmd.width, height: cmd.height, opacity: cmd.opacity }
        } else if (obj.type === 'rect') {
            const cmd = resolveRect(obj, objectScope)
            commands.push(cmd)
            const resolved: ResolvedObject = { id: obj.id, type: obj.type, x: cmd.x, y: cmd.y, opacity: cmd.opacity, visible: true, layer: cmd.layer }
            resolvedObjects[obj.id] = resolved
            scope.objects[obj.id] = { x: cmd.x, y: cmd.y, width: cmd.width, height: cmd.height, opacity: cmd.opacity }
        } else if (obj.type === 'line') {
            const cmd = resolveLine(obj, objectScope)
            commands.push(cmd)
            const resolved: ResolvedObject = { id: obj.id, type: obj.type, x: cmd.x, y: cmd.y, opacity: cmd.opacity, visible: true, layer: cmd.layer }
            resolvedObjects[obj.id] = resolved
            scope.objects[obj.id] = { x: cmd.x, y: cmd.y, opacity: cmd.opacity }
        } else if (obj.type === 'text') {
            const cmd = resolveText(obj, objectScope)
            commands.push(cmd)
            const resolved: ResolvedObject = { id: obj.id, type: obj.type, x: cmd.x, y: cmd.y, opacity: cmd.opacity, visible: true, layer: cmd.layer }
            resolvedObjects[obj.id] = resolved
            scope.objects[obj.id] = { x: cmd.x, y: cmd.y, opacity: cmd.opacity }
        } else if (obj.type === 'group') {
            const resolved = resolveGroup(obj, objectScope)
            resolvedObjects[obj.id] = resolved
            scope.objects[obj.id] = { x: resolved.x, y: resolved.y }
        } else if (obj.type === 'agent') {
            // Mutable copy of this agent's state — behaviors may update wanderAngle / pathIndex
            const state: AgentState = { ...agentSnapshots.get(obj.id)! }

            let nx: number
            let ny: number
            let vx = 0
            let vy = 0

            if (state.keyframePos) {
                // Fidelity model: keyframe overrides steering — position is exact, velocity zeroed
                nx = state.keyframePos.x
                ny = state.keyframePos.y
            } else {
                // Normal physics with optional behavior override from events
                const force = computeSteering(obj, obj.id, state, agentSnapshots, resolvedObjects, state.behaviorOverride)

                const mass = obj.mass ?? 1.0
                const maxSpeed = obj.maxSpeed ?? 4.0
                const damping = obj.damping ?? 1.0
                vx = (state.vx + force.x / mass) * damping
                vy = (state.vy + force.y / mass) * damping
                const speed = Math.sqrt(vx * vx + vy * vy)
                if (speed > maxSpeed) { vx = (vx / speed) * maxSpeed; vy = (vy / speed) * maxSpeed }

                nx = state.x + vx
                ny = state.y + vy

                if (obj.edges === 'wrap') {
                    if (nx < 0) nx += width
                    if (nx > width) nx -= width
                    if (ny < 0) ny += height
                    if (ny > height) ny -= height
                }
            }

            // Carry forward event-driven overrides (they persist until a new event changes them)
            const nextState: AgentState = {
                x: nx, y: ny, vx, vy,
                wanderAngle: state.wanderAngle, pathIndex: state.pathIndex,
                behaviorOverride: state.behaviorOverride,
                keyframePos: null  // consumed — processKeyframes re-injects next frame if needed
            }
            nextAgentStates.set(obj.id, nextState)

            const cmd = resolveAgent(obj, nextState)
            commands.push(cmd)
            const resolved: ResolvedObject = { id: obj.id, type: 'agent', x: nx, y: ny, opacity: cmd.opacity, visible: true, layer: cmd.layer }
            resolvedObjects[obj.id] = resolved
            scope.objects[obj.id] = { x: nx, y: ny, vx, vy, width: obj.width ?? 16, height: obj.height ?? 16 }
        } else if (obj.type === 'arc') {
            const cmd = resolveArc(obj, objectScope)
            commands.push(cmd)
            const resolved: ResolvedObject = { id: obj.id, type: obj.type, x: cmd.x, y: cmd.y, opacity: cmd.opacity, visible: true, layer: cmd.layer }
            resolvedObjects[obj.id] = resolved
            scope.objects[obj.id] = { x: cmd.x, y: cmd.y }
        }
    }

    // Sort by layer
    commands.sort((a, b) => a.layer - b.layer)

    return { commands, objects: resolvedObjects, agentStates: nextAgentStates }
}
