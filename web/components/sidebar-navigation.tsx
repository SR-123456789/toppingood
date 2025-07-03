"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Home, Search, ChefHat, User, Plus, LogOut } from "lucide-react"
import { LoginDialog } from "@/components/auth/login-dialog"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface SidebarNavigationProps {
  user: SupabaseUser | null
}

export function SidebarNavigation({ user }: SidebarNavigationProps) {
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const requireLogin = (action: () => void) => {
    if (!user) {
      setShowLoginDialog(true)
      return
    }
    action()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  const getActiveClass = (path: string) => {
    return pathname === path
      ? "bg-orange-50 text-orange-600 border-r-2 border-orange-600"
      : "text-gray-700 hover:bg-gray-50"
  }

  const menuItems = [
    {
      icon: Home,
      label: "ホーム",
      path: "/",
      requireAuth: false,
    },
    {
      icon: Search,
      label: "探す",
      path: "/search",
      requireAuth: false,
    },
    {
      icon: ChefHat,
      label: "マイトッピング",
      path: "/my-toppings",
      requireAuth: true,
    },
    {
      icon: User,
      label: "プロフィール",
      path: "/profile",
      requireAuth: true,
    },
  ]

  return (
    <>
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:left-0 lg:top-0 lg:h-full lg:bg-white lg:border-r lg:border-gray-200 lg:z-40">
        {/* ロゴ */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-orange-600">ToppinGOOD</h1>
        </div>

        {/* ナビゲーションメニュー */}
        <nav className="flex-1 px-4 py-6">
          <div className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={`w-full justify-start px-4 py-3 h-auto ${getActiveClass(item.path)}`}
                  onClick={() => {
                    if (item.requireAuth) {
                      requireLogin(() => router.push(item.path))
                    } else {
                      router.push(item.path)
                    }
                  }}
                >
                  <Icon className="w-6 h-6 mr-4" />
                  <span className="text-lg">{item.label}</span>
                </Button>
              )
            })}

            {/* 投稿ボタン */}
            <Button
              className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white py-3 h-auto text-lg"
              onClick={() => requireLogin(() => router.push("/create"))}
            >
              <Plus className="w-6 h-6 mr-2" />
              投稿する
            </Button>
          </div>
        </nav>

        {/* ユーザー情報 */}
        <div className="p-4 border-t border-gray-200">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2">
                <Avatar className="w-10 h-10">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.email?.split("@")[0] || "ユーザー"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                ログアウト
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="w-full bg-transparent" onClick={() => setShowLoginDialog(true)}>
              ログイン
            </Button>
          )}
        </div>
      </aside>

      <LoginDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} />
    </>
  )
}
