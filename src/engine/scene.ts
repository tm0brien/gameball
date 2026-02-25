import type { DrawCommand, EllipseCommand, LineCommand, RectCommand, TextCommand } from 'renderer/commands'

import { evalBoolean, evalColor, evalNumber, evalString, type EvalScope } from './evaluator'
import type {
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

export function resolveScene(config: SceneConfig, frame: number, t: number, canvasWidth: number, canvasHeight: number): ResolveResult {
    const width = canvasWidth
    const height = canvasHeight
    const scope = buildBaseScope(frame, t, width, height)

    const ordered = sortByDependency(config.objects)
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
        }
        // arc and agent: not implemented in M1, skip silently
    }

    // Sort by layer
    commands.sort((a, b) => a.layer - b.layer)

    return { commands, objects: resolvedObjects }
}
