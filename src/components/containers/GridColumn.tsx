import React, { Children } from 'react'

interface GridColProps {
    spacing?: number
    children?: React.ReactNode
    rowSizing?: string
}

const GridColumn: React.FC<GridColProps> = ({ spacing = 0, children, rowSizing }) => {
    const numChildren = Children.toArray(children).filter(child => React.isValidElement(child)).length
    const templateRows = rowSizing ?? `repeat(${numChildren}, 1fr)`

    return (
        <div
            style={{
                display: 'grid',
                width: '100%',
                height: '100%',
                minWidth: 0,
                minHeight: 0,
                gap: spacing,
                gridTemplateRows: templateRows
            }}
        >
            {children}
        </div>
    )
}

export default GridColumn
