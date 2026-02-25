import React, { Children } from 'react'

interface GridRowProps {
    spacing?: number
    children?: React.ReactNode
    columnSizing?: string
}

const GridRow: React.FC<GridRowProps> = ({ spacing = 0, children, columnSizing }) => {
    const numChildren = Children.toArray(children).filter(child => React.isValidElement(child)).length
    const templateCols = columnSizing ?? `repeat(${numChildren}, 1fr)`

    return (
        <div
            style={{
                display: 'grid',
                width: '100%',
                height: '100%',
                minWidth: 0,
                minHeight: 0,
                gap: spacing,
                gridTemplateColumns: templateCols
            }}
        >
            {children}
        </div>
    )
}

export default GridRow
