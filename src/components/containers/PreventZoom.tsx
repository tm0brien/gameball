import * as React from 'react'

interface PreventZoomProps {
    domRef: React.MutableRefObject<HTMLDivElement | null>
}

const PreventZoom: React.FC<PreventZoomProps> = ({ domRef }) => {
    React.useEffect(() => {
        if (!domRef.current) {
            return
        }

        const preventZooming = (ev: WheelEvent | TouchEvent) => {
            if (ev.ctrlKey) {
                ev.preventDefault()
            }
        }

        domRef.current.addEventListener('wheel', preventZooming, {
            passive: false
        })

        domRef.current.addEventListener('touchmove', preventZooming, {
            passive: false
        })

        return () => {
            if (domRef.current) {
                domRef.current.removeEventListener('wheel', preventZooming)
                domRef.current.removeEventListener('touchmove', preventZooming)
            }
        }
    }, [])

    return null
}

export default PreventZoom
