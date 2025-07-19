"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { SidebarMenuItem } from "@/components/ui/sidebar-menu-item"
import { SidebarUserInfo } from "@/components/ui/sidebar-user-info"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface MenuItem {
  icon: any
  label: string
  path: string
  requireAuth: boolean
}

interface SidebarNavigationProps {
  user: SupabaseUser | null
  menuItems: MenuItem[]
  currentPath: string
  onMenuClick: (item: MenuItem) => void
  onCreatePost: () => void
  onLogin: () => void
  onLogout: () => void
}

export function SidebarNavigation({
  user,
  menuItems,
  currentPath,
  onMenuClick,
  onCreatePost,
  onLogin,
  onLogout,
}: SidebarNavigationProps) {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:left-0 lg:top-0 lg:h-full lg:bg-white lg:border-r lg:border-gray-200 lg:z-40">
      {/* ロゴ */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-orange-600">
          <a href="/">ToppinGOOD</a>
        </h1>
      </div>

      {/* ナビゲーションメニュー */}
      <nav className="flex-1 px-4 py-6">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <SidebarMenuItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              isActive={currentPath === item.path}
              onClick={() => onMenuClick(item)}
            />
          ))}

          {/* 投稿ボタン */}
          <Button
            className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white py-3 h-auto text-lg"
            onClick={onCreatePost}
          >
            <Plus className="w-6 h-6 mr-2" />
            投稿する
          </Button>
        </div>
      </nav>

      {/* ユーザー情報 */}
      <div className="p-4 border-t border-gray-200">
        <SidebarUserInfo user={user} onLogin={onLogin} onLogout={onLogout} />
      </div>
    </aside>
  )
}
