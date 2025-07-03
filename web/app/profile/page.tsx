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
import { LoginDialog } from "@/components/auth/login-dialog"
import { FooterNavigation } from "@/components/footer-navigation"

interface UserStats {
  postsCount: number
  mimicsCount: number
  likesCount: number
  mimickedCount: number
}

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
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
      // 投稿数
      const { count: postsCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      // 真似した数
      const { count: mimicsCount } = await supabase
        .from("mimics")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      // いいねした数
      const { count: likesCount } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      // 真似された数（自分の投稿が真似された回数の合計）
      const { data: userPosts } = await supabase.from("posts").select("mimic_count").eq("user_id", userId)

      const mimickedCount = userPosts?.reduce((total, post) => total + post.mimic_count, 0) || 0

      setStats({
        postsCount: postsCount || 0,
        mimicsCount: mimicsCount || 0,
        likesCount: likesCount || 0,
        mimickedCount,
      })
    } catch (error) {
      console.error("Error fetching user stats:", error)
    }
  }

  const handleSave = async () => {
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
    setEditForm({
      display_name: profile?.display_name || "",
      username: profile?.username || "",
      bio: profile?.bio || "",
    })
    setIsEditing(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleLoginSuccess = () => {
    window.location.reload()
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
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
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
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
              <Edit className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="p-4 pb-20">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">読み込み中...</p>
          </div>
        ) : (
          <div className="max-w-md mx-auto space-y-6">
            {/* プロフィール情報 */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center space-y-4">
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
                  {isEditing ? (
                    <div className="w-full space-y-3">
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
                    <div className="text-center">
                      <h2 className="text-xl font-bold">{profile?.display_name || "名前未設定"}</h2>
                      <p className="text-gray-500">@{profile?.username || "username"}</p>
                      {profile?.bio && <p className="text-sm text-gray-700 mt-2">{profile.bio}</p>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 統計情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-center">活動統計</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
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
            <Card>
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
        )}
      </main>
      {/* フッターナビゲーション */}
      <FooterNavigation user={user} />
    </div>
  )
}
