import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateUniqueUsername, generateDisplayName } from '@/lib/username-generator'

// Admin権限でSupabaseクライアントを作成
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // User-Agentをチェック
    const userAgent = request.headers.get('user-agent') || ''
    if (!userAgent.includes(NATIVE_USER_AGENT)) {
      return NextResponse.json({ error: 'Unauthorized', userAgent }, { status: 401 })
    }

    // 既存のプロフィールをチェック
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (checkError) {
      console.error('Profile check error:', checkError)
    }

    if (existingProfile) {
      return NextResponse.json({ 
        success: true, 
        profile: existingProfile, 
        message: 'Profile already exists' 
      })
    }

    // ユニークなユーザー名を生成
    const checkUsernameExists = async (username: string): Promise<boolean> => {
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("username")
        .eq("username", username)
        .maybeSingle()
      
      return !!data
    }

    const username = await generateUniqueUsername(checkUsernameExists)
    const displayName = generateDisplayName()

    console.log('Creating profile:', { userId, username, displayName })

    // プロフィール作成
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        username,
        display_name: displayName,
      })
      .select()
      .single()

    if (error) {
      console.error('Profile creation error:', error)
      return NextResponse.json({ 
        success: false,
        error: 'Profile creation failed', 
        details: error,
        userId,
        username,
        displayName
      }, { status: 500 })
    }

    console.log('Profile created successfully:', profile)
    return NextResponse.json({ success: true, profile })

  } catch (error: any) {
    console.error('Profile creation API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
