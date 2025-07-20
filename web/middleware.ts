import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_UA = [
  'ToppifyGO-App iOS',
  'admin'
]

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || ''

  // UAが許可されていればOK
  if (ALLOWED_UA.some(ua => userAgent.includes(ua))) {
    return NextResponse.next()
  }

  // それ以外は403
  return new NextResponse('Forbidden', { status: 403 })
}

// ✅ middlewareを適用する対象を限定
export const config = {
  matcher: [
    // APIや_nextなどは除外（通常の静的リソース含む）
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\.\\w+$).*)',
  ],
}
