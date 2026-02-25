import type { DrawCommand, EllipseCommand, LineCommand, RectCommand, TextCommand, TrailCommand } from './commands'

function withOpacity(ctx: CanvasRenderingContext2D, opacity: number, fn: () => void) {
    const prev = ctx.globalAlpha
    ctx.globalAlpha = prev * Math.max(0, Math.min(1, opacity))
    fn()
    ctx.globalAlpha = prev
}

function drawEllipse(ctx: CanvasRenderingContext2D, cmd: EllipseCommand) {
    withOpacity(ctx, cmd.opacity, () => {
        const rx = cmd.width / 2
        const ry = cmd.height / 2
        ctx.beginPath()
        ctx.ellipse(cmd.x, cmd.y, Math.max(0, rx), Math.max(0, ry), 0, 0, Math.PI * 2)
        if (cmd.fill) {
            ctx.fillStyle = cmd.fill
            ctx.fill()
        }
        if (cmd.stroke) {
            ctx.strokeStyle = cmd.stroke
            ctx.lineWidth = cmd.strokeWidth
            ctx.stroke()
        }
    })
}

function drawRect(ctx: CanvasRenderingContext2D, cmd: RectCommand) {
    withOpacity(ctx, cmd.opacity, () => {
        const x = cmd.x - cmd.width / 2
        const y = cmd.y - cmd.height / 2
        ctx.beginPath()
        if (cmd.borderRadius > 0) {
            ctx.roundRect(x, y, cmd.width, cmd.height, cmd.borderRadius)
        } else {
            ctx.rect(x, y, cmd.width, cmd.height)
        }
        if (cmd.fill) {
            ctx.fillStyle = cmd.fill
            ctx.fill()
        }
        if (cmd.stroke) {
            ctx.strokeStyle = cmd.stroke
            ctx.lineWidth = cmd.strokeWidth
            ctx.stroke()
        }
    })
}

function drawLine(ctx: CanvasRenderingContext2D, cmd: LineCommand) {
    if (!cmd.stroke) return
    withOpacity(ctx, cmd.opacity, () => {
        ctx.beginPath()
        ctx.moveTo(cmd.x, cmd.y)
        ctx.lineTo(cmd.x2, cmd.y2)
        ctx.strokeStyle = cmd.stroke!
        ctx.lineWidth = cmd.strokeWidth
        ctx.stroke()
    })
}

function drawText(ctx: CanvasRenderingContext2D, cmd: TextCommand) {
    if (!cmd.fill) return
    withOpacity(ctx, cmd.opacity, () => {
        ctx.font = `${cmd.fontSize}px ${cmd.fontFamily}`
        ctx.textAlign = cmd.align
        ctx.textBaseline = 'middle'
        ctx.fillStyle = cmd.fill!
        ctx.fillText(cmd.text, cmd.x, cmd.y)
    })
}

function drawTrail(ctx: CanvasRenderingContext2D, cmd: TrailCommand) {
    if (cmd.points.length < 2) return
    const n = cmd.points.length
    for (let i = 1; i < n; i++) {
        const t = i / n // 0 = oldest, 1 = newest
        const segOpacity = cmd.opacity * t * t // fade out toward tail
        withOpacity(ctx, segOpacity, () => {
            ctx.beginPath()
            ctx.moveTo(cmd.points[i - 1].x, cmd.points[i - 1].y)
            ctx.lineTo(cmd.points[i].x, cmd.points[i].y)
            ctx.strokeStyle = cmd.color
            ctx.lineWidth = cmd.width
            ctx.lineCap = 'round'
            ctx.stroke()
        })
    }
}

export function renderFrame(ctx: CanvasRenderingContext2D, commands: DrawCommand[], background: string, width: number, height: number) {
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)

    for (const cmd of commands) {
        switch (cmd.type) {
            case 'ellipse': drawEllipse(ctx, cmd); break
            case 'rect':    drawRect(ctx, cmd);    break
            case 'line':    drawLine(ctx, cmd);    break
            case 'text':    drawText(ctx, cmd);    break
            case 'trail':   drawTrail(ctx, cmd);   break
        }
    }
}
