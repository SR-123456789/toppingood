"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Heart, MessageCircle, Share2, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { LoginDialog } from "@/components/auth/login-dialog"
import { FooterNavigation } from "@/components/footer-navigation"
import type { PostWithProfile } from "@/app/page"
import { AnimatedImageCarousel } from "@/components/animated-image-carousel"

interface Comment {
  id: string
  user_id: string
  post_id: string
  content: string
  created_at: string
  profile: {
    username: string
    display_name: string
    avatar_url: string
  } | null
}

export default function PostDetailPage() {
  const [post, setPost] = useState<PostWithProfile | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [user, setUser] = useState(null)
  const [isLiked, setIsLiked] = useState(false)
  const [isMimicked, setIsMimicked] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    if (params.id) {
      fetchPost(params.id as string)
      checkUser()
    }
  }, [params.id])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)

    if (user && params.id) {
      checkUserInteractions(user.id, params.id as string)
    }
  }

  const checkUserInteractions = async (userId: string, postId: string) => {
    // いいね状態をチェック
    const { data: like } = await supabase
      .from("likes")
      .select("id")
      .eq("user_id", userId)
      .eq("post_id", postId)
      .single()

    setIsLiked(!!like)

    // 真似状態をチェック
    const { data: mimic } = await supabase
      .from("mimics")
      .select("id")
      .eq("user_id", userId)
      .eq("post_id", postId)
      .single()

    setIsMimicked(!!mimic)
  }

  const fetchPost = async (postId: string) => {
    try {
      // 投稿を取得
      const { data: postData, error: postError } = await supabase.from("posts").select("*").eq("id", postId).single()

      if (postError) {
        console.error("Error fetching post:", postError)
        return
      }

      // プロフィールを取得
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", postData.user_id).single()

      setPost({
        ...postData,
        profile: profile || null,
      })

      // コメントを取得（今後実装）
      // fetchComments(postId)
    } catch (error) {
      console.error("Error in fetchPost:", error)
    } finally {
      setLoading(false)
    }
  }

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

  const handleLike = async () => {
    if (!user) {
      setShowLoginDialog(true)
      return
    }

    if (!post) return

    try {
      await ensureProfile(user.id)

      if (isLiked) {
        await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", post.id)
        setIsLiked(false)
        setPost((prev) => (prev ? { ...prev, like_count: prev.like_count - 1 } : null))
      } else {
        await supabase.from("likes").insert({ user_id: user.id, post_id: post.id })
        setIsLiked(true)
        setPost((prev) => (prev ? { ...prev, like_count: prev.like_count + 1 } : null))
      }
    } catch (error) {
      console.error("Error handling like:", error)
    }
  }

  const handleMimic = async () => {
    if (!user) {
      setShowLoginDialog(true)
      return
    }

    if (!post) return

    try {
      await ensureProfile(user.id)

      if (isMimicked) {
        await supabase.from("mimics").delete().eq("user_id", user.id).eq("post_id", post.id)
        setIsMimicked(false)
        setPost((prev) => (prev ? { ...prev, mimic_count: prev.mimic_count - 1 } : null))
      } else {
        await supabase.from("mimics").insert({ user_id: user.id, post_id: post.id })
        setIsMimicked(true)
        setPost((prev) => (prev ? { ...prev, mimic_count: prev.mimic_count + 1 } : null))
      }
    } catch (error) {
      console.error("Error handling mimic:", error)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${post?.menu_name} - ToppinGOOD`,
          text: `${post?.topping_content}のトッピングをチェック！`,
          url: window.location.href,
        })
      } catch (error) {
        console.log("Error sharing:", error)
      }
    } else {
      // フォールバック: URLをクリップボードにコピー
      navigator.clipboard.writeText(window.location.href)
      alert("URLをクリップボードにコピーしました")
    }
  }

  const nextImage = () => {
    if (post && post.image_urls && currentImageIndex < post.image_urls.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
    }
  }

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">投稿が見つかりませんでした</p>
          <Button onClick={() => router.back()} className="bg-orange-500 hover:bg-orange-600">
            戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">投稿詳細</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="pb-20">
        <div className="max-w-md mx-auto">
          <Card className="mb-4 mx-4 shadow-sm border-0 bg-white">
            <CardContent className="p-0">
              {/* ユーザー情報 */}
              <div className="flex items-center gap-3 p-4 pb-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={post.profile?.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback>
                    {post.profile?.display_name?.[0] || post.profile?.username?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">
                    {post.profile?.display_name || post.profile?.username || "匿名ユーザー"}
                  </p>
                  <p className="text-sm text-gray-500">{formatTimeAgo(post.created_at)}</p>
                </div>
              </div>

              {/* 投稿画像 */}
              <div className="relative">
                <AnimatedImageCarousel
                  images={post.image_urls || ["/placeholder.svg?height=400&width=400"]}
                  alt={`${post.menu_name}のトッピング`}
                  className="w-full aspect-square"
                  autoPlay={true}
                  interval={9000} // 詳細画面では9秒間隔でよりゆっくり
                />
              </div>

              {/* 投稿内容 */}
              <div className="p-4">
                <div className="mb-4">
                  <h1 className="text-xl font-bold mb-2">{post.menu_name}</h1>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200">
                      {post.topping_content}
                    </Badge>
                    <Badge variant="outline" className="text-orange-600 border-orange-200">
                      {post.mimic_count}人が真似した
                    </Badge>
                  </div>
                  {post.memo && <p className="text-gray-700 leading-relaxed">{post.memo}</p>}
                </div>

                {/* アクションボタン */}
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex items-center gap-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLike}
                      className={isLiked ? "text-red-500" : "text-gray-600"}
                    >
                      <Heart className={`w-6 h-6 mr-2 ${isLiked ? "fill-current" : ""}`} />
                      {post.like_count}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600">
                      <MessageCircle className="w-6 h-6 mr-2" />
                      {comments.length}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleShare} className="text-gray-600">
                      <Share2 className="w-6 h-6" />
                    </Button>
                  </div>
                  <Button
                    onClick={handleMimic}
                    className={`px-6 py-2 rounded-full ${
                      isMimicked
                        ? "bg-orange-200 text-orange-800 hover:bg-orange-300"
                        : "bg-orange-500 hover:bg-orange-600 text-white"
                    }`}
                  >
                    {isMimicked ? "真似済み" : "真似する"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* コメントセクション（今後実装） */}
          <Card className="mx-4 shadow-sm border-0 bg-white">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-4">コメント</h3>
              <div className="text-center py-8 text-gray-500">
                <p>コメント機能は近日公開予定です</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* フッターナビゲーション */}
      <FooterNavigation user={user} />

      {/* ログインダイアログ */}
      <LoginDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} />
    </div>
  )
}
