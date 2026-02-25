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

export type SceneObject =
    | EllipseObject
    | RectObject
    | LineObject
    | TextObject
    | ArcObject
    | GroupObject

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
