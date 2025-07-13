import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

// サーバーサイドでAdmin APIを使用（安全）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // サーバーサイドでのみ使用
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    // User-Agentでネイティブアプリかチェック
    const userAgent = request.headers.get('user-agent') || ''
    if (!userAgent.includes('ToppifyGO-App iOS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const email = `${uuidv4()}@auth.toppifygo.prep-an.com`
    const password = uuidv4() + uuidv4().replace(/-/g, '') // より長いパスワード

    console.log('Creating native account:', email)

    // Admin APIで確認済みユーザーを作成
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // メール確認をスキップ
      user_metadata: {
        created_via: 'native_app',
        created_at: new Date().toISOString()
      }
    })

    if (createError) {
      console.error('User creation error:', createError)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    console.log('Native account created successfully:', userData.user?.id)

    return NextResponse.json({
      email,
      password,
      user: userData.user,
      success: true
    })
  } catch (error) {
    console.error('Native auth error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
