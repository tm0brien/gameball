import { resetSession } from 'lib/session-store'
import { NextResponse } from 'next/server'

const SESSION_ID = 'default'

export async function DELETE() {
    resetSession(SESSION_ID)
    return NextResponse.json({ ok: true })
}
