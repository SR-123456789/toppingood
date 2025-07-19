import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_UA = [
  'ToppifyGO-App iOS', // 例：Googlebotだけ許可
  'admin'
]

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || ''

  // どれか一つでも一致したら許可
  if (ALLOWED_UA.some(ua => userAgent.includes(ua))) {
    return NextResponse.next()
  }

  // それ以外は403
  return new NextResponse('Forbidden', { status: 403 })
}

// 必要ならマッチさせたいパスを限定
// export const config = {
//   matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
// }
