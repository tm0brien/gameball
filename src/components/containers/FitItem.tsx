'use client'

import React from 'react'
import { useResizeDetector } from 'react-resize-detector'

interface FitItemProps {
    childAspectRatio: number
    children?: React.ReactNode
    style?: React.CSSProperties
}

const FitItem: React.FC<FitItemProps> = ({ children, childAspectRatio, style }) => {
    const { width, height, ref } = useResizeDetector()
    const [childSize, setChildSize] = React.useState<number[]>([0, 0])

    React.useEffect(() => {
        if (width === undefined || height === undefined) {
            return
        }
        const ar = width / height
        let h = 0
        let w = 0

        if (ar > childAspectRatio) {
            h = height
            w = h * childAspectRatio
        } else {
            w = width
            h = w / childAspectRatio
        }
        setChildSize([w, h])
    }, [width, height, childAspectRatio])

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex'
            }}
            ref={ref}
        >
            <div style={{ width: childSize[0], height: childSize[1], margin: 'auto', ...style }}>{children}</div>
        </div>
    )
}

export default FitItem
