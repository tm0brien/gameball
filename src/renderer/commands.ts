// Draw commands are the output of the engine each frame.
// The renderer (Canvas 2D, Skia, etc.) executes these — it has no knowledge of the scene graph.

export interface EllipseCommand {
    type: 'ellipse'
    objectId: string
    x: number
    y: number
    width: number
    height: number
    fill: string | null
    stroke: string | null
    strokeWidth: number
    opacity: number
    layer: number
}

export interface RectCommand {
    type: 'rect'
    objectId: string
    x: number
    y: number
    width: number
    height: number
    fill: string | null
    stroke: string | null
    strokeWidth: number
    borderRadius: number
    opacity: number
    layer: number
}

export interface LineCommand {
    type: 'line'
    objectId: string
    x: number
    y: number
    x2: number
    y2: number
    stroke: string | null
    strokeWidth: number
    opacity: number
    layer: number
}

export interface TextCommand {
    type: 'text'
    objectId: string
    x: number
    y: number
    text: string
    fontSize: number
    fontFamily: string
    fill: string | null
    align: CanvasTextAlign
    opacity: number
    layer: number
}

export interface ArcCommand {
    type: 'arc'
    objectId: string
    x: number
    y: number
    radiusX: number
    radiusY: number
    startAngle: number
    endAngle: number
    counterclockwise: boolean
    fill: string | null
    stroke: string | null
    strokeWidth: number
    opacity: number
    layer: number
}

export interface TrailCommand {
    type: 'trail'
    objectId: string
    points: Array<{ x: number; y: number }>
    color: string
    opacity: number
    width: number
    layer: number
}

export type DrawCommand = EllipseCommand | RectCommand | LineCommand | TextCommand | ArcCommand | TrailCommand
