import { getSession } from 'lib/session-store'
import { NextResponse } from 'next/server'

const SESSION_ID = 'default'

export async function GET() {
    const session = getSession(SESSION_ID)
    if (!session) {
        return NextResponse.json(
            { background: '#05050f', width: 800, height: 600, fps: 60, objects: [] }
        )
    }
    return NextResponse.json(session.scene)
}
