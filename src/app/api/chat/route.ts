import Anthropic from '@anthropic-ai/sdk'
import { executeTool, TOOLS } from 'lib/agent-tools'
import type { ToolName } from 'lib/agent-tools'
import { getOrCreateSession } from 'lib/session-store'
import { SYSTEM_PROMPT } from 'lib/system-prompt'
import { NextRequest } from 'next/server'

export const maxDuration = 60

const SESSION_ID = 'default'
const MODEL = 'claude-opus-4-5'
const MAX_TOKENS = 4096
const MAX_TOOL_ITERATIONS = 15
const MAX_TURNS_IN_HISTORY = 8

// ─── History trimming ─────────────────────────────────────────────────────────

// Trim history to the last N *conversation turns*, always cutting at a real
// user text message boundary. This prevents slicing through tool-use/tool-result
// pairs, which causes Anthropic 400 errors.
function trimHistory(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
    const turnStarts: number[] = []
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i]
        if (msg.role === 'user' && typeof msg.content === 'string') {
            turnStarts.push(i)
        }
    }
    if (turnStarts.length <= MAX_TURNS_IN_HISTORY) return messages
    const cutFrom = turnStarts[turnStarts.length - MAX_TURNS_IN_HISTORY]
    return messages.slice(cutFrom)
}

// ─── Streaming helpers ────────────────────────────────────────────────────────

type StreamEvent =
    | { type: 'tool_start'; id: string; name: string; input: Record<string, unknown> }
    | { type: 'tool_end'; id: string; name: string; success: boolean; output: unknown; durationMs: number }
    | { type: 'text'; delta: string }
    | { type: 'done'; scene: unknown; inputTokens: number; outputTokens: number }
    | { type: 'error'; message: string }

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    if (!process.env.ANTHROPIC_API_KEY) {
        return new Response(
            JSON.stringify({ type: 'error', message: 'ANTHROPIC_API_KEY is not set. Add it to .env.local.' }) + '\n',
            { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } }
        )
    }

    let body: { message?: string }
    try {
        body = await request.json()
    } catch {
        return new Response(
            JSON.stringify({ type: 'error', message: 'Invalid JSON body' }) + '\n',
            { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } }
        )
    }

    const userMessage = body.message?.trim()
    if (!userMessage) {
        return new Response(
            JSON.stringify({ type: 'error', message: 'message is required' }) + '\n',
            { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } }
        )
    }

    const session = getOrCreateSession(SESSION_ID)
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const encoder = new TextEncoder()
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
    const writer = writable.getWriter()

    const write = (event: StreamEvent) => {
        writer.write(encoder.encode(JSON.stringify(event) + '\n'))
    }

    // Run agent loop asynchronously so we can return the streaming response immediately
    ;(async () => {
        const messages: Anthropic.MessageParam[] = [
            ...(session.history as Anthropic.MessageParam[]),
            { role: 'user', content: userMessage }
        ]

        try {
            let iterations = 0
            let totalInputTokens = 0
            let totalOutputTokens = 0

            while (iterations < MAX_TOOL_ITERATIONS) {
                iterations++

                const messageStream = client.messages.stream({
                    model: MODEL,
                    max_tokens: MAX_TOKENS,
                    system: SYSTEM_PROMPT,
                    tools: TOOLS,
                    messages
                })

                // Stream text deltas to the client as they arrive
                messageStream.on('text', (text: string) => {
                    write({ type: 'text', delta: text })
                })

                const finalMessage = await messageStream.finalMessage()
                totalInputTokens += finalMessage.usage.input_tokens
                totalOutputTokens += finalMessage.usage.output_tokens
                messages.push({ role: 'assistant', content: finalMessage.content })

                if (finalMessage.stop_reason !== 'tool_use') {
                    session.history = trimHistory(messages)
                    write({ type: 'done', scene: session.scene, inputTokens: totalInputTokens, outputTokens: totalOutputTokens })
                    break
                }

                // Execute tool calls, emitting start/end events for each
                const toolResults: Anthropic.ToolResultBlockParam[] = []
                for (const block of finalMessage.content) {
                    if (block.type === 'tool_use') {
                        const input = block.input as Record<string, unknown>
                        write({ type: 'tool_start', id: block.id, name: block.name, input })

                        const t0 = Date.now()
                        const result = executeTool(block.name as ToolName, input, session)
                        const durationMs = Date.now() - t0

                        write({
                            type: 'tool_end',
                            id: block.id,
                            name: block.name,
                            success: result.success,
                            output: result.success ? result.data : { error: result.error },
                            durationMs
                        })

                        toolResults.push({
                            type: 'tool_result',
                            tool_use_id: block.id,
                            content: JSON.stringify(result.success ? result.data : { error: result.error }),
                            is_error: !result.success
                        })
                    }
                }

                messages.push({ role: 'user', content: toolResults })
            }

            if (iterations >= MAX_TOOL_ITERATIONS) {
                write({ type: 'error', message: 'Reached maximum tool iterations.' })
            }
        } catch (err) {
            write({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
        } finally {
            await writer.close()
        }
    })()

    return new Response(readable, {
        headers: {
            'Content-Type': 'application/x-ndjson',
            'Cache-Control': 'no-cache',
            'X-Content-Type-Options': 'nosniff'
        }
    })
}
