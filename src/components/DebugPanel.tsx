'use client'

import React, { useState } from 'react'
import styled from 'styled-components'

// ─── Types (exported for AgentUI to accumulate) ───────────────────────────────

export interface DebugToolCall {
    id: string
    name: string
    input: Record<string, unknown>
    output: unknown
    success: boolean
    durationMs: number
}

export interface DebugTurn {
    id: string
    userMessage: string
    toolCalls: DebugToolCall[]
    responseText: string
    inputTokens: number
    outputTokens: number
    durationMs: number
    startedAt: number
}

// ─── Styled components ────────────────────────────────────────────────────────

const Panel = styled.div`
    width: 340px;
    min-width: 340px;
    display: flex;
    flex-direction: column;
    border-left: 1px solid #1e1e2e;
    background: #080810;
    overflow: hidden;
`

const PanelHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    height: 40px;
    border-bottom: 1px solid #1a1a28;
    flex-shrink: 0;
`

const PanelTitle = styled.span`
    font-size: 11px;
    color: #44445a;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
`

const CloseButton = styled.button`
    background: none;
    border: none;
    color: #333348;
    font-size: 16px;
    cursor: pointer;
    padding: 2px 4px;
    line-height: 1;
    transition: color 0.15s;

    &:hover {
        color: #6666aa;
    }
`

const ScrollArea = styled.div`
    flex: 1;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #1e1e2e transparent;
    display: flex;
    flex-direction: column;
`

const EmptyState = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #2a2a40;
    font-size: 12px;
    font-family: 'JetBrains Mono', monospace;
`

// ─── Turn ─────────────────────────────────────────────────────────────────────

const TurnWrapper = styled.div`
    border-bottom: 1px solid #0f0f1a;
`

const TurnHeader = styled.button`
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 14px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;

    &:hover {
        background: #0d0d1a;
    }
`

const TurnChevron = styled.span<{ $open: boolean }>`
    color: #2a2a40;
    font-size: 10px;
    margin-top: 2px;
    flex-shrink: 0;
    transform: ${p => (p.$open ? 'rotate(90deg)' : 'rotate(0deg)')};
    transition: transform 0.15s ease;
`

const TurnInfo = styled.div`
    flex: 1;
    min-width: 0;
`

const TurnMessage = styled.div`
    font-size: 11.5px;
    color: #7788aa;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`

const TurnMeta = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 3px;
    font-size: 10px;
    font-family: 'JetBrains Mono', monospace;
    color: #2a2a3a;
`

const TurnBody = styled.div`
    padding: 0 14px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
`

// ─── Tool call ────────────────────────────────────────────────────────────────

const ToolCallWrapper = styled.div`
    border: 1px solid #141420;
    border-radius: 6px;
    overflow: hidden;
`

const ToolCallHeader = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 6px 10px;
    background: #0d0d18;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;

    &:hover {
        background: #111120;
    }
`

const ToolStatus = styled.span<{ $success: boolean }>`
    font-size: 10px;
    color: ${p => (p.$success ? '#3ecf8e' : '#ff6b6b')};
    flex-shrink: 0;
`

const ToolName = styled.span`
    flex: 1;
    font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
    color: #8899bb;
`

const ToolDuration = styled.span`
    font-size: 10px;
    font-family: 'JetBrains Mono', monospace;
    color: #2a2a40;
    flex-shrink: 0;
`

const ToolChevron = styled.span<{ $open: boolean }>`
    color: #2a2a40;
    font-size: 9px;
    flex-shrink: 0;
    transform: ${p => (p.$open ? 'rotate(90deg)' : 'rotate(0deg)')};
    transition: transform 0.15s ease;
`

const ToolBody = styled.div`
    border-top: 1px solid #141420;
    background: #07070e;
`

const JsonSection = styled.div`
    padding: 6px 10px;
    border-bottom: 1px solid #0d0d18;

    &:last-child {
        border-bottom: none;
    }
`

