import * as Containers from 'components/containers'
import React from 'react'

const Root = () => {
    return (
        <div style={{ width: '100%', height: '100vh' }} tabIndex={0}>
            <Containers.FullScreen background={'#ffffff'}>
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'pre'
                    }}
                >
                    Hello there! This is{' '}
                    <code style={{ fontSize: 12, backgroundColor: 'black', color: 'white' }}>nextjs-template</code>.
                </div>
            </Containers.FullScreen>
        </div>
    )
}

export default Root
