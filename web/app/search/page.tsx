"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Search, Filter } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ResponsiveLayout } from "@/components/responsive-layout"
import type { PostWithProfile } from "@/app/page"
import type { User as SupabaseUser } from "@supabase/supabase-js"

const POPULAR_TAGS = ["カップヌードル", "白米", "アイスクリーム", "パン", "サラダ", "パスタ", "ラーメン", "おにぎり"]

export default function SearchPage() {
  const [posts, setPosts] = useState<PostWithProfile[]>([])
  const [filteredPosts, setFilteredPosts] = useState<PostWithProfile[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTag, setSelectedTag] = useState("")
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchPosts()
    checkUser()
  }, [])

  useEffect(() => {
    filterPosts()
  }, [searchQuery, selectedTag, posts])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchPosts = async () => {
    try {
      const { data: posts, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })

      if (postsError) {
        console.error("Error fetching posts:", postsError)
        return
      }

      if (!posts || posts.length === 0) {
        setLoading(false)
        return
      }

      const userIds = [...new Set(posts.map((post) => post.user_id))]
      const { data: profiles } = await supabase.from("profiles").select("*").in("id", userIds)

      const postsWithProfiles: PostWithProfile[] = posts.map((post) => ({
        ...post,
        profile: profiles?.find((profile) => profile.id === post.user_id) || null,
      }))

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
    if (selectedTag === tag) {
      setSelectedTag("")
    } else {
      setSelectedTag(tag)
    }
  }

  const handlePostClick = (post: PostWithProfile) => {
    router.push(`/post/${post.id}`)
  }

  return (
    <ResponsiveLayout user={user}>
      {/* モバイル版ヘッダー */}
      <header className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
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
          )}
        </div>
      </main>
    </ResponsiveLayout>
  )
}
