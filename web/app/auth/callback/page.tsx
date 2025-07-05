"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ensureProfile } from "@/lib/profile-utils"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URLからコードを取得してセッションを交換
        const code = searchParams.get('code')
        
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          
          if (error) {
            console.error('認証エラー:', error)
            // エラーがあってもホームページにリダイレクト
            router.push('/')
            return
          }

          if (data?.user) {
            // プロフィールの存在確認と作成
            await ensureProfile(data.user.id)
            
            // 成功メッセージと共にホームページにリダイレクト
            const successUrl = new URL('/', window.location.origin)
            successUrl.searchParams.set('auth', 'success')
            router.push(successUrl.toString())
          } else {
            router.push('/')
          }
        } else {
          // コードがない場合はホームページにリダイレクト
          router.push('/')
        }
      } catch (error) {
        console.error('認証処理中にエラーが発生しました:', error)
        router.push('/')
      }
    }

    handleAuthCallback()
  }, [searchParams, router, supabase.auth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">認証処理中...</h2>
        <p className="text-gray-600">メール認証を完了しています。少々お待ちください。</p>
      </div>
    </div>
  )
}
