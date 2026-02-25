'use client'

import type { SceneConfig } from 'engine/types'
import { demos } from 'lib/demos'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

import Gameball from './Gameball'

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
    justify-content: space-between;
    height: 52px;
    padding: 0 20px;
    background: #0f0f18;
    border-bottom: 1px solid #1e1e2e;
    flex-shrink: 0;
    gap: 16px;
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

const DemoBar = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`

const DemoLabel = styled.span`
    font-size: 11px;
    color: #555570;
    margin-right: 4px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
`

const DemoButton = styled.button<{ $active: boolean }>`
    padding: 5px 12px;
    border-radius: 6px;
    border: 1px solid ${p => p.$active ? '#4a9eff55' : '#1e1e2e'};
    background: ${p => p.$active ? '#4a9eff18' : 'transparent'};
    color: ${p => p.$active ? '#4a9eff' : '#888899'};
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;

    &:hover {
        border-color: #4a9eff55;
        color: #b0c8ff;
    }
`

const Body = styled.div`
    display: flex;
    flex: 1;
    min-height: 0;
`

const EditorPanel = styled.div`
    display: flex;
    flex-direction: column;
    width: 380px;
    min-width: 280px;
    border-right: 1px solid #1e1e2e;
    background: #0b0b14;
    flex-shrink: 0;
`

const EditorHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid #1a1a28;
`

const EditorTitle = styled.span`
    font-size: 11px;
    color: #44445a;
    text-transform: uppercase;
    letter-spacing: 0.08em;
`

const RunButton = styled.button`
    padding: 4px 12px;
    border-radius: 5px;
    border: 1px solid #2a2a40;
    background: #151525;
    color: #7788cc;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        border-color: #4a9eff55;
        color: #4a9eff;
        background: #4a9eff0f;
    }
`

const CodeArea = styled.textarea`
    flex: 1;
    resize: none;
    border: none;
    outline: none;
    background: transparent;
    color: #c8c8e0;
    font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace;
    font-size: 12.5px;
    line-height: 1.7;
    padding: 16px;
    tab-size: 2;
    caret-color: #4a9eff;
    scrollbar-width: thin;
    scrollbar-color: #2a2a40 transparent;

    &::selection {
        background: #4a9eff28;
    }
`

const ErrorBanner = styled.div`
    padding: 10px 16px;
    background: #2a0a0a;
    border-top: 1px solid #4a1a1a;
    color: #ff6b6b;
    font-size: 11.5px;
    font-family: 'JetBrains Mono', monospace;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 80px;
    overflow-y: auto;
`

const CanvasPanel = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #060609;
    min-width: 0;
`

// ─── Component ────────────────────────────────────────────────────────────────

function sceneToJson(scene: SceneConfig): string {
    return JSON.stringify(scene, null, 2)
}

export default function SimulatorUI() {
    const [activeDemoId, setActiveDemoId] = useState(demos[0].id)
    const [editorText, setEditorText] = useState(() => sceneToJson(demos[0].scene))
    const [scene, setScene] = useState<SceneConfig>(demos[0].scene)
    const [error, setError] = useState<string | null>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Load demo into editor
    const loadDemo = useCallback((demoId: string) => {
        const demo = demos.find(d => d.id === demoId)
        if (!demo) return
        setActiveDemoId(demoId)
        const text = sceneToJson(demo.scene)
        setEditorText(text)
        setScene(demo.scene)
        setError(null)
    }, [])

    // Parse and apply editor content
    const applyEditorText = useCallback((text: string) => {
        try {
            const parsed = JSON.parse(text)
            if (!parsed.objects || !Array.isArray(parsed.objects)) {
                setError('Scene must have an "objects" array.')
                return
            }
            setScene(parsed as SceneConfig)
            setError(null)
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Invalid JSON')
        }
    }, [])

    const handleEditorChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value
        setEditorText(text)
        setActiveDemoId('') // deactivate demo highlight when editing

        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => applyEditorText(text), 600)
    }, [applyEditorText])

    const handleRun = useCallback(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        applyEditorText(editorText)
    }, [editorText, applyEditorText])

    // Cmd/Ctrl+Enter to run
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            handleRun()
        }
    }, [handleRun])

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [])

    return (
        <Shell>
            <Header>
                <Logo>
                    <LogoDot />
                    gameball
                </Logo>
                <DemoBar>
                    <DemoLabel>examples</DemoLabel>
                    {demos.map(demo => (
                        <DemoButton
                            key={demo.id}
                            $active={activeDemoId === demo.id}
                            onClick={() => loadDemo(demo.id)}
                        >
                            {demo.label}
                        </DemoButton>
                    ))}
                </DemoBar>
            </Header>
            <Body>
                <EditorPanel>
                    <EditorHeader>
                        <EditorTitle>scene.json</EditorTitle>
                        <RunButton onClick={handleRun} title="Run (⌘↵)">
                            ▶ Run
                        </RunButton>
                    </EditorHeader>
                    <CodeArea
                        value={editorText}
                        onChange={handleEditorChange}
                        onKeyDown={handleKeyDown}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                    />
                    {error && <ErrorBanner>{error}</ErrorBanner>}
                </EditorPanel>
                <CanvasPanel>
                    <Gameball scene={scene} />
                </CanvasPanel>
            </Body>
        </Shell>
    )
}
