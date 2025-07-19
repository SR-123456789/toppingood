"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Heart, MessageCircle, Share2, ArrowLeft, Clock, DollarSign, Tag, Edit2, Trash2, MoreVertical } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { triggerHapticFeedback } from "@/lib/haptic-feedback"
import { LoginDialog } from "@/components/auth/login-dialog"
import { FooterNavigation } from "@/components/footer-navigation"
import { ResponsiveLayout } from "@/components/responsive-layout"
import { ensureProfile } from "@/lib/profile-utils"
import type { PostWithProfile } from "@/app/page"
import { AnimatedImageCarousel } from "@/components/animated-image-carousel"
import { TextWithLinks } from "@/components/ui/text-with-links"
import type { User as SupabaseUser } from "@supabase/supabase-js"

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
  const [user, setUser] = useState<SupabaseUser | null>(null)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleLike = async () => {
    // いいねボタンには軽めの触覚フィードバック
    triggerHapticFeedback('light')
    
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
    // 真似するボタンには中程度の触覚フィードバック（重要なアクション）
    triggerHapticFeedback('medium')
    
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
    // シェアボタンには軽めの触覚フィードバック
    triggerHapticFeedback('light')
    
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

  // 投稿編集機能
  const handleEdit = () => {
    triggerHapticFeedback('medium')
    if (post) {
      router.push(`/create?edit=${post.id}`)
    }
  }

  // 投稿削除機能
  const handleDelete = async () => {
    if (!post || !user) return

    const confirmed = confirm('この投稿を削除しますか？この操作は取り消せません。')
    if (!confirmed) return

    triggerHapticFeedback('heavy')
    
    try {
      setLoading(true)
      
      // 関連データも削除（いいね、真似、コメント）
      await supabase.from('likes').delete().eq('post_id', post.id)
      await supabase.from('mimics').delete().eq('post_id', post.id)
      await supabase.from('comments').delete().eq('post_id', post.id)
      
      // 投稿を削除
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id)
        .eq('user_id', user.id) // 本人確認

      if (error) {
        console.error('Error deleting post:', error)
        alert('削除に失敗しました')
        return
      }

      alert('投稿を削除しました')
      router.push('/')
    } catch (error) {
      console.error('Error in handleDelete:', error)
      alert('削除に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 投稿の所有者かチェック
  const isOwner = user && post && user.id === post.user_id

  // 時間フォーマット関数
  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const postDate = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      return "1時間以内"
    } else if (diffInHours < 24) {
      return `${diffInHours}時間前`
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}日前`
    }
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
          <Button onClick={() => {
            triggerHapticFeedback('medium')
            router.back()
          }} className="bg-orange-500 hover:bg-orange-600">
            戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveLayout user={user}>
      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー（モバイル版のみ） */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
            <Button variant="ghost" size="icon" onClick={() => {
              triggerHapticFeedback('medium')
              router.back()
            }}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">投稿詳細</h1>
            <div className="w-10" />
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="pb-20 lg:pb-8">
          {/* モバイル版レイアウト */}
          <div className="lg:hidden">
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
                      interval={9000}
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
                      {post.memo && (
                        <TextWithLinks 
                          text={post.memo} 
                          className="text-gray-700 leading-relaxed" 
                        />
                      )}

                      {/* 詳細情報（調理時間・予算・タグ） */}
                      {(post.cooking_time || post.budget || (post.tags && post.tags.length > 0)) && (
                        <div className="mt-4 space-y-3 p-3 bg-gray-50 rounded-lg">
                          {post.cooking_time && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="w-4 h-4 mr-2" />
                              <span>調理時間: {post.cooking_time}分</span>
                            </div>
                          )}
                          {post.budget && (
                            <div className="flex items-center text-sm text-gray-600">
                              <DollarSign className="w-4 h-4 mr-2" />
                              <span>予算: {post.budget}円</span>
                            </div>
                          )}
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex items-start text-sm text-gray-600">
                              <Tag className="w-4 h-4 mr-2 mt-0.5" />
                              <div className="flex flex-wrap gap-1">
                                {post.tags.map((tag, index) => (
                                  <span 
                                    key={index}
                                    className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* アクションボタン */}
                    <div className="border-t pt-4">
                      {/* メインアクション行 */}
                      <div className="flex items-center justify-between mb-3">
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
                        <div className="flex items-center gap-2">
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

                      {/* 投稿者のみ表示：編集・削除ボタン */}
                      {isOwner && (
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEdit}
                            className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            編集
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDelete}
                            className="text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            {loading ? "削除中..." : "削除"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* コメントセクション（モバイル） */}
              <Card className="mx-4 shadow-sm border-0 bg-white">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-4">コメント</h3>
                  <div className="text-center py-8 text-gray-500">
                    <p>コメント機能は近日公開予定です</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* PC版レイアウト */}
          <div className="hidden lg:block">
            <div className="max-w-4xl mx-auto px-6 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 左側：画像エリア */}
                <div className="lg:sticky lg:top-8 lg:h-fit">
                  <Card className="shadow-sm border-0 bg-white overflow-hidden">
                    <AnimatedImageCarousel
                      images={post.image_urls || ["/placeholder.svg?height=600&width=600"]}
                      alt={`${post.menu_name}のトッピング`}
                      className="w-full aspect-square"
                      autoPlay={true}
                      interval={9000}
                    />
                  </Card>
                </div>

                {/* 右側：詳細情報エリア */}
                <div className="space-y-6">
                  {/* ユーザー情報 */}
                  <Card className="shadow-sm border-0 bg-white">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={post.profile?.avatar_url || "/placeholder.svg"} />
                          <AvatarFallback className="text-lg">
                            {post.profile?.display_name?.[0] || post.profile?.username?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-xl font-semibold">
                            {post.profile?.display_name || post.profile?.username || "匿名ユーザー"}
                          </p>
                          <p className="text-gray-500">{formatTimeAgo(post.created_at)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 投稿内容 */}
                  <Card className="shadow-sm border-0 bg-white">
                    <CardContent className="p-6">
                      <div className="mb-6">
                        <h1 className="text-3xl font-bold mb-4">{post.menu_name}</h1>
                        <div className="flex items-center gap-3 mb-4">
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200 text-lg px-4 py-2">
                            {post.topping_content}
                          </Badge>
                          <Badge variant="outline" className="text-orange-600 border-orange-200 text-lg px-4 py-2">
                            {post.mimic_count}人が真似した
                          </Badge>
                        </div>
                        {post.memo && (
                          <TextWithLinks 
                            text={post.memo} 
                            className="text-gray-700 leading-relaxed text-lg" 
                          />
                        )}

                        {/* 詳細情報（調理時間・予算・タグ）PC版 */}
                        {(post.cooking_time || post.budget || (post.tags && post.tags.length > 0)) && (
                          <div className="mt-6 space-y-4 p-4 bg-gray-50 rounded-lg">
                            {post.cooking_time && (
                              <div className="flex items-center text-gray-600">
                                <Clock className="w-5 h-5 mr-3" />
                                <span className="text-lg">調理時間: {post.cooking_time}分</span>
                              </div>
                            )}
                            {post.budget && (
                              <div className="flex items-center text-gray-600">
                                <DollarSign className="w-5 h-5 mr-3" />
                                <span className="text-lg">予算: {post.budget}円</span>
                              </div>
                            )}
                            {post.tags && post.tags.length > 0 && (
                              <div className="flex items-start text-gray-600">
                                <Tag className="w-5 h-5 mr-3 mt-1" />
                                <div className="flex flex-wrap gap-2">
                                  {post.tags.map((tag, index) => (
                                    <span 
                                      key={index}
                                      className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* アクションボタン（PC版） */}
                      <div className="border-t pt-6">
                        {/* メインアクション行 */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-8">
                            <Button
                              variant="ghost"
                              size="lg"
                              onClick={handleLike}
                              className={isLiked ? "text-red-500" : "text-gray-600"}
                            >
                              <Heart className={`w-7 h-7 mr-3 ${isLiked ? "fill-current" : ""}`} />
                              <span className="text-lg">{post.like_count}</span>
                            </Button>
                            <Button variant="ghost" size="lg" className="text-gray-600">
                              <MessageCircle className="w-7 h-7 mr-3" />
                              <span className="text-lg">{comments.length}</span>
                            </Button>
                            <Button variant="ghost" size="lg" onClick={handleShare} className="text-gray-600">
                              <Share2 className="w-7 h-7" />
                            </Button>
                          </div>
                          <Button
                            onClick={handleMimic}
                            size="lg"
                            className={`px-8 py-3 rounded-full text-lg ${
                              isMimicked
                                ? "bg-orange-200 text-orange-800 hover:bg-orange-300"
                                : "bg-orange-500 hover:bg-orange-600 text-white"
                            }`}
                          >
                            {isMimicked ? "真似済み" : "真似する"}
                          </Button>
                        </div>

                        {/* 投稿者のみ表示：編集・削除ボタン（PC版） */}
                        {isOwner && (
                          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                            <Button
                              variant="ghost"
                              size="default"
                              onClick={handleEdit}
                              className="text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors px-4 py-2"
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              編集
                            </Button>
                            <Button
                              variant="ghost"
                              size="default"
                              onClick={handleDelete}
                              className="text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors px-4 py-2"
                              disabled={loading}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {loading ? "削除中..." : "削除"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* コメントセクション（PC版） */}
                  <Card className="shadow-sm border-0 bg-white">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold mb-6">コメント</h3>
                      <div className="text-center py-12 text-gray-500">
                        <p className="text-lg">コメント機能は近日公開予定です</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* モバイル版フッターナビゲーション */}
        <div className="lg:hidden">
          <FooterNavigation user={user} />
        </div>

        {/* ログインダイアログ */}
        <LoginDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} />
      </div>
    </ResponsiveLayout>
  )
}
