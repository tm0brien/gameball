import type Anthropic from '@anthropic-ai/sdk'
import { processEvents, processKeyframes } from 'engine/playback'
import { resolveScene } from 'engine/scene'
import type { SceneObject } from 'engine/types'

import { fetchShotsByName } from './nba-api'
import { BASKETBALL_FORMATIONS, compile as compileSportScene } from './sports-plugin'
import type { ShotChartConfig, SportConfig } from './sports-plugin'
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
    },
    // ─── Sports plugin tools ──────────────────────────────────────────────────
    {
        name: 'compileSport',
        description: 'Compiles a sports config into a full scene and replaces the current scene. Use this to set up a basketball simulation. For basketball, the court variant can be "full" or "half".',
        input_schema: {
            type: 'object',
            properties: {
                config: {
                    type: 'object',
                    description: 'Sport config: { sport: "basketball", court: { variant, color, lineColor }, teams: [{ id, color, players, formation }], ball: { color, possession } }'
                }
            },
            required: ['config']
        }
    },
    {
        name: 'setPlay',
        description: 'Sets a named basketball play, assigning behaviors to the relevant agents. Supported plays: pick_and_roll, fast_break, iso.',
        input_schema: {
            type: 'object',
            properties: {
                type: { type: 'string', description: 'Play type: pick_and_roll | fast_break | iso' },
                config: { type: 'object', description: 'Play config, e.g. { ballHandler: "home.player1", screener: "home.player5" }' }
            },
            required: ['type']
        }
    },
    {
        name: 'setFormation',
        description: 'Teleports a team to a named formation. Supported: 5-out, 4-1 (offense); man-to-man, zone-2-3, zone-3-2 (defense).',
        input_schema: {
            type: 'object',
            properties: {
                teamId: { type: 'string', description: 'Team id, e.g. "home" or "away"' },
                formation: { type: 'string', description: 'Formation name' }
            },
            required: ['teamId', 'formation']
        }
    },
    {
        name: 'setPossession',
        description: 'Transfers ball possession to a player. The ball will follow that player.',
        input_schema: {
            type: 'object',
            properties: {
                agentId: { type: 'string', description: 'Player agent id, e.g. "home.player3"' }
            },
            required: ['agentId']
        }
    },
    {
        name: 'compileShotChart',
        description:
            'Compiles a basketball shot chart scene — court + animated shot markers. Each shot appears at the correct game-time frame. Made shots = filled dots, missed = rings. Use transformNBAStatsShot(LOC_X, LOC_Y) to convert NBA Stats API coordinates before passing.',
        input_schema: {
            type: 'object',
            properties: {
                variant: {
                    type: 'string',
                    description: '"half" or "full" court (default: "half")'
                },
                shotChart: {
                    type: 'object',
                    description: 'ShotChartConfig: { shots: [{x, y, made, shotType?, player?, quarter?, gameClock?}], mode?: "animated"|"static", playbackSpeed?: 10, madeColor?, missedColor? }'
                },
                courtColor: { type: 'string', description: 'Court color (default: "#c8a96e")' },
                lineColor: { type: 'string', description: 'Line color (default: "#ffffff")' }
            },
            required: ['shotChart']
        }
    },
    {
        name: 'setEvents',
        description:
            'Sets the events array on the current scene. Events fire at specific frames and drive agent behavior changes (possession, pass, shot, timeout). Replaces any existing events.',
        input_schema: {
            type: 'object',
            properties: {
                events: {
                    type: 'array',
                    description: 'Array of GameEvent: { frame, type, ...payload }. Types: possession ({agent, ball?}), pass ({from, to}), shot ({from, x, y}), timeout.'
                }
            },
            required: ['events']
        }
    },
    {
        name: 'setKeyframes',
        description:
            'Sets the keyframes array on the current scene. Keyframes provide exact agent positions at specific frames (in world/feet coords). Between keyframes the engine interpolates. After the last keyframe the agent falls back to its behaviors.',
        input_schema: {
            type: 'object',
            properties: {
                keyframes: {
                    type: 'array',
                    description: 'Array of Keyframe: { frame, agent, x, y } where x/y are in feet (basketball world coords).'
                }
            },
            required: ['keyframes']
        }
    },
    {
        name: 'fetchNBAShots',
        description:
            'Fetch real NBA shot chart data for a player from the NBA Stats API and compile it as an animated shot chart on a basketball court. Looks up the player by name automatically.',
        input_schema: {
            type: 'object',
            properties: {
                playerName: {
                    type: 'string',
                    description: 'Player full name, e.g. "Stephen Curry", "LeBron James", "Kevin Durant"'
                },
                season: {
                    type: 'string',
                    description: 'Season string, e.g. "2024-25" (default: "2024-25")'
                },
                seasonType: {
                    type: 'string',
                    description: '"Regular Season" | "Playoffs" (default: "Regular Season")'
                },
                mode: {
                    type: 'string',
                    description: '"animated" (shots appear in game order) | "static" (all shots shown at once). Animated works great for a single game; static is better for a full season. Default: "animated"'
                },
                variant: {
                    type: 'string',
                    description: '"half" | "full" court (default: "half")'
                }
            },
            required: ['playerName']
        }
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
    | 'compileSport'
    | 'setPlay'
    | 'setFormation'
    | 'setPossession'
    | 'compileShotChart'
    | 'setEvents'
    | 'setKeyframes'
    | 'fetchNBAShots'

export interface ToolResult {
    success: boolean
    data?: unknown
    error?: string
}

export async function executeTool(
    toolName: ToolName,
    toolInput: Record<string, unknown>,
    session: Session
): Promise<ToolResult> {
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
            const ct = session.scene.courtTransform

            let lastObjects: Record<string, unknown> = {}
            for (let i = 0; i < n; i++) {
                const frame = startFrame + i
                const t = frame / fps

                // Apply event/keyframe overrides into agent states before physics
                if (session.scene.events?.length) {
                    processEvents(session.scene.events, frame, session.agentStates, ct, width, height)
                }
                if (session.scene.keyframes?.length && ct) {
                    processKeyframes(session.scene.keyframes, frame, session.agentStates, ct, width, height)
                }

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

        case 'compileSport': {
            const config = toolInput.config as SportConfig
            if (!config?.sport) return { success: false, error: 'INVALID_SPEC: config.sport is required' }
            try {
                const compiled = compileSportScene(config)
                session.scene = compiled
                session.frame = 0
                session.agentStates = new Map()
                return {
                    success: true,
                    data: {
                        sport: config.sport,
                        objectCount: compiled.objects.length,
                        message: 'Scene compiled and set. Use setPlay, setFormation, setPossession to author the scenario.'
                    }
                }
            } catch (e) {
                return { success: false, error: `Compile error: ${(e as Error).message}` }
            }
        }

        case 'setPlay': {
            const playType = toolInput.type as string
            const config = (toolInput.config ?? {}) as Record<string, string>
            const canvasW = session.scene.width ?? 800
            const canvasH = session.scene.height ?? 600

            switch (playType) {
                case 'fast_break': {
                    // All home players sprint toward right basket
                    const scale = Math.min((canvasW - 40) / 94, (canvasH - 40) / 50)
                    const basketX = canvasW / 2 + 41.75 * scale
                    const basketY = canvasH / 2
                    for (let i = 1; i <= 5; i++) {
                        const id = `home.player${i}`
                        const obj = session.scene.objects.find(o => o.id === id)
                        if (!obj) continue
                        session.scene = {
                            ...session.scene,
                            objects: session.scene.objects.map(o => o.id === id
                                ? { ...o, behaviors: [{ type: 'fast_break', target: { x: basketX, y: basketY }, weight: 1.0 }] } as SceneObject
                                : o)
                        }
                    }
                    return { success: true, data: { play: 'fast_break', description: 'All home players sprinting to basket' } }
                }

                case 'pick_and_roll': {
                    const ballHandler = config.ballHandler ?? 'home.player1'
                    const screener = config.screener ?? 'home.player5'
                    const scale = Math.min((canvasW - 40) / 94, (canvasH - 40) / 50)
                    const basketX = canvasW / 2 + 41.75 * scale
                    const basketY = canvasH / 2
                    session.scene = {
                        ...session.scene,
                        objects: session.scene.objects.map(o => {
                            if (o.id === ballHandler) return { ...o, behaviors: [{ type: 'fast_break', target: { x: basketX, y: basketY }, weight: 1.0 }] } as SceneObject
                            if (o.id === screener) return { ...o, behaviors: [{ type: 'set_screen', ballHandler, offset: { x: 0, y: 0 }, weight: 1.0 }] } as SceneObject
                            return o
                        })
                    }
                    return { success: true, data: { play: 'pick_and_roll', ballHandler, screener } }
                }

                case 'iso': {
                    const ballHandler = config.ballHandler ?? 'home.player1'
                    const scale = Math.min((canvasW - 40) / 94, (canvasH - 40) / 50)
                    const basketX = canvasW / 2 + 41.75 * scale
                    const basketY = canvasH / 2
                    // Spread positions for other players
                    const clearOutPositions = [
                        { x: canvasW / 2 + 36 * scale, y: canvasH / 2 - 22 * scale },
                        { x: canvasW / 2 + 36 * scale, y: canvasH / 2 + 22 * scale },
                        { x: canvasW / 2 + 25 * scale, y: canvasH / 2 - 17 * scale },
                        { x: canvasW / 2 + 25 * scale, y: canvasH / 2 + 17 * scale }
                    ]
                    let clearIdx = 0
                    session.scene = {
                        ...session.scene,
                        objects: session.scene.objects.map(o => {
                            if (o.id === ballHandler) return { ...o, behaviors: [{ type: 'fast_break', target: { x: basketX, y: basketY }, weight: 1.0 }] } as SceneObject
                            if (o.id.startsWith('home.player')) {
                                const clearPos = clearOutPositions[clearIdx++] ?? clearOutPositions[0]
                                return { ...o, behaviors: [{ type: 'arrive', target: clearPos, slowRadius: 15, weight: 1.0 }] } as SceneObject
                            }
                            return o
                        })
                    }
                    return { success: true, data: { play: 'iso', ballHandler } }
                }

                default:
                    return { success: false, error: `Unknown play type: ${playType}. Supported: fast_break, pick_and_roll, iso` }
            }
        }

        case 'setFormation': {
            const teamId = toolInput.teamId as string
            const formation = toolInput.formation as string
            const positions = BASKETBALL_FORMATIONS[formation]
            if (!positions) {
                return { success: false, error: `Unknown formation: ${formation}. Supported: ${Object.keys(BASKETBALL_FORMATIONS).join(', ')}` }
            }
            const canvasW = session.scene.width ?? 800
            const canvasH = session.scene.height ?? 600
            const isHalf = session.scene.objects.some(o => o.id === 'court_surface') &&
                !session.scene.objects.some(o => o.id === 'court_halfline')
            const scale = isHalf
                ? Math.min((canvasW - 40) / 47, (canvasH - 40) / 50)
                : Math.min((canvasW - 40) / 94, (canvasH - 40) / 50)

            const isHome = teamId === 'home'

            for (let i = 0; i < positions.length; i++) {
                const pos = positions[i]
                const id = `${teamId}.player${i + 1}`
                // Away team mirrors to left side
                const wx = isHome ? pos.x : -pos.x
                const wy = pos.y
                const canvasX = isHalf
                    ? canvasW / 2 + (wx - 23.5) * scale
                    : canvasW / 2 + wx * scale
                const canvasY = canvasH / 2 - wy * scale

                // Teleport and zero velocity
                const existing = session.agentStates.get(id)
                session.agentStates.set(id, {
                    x: canvasX, y: canvasY, vx: 0, vy: 0,
                    wanderAngle: existing?.wanderAngle ?? 0,
                    pathIndex: existing?.pathIndex ?? 0
                })
            }

            // Clear behaviors on positioned players so they hold formation
            session.scene = {
                ...session.scene,
                objects: session.scene.objects.map(o => {
                    if (!o.id.startsWith(`${teamId}.player`)) return o
                    const idx = parseInt(o.id.replace(`${teamId}.player`, '')) - 1
                    if (idx < 0 || idx >= positions.length) return o
                    return { ...o, behaviors: [] } as SceneObject
                })
            }

            return { success: true, data: { teamId, formation, playersPositioned: positions.length } }
        }

        case 'setPossession': {
            const agentId = toolInput.agentId as string
            const ballObj = session.scene.objects.find(o => o.id === 'ball')
            if (!ballObj) return { success: false, error: 'OBJECT_NOT_FOUND: No ball in scene. Use compileSport first.' }
            session.scene = {
                ...session.scene,
                objects: session.scene.objects.map(o =>
                    o.id === 'ball'
                        ? { ...o, behaviors: [{ type: 'arrive', target: agentId, slowRadius: 8, weight: 1.0 }] } as SceneObject
                        : o
                )
            }
            return { success: true, data: { possession: agentId } }
        }

        case 'compileShotChart': {
            const variant = (toolInput.variant as 'full' | 'half' | undefined) ?? 'half'
            const shotChartConfig = toolInput.shotChart as ShotChartConfig
            if (!shotChartConfig?.shots) {
                return { success: false, error: 'INVALID_SPEC: shotChart.shots array is required' }
            }
            try {
                const compiled = compileSportScene({
                    sport: 'basketball',
                    court: {
                        variant,
                        color: (toolInput.courtColor as string | undefined) ?? '#c8a96e',
                        lineColor: (toolInput.lineColor as string | undefined) ?? '#ffffff'
                    },
                    shotChart: shotChartConfig
                })
                session.scene = compiled
                session.frame = 0
                session.agentStates = new Map()
                const modeLabel = shotChartConfig.mode === 'static' ? 'static' : 'animated'
                return {
                    success: true,
                    data: {
                        shotCount: shotChartConfig.shots.length,
                        mode: modeLabel,
                        objectCount: compiled.objects.length,
                        message: `Shot chart compiled. ${shotChartConfig.shots.length} shots — ${modeLabel} mode.`
                    }
                }
            } catch (e) {
                return { success: false, error: `Compile error: ${(e as Error).message}` }
            }
        }

        case 'setEvents': {
            const events = toolInput.events as import('engine/types').GameEvent[]
            if (!Array.isArray(events)) return { success: false, error: 'INVALID_SPEC: events must be an array' }
            session.scene = { ...session.scene, events }
            return { success: true, data: { eventCount: events.length } }
        }

        case 'setKeyframes': {
            const keyframes = toolInput.keyframes as import('engine/types').Keyframe[]
            if (!Array.isArray(keyframes)) return { success: false, error: 'INVALID_SPEC: keyframes must be an array' }
            session.scene = { ...session.scene, keyframes }
            const agentCount = new Set(keyframes.map(kf => kf.agent)).size
            return { success: true, data: { keyframeCount: keyframes.length, agentCount } }
        }

        case 'fetchNBAShots': {
            const playerName = toolInput.playerName as string
            if (!playerName) return { success: false, error: 'playerName is required' }

            const season = (toolInput.season as string | undefined) ?? '2024-25'
            const rawType = (toolInput.seasonType as string | undefined) ?? 'Regular Season'
            const seasonType = (['Regular Season', 'Playoffs', 'Pre Season'].includes(rawType)
                ? rawType
                : 'Regular Season') as 'Regular Season' | 'Playoffs' | 'Pre Season'
            const mode = (toolInput.mode as 'animated' | 'static' | undefined) ?? 'animated'
            const variant = (toolInput.variant as 'half' | 'full' | undefined) ?? 'half'

            try {
                const result = await fetchShotsByName(playerName, season, seasonType)

                // For full-season shot data (>100 shots), default to static unless caller specified animated
                const effectiveMode = toolInput.mode
                    ? mode
                    : result.totalShots > 100 ? 'static' : 'animated'

                const compiled = compileSportScene({
                    sport: 'basketball',
                    court: { variant, color: '#c8a96e', lineColor: '#f0f0e8' },
                    shotChart: {
                        shots: result.shots,
                        mode: effectiveMode,
                        playbackSpeed: effectiveMode === 'animated' ? 8 : undefined,
                        madeColor: '#4ade80',
                        missedColor: '#f87171',
                        dotRadius: 4,
                        showFlash: effectiveMode === 'animated'
                    }
                })

                session.scene = compiled
                session.frame = 0
                session.agentStates = new Map()

                const pct = Math.round((result.made / result.totalShots) * 100)
                const dataNote = result.isSampleData
                    ? ' (using sample data — NBA Stats API unavailable)'
                    : ''
                return {
                    success: true,
                    data: {
                        player: result.player,
                        team: result.team,
                        season: result.season,
                        seasonType: result.seasonType,
                        totalShots: result.totalShots,
                        made: result.made,
                        missed: result.missed,
                        fieldGoalPct: `${pct}%`,
                        mode: effectiveMode,
                        isSampleData: result.isSampleData ?? false,
                        message: `Loaded ${result.totalShots} shots for ${result.player} (${result.team}) — ${result.made}/${result.totalShots} FG (${pct}%)${dataNote}. ${effectiveMode === 'animated' ? 'Shots playing back in game order.' : 'All shots shown at once.'}`
                    }
                }
            } catch (err) {
                return { success: false, error: (err as Error).message }
            }
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` }
    }
}
