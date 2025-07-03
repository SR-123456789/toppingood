"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Upload, X, CheckCircle, AlertCircle } from "lucide-react"
import Image from "next/image"
import { LoginDialog } from "@/components/auth/login-dialog"
import { ResponsiveLayout } from "@/components/responsive-layout"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import "./progress.css"

export default function CreatePostPage() {
  const [menuName, setMenuName] = useState("")
  const [toppingContent, setToppingContent] = useState("")
  const [memo, setMemo] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()
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
    getUser()
  }, [supabase])

  // プロフィールの存在確認と作成
  const ensureProfile = async (userId: string) => {
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).single()

    if (!profile) {
      // プロフィールが存在しない場合は作成
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

      // 画像をアップロード
      const imageUrls: string[] = []

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
      } else {
        // 画像がない場合はプレースホルダーを使用
        imageUrls.push("/placeholder.svg?height=300&width=300")
      }

      // 投稿を作成
      const { error: postError } = await supabase.from("posts").insert({
        user_id: user.id,
        menu_name: menuName,
        topping_content: toppingContent,
        memo: memo || null,
        image_urls: imageUrls,
      })

      if (postError) {
        console.error("Post creation error:", postError)
        throw new Error(`投稿の作成に失敗しました: ${postError.message}`)
      }

      // 成功状態を表示
      setSuccess(true)

      // 2秒後にホームページにリダイレクト
      setTimeout(() => {
        router.push("/")
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
          <h2 className="text-2xl font-bold text-green-600 mb-2">投稿完了！</h2>
          <p className="text-gray-600 mb-4">トッピングが正常に投稿されました</p>
          <p className="text-sm text-gray-500">ホーム画面に戻ります...</p>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveLayout user={user}>
      {/* モバイル版ヘッダー */}
      <header className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
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
              <Button variant="outline" onClick={() => router.push("/")}>
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
                トッピングを投稿
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
                          style={{ width: `${progress}%` }}
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
                  {loading ? "投稿中..." : "投稿する"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </ResponsiveLayout>
  )
}
