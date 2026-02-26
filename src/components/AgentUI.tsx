'use client'

import type { SceneConfig } from 'engine/types'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import styled, { keyframes } from 'styled-components'

import DebugPanel from './DebugPanel'
import type { DebugToolCall, DebugTurn } from './DebugPanel'
import Gameball from './Gameball'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ToolCallInfo {
    id: string
    name: string
    status: 'pending' | 'done' | 'error'
}

interface UserMessage {
    role: 'user'
    content: string
}

interface AssistantMessage {
    role: 'assistant'
    content: string
    toolCalls: ToolCallInfo[]
}

type ChatMessage = UserMessage | AssistantMessage

// ─── Styled components ────────────────────────────────────────────────────────

const Shell = styled.div`
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    background: #09090e;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    overflow: hidden;
`

const Header = styled.header`
    display: flex;
    align-items: center;
    height: 52px;
    padding: 0 20px;
    background: #0f0f18;
    border-bottom: 1px solid #1e1e2e;
    flex-shrink: 0;
    gap: 12px;
`

const Logo = styled.div`
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: #e8e8f0;
    user-select: none;
`

const LogoDot = styled.span`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4a9eff;
    display: inline-block;
    box-shadow: 0 0 8px #4a9eff88;
`

const HeaderActions = styled.div`
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
`

const HeaderButton = styled.button<{ $active?: boolean }>`
    padding: 5px 12px;
    border-radius: 6px;
    border: 1px solid ${p => (p.$active ? '#4a9eff44' : '#1e1e2e')};
    background: ${p => (p.$active ? '#4a9eff18' : 'transparent')};
    color: ${p => (p.$active ? '#4a9eff' : '#444460')};
    font-size: 11.5px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;

    &:hover {
        border-color: #4a9eff33;
        color: ${p => (p.$active ? '#4a9eff' : '#7788aa')};
    }
`

const Body = styled.div`
    display: flex;
    flex: 1;
    min-height: 0;
`

const ChatPanel = styled.div`
    display: flex;
    flex-direction: column;
    width: 380px;
    min-width: 280px;
    border-right: 1px solid #1e1e2e;
    background: #0b0b14;
    flex-shrink: 0;
`

const MessagesArea = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 16px 16px 8px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    scrollbar-width: thin;
    scrollbar-color: #2a2a40 transparent;
`

const EmptyState = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-align: center;
    padding: 32px 24px;
`

const EmptyTitle = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: #e8e8f0;
    letter-spacing: -0.01em;
`

const EmptySubtitle = styled.div`
    font-size: 12px;
    color: #444460;
    line-height: 1.5;
`

const Suggestion = styled.button`
    margin-top: 4px;
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid #1e1e2e;
    background: transparent;
    color: #555575;
    font-size: 11.5px;
    cursor: pointer;
    text-align: left;
    line-height: 1.4;
    transition: all 0.15s ease;

    &:hover {
        border-color: #4a9eff33;
        color: #8899cc;
        background: #4a9eff08;
    }
`

const UserBubble = styled.div`
    max-width: 100%;
    padding: 10px 13px;
    border-radius: 12px 12px 4px 12px;
    background: #1a2540;
    border: 1px solid #2a3d6a;
    color: #c8d8f8;
    font-size: 13px;
    line-height: 1.55;
    align-self: flex-end;
    white-space: pre-wrap;
    word-break: break-word;
`

const AssistantBubble = styled.div`
    max-width: 100%;
    padding: 10px 13px;
    border-radius: 12px 12px 12px 4px;
    background: #111120;
    border: 1px solid #1a1a28;
    color: #b8b8d0;
    font-size: 13px;
    line-height: 1.55;
    align-self: flex-start;
    white-space: pre-wrap;
    word-break: break-word;
    display: flex;
    flex-direction: column;
    gap: 8px;
`

const ToolCallRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
`

