import React from 'react'

interface ContainerProps {
    children?: React.ReactNode
    background?: string
    padding?: number | string
}

const FullScreen: React.FC<ContainerProps> = ({ background = 'transparent', children, padding }) => {
    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                minWidth: '100vw',
                minHeight: '100vh',
                background: background,
                padding: padding ?? 0
            }}
            tabIndex={0}
        >
            {children}
        </div>
    )
}

export default FullScreen
