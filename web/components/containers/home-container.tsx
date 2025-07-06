"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { triggerHapticFeedback } from "@/lib/haptic-feedback"
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

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
          <PostList
            posts={posts}
            likedPosts={likedPosts}
            mimickedPosts={mimickedPosts}
            onLike={handleLike}
            onMimic={handleMimic}
            onPostClick={handlePostClick}
            formatTimeAgo={formatTimeAgo}
          />
        )}
      </main>

      <LoginDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} />
      
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
