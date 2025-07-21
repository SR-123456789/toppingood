import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

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

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // 認証確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    console.log('Deleting account for user:', userId)

    // 1. ユーザーの投稿に関連するデータを削除
    // いいね、真似データを削除
    const { error: likesError } = await supabaseAdmin
      .from('likes')
      .delete()
      .eq('user_id', userId)

    if (likesError) {
      console.error('Error deleting likes:', likesError)
    }

    const { error: mimicsError } = await supabaseAdmin
      .from('mimics')
      .delete()
      .eq('user_id', userId)

    if (mimicsError) {
      console.error('Error deleting mimics:', mimicsError)
    }

    // 2. ユーザーの投稿を削除
    const { error: postsError } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('user_id', userId)

    if (postsError) {
      console.error('Error deleting posts:', postsError)
      return NextResponse.json({ error: 'Failed to delete posts' }, { status: 500 })
    }

    // 3. プロフィールを削除
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error deleting profile:', profileError)
      return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 })
    }

    // 4. 最後にユーザーアカウント自体を削除
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteUserError) {
      console.error('Error deleting user account:', deleteUserError)
      return NextResponse.json({ error: 'Failed to delete user account' }, { status: 500 })
    }

    console.log('Account deleted successfully:', userId)

    return NextResponse.json({ 
      success: true,
      message: 'アカウントが正常に削除されました' 
    })

  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