const JsonLabel = styled.div`
    font-size: 9.5px;
    font-family: 'JetBrains Mono', monospace;
    color: #2a2a40;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 4px;
`

const JsonPre = styled.pre`
    margin: 0;
    font-size: 10.5px;
    font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
    color: #5566aa;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 200px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #1a1a28 transparent;
    line-height: 1.5;
`

// ─── Response text ────────────────────────────────────────────────────────────

const ResponseSection = styled.div`
    padding: 6px 10px;
    border: 1px solid #141420;
    border-radius: 6px;
    background: #0d0d18;
`

const ResponseLabel = styled.div`
    font-size: 9.5px;
    font-family: 'JetBrains Mono', monospace;
    color: #2a2a40;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 4px;
`

const ResponseText = styled.div`
    font-size: 11px;
    color: #44445a;
    line-height: 1.5;
    max-height: 80px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #1a1a28 transparent;
`

// ─── Sub-components ───────────────────────────────────────────────────────────

function ToolCallRow({ tc }: { tc: DebugToolCall }) {
    const [open, setOpen] = useState(false)
    return (
        <ToolCallWrapper>
            <ToolCallHeader onClick={() => setOpen(o => !o)}>
                <ToolStatus $success={tc.success}>{tc.success ? '✓' : '✕'}</ToolStatus>
                <ToolName>{tc.name}</ToolName>
                <ToolDuration>{tc.durationMs}ms</ToolDuration>
                <ToolChevron $open={open}>▶</ToolChevron>
            </ToolCallHeader>
            {open && (
                <ToolBody>
                    <JsonSection>
                        <JsonLabel>input</JsonLabel>
                        <JsonPre>{JSON.stringify(tc.input, null, 2)}</JsonPre>
                    </JsonSection>
                    <JsonSection>
                        <JsonLabel>output</JsonLabel>
                        <JsonPre>{JSON.stringify(tc.output, null, 2)}</JsonPre>
                    </JsonSection>
                </ToolBody>
            )}
        </ToolCallWrapper>
    )
}

function TurnRow({ turn }: { turn: DebugTurn }) {
    const [open, setOpen] = useState(true)
    const totalTokens = turn.inputTokens + turn.outputTokens
    const durationSec = (turn.durationMs / 1000).toFixed(1)
    const time = new Date(turn.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

    return (
        <TurnWrapper>
            <TurnHeader onClick={() => setOpen(o => !o)}>
                <TurnChevron $open={open}>▶</TurnChevron>
                <TurnInfo>
                    <TurnMessage>{turn.userMessage}</TurnMessage>
                    <TurnMeta>
                        <span>{time}</span>
                        <span>{totalTokens} tok</span>
                        <span>{durationSec}s</span>
                        <span>{turn.toolCalls.length} calls</span>
                    </TurnMeta>
                </TurnInfo>
            </TurnHeader>
            {open && (
                <TurnBody>
                    {turn.toolCalls.map(tc => (
                        <ToolCallRow key={tc.id} tc={tc} />
                    ))}
                    {turn.responseText && (
                        <ResponseSection>
                            <ResponseLabel>response</ResponseLabel>
                            <ResponseText>{turn.responseText}</ResponseText>
                        </ResponseSection>
                    )}
                </TurnBody>
            )}
        </TurnWrapper>
    )
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface DebugPanelProps {
    turns: DebugTurn[]
    onClose: () => void
}

export default function DebugPanel({ turns, onClose }: DebugPanelProps) {
    const reversed = [...turns].reverse()

    return (
        <Panel>
            <PanelHeader>
                <PanelTitle>Debug</PanelTitle>
                <CloseButton onClick={onClose} title="Close debug panel">×</CloseButton>
            </PanelHeader>
            <ScrollArea>
                {reversed.length === 0 ? (
                    <EmptyState>no turns yet</EmptyState>
                ) : (
                    reversed.map(turn => <TurnRow key={turn.id} turn={turn} />)
                )}
            </ScrollArea>
        </Panel>
    )
}
