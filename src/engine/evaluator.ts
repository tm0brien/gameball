import { evaluate } from 'mathjs'

import type { AnimatableBoolean, AnimatableColor, AnimatableNumber, AnimatableString, FormulaValue } from './types'

export interface EvalScope {
    frame: number
    t: number
    width: number
    height: number
    objects: Record<string, Record<string, number | string | boolean>>
    parent?: { x: number; y: number }
    [key: string]: unknown
}

function isFormula(v: unknown): v is FormulaValue {
    return typeof v === 'object' && v !== null && 'formula' in v
}

export function evalNumber(value: AnimatableNumber | undefined, fallback: number, scope: EvalScope): number {
    if (value === undefined) return fallback
    if (isFormula(value)) {
        try {
            const result = evaluate(value.formula, scope)
            return typeof result === 'number' ? result : Number(result)
        } catch {
            return fallback
        }
    }
    return value
}

export function evalBoolean(value: AnimatableBoolean | undefined, fallback: boolean, scope: EvalScope): boolean {
    if (value === undefined) return fallback
    if (isFormula(value)) {
        try {
            const result = evaluate(value.formula, scope)
            return Boolean(result)
        } catch {
            return fallback
        }
    }
    return value
}

export function evalString(value: AnimatableString | undefined, fallback: string, scope: EvalScope): string {
    if (value === undefined) return fallback
    if (isFormula(value)) {
        try {
            const result = evaluate(value.formula, scope)
            return String(result)
        } catch {
            return fallback
        }
    }
    return value
}

export function evalColor(value: AnimatableColor | undefined, fallback: string | null, scope: EvalScope): string | null {
    if (value === undefined) return fallback
    if (value === null) return null
    if (isFormula(value)) {
        try {
            const result = evaluate(value.formula, scope)
            return String(result)
        } catch {
            return fallback
        }
    }
    return value
}
