import React from 'react'

const hAligns = {
    center: 'center',
    left: 'flex-start',
    right: 'flex-end'
}

type hAlignKey = keyof typeof hAligns

interface VStackProps {
    width?: number | string
    horizontalAlignment?: hAlignKey
    spacing?: number
    children?: React.ReactNode
}

const HStack: React.FC<VStackProps> = ({ width = '100%', horizontalAlignment = 'center', spacing = 0, children }) => {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                width: width,
                minHeight: 0,
                height: 'fit-content',
                alignItems: hAligns[horizontalAlignment],
                justifyContent: 'flex-start',
                gap: spacing
            }}
        >
            {children}
        </div>
    )
}

export default HStack
