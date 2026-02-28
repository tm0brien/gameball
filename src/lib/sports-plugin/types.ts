export interface CourtConfig {
    variant: 'full' | 'half'
    orientation?: 'landscape' | 'portrait'
    color?: string
    lineColor?: string
    coordinateSystem?: 'real-world' | 'canvas'
}

export interface TeamConfig {
    id: string
    color: string
    players: number       // number of players to generate (up to 5)
    formation?: string    // named formation for initial placement
}

export interface BallConfig {
    id?: string
    color?: string
    possession?: string   // agent id of player with initial possession
}

// ─── Shot chart ───────────────────────────────────────────────────────────────

export type ShotType = 'layup' | 'dunk' | 'floater' | 'mid-range' | 'three-pointer' | 'free-throw'

export interface Shot {
    x: number          // feet from center court (same coordinate system as court)
    y: number
    made: boolean
    shotType?: ShotType
    player?: string    // agent id (e.g. 'home.player3')
    quarter?: number   // 1–4 (or 5+ for OT)
    gameClock?: string // "MM:SS" remaining in the quarter
}

export type ShotChartMode = 'static' | 'animated'

export interface ShotChartConfig {
    shots: Shot[]
    mode?: ShotChartMode         // default: 'animated'
    playbackSpeed?: number        // real game-seconds per playback second (default 10)
    fps?: number                  // default 60
    madeColor?: string            // default '#4ade80' (green)
    missedColor?: string          // default '#f87171' (red)
    dotRadius?: number            // default 4
    showFlash?: boolean           // brief expanding ring on shot appearance (default true)
}

export interface BasketballConfig {
    sport: 'basketball'
    court: CourtConfig
    teams?: TeamConfig[]
    ball?: BallConfig
    shotChart?: ShotChartConfig
}

export type SportConfig = BasketballConfig

// Formation position: world coordinates (feet, origin at center court)
export interface FormationPosition {
    x: number
    y: number
}