const spin = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
`

const ToolChip = styled.span<{ $status: 'pending' | 'done' | 'error' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 10.5px;
    font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
    border: 1px solid ${p =>
        p.$status === 'done' ? '#3ecf8e33' :
        p.$status === 'error' ? '#ff4a4a33' :
        '#4a9eff33'};
    background: ${p =>
        p.$status === 'done' ? '#3ecf8e0d' :
        p.$status === 'error' ? '#ff4a4a0d' :
        '#4a9eff0d'};
    color: ${p =>
        p.$status === 'done' ? '#3ecf8e' :
        p.$status === 'error' ? '#ff6b6b' :
        '#6aa8ff'};

    &::before {
        content: '${p =>
            p.$status === 'done' ? '✓' :
            p.$status === 'error' ? '✕' :
            '·'}';
        display: inline-block;
        animation: ${p => p.$status === 'pending' ? spin : 'none'} 1s linear infinite;
        font-style: normal;
    }
`

const pulse = keyframes`
    0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
    40% { opacity: 1; transform: scale(1); }
`

const TypingIndicator = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 10px 13px;
    border-radius: 12px 12px 12px 4px;
    background: #111120;
    border: 1px solid #1a1a28;
    align-self: flex-start;

    span {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #4a9eff;
        display: inline-block;
        animation: ${pulse} 1.2s infinite ease-in-out;

        &:nth-child(2) { animation-delay: 0.15s; }
        &:nth-child(3) { animation-delay: 0.3s; }
    }
`

const InputArea = styled.div`
    padding: 12px 16px 16px;
    border-top: 1px solid #1a1a28;
    display: flex;
    gap: 8px;
    align-items: flex-end;
`

const TextInput = styled.textarea`
    flex: 1;
    resize: none;
    border: 1px solid #1e1e2e;
    outline: none;
    background: #0f0f1a;
    color: #e0e0f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    line-height: 1.5;
    padding: 9px 12px;
    border-radius: 8px;
    min-height: 38px;
    max-height: 120px;
    caret-color: #4a9eff;
    scrollbar-width: thin;
    scrollbar-color: #2a2a40 transparent;
    transition: border-color 0.15s ease;

    &:focus {
        border-color: #4a9eff44;
    }

    &::placeholder {
        color: #333348;
    }
`

const SendButton = styled.button<{ $disabled: boolean }>`
    width: 36px;
    height: 36px;
    border-radius: 8px;
    border: 1px solid ${p => (p.$disabled ? '#1e1e2e' : '#4a9eff44')};
    background: ${p => (p.$disabled ? 'transparent' : '#4a9eff18')};
    color: ${p => (p.$disabled ? '#333348' : '#4a9eff')};
    font-size: 15px;
    cursor: ${p => (p.$disabled ? 'default' : 'pointer')};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.15s ease;

    &:hover:not(:disabled) {
        background: #4a9eff28;
    }
`

const ErrorBanner = styled.div`
    padding: 8px 16px;
    background: #1a0808;
    border-top: 1px solid #3a1212;
    color: #ff6b6b;
    font-size: 11.5px;
    font-family: 'JetBrains Mono', monospace;
`

const CanvasPanel = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #060609;
    min-width: 0;
`

// ─── Tool name labels ──────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
    getScene: 'getScene',
    getObject: 'getObject',
    addObject: 'addObject',
    setObject: 'setObject',
    deleteObject: 'deleteObject',
    runFrames: 'runFrames',
    getSimulationState: 'getState',
    resetSimulation: 'reset'
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

