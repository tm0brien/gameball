import type { SceneConfig } from 'engine/types'

import { compileBasketball, BASKETBALL_FORMATIONS } from './basketball'
import { compileShotChart } from './shot-chart'
import type { ShotChartConfig, SportConfig } from './types'

export function compile(config: SportConfig): SceneConfig {
    switch (config.sport) {
        case 'basketball':
            return compileBasketball(config)
        default:
            throw new Error(`Unknown sport: ${(config as { sport: string }).sport}`)
    }
}

export { BASKETBALL_FORMATIONS, compileShotChart }
export type { SportConfig, ShotChartConfig }
