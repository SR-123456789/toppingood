/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Plus, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { triggerHapticFeedback } from "@/lib/haptic-feedback"
import { LoginDialog } from "@/components/auth/login-dialog"
import { ResponsiveLayout } from "@/components/responsive-layout"
import type { PostWithProfile } from "@/app/page"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export default function MyToppingsPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [myPosts, setMyPosts] = useState<PostWithProfile[]>([])
  const [mimickedPosts, setMimickedPosts] = useState<PostWithProfile[]>([])
  const [likedPosts, setLikedPosts] = useState<PostWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setShowLoginDialog(true)
        setLoading(false)
        return
      }

      setUser(user)
      await fetchUserData(user.id)
    } catch (error) {
      console.error("Error in checkUser:", error)
      setLoading(false)
    }
  }

  const fetchUserData = async (userId: string) => {
    try {
      // 必要最小限のフィールドのみを取得し、並列実行で高速化
      const [myPostsResult, mimicsResult, likesResult] = await Promise.all([
        // 自分の投稿（最新15件のみ）
        supabase
          .from("posts")
          .select("id, menu_name, topping_content, image_urls, mimic_count, like_count, created_at, user_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(15),

        // 真似した投稿（最新15件のみ）- JOINで一括取得
        supabase
          .from("mimics")
          .select(`
            posts!inner(
              id, menu_name, topping_content, image_urls, mimic_count, like_count, created_at, user_id
            )
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(15),

        // いいねした投稿（最新15件のみ）- JOINで一括取得
        supabase
          .from("likes")
          .select(`
            posts!inner(
              id, menu_name, topping_content, image_urls, mimic_count, like_count, created_at, user_id
            )
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(15)
      ])

      // プロフィール情報を取得（必要な投稿のユーザーのみ）
      const allPosts = [
        ...(myPostsResult.data || []),
        ...(mimicsResult.data?.map((m: any) => m.posts).filter(Boolean) || []),
        ...(likesResult.data?.map((l: any) => l.posts).filter(Boolean) || [])
      ]

      const userIds = [...new Set(allPosts.map((post: any) => post.user_id))]
      let profiles: any[] = []

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", userIds)

        profiles = profilesData || []
      }

      // データをPostWithProfile形式に変換
      const createPostWithProfile = (post: any) => ({
        ...post,
        profile: profiles.find((profile) => profile.id === post.user_id) || null,
      })

      setMyPosts((myPostsResult.data || []).map(createPostWithProfile))
      setMimickedPosts((mimicsResult.data?.map((m: any) => m.posts).filter(Boolean) || []).map(createPostWithProfile))
      setLikedPosts((likesResult.data?.map((l: any) => l.posts).filter(Boolean) || []).map(createPostWithProfile))

    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLoginSuccess = () => {
    window.location.reload()
  }

  const PostGrid = ({ posts, emptyMessage }: { posts: PostWithProfile[]; emptyMessage: string }) => (
    <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-4">
      {posts.length === 0 ? (
        <div className="col-span-3 lg:col-span-4 xl:col-span-5 text-center py-12">
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        posts.map((post) => (
          <Card
            key={post.id}
            className="cursor-pointer hover:shadow-md transition-shadow border-0"
            onClick={() => {
              triggerHapticFeedback('light') // 投稿詳細表示は軽めのフィードバック
              router.push(`/post/${post.id}`)
            }}
          >
            <CardContent className="p-0">
              <div className="relative aspect-square">
                <Image
                  src={post.image_urls?.[0] || "/placeholder.svg?height=150&width=150"}
                  alt={`${post.menu_name}のトッピング`}
                  fill
                  className="object-cover rounded-lg"
                />
                {/* オーバーレイ情報 */}
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-end">
                  <div className="p-2 text-white opacity-0 hover:opacity-100 transition-opacity">
                    <p className="text-xs font-semibold truncate">{post.menu_name}</p>
                    <p className="text-xs truncate">{post.topping_content}</p>
                  </div>
                </div>
                {/* 統計バッジ */}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant="secondary" className="bg-white bg-opacity-90 text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    {post.mimic_count}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">マイトッピングを見るにはログインが必要です</p>
          <Button onClick={() => setShowLoginDialog(true)} className="bg-orange-500 hover:bg-orange-600">
            ログイン
          </Button>
        </div>
        <LoginDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} onSuccess={handleLoginSuccess} />
      </div>
    )
  }

  return (
    <ResponsiveLayout user={user}>
      {/* モバイル版ヘッダー */}
      <header className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => {
            triggerHapticFeedback('medium') // 戻るボタンには中程度のフィードバック
            router.push("/")
          }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">マイトッピング</h1>
          <Button
            size="icon"
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full"
            onClick={() => {
              triggerHapticFeedback('medium') // 新規投稿は重要なアクション
              router.push("/create")
            }}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* PC版ヘッダー */}
      <header className="hidden lg:block bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-8 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">マイトッピング</h1>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => {
                  triggerHapticFeedback('medium')
                  router.push("/create")
                }}
              >
                <Plus className="w-5 h-5 mr-2" />
                新しいトッピングを投稿
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="p-4 pb-20 lg:pb-8 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">読み込み中...</p>
            </div>
          ) : (
            <Tabs defaultValue="my-posts" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="my-posts" className="text-xs lg:text-sm">
                  投稿した ({myPosts.length})
                </TabsTrigger>
                <TabsTrigger value="mimicked" className="text-xs lg:text-sm">
                  真似した ({mimickedPosts.length})
                </TabsTrigger>
                <TabsTrigger value="liked" className="text-xs lg:text-sm">
                  いいね ({likedPosts.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="my-posts" className="mt-4">
                <PostGrid posts={myPosts} emptyMessage="まだ投稿がありません。最初のトッピングを投稿してみましょう！" />
              </TabsContent>

              <TabsContent value="mimicked" className="mt-4">
                <PostGrid
                  posts={mimickedPosts}
                  emptyMessage="まだ真似したトッピングがありません。気になるトッピングを真似してみましょう！"
                />
              </TabsContent>

              <TabsContent value="liked" className="mt-4">
                <PostGrid
                  posts={likedPosts}
                  emptyMessage="まだいいねしたトッピングがありません。気に入ったトッピングにいいねしてみましょう！"
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

      <LoginDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} />
    </ResponsiveLayout>
  )
}
