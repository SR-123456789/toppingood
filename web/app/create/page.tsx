"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { triggerHapticFeedback } from "@/lib/haptic-feedback"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Upload, X, CheckCircle, AlertCircle, Plus, Clock, DollarSign, Tag } from "lucide-react"
import Image from "next/image"
import { LoginDialog } from "@/components/auth/login-dialog"
import { ResponsiveLayout } from "@/components/responsive-layout"
import { ensureProfile } from "@/lib/profile-utils"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import "./progress.css"

export default function CreatePostPage() {
  const [menuName, setMenuName] = useState("")
  const [toppingContent, setToppingContent] = useState("")
  const [memo, setMemo] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([])
  const [cookingTime, setCookingTime] = useState<number | null>(null)
  const [budget, setBudget] = useState<number | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [shouldClearTagInput, setShouldClearTagInput] = useState(false)
  const [showAdditionalFields, setShowAdditionalFields] = useState(false)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editPostId, setEditPostId] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setShowLoginDialog(true)
        return
      }
      setUser(user)
    }
    
    const loadPostForEdit = async (postId: string) => {
      try {
        const { data: post, error } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .single()

        if (error) {
          console.error('Error loading post:', error)
          setError('投稿の読み込みに失敗しました')
          return
        }

        // フォームに既存データを設定
        setMenuName(post.menu_name || '')
        setToppingContent(post.topping_content || '')
        setMemo(post.memo || '')
        setCookingTime(post.cooking_time)
        setBudget(post.budget)
        setTags(post.tags || [])
        setExistingImageUrls(post.image_urls || [])
        
        // 追加フィールドが入力されている場合は表示
        if (post.cooking_time || post.budget || (post.tags && post.tags.length > 0)) {
          setShowAdditionalFields(true)
        }
      } catch (error) {
        console.error('Error in loadPostForEdit:', error)
        setError('投稿の読み込みに失敗しました')
      }
    }

    getUser()

    // 編集モードかチェック
    const editId = searchParams.get('edit')
    if (editId) {
      setIsEditMode(true)
      setEditPostId(editId)
      loadPostForEdit(editId)
    }
  }, [searchParams, supabase])

  // タグ入力クリア用のuseEffect
  useEffect(() => {
    if (shouldClearTagInput) {
      setTagInput('')
      setShouldClearTagInput(false)
    }
  }, [shouldClearTagInput])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    // ファイル数チェック
    if (images.length + files.length > 3) {
      setError("画像は最大3枚まで選択できます")
      return
    }

    // ファイルサイズとタイプチェック
    const validFiles = files.filter((file) => {
      // 5MB制限
      if (file.size > 5 * 1024 * 1024) {
        setError(`${file.name} は5MBを超えています`)
        return false
      }

      // 画像ファイルのみ
      if (!file.type.startsWith("image/")) {
        setError(`${file.name} は画像ファイルではありません`)
        return false
      }

      return true
    })

    if (validFiles.length > 0) {
      setImages([...images, ...validFiles])
      setError("")
    }
  }

  const removeImage = (index: number) => {
    // 画像削除には軽めの触覚フィードバック
    triggerHapticFeedback('light')
    setImages(images.filter((_, i) => i !== index))
    setError("")
  }

  const uploadImageToSupabase = async (file: File, userId: string): Promise<string> => {
    const fileExt = file.name.split(".").pop()
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

    // アップロード進行状況を追跡
    const fileId = `${file.name}-${Date.now()}`
    setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }))

    try {
      const { data, error } = await supabase.storage.from("post-images").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (error) {
        console.error("Image upload error:", error)
        throw new Error(`画像のアップロードに失敗しました: ${error.message}`)
      }

      // アップロード完了
      setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }))

      const {
        data: { publicUrl },
      } = supabase.storage.from("post-images").getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      setUploadProgress((prev) => {
        const newProgress = { ...prev }
        delete newProgress[fileId]
        return newProgress
      })
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 投稿ボタンには重要なアクションなので強めの触覚フィードバック
    triggerHapticFeedback('heavy')
    
    if (!user) {
      setShowLoginDialog(true)
      return
    }

    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      // プロフィールの存在確認と作成
      await ensureProfile(user.id)

      // 画像をアップロード（新しい画像がある場合のみ）
      const imageUrls: string[] = [...existingImageUrls] // 既存画像URLを保持

      if (images.length > 0) {
        for (const image of images) {
          try {
            const url = await uploadImageToSupabase(image, user.id)
            imageUrls.push(url)
          } catch (error) {
            console.error("Individual image upload failed:", error)
            // 個別の画像アップロードが失敗してもプレースホルダーを使用
            imageUrls.push("/placeholder.svg?height=300&width=300")
          }
        }
      } else if (!isEditMode && imageUrls.length === 0) {
        // 新規投稿で画像がない場合はプレースホルダーを使用
        imageUrls.push("/placeholder.svg?height=300&width=300")
      }

      const postData = {
        menu_name: menuName,
        topping_content: toppingContent,
        memo: memo || null,
        image_urls: imageUrls,
        cooking_time: cookingTime,
        budget: budget,
        tags: tags.length > 0 ? tags : null,
      }

      if (isEditMode && editPostId) {
        // 編集モード: 投稿を更新
        const { error: updateError } = await supabase
          .from("posts")
          .update(postData)
          .eq('id', editPostId)
          .eq('user_id', user.id) // 本人確認

        if (updateError) {
          console.error("Post update error:", updateError)
          throw new Error(`投稿の更新に失敗しました: ${updateError.message}`)
        }
      } else {
        // 新規作成モード: 投稿を作成
        const { error: postError } = await supabase.from("posts").insert({
          user_id: user.id,
          ...postData,
        })

        if (postError) {
          console.error("Post creation error:", postError)
          throw new Error(`投稿の作成に失敗しました: ${postError.message}`)
        }
      }

      // 成功状態を表示
      setSuccess(true)

      // 2秒後にリダイレクト
      setTimeout(() => {
        if (isEditMode && editPostId) {
          router.push(`/post/${editPostId}`)
        } else {
          router.push("/")
        }
        router.refresh()
      }, 2000)
    } catch (error: any) {
      console.error("Error:", error)
      setError(error.message || "投稿の作成中にエラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  const handleLoginSuccess = () => {
    // ログイン成功後、ページをリロードしてユーザー状態を更新
    window.location.reload()
  }

  const handleTagsChange = (value: string) => {
    setTagInput(value)
    
    // 一気に貼り付けされた場合の処理（カンマ、スペース、#区切りを検知）
    if (value.includes(',') || value.includes(' ') || value.includes('#')) {
      // 複数の区切り文字で分割して処理
      const newTags = value
        .split(/[,\s#]+/) // カンマ、スペース、#で分割
        .map(tag => tag.trim())
        .filter(tag => tag && tag !== '') // 空文字を除外
        .filter(tag => !tags.includes(tag)) // 重複を除外
      
      if (newTags.length > 0) {
        console.log('Bulk adding tags:', newTags)
        setTags([...tags, ...newTags])
        setShouldClearTagInput(true)
      }
    }
  }

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log('Key pressed:', e.key, 'Current input:', tagInput)
    
    // Enterキーまたはカンマキーでタグを追加
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      e.stopPropagation()
      const currentValue = tagInput.trim()
      console.log('Trying to add tag:', currentValue)
      
      if (currentValue && !tags.includes(currentValue)) {
        console.log('Adding tag:', currentValue)
        setTags([...tags, currentValue])
        // useEffect を使用してクリア
        setShouldClearTagInput(true)
      } else {
        console.log('Tag not added - empty or duplicate')
        // 重複や空の場合でもクリア
        setShouldClearTagInput(true)
      }
    }
    // BackspaceキーでInputが空の場合は最後のタグを削除
    else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      e.preventDefault()
      const newTags = [...tags]
      newTags.pop()
      setTags(newTags)
    }
  }

  const handleTagInputBlur = () => {
    // フォーカスが外れた時にも入力中のタグを追加
    const currentValue = tagInput.trim()
    if (currentValue && !tags.includes(currentValue)) {
      setTags([...tags, currentValue])
      setShouldClearTagInput(true)
    }
  }

  const removeTag = (indexToRemove: number) => {
    setTags(tags.filter((_, index) => index !== indexToRemove))
  }

  const handleTagPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text')
    console.log('Pasted text:', pastedText)
    
    // 区切り文字が含まれている場合はペーストを処理
    if (pastedText.includes(',') || pastedText.includes(' ') || pastedText.includes('#')) {
      e.preventDefault()
      
      // 複数の区切り文字で分割して処理
      const newTags = pastedText
        .split(/[,\s#]+/) // カンマ、スペース、#で分割
        .map(tag => tag.trim())
        .filter(tag => tag && tag !== '') // 空文字を除外
        .filter(tag => !tags.includes(tag)) // 重複を除外
      
      if (newTags.length > 0) {
        console.log('Paste adding tags:', newTags)
        setTags([...tags, ...newTags])
        setShouldClearTagInput(true)
      }
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">投稿するにはログインが必要です</p>
          <Button onClick={() => setShowLoginDialog(true)} className="bg-orange-500 hover:bg-orange-600">
            ログイン
          </Button>
        </div>
        <LoginDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} onSuccess={handleLoginSuccess} />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-600 mb-2">
            {isEditMode ? '更新完了！' : '投稿完了！'}
          </h2>
          <p className="text-gray-600 mb-4">
            {isEditMode ? 'トッピングが正常に更新されました' : 'トッピングが正常に投稿されました'}
          </p>
          <p className="text-sm text-gray-500">
            {isEditMode ? '投稿詳細に戻ります...' : 'ホーム画面に戻ります...'}
          </p>
        </div>
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
          <h1 className="text-lg font-semibold">新しい投稿</h1>
          <div className="w-10" />
        </div>
      </header>

      {/* PC版ヘッダー */}
      <header className="hidden lg:block bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-8 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">新しいトッピングを投稿</h1>
              <Button variant="outline" onClick={() => {
                triggerHapticFeedback('medium')
                router.push("/")
              }}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                ホームに戻る
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="p-4 pb-20 lg:pb-8 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center lg:text-left text-orange-600">
                {isEditMode ? 'トッピングを編集' : 'トッピングを投稿'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* エラー表示 */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="menuName">メニュー名 *</Label>
                  <Input
                    id="menuName"
                    placeholder="例：カップヌードル"
                    value={menuName}
                    onChange={(e) => setMenuName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="toppingContent">トッピング内容 *</Label>
                  <Input
                    id="toppingContent"
                    placeholder="例：キムチ + 粉チーズ"
                    value={toppingContent}
                    onChange={(e) => setToppingContent(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memo">味メモ（任意）</Label>
                  <Textarea
                    id="memo"
                    placeholder="どんな味だった？おすすめポイントは？"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    rows={3}
                    disabled={loading}
                  />
                </div>

                {/* 詳細情報の展開ボタン */}
                {!showAdditionalFields && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAdditionalFields(true)}
                    className="w-full"
                    disabled={loading}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    詳細情報を追加（調理時間・予算・タグ）
                  </Button>
                )}

                {/* 追加フィールド */}
                {showAdditionalFields && (
                  <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                    {/* 調理時間 */}
                    <div className="space-y-2">
                      <Label htmlFor="cooking-time" className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        調理時間（分）
                      </Label>
                      <Input
                        id="cooking-time"
                        type="number"
                        placeholder="例: 30"
                        value={cookingTime || ""}
                        onChange={(e) => setCookingTime(e.target.value ? Number(e.target.value) : null)}
                        disabled={loading}
                        className="mt-1"
                      />
                    </div>

                    {/* 予算 */}
                    <div className="space-y-2">
                      <Label htmlFor="budget" className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-2" />
                        予算（円）
                      </Label>
                      <Input
                        id="budget"
                        type="number"
                        placeholder="例: 500"
                        value={budget || ""}
                        onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : null)}
                        disabled={loading}
                        className="mt-1"
                      />
                    </div>

                    {/* タグ */}
                    <div className="space-y-2">
                      <Label htmlFor="tags" className="flex items-center">
                        <Tag className="w-4 h-4 mr-2" />
                        タグ
                      </Label>
                      <Input
                        id="tags"
                        placeholder="タグを入力・貼り付けしてEnterキーまたはカンマで追加"
                        value={tagInput}
                        onChange={(e) => handleTagsChange(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        onBlur={handleTagInputBlur}
                        onPaste={handleTagPaste}
                        disabled={loading}
                        className="mt-1"
                      />
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {tags.map((tag, index) => (
                            <span 
                              key={index}
                              className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-sm flex items-center gap-1 cursor-pointer hover:bg-orange-200"
                              onClick={() => removeTag(index)}
                            >
                              #{tag}
                              <X className="w-3 h-3" />
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        Enterキーまたはカンマ（,）でタグを追加。「簡単, 節約, #朝食」のような一括貼り付けも対応。タグをクリックして削除。
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowAdditionalFields(false)}
                      className="w-full"
                      disabled={loading}
                    >
                      詳細情報を閉じる
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>写真（最大3枚、各5MB以下）</Label>
                  <div className="grid grid-cols-3 gap-2 lg:gap-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative aspect-square">
                        <Image
                          src={URL.createObjectURL(image) || "/placeholder.svg"}
                          alt={`アップロード画像 ${index + 1}`}
                          fill
                          className="object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 w-6 h-6"
                          onClick={() => removeImage(index)}
                          disabled={loading}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {images.length < 3 && (
                      <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-orange-400 disabled:cursor-not-allowed">
                        <Upload className="w-6 h-6 text-gray-400" />
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={loading}
                          aria-label="画像をアップロード"
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">JPG、PNG、GIF形式に対応。各ファイル5MB以下。</p>
                </div>

                {/* アップロード進行状況 */}
                {Object.keys(uploadProgress).length > 0 && (
                  <div className="space-y-2">
                    <Label>アップロード中...</Label>
                    {Object.entries(uploadProgress).map(([fileId, progress]) => (
                      <div key={fileId} className="progress-bar">
                        <div
                          className="progress-bar-fill"
                          data-progress={progress}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  disabled={loading || !menuName || !toppingContent}
                >
                  {loading 
                    ? (isEditMode ? "更新中..." : "投稿中...") 
                    : (isEditMode ? "更新する" : "投稿する")
                  }
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </ResponsiveLayout>
  )
}
