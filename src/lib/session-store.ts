import type { AgentState, SceneConfig } from 'engine/types'

export interface Session {
    scene: SceneConfig
    frame: number
    agentStates: Map<string, AgentState>
    // Stored as Anthropic.MessageParam[] at runtime; typed as unknown[] to avoid
    // importing the SDK at the type level in this module.
    history: unknown[]
}

const EMPTY_SCENE: SceneConfig = {
    background: '#05050f',
    width: 800,
    height: 600,
    fps: 60,
    objects: []
}

// In-memory store. Ephemeral — sessions are lost on server restart.
// Persistence is deferred to M6.
const sessions = new Map<string, Session>()

export function getOrCreateSession(id: string): Session {
    if (!sessions.has(id)) {
        sessions.set(id, {
            scene: structuredClone(EMPTY_SCENE),
            frame: 0,
            agentStates: new Map(),
            history: []
        })
    }
    return sessions.get(id)!
}

export function getSession(id: string): Session | undefined {
    return sessions.get(id)
}

export function resetSession(id: string): void {
    sessions.set(id, {
        scene: structuredClone(EMPTY_SCENE),
        frame: 0,
        agentStates: new Map(),
        history: []
    })
}
