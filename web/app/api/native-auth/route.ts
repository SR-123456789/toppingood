import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { generateUniqueUsername, generateDisplayName } from '@/lib/username-generator'

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
const NATIVE_USER_AGENT = 'ToppifyGO-App iOS dess'



export async function POST(request: NextRequest) {
  try {
    // User-Agentでネイティブアプリかチェック
    const userAgent = request.headers.get('user-agent') || ''
    if (!userAgent.includes(NATIVE_USER_AGENT)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const email = `${uuidv4()}@auth.toppifygo.prep-an.com`
    const password = uuidv4() + uuidv4().replace(/-/g, '') // より長いパスワード

    console.log('Creating native account:', email)

    // ユーザー名の重複チェック関数
    const checkUsernameExists = async (username: string): Promise<boolean> => {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("username")
        .eq("username", username)
        .single()
      
      return !!data
    }

    // いい感じのユーザー名と表示名を生成
    const username = await generateUniqueUsername(checkUsernameExists)
    const displayName = generateDisplayName()
    
    console.log('Generated username for native user:', username)
    console.log('Generated display name for native user:', displayName)

    // Admin APIで確認済みユーザーを作成（ユーザー名付き）
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // メール確認をスキップ
      user_metadata: {
        username,
        display_name: displayName,
        created_via: 'native_app',
        auto_generated: true,
        created_at: new Date().toISOString()
      }
    })

    if (createError) {
      console.error('User creation error:', createError)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    console.log('Native account created successfully with username:', userData.user?.id, username)

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
