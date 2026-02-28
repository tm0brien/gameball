'use client'

import type { AgentState, SceneConfig } from 'engine/types'
import { FrameLoop } from 'engine/loop'
import { processEvents, processKeyframes } from 'engine/playback'
import { resolveScene } from 'engine/scene'
import type { TrailCommand } from 'renderer/commands'
import { renderFrame } from 'renderer/canvas'
import React, { useEffect, useRef } from 'react'

interface Props {
    scene: SceneConfig
    width?: number
    height?: number
    style?: React.CSSProperties
    className?: string
}

export default function Gameball({ scene, width, height, style, className }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Keep a stable ref to the scene so the loop callback always sees the latest
    const sceneRef = useRef(scene)
    sceneRef.current = scene

    // Trail history: objectId → rolling array of {x, y} positions
    const trailsRef = useRef<Map<string, Array<{ x: number; y: number }>>>(new Map())

    // Agent physics state — persists between frames
    const agentStatesRef = useRef<Map<string, AgentState>>(new Map())

    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Size canvas to container or explicit props
        const resize = () => {
            const w = width ?? container.clientWidth
            const h = height ?? container.clientHeight
            if (w > 0 && h > 0) {
                canvas.width = w
                canvas.height = h
            }
        }
        resize()

        const ro = new ResizeObserver(resize)
        ro.observe(container)

        // Reset trails and agent states when scene changes
        trailsRef.current.clear()
        agentStatesRef.current.clear()

        const loop = new FrameLoop(sceneRef.current.fps ?? 60, (frame, t) => {
            const s = sceneRef.current
            const w = canvas.width
            const h = canvas.height
            if (w === 0 || h === 0) return

            // Apply event/keyframe overrides before physics
            const ct = s.courtTransform
            if (s.events?.length) {
                processEvents(s.events, frame, agentStatesRef.current, ct, w, h)
            }
            if (s.keyframes?.length && ct) {
                processKeyframes(s.keyframes, frame, agentStatesRef.current, ct, w, h)
            }

            const { commands, objects, agentStates } = resolveScene(s, frame, t, w, h, agentStatesRef.current)
            agentStatesRef.current = agentStates

            // Update trail history for any object that has a trail config
            const trailCommands: TrailCommand[] = []
            for (const obj of s.objects) {
                if (!obj.trail) continue
                const resolved = objects[obj.id]
                if (!resolved) continue

                let history = trailsRef.current.get(obj.id)
                if (!history) {
                    history = []
                    trailsRef.current.set(obj.id, history)
                }
                history.push({ x: resolved.x, y: resolved.y })
                if (history.length > obj.trail.length) {
                    history.splice(0, history.length - obj.trail.length)
                }

                trailCommands.push({
                    type: 'trail',
                    objectId: obj.id,
                    points: [...history],
                    color: obj.trail.color,
                    opacity: obj.trail.opacity,
                    width: obj.trail.width,
                    layer: (obj.layer ?? 0) - 0.5 // draw trails just below their object
                })
            }

            const allCommands = [...trailCommands, ...commands].sort((a, b) => a.layer - b.layer)
            renderFrame(ctx, allCommands, s.background ?? '#000000', w, h)
        })

        loop.start()

        return () => {
            loop.stop()
            ro.disconnect()
        }
    }, [scene, width, height])

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', ...style }} className={className}>
            <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        </div>
    )
}
