"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { triggerHapticFeedback } from "@/lib/haptic-feedback"
import { autoSignInNative, createAutoAccountAndLogin } from "@/lib/native-auth"
import { isNativeApp } from "@/lib/platform-utils"
import { LoginDialog } from "@/components/auth/login-dialog"
import { ResponsiveLayout } from "@/components/responsive-layout"
import { MobileHeader } from "@/components/ui/mobile-header"
import { PostList } from "@/components/ui/post-list"
import { EmptyState } from "@/components/ui/empty-state"
import { ensureProfile } from "@/lib/profile-utils"
import type { PostWithProfile } from "@/app/page"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface HomeContainerProps {
  user: SupabaseUser | null
  initialPosts: PostWithProfile[]
}

export function HomeContainer({ user: initialUser, initialPosts }: HomeContainerProps) {
  const [posts, setPosts] = useState<PostWithProfile[]>(initialPosts || [])
  const [likedPosts, setLikedPosts] = useState<string[]>([])
  const [mimickedPosts, setMimickedPosts] = useState<string[]>([])
  const [user, setUser] = useState<SupabaseUser | null>(initialUser)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAuthSuccessMessage, setShowAuthSuccessMessage] = useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // ネイティブアプリでの自動認証
  useEffect(() => {
    const handleNativeAuth = async () => {
      if (isNativeApp()) {
        console.log('🔍 ネイティブアプリ起動時の自動認証開始')
        console.log('📊 初期ユーザー状態:', !!initialUser)
        
        try {
          // まず現在のセッションを確認
          const { data: { session } } = await supabase.auth.getSession()
          console.log('📊 現在のセッション:', !!session)
          
          if (session && session.user) {
            console.log('✅ 既存セッションあり、ユーザー情報を更新')
            setUser(session.user)
            return
          }
          
          // セッションがない場合、localStorageから認証情報を取得して直接ログイン
          if (typeof window !== 'undefined') {
            const savedAccount = localStorage.getItem('toppifygo_native_account')
            console.log('💾 localStorage認証情報:', !!savedAccount)
            
            if (savedAccount) {
              try {
                const accountInfo = JSON.parse(savedAccount)
                if (accountInfo.email && accountInfo.password && accountInfo.created) {
                  console.log('🔑 localStorageから直接ログイン試行:', accountInfo.email)
                  
                  const { data, error } = await supabase.auth.signInWithPassword({
                    email: accountInfo.email,
                    password: accountInfo.password,
                  })
                  
                  if (!error && data.user) {
                    console.log('✅ 直接ログイン成功')
                    setUser(data.user)
                    setShowAuthSuccessMessage(true)
                    setTimeout(() => setShowAuthSuccessMessage(false), 3000)
                    return
                  } else {
                    console.log('❌ 直接ログイン失敗:', error?.message)
                    // 認証情報が無効な場合はクリア
                    if (error?.message.includes('Invalid login credentials')) {
                      localStorage.removeItem('toppifygo_native_account')
                      console.log('🗑️ 無効な認証情報をクリアしました')
                    }
                  }
                }
              } catch (parseError) {
                console.error('localStorage解析エラー:', parseError)
              }
            } else {

              const result = await autoSignInNative()

              if(result.success) {
                location.reload()
              }

            }
          }
          
        } catch (error) {
          console.error('自動認証でエラーが発生:', error)
        }
      }
    }

    handleNativeAuth()
  }, [supabase, initialUser])

  // 認証成功メッセージの表示チェック
  useEffect(() => {
    const authSuccess = searchParams.get('auth')
    if (authSuccess === 'success') {
      setShowAuthSuccessMessage(true)
      // URLパラメータをクリア
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete('auth')
      window.history.replaceState({}, '', newUrl.toString())
      
      // 3秒後にメッセージを非表示
      setTimeout(() => {
        setShowAuthSuccessMessage(false)
      }, 3000)
    }
  }, [searchParams])

  // ユーザーのいいねと真似した投稿を取得
  useEffect(() => {
    const fetchUserInteractions = async () => {
      if (!user) return

      try {
        setIsLoading(true)
        
        // 表示されている投稿のIDのみを対象にする
        const postIds = posts.map(post => post.id)
        
        if (postIds.length === 0) {
          setIsLoading(false)
          return
        }

        // 表示中の投稿のみでいいねを取得
        const { data: likes } = await supabase
          .from("likes")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds) // 表示中の投稿のみ
        
        if (likes) {
          setLikedPosts(likes.map((like) => like.post_id))
        }

        // 表示中の投稿のみで真似を取得
        const { data: mimics } = await supabase
          .from("mimics")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds) // 表示中の投稿のみ
        
        if (mimics) {
          setMimickedPosts(mimics.map((mimic) => mimic.post_id))
        }
      } catch (error) {
        console.error("Error fetching user interactions:", error)
        setError("ユーザーデータの取得に失敗しました")
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserInteractions()
  }, [user, posts, supabase]) // postsも依存関係に追加

  // 追加の投稿を読み込む関数
  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    try {
      const { data: morePosts, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .range(posts.length, posts.length + 19) // 次の20件を取得

      if (error) {
        console.error("Error loading more posts:", error)
        return
      }

      if (!morePosts || morePosts.length === 0) {
        setHasMore(false)
        return
      }

      // プロフィールも取得
      const userIds = [...new Set(morePosts.map((post) => post.user_id))]
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds)

      const postsWithProfiles: PostWithProfile[] = morePosts.map((post) => ({
        ...post,
        profile: profiles?.find((profile) => profile.id === post.user_id) || null,
      }))

      setPosts(prev => [...prev, ...postsWithProfiles])
      
      // 20件未満なら最後のページ
      if (morePosts.length < 20) {
        setHasMore(false)
      }
    } catch (error) {
      console.error("Error in loadMorePosts:", error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [posts.length, isLoadingMore, hasMore, supabase])

  // スクロール検知
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight || isLoadingMore) {
        return
      }
      loadMorePosts()
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadMorePosts, isLoadingMore])

  const requireLogin = (action: () => void) => {
    if (!user) {
      triggerHapticFeedback('light') // ログインダイアログ表示は軽めのフィードバック
      setShowLoginDialog(true)
      return
    }
    action()
  }

  const handleLike = async (postId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    // いいねボタンには軽めの触覚フィードバック
    triggerHapticFeedback('light')

    if (!user) {
      setShowLoginDialog(true)
      return
    }

    const isLiked = likedPosts.includes(postId)

    try {
      await ensureProfile(user.id)

      if (isLiked) {
        await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", postId)
        setLikedPosts((prev) => prev.filter((id) => id !== postId))
      } else {
        await supabase.from("likes").insert({ user_id: user.id, post_id: postId })
        setLikedPosts((prev) => [...prev, postId])
      }

      setPosts((prev) =>
        prev.map((post) => (post.id === postId ? { ...post, like_count: post.like_count + (isLiked ? -1 : 1) } : post)),
      )
    } catch (error) {
      console.error("Error handling like:", error)
    }
  }

  const handleMimic = async (postId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    // 真似するボタンには中程度の触覚フィードバック（重要なアクション）
    triggerHapticFeedback('medium')

    if (!user) {
      setShowLoginDialog(true)
      return
    }

    const isMimicked = mimickedPosts.includes(postId)

    try {
      await ensureProfile(user.id)

      if (isMimicked) {
        await supabase.from("mimics").delete().eq("user_id", user.id).eq("post_id", postId)
        setMimickedPosts((prev) => prev.filter((id) => id !== postId))
      } else {
        await supabase.from("mimics").insert({ user_id: user.id, post_id: postId })
        setMimickedPosts((prev) => [...prev, postId])
      }

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, mimic_count: post.mimic_count + (isMimicked ? -1 : 1) } : post,
        ),
      )
    } catch (error) {
      console.error("Error handling mimic:", error)
    }
  }

  const handleCreatePost = () => {
    requireLogin(() => {
      triggerHapticFeedback('medium') // 投稿作成は重要なアクション
      router.push("/create")
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setLikedPosts([])
    setMimickedPosts([])
    router.refresh()
  }

  const handlePostClick = (postId: string) => {
    // 投稿詳細表示には軽めの触覚フィードバック
    triggerHapticFeedback('light')
    router.push(`/post/${postId}`)
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const postDate = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "たった今"
    if (diffInHours < 24) return `${diffInHours}時間前`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}日前`
  }

  return (
    <ResponsiveLayout user={user}>
      <MobileHeader
        onCreatePost={handleCreatePost}
        onLogin={() => setShowLoginDialog(true)}
        onLogout={handleLogout}
        user={user}
      />

      <main className="pb-20 lg:pb-0 lg:py-8">
        {error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              再読み込み
            </button>
          </div>
        ) : isCreatingAccount ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-500">アカウントを作成中...</p>
            <p className="text-sm text-gray-400 mt-2">しばらくお待ちください</p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">読み込み中...</p>
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            message="まだ投稿がありません"
            actionLabel="最初の投稿をしてみよう！"
            onAction={handleCreatePost}
          />
        ) : (
          <>
            <PostList
              posts={posts}
              likedPosts={likedPosts}
              mimickedPosts={mimickedPosts}
              onLike={handleLike}
              onMimic={handleMimic}
              onPostClick={handlePostClick}
              formatTimeAgo={formatTimeAgo}
            />
            
            {/* 無限スクロール用のローディング表示 */}
            {isLoadingMore && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">さらに読み込み中...</p>
              </div>
            )}
            
            {/* 全て読み込み完了の表示 */}
            {!hasMore && posts.length > 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">すべての投稿を表示しました</p>
              </div>
            )}
          </>
        )}
      </main>

      <LoginDialog 
        open={showLoginDialog} 
        onOpenChange={setShowLoginDialog}
        onSuccess={(loggedInUser) => {
          console.log('🎉 ログイン成功、ユーザー状態を更新:', loggedInUser?.email)
          if (loggedInUser) {
            setUser(loggedInUser)
            setShowAuthSuccessMessage(true)
            setTimeout(() => setShowAuthSuccessMessage(false), 3000)
          }
        }}
      />
      
      {/* 認証成功メッセージ */}
      {showAuthSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>ログインが完了しました！ToppinGOODへようこそ 🎉</span>
          </div>
        </div>
      )}
    </ResponsiveLayout>
  )
}
