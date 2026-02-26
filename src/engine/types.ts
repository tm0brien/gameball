// A property can be a static value or a formula to be evaluated each frame
export type FormulaValue = { formula: string }

export type AnimatableNumber = number | FormulaValue
export type AnimatableBoolean = boolean | FormulaValue
export type AnimatableString = string | FormulaValue
export type AnimatableColor = string | null | FormulaValue

export interface TrailConfig {
    length: number
    color: string
    opacity: number
    width: number
}

export type ObjectType = 'ellipse' | 'rect' | 'line' | 'arc' | 'text' | 'group' | 'agent'

interface BaseObject {
    id: string
    type: ObjectType
    x?: AnimatableNumber
    y?: AnimatableNumber
    opacity?: AnimatableNumber
    visible?: AnimatableBoolean
    layer?: number
    parent?: string
    trail?: TrailConfig
}

export interface EllipseObject extends BaseObject {
    type: 'ellipse'
    width: AnimatableNumber
    height: AnimatableNumber
    fill?: AnimatableColor
    stroke?: AnimatableColor
    strokeWidth?: number
}

export interface RectObject extends BaseObject {
    type: 'rect'
    width: AnimatableNumber
    height: AnimatableNumber
    fill?: AnimatableColor
    stroke?: AnimatableColor
    strokeWidth?: number
    borderRadius?: number
}

export interface LineObject extends BaseObject {
    type: 'line'
    x2: AnimatableNumber
    y2: AnimatableNumber
    stroke?: AnimatableColor
    strokeWidth?: number
}

export interface TextObject extends BaseObject {
    type: 'text'
    text: AnimatableString
    fontSize?: number
    fontFamily?: string
    fill?: AnimatableColor
    align?: 'left' | 'center' | 'right'
}

// arc and group are future types — parsed but not rendered in M1
export interface ArcObject extends BaseObject {
    type: 'arc'
}

export interface GroupObject extends BaseObject {
    type: 'group'
}

// ─── Agent / Physics types ────────────────────────────────────────────────────

export type BehaviorTarget = string | { x: number; y: number }

export type ZoneConfig =
    | { shape: 'rect'; x: number; y: number; width: number; height: number }
    | { shape: 'circle'; x: number; y: number; radius: number }

export type BehaviorConfig =
    | { type: 'seek'; target: BehaviorTarget; weight?: number }
    | { type: 'flee'; target: BehaviorTarget; radius?: number; weight?: number }
    | { type: 'arrive'; target: BehaviorTarget; slowRadius?: number; weight?: number }
    | { type: 'pursue'; target: string; weight?: number }
    | { type: 'evade'; target: string; radius?: number; weight?: number }
    | { type: 'wander'; strength?: number; speed?: number; weight?: number }
    | { type: 'separate'; radius?: number; weight?: number }
    | { type: 'align'; radius?: number; weight?: number }
    | { type: 'cohere'; radius?: number; weight?: number }
    | { type: 'follow_path'; path: Array<{ x: number; y: number }>; loop?: boolean; weight?: number }
    | { type: 'maintain_zone'; zone: ZoneConfig; weight?: number }

export interface AgentObject extends BaseObject {
    type: 'agent'
    width?: number
    height?: number
    fill?: AnimatableColor
    stroke?: AnimatableColor
    strokeWidth?: number
    mass?: number
    maxSpeed?: number
    maxForce?: number
    behaviors?: BehaviorConfig[]
    // Initial velocity (applied at frame 0 if no existing state)
    vx?: number
    vy?: number
    // Edge handling: 'wrap' teleports agents across edges, 'none' lets them drift
    edges?: 'wrap' | 'none'
}

// Runtime state for physics agents — persists between frames
export interface AgentState {
    x: number
    y: number
    vx: number
    vy: number
    wanderAngle: number
    pathIndex: number
}

export type SceneObject =
    | EllipseObject
    | RectObject
    | LineObject
    | TextObject
    | ArcObject
    | GroupObject
    | AgentObject

export interface SceneConfig {
    background?: string
    width?: number
    height?: number
    fps?: number
    objects: SceneObject[]
}

// Resolved object — all formulas evaluated to concrete values
export interface ResolvedObject {
    id: string
    type: ObjectType
    x: number
    y: number
    opacity: number
    visible: boolean
    layer: number
    [key: string]: unknown
}
