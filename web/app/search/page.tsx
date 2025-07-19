"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Search, Filter, X, Plus, Hash, Clock, DollarSign } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { triggerHapticFeedback } from "@/lib/haptic-feedback"
import { ResponsiveLayout } from "@/components/responsive-layout"
import { shuffleArray, getHourlyTimeSeed, getDailyRandomOffset, getSessionSeed } from "@/lib/random-utils"
import type { PostWithProfile } from "@/app/page"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface SearchFilters {
  query: string
  tags: string[]
  cookingTimeMin?: number
  cookingTimeMax?: number
  budgetMin?: number
  budgetMax?: number
}

const POPULAR_TAGS = ["カップ麺", 
  "ペヤング", 
  "焼きそば", 
  "サラダ", 
  "パスタ", 
  "ラーメン", 
  "おにぎり",
  "300円以下",
  "500円以下",
  "簡単",
  "時短",
  "ヘルシー"
]

const SUGGESTED_HASHTAGS = [
  '和食', '洋食', '中華', '韓国料理', 'イタリアン',
  '簡単', '時短', 'ヘルシー', '節約', '贅沢',
  '朝食', '昼食', '夕食', 'デザート', 'おやつ', 'お弁当'
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [tagInput, setTagInput] = useState("")
  
  // 詳細検索フィルター
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: "",
    tags: [],
    cookingTimeMin: undefined,
    cookingTimeMax: undefined,
    budgetMin: undefined,
    budgetMax: undefined
  })

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
  }, [searchQuery, selectedTag, posts, searchFilters])

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

      // アクティブなフィルターがあるかチェック
      const hasActiveFilters = searchQuery || selectedTag || 
        searchFilters.tags.length > 0 ||
        searchFilters.cookingTimeMin !== undefined ||
        searchFilters.cookingTimeMax !== undefined ||
        searchFilters.budgetMin !== undefined ||
        searchFilters.budgetMax !== undefined

      // フィルターがない場合はランダム表示
      const fetchLimit = !hasActiveFilters ? Math.min(50, count) : 50
      const actualOffset = !hasActiveFilters ? Math.min(randomOffset, Math.max(0, count - fetchLimit)) : 0

      let query = supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })

      // テキスト検索（ハッシュタグも含む）
      if (searchQuery || searchFilters.query) {
        const queryText = searchQuery || searchFilters.query
        query = query.or(
          `menu_name.ilike.%${queryText}%,topping_content.ilike.%${queryText}%,memo.ilike.%${queryText}%,tags.cs.["${queryText}"]`,
        )
      }

      // ハッシュタグ検索
      if (searchFilters.tags.length > 0) {
        const tagConditions = searchFilters.tags.map(tag => `tags.cs.["${tag}"]`).join(',')
        query = query.or(tagConditions)
      }

      // 調理時間フィルター
      if (searchFilters.cookingTimeMin !== undefined) {
        query = query.gte('cooking_time', searchFilters.cookingTimeMin)
      }
      if (searchFilters.cookingTimeMax !== undefined) {
        query = query.lte('cooking_time', searchFilters.cookingTimeMax)
      }

      // 予算フィルター
      if (searchFilters.budgetMin !== undefined) {
        query = query.gte('budget', searchFilters.budgetMin)
      }
      if (searchFilters.budgetMax !== undefined) {
        query = query.lte('budget', searchFilters.budgetMax)
      }

      if (!hasActiveFilters) {
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

    // テキスト検索（ハッシュタグも含む）
    if (searchQuery || searchFilters.query) {
      const queryText = searchQuery || searchFilters.query
      filtered = filtered.filter(
        (post) =>
          post.menu_name.toLowerCase().includes(queryText.toLowerCase()) ||
          post.topping_content.toLowerCase().includes(queryText.toLowerCase()) ||
          (post.memo && post.memo.toLowerCase().includes(queryText.toLowerCase())) ||
          (post.tags && post.tags.some(tag => tag.toLowerCase().includes(queryText.toLowerCase()))),
      )
    }

    // 従来のselectedTag検索（POPULAR_TAGSがselectedTagでない場合）
    if (selectedTag) {
      filtered = filtered.filter(
        (post) =>
          post.menu_name.includes(selectedTag) ||
          post.topping_content.includes(selectedTag) ||
          (post.memo && post.memo.includes(selectedTag)),
      )
    }

    // ハッシュタグ検索
    if (searchFilters.tags.length > 0) {
      filtered = filtered.filter((post) => {
        return searchFilters.tags.some(tag => 
          post.menu_name.includes(tag) ||
          post.topping_content.includes(tag) ||
          (post.memo && post.memo.includes(tag)) ||
          (post.tags && post.tags.includes(tag))
        )
      })
    }

    // 調理時間フィルター
    if (searchFilters.cookingTimeMin !== undefined) {
      filtered = filtered.filter(post => 
        post.cooking_time !== undefined && post.cooking_time !== null && post.cooking_time >= searchFilters.cookingTimeMin!
      )
    }
    if (searchFilters.cookingTimeMax !== undefined) {
      filtered = filtered.filter(post => 
        post.cooking_time !== undefined && post.cooking_time !== null && post.cooking_time <= searchFilters.cookingTimeMax!
      )
    }

    // 予算フィルター
    if (searchFilters.budgetMin !== undefined) {
      filtered = filtered.filter(post => 
        post.budget !== undefined && post.budget !== null && post.budget >= searchFilters.budgetMin!
      )
    }
    if (searchFilters.budgetMax !== undefined) {
      filtered = filtered.filter(post => 
        post.budget !== undefined && post.budget !== null && post.budget <= searchFilters.budgetMax!
      )
    }

    setFilteredPosts(filtered)
  }

  const handleTagClick = (tag: string) => {
    // タグクリックには軽めの触覚フィードバック
    triggerHapticFeedback('light')
    
    // POPULAR_TAGSの場合、ハッシュタグ検索として扱う
    if (POPULAR_TAGS.includes(tag)) {
      // 既に選択されている場合は解除
      if (searchFilters.tags.includes(tag)) {
        removeHashtag(tag)
      } else {
        // 選択されていない場合は追加
        addHashtag(tag)
      }
      setSelectedTag("") // selectedTagはクリア
    } else {
      // 従来の選択タグ機能
      if (selectedTag === tag) {
        setSelectedTag("")
      } else {
        setSelectedTag(tag)
      }
    }
  }

  const addHashtag = (tag: string) => {
    if (!searchFilters.tags.includes(tag) && tag.trim()) {
      setSearchFilters(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }))
    }
    setTagInput("")
  }

  // 入力フィールドがフォーカスを失った時にハッシュタグを自動追加
  const handleTagInputBlur = () => {
    if (tagInput.trim()) {
      addHashtag(tagInput.trim())
    }
  }

  const removeHashtag = (tag: string) => {
    setSearchFilters(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }))
  }

  const clearAllFilters = () => {
    setSearchFilters({
      query: "",
      tags: [],
      cookingTimeMin: undefined,
      cookingTimeMax: undefined,
      budgetMin: undefined,
      budgetMax: undefined
    })
    setSearchQuery("")
    setSelectedTag("")
    setTagInput("")
  }

  const applyFilters = () => {
    // searchFiltersの内容を基に再検索
    fetchPosts()
    setShowAdvancedFilters(false)
    triggerHapticFeedback('medium')
  }

  const handlePostClick = (post: PostWithProfile) => {
    // 投稿詳細表示には軽めの触覚フィードバック
    triggerHapticFeedback('light')
    router.push(`/post/${post.id}`)
  }

  // 追加の投稿を読み込む関数
  const loadMorePosts = useCallback(async () => {
    const hasActiveFilters = searchQuery || selectedTag || 
      searchFilters.tags.length > 0 ||
      searchFilters.cookingTimeMin !== undefined ||
      searchFilters.cookingTimeMax !== undefined ||
      searchFilters.budgetMin !== undefined ||
      searchFilters.budgetMax !== undefined

    if (isLoadingMore || !hasMore || hasActiveFilters) return // フィルター中は無効

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
  }, [posts, isLoadingMore, hasMore, searchQuery, selectedTag, searchFilters, supabase, timeSeed, randomOffset])

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
          <Button variant="ghost" size="icon" onClick={() => {
            triggerHapticFeedback('light')
            setShowAdvancedFilters(!showAdvancedFilters)
          }}>
            <Filter className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* PC版ヘッダー */}
      <header className="hidden lg:block bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-8 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex gap-3 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="メニューやトッピングを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 py-3 text-lg"
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => {
                triggerHapticFeedback('light')
                setShowAdvancedFilters(!showAdvancedFilters)
              }}>
                <Filter className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="p-4 pb-20 lg:pb-8 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* 詳細検索パネル */}
          {showAdvancedFilters && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">詳細検索</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAdvancedFilters(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* ハッシュタグ検索 */}
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4" />
                    ハッシュタグ
                  </Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="ハッシュタグを入力（入力後Enterまたはフォーカスアウトで追加）"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && tagInput.trim()) {
                          e.preventDefault()
                          addHashtag(tagInput.trim())
                        }
                      }}
                      onBlur={handleTagInputBlur}
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => tagInput.trim() && addHashtag(tagInput.trim())}
                      disabled={!tagInput.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {/* 選択されたハッシュタグ */}
                  {searchFilters.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {searchFilters.tags.map((tag) => (
                        <Badge 
                          key={tag} 
                          variant="secondary" 
                          className="bg-orange-100 text-orange-800 cursor-pointer hover:bg-orange-200"
                          onClick={() => removeHashtag(tag)}
                        >
                          #{tag}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}
                  {/* 人気ハッシュタグの提案 */}
                  <div className="flex flex-wrap gap-1">
                    {SUGGESTED_HASHTAGS.filter(tag => !searchFilters.tags.includes(tag)).slice(0, 8).map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="outline" 
                        className="cursor-pointer hover:bg-gray-100 text-xs"
                        onClick={() => addHashtag(tag)}
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* 調理時間フィルター */}
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4" />
                    調理時間（分）
                  </Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      placeholder="最小"
                      value={searchFilters.cookingTimeMin || ""}
                      onChange={(e) => setSearchFilters(prev => ({
                        ...prev,
                        cookingTimeMin: e.target.value ? Number(e.target.value) : undefined
                      }))}
                      className="w-20"
                      min="0"
                    />
                    <span className="text-gray-500">〜</span>
                    <Input
                      type="number"
                      placeholder="最大"
                      value={searchFilters.cookingTimeMax || ""}
                      onChange={(e) => setSearchFilters(prev => ({
                        ...prev,
                        cookingTimeMax: e.target.value ? Number(e.target.value) : undefined
                      }))}
                      className="w-20"
                      min="0"
                    />
                  </div>
                </div>

                {/* 予算フィルター */}
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4" />
                    予算（円）
                  </Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      placeholder="最小"
                      value={searchFilters.budgetMin || ""}
                      onChange={(e) => setSearchFilters(prev => ({
                        ...prev,
                        budgetMin: e.target.value ? Number(e.target.value) : undefined
                      }))}
                      className="w-24"
                      min="0"
                    />
                    <span className="text-gray-500">〜</span>
                    <Input
                      type="number"
                      placeholder="最大"
                      value={searchFilters.budgetMax || ""}
                      onChange={(e) => setSearchFilters(prev => ({
                        ...prev,
                        budgetMax: e.target.value ? Number(e.target.value) : undefined
                      }))}
                      className="w-24"
                      min="0"
                    />
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex gap-2 pt-2">
                  <Button onClick={applyFilters} className="flex-1 bg-orange-500 hover:bg-orange-600">
                    検索実行
                  </Button>
                  <Button variant="outline" onClick={clearAllFilters} className="flex-1">
                    クリア
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* 人気タグ */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">人気のメニュー</h2>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TAGS.map((tag) => (
                <Badge
                  key={tag}
                  variant={searchFilters.tags.includes(tag) ? "default" : "secondary"}
                  className={`cursor-pointer ${
                    searchFilters.tags.includes(tag)
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {searchQuery || selectedTag || searchFilters.tags.length > 0 || 
                 searchFilters.cookingTimeMin !== undefined || searchFilters.cookingTimeMax !== undefined ||
                 searchFilters.budgetMin !== undefined || searchFilters.budgetMax !== undefined
                  ? `検索結果 (${filteredPosts.length}件)`
                  : `すべての投稿 (${filteredPosts.length}件)`}
              </h2>
              {/* アクティブなフィルターがある場合、クリアボタンを表示 */}
              {(searchQuery || selectedTag || searchFilters.tags.length > 0 || 
                searchFilters.cookingTimeMin !== undefined || searchFilters.cookingTimeMax !== undefined ||
                searchFilters.budgetMin !== undefined || searchFilters.budgetMax !== undefined) && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-orange-600 hover:text-orange-700">
                  すべてクリア
                </Button>
              )}
            </div>
            
            {/* アクティブなフィルターの表示 */}
            {(searchFilters.tags.length > 0 || searchFilters.cookingTimeMin !== undefined || 
              searchFilters.cookingTimeMax !== undefined || searchFilters.budgetMin !== undefined || 
              searchFilters.budgetMax !== undefined) && (
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                {searchFilters.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-orange-600">
                    #{tag}
                  </Badge>
                ))}
                {(searchFilters.cookingTimeMin !== undefined || searchFilters.cookingTimeMax !== undefined) && (
                  <Badge variant="outline" className="text-blue-600">
                    調理時間: {searchFilters.cookingTimeMin || 0}〜{searchFilters.cookingTimeMax || '∞'}分
                  </Badge>
                )}
                {(searchFilters.budgetMin !== undefined || searchFilters.budgetMax !== undefined) && (
                  <Badge variant="outline" className="text-green-600">
                    予算: {searchFilters.budgetMin || 0}〜{searchFilters.budgetMax || '∞'}円
                  </Badge>
                )}
              </div>
            )}
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
              {isLoadingMore && !searchQuery && !selectedTag && searchFilters.tags.length === 0 && 
               searchFilters.cookingTimeMin === undefined && searchFilters.cookingTimeMax === undefined &&
               searchFilters.budgetMin === undefined && searchFilters.budgetMax === undefined && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">さらに読み込み中...</p>
                </div>
              )}
              
              {/* 全て読み込み完了の表示 */}
              {!hasMore && filteredPosts.length > 0 && !searchQuery && !selectedTag && searchFilters.tags.length === 0 &&
               searchFilters.cookingTimeMin === undefined && searchFilters.cookingTimeMax === undefined &&
               searchFilters.budgetMin === undefined && searchFilters.budgetMax === undefined && (
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
