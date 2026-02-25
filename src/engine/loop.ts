export type FrameCallback = (frame: number, t: number) => void

export class FrameLoop {
    private frame = 0
    private rafId: number | null = null
    private startTime: number | null = null
    private lastFrameTime: number | null = null
    private readonly frameInterval: number

    constructor(
        private fps: number,
        private onFrame: FrameCallback
    ) {
        this.frameInterval = 1000 / fps
    }

    start() {
        const tick = (now: number) => {
            if (this.startTime === null) this.startTime = now
            if (this.lastFrameTime === null) this.lastFrameTime = now

            const elapsed = now - this.lastFrameTime
            if (elapsed >= this.frameInterval) {
                this.lastFrameTime = now - (elapsed % this.frameInterval)
                const t = (now - this.startTime) / 1000
                this.onFrame(this.frame++, t)
            }

            this.rafId = requestAnimationFrame(tick)
        }

        this.rafId = requestAnimationFrame(tick)
    }

    stop() {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId)
            this.rafId = null
        }
    }

    reset() {
        this.frame = 0
        this.startTime = null
        this.lastFrameTime = null
    }
}
