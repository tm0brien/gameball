import React from 'react'
import { ResizePayload, useResizeDetector } from 'react-resize-detector'

interface ResizeBuddyProps {
    onResize: (width?: number | null, height?: number | null) => void
}

const ResizeBuddy: React.FC<ResizeBuddyProps> = ({ onResize }) => {
    const onDetectorResize = (payload: ResizePayload) => {
        const { width, height } = payload
        onResize(width, height)
    }

    const { ref } = useResizeDetector({ onResize: onDetectorResize })
    return <div ref={ref} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
}

export default ResizeBuddy
