"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { generateUniqueUsername, generateDisplayName } from "@/lib/username-generator"
import { triggerHapticFeedback } from "@/lib/haptic-feedback"
import { autoSignInNative } from "@/lib/native-auth"
import { isNativeApp } from "@/lib/platform-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (user?: any) => void
}

export function LoginDialog({ open, onOpenChange, onSuccess }: LoginDialogProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()

  // クライアントサイドマウント検出
  useEffect(() => {
    setMounted(true)
  }, [])

  // ネイティブアプリでの自動認証
  useEffect(() => {
    const handleNativeAuth = async () => {
      // クライアントサイドマウント完了後のみ実行
      if (!mounted || typeof window === 'undefined') return
      
      if (isNativeApp() && open) {
        console.log('🔍 ネイティブアプリでログインダイアログが開かれました')
        
        // 既にログイン済みかチェック
        const { data: { session } } = await supabase.auth.getSession()
        if (session && session.user) {
          console.log('✅ 既にログイン済み、ダイアログを閉じます')
          onOpenChange(false)
          onSuccess?.(session.user)
          return
        }
        
        // まずlocalStorageの内容を確認
        const savedAccount = localStorage.getItem('toppifygo_native_account')
        console.log('💾 localStorage内容:', savedAccount)
        
        setLoading(true)
        try {
          // localStorageから保存された認証情報を使用して自動ログイン
          console.log('🚀 autoSignInNative開始...')
          const result = await autoSignInNative()
          console.log('📊 autoSignInNative結果:', result)
          
          if (result.success) {
            console.log('✅ 自動認証成功')
            
            // 認証成功後、最新のユーザー情報を取得
            const { data: { user: loggedInUser } } = await supabase.auth.getUser()
            
            // 認証成功
            onOpenChange(false)
            onSuccess?.(loggedInUser)
            // ネイティブアプリでログイン成功後、ページ状態を更新
            console.log('🔄 autoSignInNative成功、ページ状態を更新中...')
            setTimeout(() => {
              window.location.href = window.location.href
            }, 500)
            return
          } else {
            console.log('❌ autoSignInNative失敗、直接ログインを試行')
            // autoSignInNativeが失敗した場合、直接ログインを試行
            if (savedAccount) {
              const accountInfo = JSON.parse(savedAccount)
              if (accountInfo.email && accountInfo.password) {
                console.log('🔑 保存された認証情報で直接ログイン試行')
                const { error: directLoginError } = await supabase.auth.signInWithPassword({
                  email: accountInfo.email,
                  password: accountInfo.password,
                })
                
                if (!directLoginError) {
                  console.log('✅ 直接ログイン成功')
                  
                  // 認証成功後、最新のユーザー情報を取得
                  const { data: { user: loggedInUser } } = await supabase.auth.getUser()
                  
                  onOpenChange(false)
                  onSuccess?.(loggedInUser)
                  // ネイティブアプリでログイン成功後、ページ状態を更新
                  console.log('🔄 直接ログイン成功、ページ状態を更新中...')
                  setTimeout(() => {
                    window.location.href = window.location.href
                  }, 500)
                  return
                } else {
                  console.log('❌ 直接ログイン失敗:', directLoginError.message)
                }
              }
            }
            
            console.log('📝 保存された認証情報をフォームに設定')
            // ログイン失敗時はlocalStorageの認証情報を表示
            if (savedAccount) {
              try {
                const accountInfo = JSON.parse(savedAccount)
                console.log('📝 保存された認証情報:', { email: accountInfo.email, hasPassword: !!accountInfo.password })
                if (accountInfo.email && accountInfo.password) {
                  setEmail(accountInfo.email)
                  setPassword(accountInfo.password)
                }
              } catch (error) {
                console.error('保存された認証情報の読み込みエラー:', error)
              }
            }
          }
        } catch (error) {
          console.error('ネイティブ自動認証エラー:', error)
          // エラー時もlocalStorageから認証情報を復元
          if (savedAccount) {
            try {
              const accountInfo = JSON.parse(savedAccount)
              if (accountInfo.email && accountInfo.password) {
                setEmail(accountInfo.email)
                setPassword(accountInfo.password)
              }
            } catch (error) {
              console.error('保存された認証情報の読み込みエラー:', error)
            }
          } else {
            console.log('⚠️ localStorageに保存された認証情報がありません')
          }
        } finally {
          setLoading(false)
        }
      } else {
        console.log('🌐 Web版またはダイアログが閉じています')
      }
    }

    if (open) {
      handleNativeAuth()
    }
  }, [open, onOpenChange, onSuccess, supabase.auth, mounted])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    triggerHapticFeedback('medium')
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
    triggerHapticFeedback('medium')
    setLoading(true)
    setMessage("")

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(error.message)        } else {
          console.log('✅ 手動ログイン成功')
          
          // ログイン成功後、最新のユーザー情報を取得
          const { data: { user: loggedInUser } } = await supabase.auth.getUser()
          
          // ネイティブアプリの場合、認証情報をlocalStorageに保存
          if (typeof window !== 'undefined' && isNativeApp()) {
            console.log('💾 ネイティブアプリでログイン成功、認証情報を保存中...')
            try {
              const accountInfo = {
                email,
                password,
                created: true,
                timestamp: new Date().toISOString()
              }
              localStorage.setItem('toppifygo_native_account', JSON.stringify(accountInfo))
              console.log('✅ 認証情報をlocalStorageに保存完了:', { email, hasPassword: !!password })
            } catch (storageError) {
              console.error('❌ 認証情報の保存エラー:', storageError)
            }
          }
          
          onOpenChange(false)
          onSuccess?.(loggedInUser)
          
          // ネイティブアプリの場合はリロードしない（WebViewが落ちるため）
          // Web版（スマホ・PC）のみリロードを実行
          if (!isNativeApp()) {
            window.location.reload()
          } else {
            // ネイティブアプリの場合、ページを強制的に再読み込みして状態を同期
            console.log('🔄 ネイティブアプリでログイン成功、ページ状態を更新中...')
            // 少し待ってからリロード（認証状態の同期を待つ）
            setTimeout(() => {
              window.location.href = window.location.href
            }, 500)
          }
        }
    } catch (error) {
      setMessage("エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={mounted && open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-orange-600">ToppinGOOD</DialogTitle>
          <DialogDescription className="text-center">ログインしてトッピングを共有しよう</DialogDescription>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  )
}
