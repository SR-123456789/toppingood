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
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setShowLoginDialog(true)
      return
    }

    setUser(user)
    await fetchUserData(user.id)
  }

  const fetchUserData = async (userId: string) => {
    try {
      // 自分の投稿を最新30件のみ取得
      const { data: myPostsData } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30) // 最新30件のみ

      // 真似した投稿を最新30件のみ取得
      const { data: mimicsData } = await supabase
        .from("mimics")
        .select("post_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30) // 最新30件のみ

      // いいねした投稿を最新30件のみ取得
      const { data: likesData } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30) // 最新30件のみ

      let mimickedPostsData: any[] = []
      let likedPostsData: any[] = []

      // 真似した投稿の詳細を取得
      if (mimicsData && mimicsData.length > 0) {
        const mimicPostIds = mimicsData.map((mimic) => mimic.post_id)
        const { data: fetchedMimickedPostsData } = await supabase.from("posts").select("*").in("id", mimicPostIds)

        if (fetchedMimickedPostsData) {
          mimickedPostsData = fetchedMimickedPostsData
        }
      }

      // いいねした投稿の詳細を取得
      if (likesData && likesData.length > 0) {
        const likePostIds = likesData.map((like) => like.post_id)
        const { data: fetchedLikedPostsData } = await supabase.from("posts").select("*").in("id", likePostIds)

        if (fetchedLikedPostsData) {
          likedPostsData = fetchedLikedPostsData
        }
      }

      // プロフィール情報を取得
      const allPosts = [...(myPostsData || []), ...(mimickedPostsData || []), ...(likedPostsData || [])]
      const userIds = [...new Set(allPosts.map((post) => post.user_id))]

      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("*").in("id", userIds)

        // プロフィール情報を結合
        setMyPosts(
          (myPostsData || []).map((post) => ({
            ...post,
            profile: profiles?.find((profile) => profile.id === post.user_id) || null,
          })),
        )

        setMimickedPosts(
          mimickedPostsData.map((post) => ({
            ...post,
            profile: profiles?.find((profile) => profile.id === post.user_id) || null,
          })),
        )

        setLikedPosts(
          likedPostsData.map((post) => ({
            ...post,
            profile: profiles?.find((profile) => profile.id === post.user_id) || null,
          })),
        )
      } else {
        setMyPosts((myPostsData || []).map((post) => ({ ...post, profile: null })))
        setMimickedPosts([])
        setLikedPosts([])
      }
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
