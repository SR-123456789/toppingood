"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { generateUniqueUsername, generateDisplayName } from "@/lib/username-generator"
import { triggerHapticFeedback } from "@/lib/haptic-feedback"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"

export function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    triggerHapticFeedback('medium') // サインアップボタンは重要なアクション
    setLoading(true)
    setMessage("")

    try {
      // ユニークなユーザー名を生成
      const checkUsernameExists = async (username: string): Promise<boolean> => {
        const { data } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", username)
          .single()
        
        return !!data
      }

      const username = await generateUniqueUsername(checkUsernameExists)
      const displayName = generateDisplayName()

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: displayName,
          },
        },
      })

      if (error) {
        setMessage(error.message)
      } else {
        setMessage("確認メールを送信しました。メールをチェックしてください。")
      }
    } catch (error) {
      setMessage("エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    triggerHapticFeedback('medium') // サインインボタンは重要なアクション
    setLoading(true)
    setMessage("")

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(error.message)
      } else {
        // ログイン成功後、ページをリフレッシュ
        window.location.href = "/"
      }
    } catch (error) {
      setMessage("エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-orange-600">ToppinGOOD</CardTitle>
          <CardDescription>トッピングを共有しよう</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">ログイン</TabsTrigger>
              <TabsTrigger value="signup">新規登録</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">パスワード</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={loading}>
                  {loading ? "ログイン中..." : "ログイン"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">パスワード</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="text-sm text-gray-600 bg-orange-50 p-3 rounded-lg">
                  💡 ユーザー名と表示名は自動で素敵なものを生成します！
                </div>
                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={loading}>
                  {loading ? "登録中..." : "新規登録"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {message && <div className="mt-4 text-center text-sm text-gray-600">{message}</div>}
        </CardContent>
      </Card>
    </div>
  )
}
