import React from 'react'

interface FlexItemProps {
    flexGrow?: number
    flexShrink?: number
    flexBasis?: string
    children?: React.ReactNode
}

const FlexItem: React.FC<FlexItemProps> = ({ flexGrow = 0, flexShrink = 1, flexBasis = 'auto', children }) => {
    return (
        <div
            style={{
                flexGrow: flexGrow,
                flexShrink: flexShrink,
                flexBasis: flexBasis,
                minHeight: 0,
                minWidth: 0
            }}
        >
            {children}
        </div>
    )
}

export default FlexItem
