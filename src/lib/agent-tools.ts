import type Anthropic from '@anthropic-ai/sdk'
import { resolveScene } from 'engine/scene'
import type { SceneObject } from 'engine/types'

import type { Session } from './session-store'

// ─── Tool definitions (passed to Anthropic API) ───────────────────────────────

export const TOOLS: Anthropic.Tool[] = [
    {
        name: 'getScene',
        description: 'Returns the full current scene configuration including all objects.',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'getObject',
        description: "Returns a single object's full current spec by id.",
        input_schema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'The object id' }
            },
            required: ['id']
        }
    },
    {
        name: 'addObject',
        description:
            'Adds a new object to the scene. The spec must include a unique id and type. Types: ellipse, rect, line, text, group, agent. Agents are physics-enabled and accept mass, maxSpeed, maxForce, and a behaviors array. Any numeric property can be animated with { "formula": "expression" }.',
        input_schema: {
            type: 'object',
            properties: {
                spec: {
                    type: 'object',
                    description: 'Full object spec including id and type.'
                }
            },
            required: ['spec']
        }
    },
    {
        name: 'setObject',
        description:
            'Declares the desired state for an existing object. Replaces the full spec. Call getObject first to read current state before modifying.',
        input_schema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'The object id to update' },
                spec: {
                    type: 'object',
                    description: 'Full desired object spec including id and type.'
                }
            },
            required: ['id', 'spec']
        }
    },
    {
        name: 'deleteObject',
        description: 'Removes an object from the scene.',
        input_schema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'The object id to remove' }
            },
            required: ['id']
        }
    },
    {
        name: 'runFrames',
        description:
            'Advances the simulation by n frames and returns resolved positions of all objects at the end frame. Use this to verify animated formulas produce the intended result.',
        input_schema: {
            type: 'object',
            properties: {
                n: { type: 'number', description: 'Number of frames to run (1–300)' }
            },
            required: ['n']
        }
    },
    {
        name: 'getSimulationState',
        description:
            'Returns the current resolved state of all objects at the current frame without advancing time.',
        input_schema: { type: 'object', properties: {}, required: [] }
    },
    {
        name: 'resetSimulation',
        description: 'Resets the simulation to frame 0.',
        input_schema: { type: 'object', properties: {}, required: [] }
    }
]

// ─── Tool execution ───────────────────────────────────────────────────────────

export type ToolName =
    | 'getScene'
    | 'getObject'
    | 'addObject'
    | 'setObject'
    | 'deleteObject'
    | 'runFrames'
    | 'getSimulationState'
    | 'resetSimulation'

export interface ToolResult {
    success: boolean
    data?: unknown
    error?: string
}

export function executeTool(
    toolName: ToolName,
    toolInput: Record<string, unknown>,
    session: Session
): ToolResult {
    switch (toolName) {
        case 'getScene':
            return { success: true, data: session.scene }

        case 'getObject': {
            const id = toolInput.id as string
            const obj = session.scene.objects.find(o => o.id === id)
            if (!obj) return { success: false, error: `OBJECT_NOT_FOUND: No object with id "${id}"` }
            return { success: true, data: obj }
        }

        case 'addObject': {
            const spec = toolInput.spec as SceneObject
            if (!spec?.id) return { success: false, error: 'INVALID_SPEC: Object spec must include an id' }
            if (!spec.type) return { success: false, error: 'INVALID_SPEC: Object spec must include a type' }
            if (session.scene.objects.find(o => o.id === spec.id)) {
                return { success: false, error: `DUPLICATE_ID: Object with id "${spec.id}" already exists` }
            }
            session.scene = { ...session.scene, objects: [...session.scene.objects, spec] }
            return { success: true, data: { id: spec.id, objectCount: session.scene.objects.length } }
        }

        case 'setObject': {
            const id = toolInput.id as string
            const spec = toolInput.spec as SceneObject
            if (!spec) return { success: false, error: 'INVALID_SPEC: Object spec is required' }
            if (!session.scene.objects.find(o => o.id === id)) {
                return { success: false, error: `OBJECT_NOT_FOUND: No object with id "${id}"` }
            }
            session.scene = {
                ...session.scene,
                objects: session.scene.objects.map(o => (o.id === id ? { ...spec, id } : o))
            }
            return { success: true, data: { id } }
        }

        case 'deleteObject': {
            const id = toolInput.id as string
            if (!session.scene.objects.find(o => o.id === id)) {
                return { success: false, error: `OBJECT_NOT_FOUND: No object with id "${id}"` }
            }
            session.scene = {
                ...session.scene,
                objects: session.scene.objects.filter(o => o.id !== id)
            }
            return { success: true, data: { id } }
        }

        case 'runFrames': {
            const n = Math.min(Math.max(1, (toolInput.n as number) || 30), 300)
            const width = session.scene.width || 800
            const height = session.scene.height || 600
            const fps = session.scene.fps || 60
            const startFrame = session.frame

            let lastObjects: Record<string, unknown> = {}
            for (let i = 0; i < n; i++) {
                const frame = startFrame + i
                const t = frame / fps
                const result = resolveScene(session.scene, frame, t, width, height, session.agentStates)
                session.agentStates = result.agentStates
                if (i === n - 1) {
                    lastObjects = result.objects as Record<string, unknown>
                }
            }
            session.frame = startFrame + n

            return {
                success: true,
                data: { framesRun: n, endFrame: session.frame, objects: lastObjects }
            }
        }

        case 'getSimulationState': {
            const width = session.scene.width || 800
            const height = session.scene.height || 600
            const fps = session.scene.fps || 60
            const t = session.frame / fps
            const result = resolveScene(session.scene, session.frame, t, width, height, session.agentStates)
            return { success: true, data: { frame: session.frame, objects: result.objects } }
        }

        case 'resetSimulation': {
            session.frame = 0
            session.agentStates = new Map()
            return { success: true, data: { frame: 0 } }
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` }
    }
}
