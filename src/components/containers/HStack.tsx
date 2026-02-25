import React from 'react'

const vAligns = {
    center: 'center',
    left: 'flex-start',
    right: 'flex-end'
}

type vAlignKey = keyof typeof vAligns

interface HStackProps {
    height?: number | string
    verticalAlignment?: vAlignKey
    spacing?: number
    children?: React.ReactNode
}

const HStack: React.FC<HStackProps> = ({ height = '100%', verticalAlignment = 'center', spacing = 0, children }) => {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                height: height,
                minWidth: 0,
                width: 'fit-content',
                alignItems: vAligns[verticalAlignment],
                justifyContent: 'flex-start',
                gap: spacing
            }}
        >
            {children}
        </div>
    )
}

export default HStack
