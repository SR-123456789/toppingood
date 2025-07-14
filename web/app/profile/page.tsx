"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Edit, Save, X, Camera, Users, Heart, ChefHat } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { triggerHapticFeedback } from "@/lib/haptic-feedback"
import { LoginDialog } from "@/components/auth/login-dialog"
import { ResponsiveLayout } from "@/components/responsive-layout"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface UserStats {
  postsCount: number
  mimicsCount: number
  likesCount: number
  mimickedCount: number
}

interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<UserStats>({
    postsCount: 0,
    mimicsCount: 0,
    likesCount: 0,
    mimickedCount: 0,
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    display_name: "",
    username: "",
    bio: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    await fetchUserProfile(user.id)
    await fetchUserStats(user.id)
  }

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (error) {
        console.error("Error fetching profile:", error)
        return
      }

      setProfile(profile)
      setEditForm({
        display_name: profile.display_name || "",
        username: profile.username || "",
        bio: profile.bio || "",
      })
    } catch (error) {
      console.error("Error in fetchUserProfile:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserStats = async (userId: string) => {
    try {
      // 統計情報を並列で取得（countクエリを使用）
      const [postsResult, mimicsResult, likesResult, userPostsResult] = await Promise.all([
        // 投稿数
        supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
        
        // 真似した数
        supabase
          .from("mimics")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
        
        // いいねした数
        supabase
          .from("likes")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId),
        
        // 真似された数用の投稿データ（mimic_countのみ）
        supabase
          .from("posts")
          .select("mimic_count")
          .eq("user_id", userId)
      ])

      const mimickedCount = userPostsResult.data?.reduce((total, post) => total + post.mimic_count, 0) || 0

      setStats({
        postsCount: postsResult.count || 0,
        mimicsCount: mimicsResult.count || 0,
        likesCount: likesResult.count || 0,
        mimickedCount,
      })
    } catch (error) {
      console.error("Error fetching user stats:", error)
    }
  }

  const handleSave = async () => {
    triggerHapticFeedback('medium') // プロフィール保存は重要なアクション
    
    if (!user || !profile) return

    setSaving(true)

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: editForm.display_name,
          username: editForm.username,
          bio: editForm.bio,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) {
        console.error("Error updating profile:", error)
        alert("プロフィールの更新に失敗しました")
        return
      }

      // プロフィールを再取得
      await fetchUserProfile(user.id)
      setIsEditing(false)
    } catch (error) {
      console.error("Error in handleSave:", error)
      alert("エラーが発生しました")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    triggerHapticFeedback('light') // キャンセルは軽めのフィードバック
    
    setEditForm({
      display_name: profile?.display_name || "",
      username: profile?.username || "",
      bio: profile?.bio || "",
    })
    setIsEditing(false)
  }

  const handleLogout = async () => {
    triggerHapticFeedback('heavy') // ログアウトは重要なアクション
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleLoginSuccess = () => {
    window.location.reload()
  }

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
          <p className="text-gray-600 mb-4">プロフィールを見るにはログインが必要です</p>
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
          <h1 className="text-lg font-semibold">マイページ</h1>
          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={handleCancel}>
                <X className="w-5 h-5" />
              </Button>
              <Button size="icon" onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                <Save className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => {
              triggerHapticFeedback('light') // 編集開始は軽めのフィードバック
              setIsEditing(true)
            }}>
              <Edit className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      {/* PC版ヘッダー */}
      <header className="hidden lg:block bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-8 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">マイページ</h1>
              {isEditing ? (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-2" />
                    キャンセル
                  </Button>
                  <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "保存中..." : "保存"}
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => {
                  triggerHapticFeedback('light')
                  setIsEditing(true)
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  編集
                </Button>
              )}
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
            <div className="max-w-md mx-auto lg:max-w-none lg:grid lg:grid-cols-3 lg:gap-6">
              {/* プロフィール情報 */}
              <div className="lg:col-span-2">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
                      {/* アバター */}
                      <div className="relative">
                        <Avatar className="w-24 h-24">
                          <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} />
                          <AvatarFallback className="text-2xl">
                            {profile?.display_name?.[0] || profile?.username?.[0] || "?"}
                          </AvatarFallback>
                        </Avatar>
                        {isEditing && (
                          <Button
                            size="icon"
                            className="absolute -bottom-2 -right-2 w-8 h-8 bg-orange-500 hover:bg-orange-600"
                          >
                            <Camera className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      {/* 名前とユーザー名 */}
                      <div className="flex-1 w-full">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor="display_name">表示名</Label>
                              <Input
                                id="display_name"
                                value={editForm.display_name}
                                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                                placeholder="表示名を入力"
                              />
                            </div>
                            <div>
                              <Label htmlFor="username">ユーザー名</Label>
                              <Input
                                id="username"
                                value={editForm.username}
                                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                placeholder="ユーザー名を入力"
                              />
                            </div>
                            <div>
                              <Label htmlFor="bio">自己紹介</Label>
                              <Textarea
                                id="bio"
                                value={editForm.bio}
                                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                placeholder="自己紹介を入力"
                                rows={3}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="text-center lg:text-left">
                            <h2 className="text-xl lg:text-2xl font-bold">{profile?.display_name || "名前未設定"}</h2>
                            <p className="text-gray-500">@{profile?.username || "username"}</p>
                            {profile?.bio && <p className="text-sm text-gray-700 mt-2">{profile.bio}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 統計情報 */}
              <div className="lg:col-span-1 mt-6 lg:mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-center lg:text-left">活動統計</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                      <div className="text-center p-3 bg-orange-50 rounded-lg">
                        <ChefHat className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                        <p className="text-2xl font-bold text-orange-600">{stats.postsCount}</p>
                        <p className="text-sm text-gray-600">投稿数</p>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                        <p className="text-2xl font-bold text-blue-600">{stats.mimickedCount}</p>
                        <p className="text-sm text-gray-600">真似された数</p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <Users className="w-6 h-6 mx-auto mb-2 text-green-600" />
                        <p className="text-2xl font-bold text-green-600">{stats.mimicsCount}</p>
                        <p className="text-sm text-gray-600">真似した数</p>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <Heart className="w-6 h-6 mx-auto mb-2 text-red-600" />
                        <p className="text-2xl font-bold text-red-600">{stats.likesCount}</p>
                        <p className="text-sm text-gray-600">いいね数</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 設定・その他 */}
                <Card className="mt-6">
                  <CardContent className="p-4 space-y-3">
                    <Button variant="ghost" className="w-full justify-start" onClick={() => router.push("/my-toppings")}>
                      <ChefHat className="w-5 h-5 mr-3" />
                      マイトッピング
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-red-600" onClick={handleLogout}>
                      ログアウト
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <LoginDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} />
    </ResponsiveLayout>
  )
}