const SUGGESTIONS = [
    'Add a blue circle that orbits the center',
    'Create a solar system with 3 planets',
    'Make a pulsing grid of dots',
    'Build a neon Lissajous curve'
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_SCENE: SceneConfig = {
    background: '#05050f',
    width: 800,
    height: 600,
    fps: 60,
    objects: []
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgentUI() {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [inputText, setInputText] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [scene, setScene] = useState<SceneConfig>(EMPTY_SCENE)

    // Live state while streaming — tracked in refs so closures see current values
    const [liveToolCalls, setLiveToolCalls] = useState<ToolCallInfo[]>([])
    const [liveText, setLiveText] = useState('')
    const liveToolCallsRef = useRef<ToolCallInfo[]>([])
    const liveTextRef = useRef('')

    // Debug panel
    const [debugOpen, setDebugOpen] = useState(false)
    const [debugTurns, setDebugTurns] = useState<DebugTurn[]>([])
    const currentDebugTurnRef = useRef<DebugTurn | null>(null)

    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, liveText, liveToolCalls, loading])

    // ⌘⇧D / Ctrl⇧D toggles debug panel
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'D' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setDebugOpen(o => !o)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    const resetConversation = useCallback(async () => {
        await fetch('/api/session', { method: 'DELETE' })
        setMessages([])
        setScene(EMPTY_SCENE)
        setError(null)
        setLiveToolCalls([])
        setLiveText('')
        setDebugTurns([])
        liveToolCallsRef.current = []
        liveTextRef.current = ''
        currentDebugTurnRef.current = null
    }, [])

    const sendMessage = useCallback(
        async (text: string) => {
            const trimmed = text.trim()
            if (!trimmed || loading) return

            setInputText('')
            setError(null)
            setMessages(prev => [...prev, { role: 'user', content: trimmed }])
            setLoading(true)

            // Reset live state
            liveToolCallsRef.current = []
            liveTextRef.current = ''
            setLiveToolCalls([])
            setLiveText('')

            // Start a new debug turn
            const turnId = `turn-${Date.now()}`
            currentDebugTurnRef.current = {
                id: turnId,
                userMessage: trimmed,
                toolCalls: [],
                responseText: '',
                inputTokens: 0,
                outputTokens: 0,
                durationMs: 0,
                startedAt: Date.now()
            }

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: trimmed })
                })

                if (!response.body) {
                    setError('No response body')
                    return
                }

                const reader = response.body.getReader()
                const decoder = new TextDecoder()
                let buffer = ''

                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })
                    const lines = buffer.split('\n')
                    buffer = lines.pop() ?? ''

                    for (const line of lines) {
                        if (!line.trim()) continue
                        let event: Record<string, unknown>
                        try {
                            event = JSON.parse(line)
                        } catch {
                            continue
                        }

                        if (event.type === 'tool_start') {
                            const newCall: ToolCallInfo = {
                                id: event.id as string,
                                name: event.name as string,
                                status: 'pending'
                            }
                            liveToolCallsRef.current = [...liveToolCallsRef.current, newCall]
                            setLiveToolCalls([...liveToolCallsRef.current])

                            // Debug: record tool call start
                            if (currentDebugTurnRef.current) {
                                const dbgCall: DebugToolCall = {
                                    id: event.id as string,
                                    name: event.name as string,
                                    input: event.input as Record<string, unknown>,
                                    output: null,
                                    success: false,
                                    durationMs: 0
                                }
                                currentDebugTurnRef.current.toolCalls = [
                                    ...currentDebugTurnRef.current.toolCalls,
                                    dbgCall
                                ]
                            }
                        } else if (event.type === 'tool_end') {
                            liveToolCallsRef.current = liveToolCallsRef.current.map(t =>
                                t.id === event.id
                                    ? { ...t, status: (event.success ? 'done' : 'error') as ToolCallInfo['status'] }
                                    : t
                            )
                            setLiveToolCalls([...liveToolCallsRef.current])

                            // Debug: update tool call with result
                            if (currentDebugTurnRef.current) {
                                currentDebugTurnRef.current.toolCalls = currentDebugTurnRef.current.toolCalls.map(tc =>
                                    tc.id === event.id
                                        ? {
                                              ...tc,
                                              output: event.output,
                                              success: event.success as boolean,
                                              durationMs: event.durationMs as number
                                          }
                                        : tc
                                )
                            }
                        } else if (event.type === 'text') {
                            liveTextRef.current += event.delta as string
                            setLiveText(liveTextRef.current)

                            if (currentDebugTurnRef.current) {
                                currentDebugTurnRef.current.responseText = liveTextRef.current
                            }
                        } else if (event.type === 'done') {
                            const finalToolCalls = liveToolCallsRef.current
                            const finalText = liveTextRef.current
                            setMessages(prev => [
                                ...prev,
                                { role: 'assistant', content: finalText, toolCalls: finalToolCalls }
                            ])
                            setLiveToolCalls([])
                            setLiveText('')
                            liveToolCallsRef.current = []
                            liveTextRef.current = ''
                            if (event.scene) setScene(event.scene as SceneConfig)

                            // Debug: finalize the turn
                            if (currentDebugTurnRef.current) {
                                currentDebugTurnRef.current.inputTokens = (event.inputTokens as number) ?? 0
                                currentDebugTurnRef.current.outputTokens = (event.outputTokens as number) ?? 0
                                currentDebugTurnRef.current.durationMs = Date.now() - currentDebugTurnRef.current.startedAt
                                setDebugTurns(prev => [...prev, currentDebugTurnRef.current!])
                                currentDebugTurnRef.current = null
                            }
                        } else if (event.type === 'error') {
                            setError(event.message as string)
                        }
                    }
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Request failed')
            } finally {
                setLoading(false)
            }
        },
        [loading]
    )

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(inputText)
            }
        },
        [inputText, sendMessage]
    )

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputText(e.target.value)
        e.target.style.height = 'auto'
        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
    }, [])

    const isStreaming = loading && (liveToolCalls.length > 0 || liveText.length > 0)
    const hasMessages = messages.length > 0

    return (
        <Shell>
            <Header>
                <Logo>
                    <LogoDot />
                    gameball
                </Logo>
                <HeaderActions>
                    {hasMessages && (
                        <HeaderButton onClick={resetConversation} title="Start a new conversation">
                            New scene
                        </HeaderButton>
                    )}
                    <HeaderButton
                        $active={debugOpen}
                        onClick={() => setDebugOpen(o => !o)}
                        title="Toggle debug panel (⌘⇧D)"
                    >
                        {'{ }'}
                    </HeaderButton>
                </HeaderActions>
            </Header>
            <Body>
                <ChatPanel>
                    <MessagesArea>
                        {!hasMessages && !loading ? (
                            <EmptyState>
                                <EmptyTitle>What do you want to build?</EmptyTitle>
                                <EmptySubtitle>
                                    Describe a simulation and the AI will create it live on the canvas.
                                </EmptySubtitle>
                                {SUGGESTIONS.map(s => (
                                    <Suggestion key={s} onClick={() => sendMessage(s)}>
                                        {s}
                                    </Suggestion>
                                ))}
                            </EmptyState>
                        ) : (
                            <>
                                {messages.map((msg, i) => {
                                    if (msg.role === 'user') {
                                        return <UserBubble key={i}>{msg.content}</UserBubble>
                                    }
                                    return (
                                        <AssistantBubble key={i}>
                                            {msg.toolCalls.length > 0 && (
                                                <ToolCallRow>
                                                    {msg.toolCalls.map(tc => (
                                                        <ToolChip key={tc.id} $status={tc.status}>
                                                            {TOOL_LABELS[tc.name] ?? tc.name}
                                                        </ToolChip>
                                                    ))}
                                                </ToolCallRow>
                                            )}
                                            {msg.content}
                                        </AssistantBubble>
                                    )
                                })}

                                {/* Live streaming response */}
                                {loading && (
                                    <AssistantBubble>
                                        {liveToolCalls.length > 0 && (
                                            <ToolCallRow>
                                                {liveToolCalls.map(tc => (
                                                    <ToolChip key={tc.id} $status={tc.status}>
                                                        {TOOL_LABELS[tc.name] ?? tc.name}
                                                    </ToolChip>
                                                ))}
                                            </ToolCallRow>
                                        )}
                                        {liveText || (!isStreaming && (
                                            <TypingIndicator style={{ background: 'none', border: 'none', padding: 0 }}>
                                                <span /><span /><span />
                                            </TypingIndicator>
                                        ))}
                                    </AssistantBubble>
                                )}
                            </>
                        )}
                        <div ref={messagesEndRef} />
                    </MessagesArea>
                    {error && <ErrorBanner>{error}</ErrorBanner>}
                    <InputArea>
                        <TextInput
                            value={inputText}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Describe what you want to create…"
                            disabled={loading}
                            rows={1}
                            spellCheck={false}
                        />
                        <SendButton
                            $disabled={!inputText.trim() || loading}
                            disabled={!inputText.trim() || loading}
                            onClick={() => sendMessage(inputText)}
                            title="Send (Enter)"
                        >
                            ↑
                        </SendButton>
                    </InputArea>
                </ChatPanel>
                <CanvasPanel>
                    <Gameball scene={scene} />
                </CanvasPanel>
                {debugOpen && (
                    <DebugPanel turns={debugTurns} onClose={() => setDebugOpen(false)} />
                )}
            </Body>
        </Shell>
    )
}
