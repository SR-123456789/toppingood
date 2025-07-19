"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Search, Filter } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { triggerHapticFeedback } from "@/lib/haptic-feedback"
import { ResponsiveLayout } from "@/components/responsive-layout"
import { shuffleArray, getHourlyTimeSeed, getDailyRandomOffset, getSessionSeed } from "@/lib/random-utils"
import type { PostWithProfile } from "@/app/page"
import type { User as SupabaseUser } from "@supabase/supabase-js"

const POPULAR_TAGS = ["カップ麺", 
  "ペヤング", 
  // "アイスクリーム", 
  "焼きそば", 
  "サラダ", 
  "パスタ", 
  "ラーメン", 
  "おにぎり",
  "300円以下",
  "500円以下"
]

export default function SearchPage() {
  const [posts, setPosts] = useState<PostWithProfile[]>([])
  const [filteredPosts, setFilteredPosts] = useState<PostWithProfile[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState("")
  const [loading, setLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // 時間ベースのシード（30分ごとに変わる）+ セッションシード
  const [timeSeed] = useState(() => getHourlyTimeSeed() + getSessionSeed())
  const [randomOffset] = useState(() => getDailyRandomOffset())

  useEffect(() => {
    fetchPosts()
    checkUser()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    filterPosts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedTag, posts])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchPosts = async () => {
    try {
      // まず全体のデータ数を確認
      const { count } = await supabase
        .from("posts")
        .select("*", { count: 'exact', head: true })

      if (!count || count === 0) {
        setLoading(false)
        return
      }

      // 検索・フィルタがない場合はランダム表示用に多めに取得
      const fetchLimit = (!searchQuery && !selectedTag) ? Math.min(50, count) : 50
      const actualOffset = (!searchQuery && !selectedTag) ? Math.min(randomOffset, Math.max(0, count - fetchLimit)) : 0

      let query = supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })

      if (searchQuery) {
        query = query.or(
          `menu_name.ilike.%${searchQuery}%,topping_content.ilike.%${searchQuery}%,memo.ilike.%${searchQuery}%`,
        )
      }

      if (!searchQuery && !selectedTag) {
        query = query.range(actualOffset, actualOffset + fetchLimit - 1)
      } else {
        query = query.limit(fetchLimit)
      }

      const { data: posts, error: postsError } = await query

      if (postsError) {
        console.error("Error fetching posts:", postsError)
        return
      }

      if (!posts || posts.length === 0) {
        setLoading(false)
        return
      }

      // 必要なユーザーIDのみでプロフィールを取得
      const userIds = [...new Set(posts.map((post) => post.user_id))]
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url") // 必要なフィールドのみ
        .in("id", userIds)

      let postsWithProfiles: PostWithProfile[] = posts.map((post) => ({
        ...post,
        profile: profiles?.find((profile) => profile.id === post.user_id) || null,
      }))

      // 検索・フィルタがない場合はランダムシャッフル
      if (!searchQuery && !selectedTag) {
        postsWithProfiles = shuffleArray(postsWithProfiles, timeSeed)
        // 最初の50件に制限
        postsWithProfiles = postsWithProfiles.slice(0, 50)
      }

      setPosts(postsWithProfiles)
      setFilteredPosts(postsWithProfiles)
    } catch (error) {
      console.error("Error in fetchPosts:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterPosts = () => {
    let filtered = posts

    if (searchQuery) {
      filtered = filtered.filter(
        (post) =>
          post.menu_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.topping_content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (post.memo && post.memo.toLowerCase().includes(searchQuery.toLowerCase())),
      )
    }

    if (selectedTag) {
      filtered = filtered.filter(
        (post) =>
          post.menu_name.includes(selectedTag) ||
          post.topping_content.includes(selectedTag) ||
          (post.memo && post.memo.includes(selectedTag)),
      )
    }

    setFilteredPosts(filtered)
  }

  const handleTagClick = (tag: string) => {
    // タグクリックには軽めの触覚フィードバック
    triggerHapticFeedback('light')
    
    if (selectedTag === tag) {
      setSelectedTag("")
    } else {
      setSelectedTag(tag)
    }
  }

  const handlePostClick = (post: PostWithProfile) => {
    // 投稿詳細表示には軽めの触覚フィードバック
    triggerHapticFeedback('light')
    router.push(`/post/${post.id}`)
  }

  // 追加の投稿を読み込む関数
  const loadMorePosts = useCallback(async () => {
    if (isLoadingMore || !hasMore || searchQuery || selectedTag) return // 検索中は無効

    setIsLoadingMore(true)
    try {
      // 全体のデータ数を確認
      const { count } = await supabase
        .from("posts")
        .select("*", { count: 'exact', head: true })

      if (!count || count === 0) {
        setHasMore(false)
        return
      }

      // ランダム表示用に多めに取得してシャッフル
      const fetchLimit = 30
      const actualOffset = Math.min(posts.length + randomOffset, Math.max(0, count - fetchLimit))

      const { data: morePosts, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .range(actualOffset, actualOffset + fetchLimit - 1)

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

      let postsWithProfiles: PostWithProfile[] = morePosts.map((post) => ({
        ...post,
        profile: profiles?.find((profile) => profile.id === post.user_id) || null,
      }))

      // ランダムシャッフルして20件に制限
      postsWithProfiles = shuffleArray(postsWithProfiles, timeSeed + posts.length)
      postsWithProfiles = postsWithProfiles.slice(0, 20)

      // 既存の投稿IDと重複しないようにフィルタリング
      const existingPostIds = new Set(posts.map(post => post.id))
      const newUniquePosts = postsWithProfiles.filter(post => !existingPostIds.has(post.id))

      if (newUniquePosts.length === 0) {
        // 新しい投稿がない場合、さらに多くのデータを取得して再試行
        const extendedLimit = 60
        const extendedOffset = Math.min(posts.length + randomOffset + 30, Math.max(0, count - extendedLimit))
        
        const { data: extendedPosts, error: extendedError } = await supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false })
          .range(extendedOffset, extendedOffset + extendedLimit - 1)

        if (!extendedError && extendedPosts && extendedPosts.length > 0) {
          const extendedUserIds = [...new Set(extendedPosts.map((post) => post.user_id))]
          const { data: extendedProfiles } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", extendedUserIds)

          let extendedPostsWithProfiles: PostWithProfile[] = extendedPosts.map((post) => ({
            ...post,
            profile: extendedProfiles?.find((profile) => profile.id === post.user_id) || null,
          }))

          extendedPostsWithProfiles = shuffleArray(extendedPostsWithProfiles, timeSeed + posts.length + 1000)
          const finalUniquePosts = extendedPostsWithProfiles.filter(post => !existingPostIds.has(post.id)).slice(0, 20)
          
          if (finalUniquePosts.length > 0) {
            setPosts(prev => [...prev, ...finalUniquePosts])
            setFilteredPosts(prev => [...prev, ...finalUniquePosts])
          } else {
            setHasMore(false)
          }
        } else {
          setHasMore(false)
        }
      } else {
        setPosts(prev => [...prev, ...newUniquePosts])
        setFilteredPosts(prev => [...prev, ...newUniquePosts])
      }
      
      if (newUniquePosts.length < 20) {
        setHasMore(false)
      }
    } catch (error) {
      console.error("Error in loadMorePosts:", error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [posts, isLoadingMore, hasMore, searchQuery, selectedTag, supabase, timeSeed, randomOffset])

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

  return (
    <ResponsiveLayout user={user}>
      {/* モバイル版ヘッダー */}
      <header className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => {
            triggerHapticFeedback('medium') // 戻るボタンには中程度のフィードバック
            router.push("/")
          }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="メニューやトッピングを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="ghost" size="icon">
            <Filter className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* PC版ヘッダー */}
      <header className="hidden lg:block bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-8 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="メニューやトッピングを検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 py-3 text-lg"
              />
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="p-4 pb-20 lg:pb-8 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* 人気タグ */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">人気のメニュー</h2>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTag === tag ? "default" : "secondary"}
                  className={`cursor-pointer ${
                    selectedTag === tag
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                  onClick={() => handleTagClick(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* 検索結果 */}
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-3">
              {searchQuery || selectedTag
                ? `検索結果 (${filteredPosts.length}件)`
                : `すべての投稿 (${filteredPosts.length}件)`}
            </h2>
          </div>

          {/* 投稿グリッド */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">読み込み中...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-2">投稿が見つかりませんでした</p>
              <p className="text-sm text-gray-400">別のキーワードで検索してみてください</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-4">
                {filteredPosts.map((post) => (
                  <Card
                    key={post.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-0"
                    onClick={() => handlePostClick(post)}
                  >
                    <CardContent className="p-0">
                      <div className="relative aspect-square">
                        <Image
                          src={post.image_urls?.[0] || "/placeholder.svg?height=150&width=150"}
                          alt={`${post.menu_name}のトッピング`}
                          fill
                          className="object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-end">
                          <div className="p-2 text-white opacity-0 hover:opacity-100 transition-opacity">
                            <p className="text-xs font-semibold truncate">{post.menu_name}</p>
                            <p className="text-xs truncate">{post.topping_content}</p>
                          </div>
                        </div>
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="bg-white bg-opacity-90 text-xs">
                            {post.mimic_count}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* 無限スクロール用のローディング表示 */}
              {isLoadingMore && !searchQuery && !selectedTag && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">さらに読み込み中...</p>
                </div>
              )}
              
              {/* 全て読み込み完了の表示 */}
              {!hasMore && filteredPosts.length > 0 && !searchQuery && !selectedTag && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">すべての投稿を表示しました</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </ResponsiveLayout>
  )
}
