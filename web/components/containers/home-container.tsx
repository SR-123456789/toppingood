"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { LoginDialog } from "@/components/auth/login-dialog"
import { ResponsiveLayout } from "@/components/responsive-layout"
import { MobileHeader } from "@/components/ui/mobile-header"
import { PostList } from "@/components/ui/post-list"
import { EmptyState } from "@/components/ui/empty-state"
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
  const router = useRouter()
  const supabase = createClient()

  // ユーザーのいいねと真似した投稿を取得
  useEffect(() => {
    const fetchUserInteractions = async () => {
      if (!user) return

      try {
        setIsLoading(true)
        const { data: likes } = await supabase.from("likes").select("post_id").eq("user_id", user.id)
        if (likes) {
          setLikedPosts(likes.map((like) => like.post_id))
        }

        const { data: mimics } = await supabase.from("mimics").select("post_id").eq("user_id", user.id)
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
  }, [user, supabase])

  // プロフィールの存在確認と作成
  const ensureProfile = async (userId: string) => {
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).single()

    if (!profile) {
      const { error } = await supabase.from("profiles").insert({
        id: userId,
        username: `user_${userId.substring(0, 8)}`,
        display_name: "ユーザー",
      })

      if (error) {
        console.error("Error creating profile:", error)
        throw error
      }
    }
  }

  const requireLogin = (action: () => void) => {
    if (!user) {
      setShowLoginDialog(true)
      return
    }
    action()
  }

  const handleLike = async (postId: string, event: React.MouseEvent) => {
    event.stopPropagation()

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
    </ResponsiveLayout>
  )
}
