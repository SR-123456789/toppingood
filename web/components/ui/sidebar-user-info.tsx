"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface SidebarUserInfoProps {
  user: SupabaseUser | null
  onLogin: () => void
  onLogout: () => void
}

export function SidebarUserInfo({ user, onLogin, onLogout }: SidebarUserInfoProps) {
  if (!user) {
    return (
      <Button variant="outline" className="w-full bg-transparent" onClick={onLogin}>
        ログイン
      </Button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-2">
        <Avatar className="w-10 h-10">
          <AvatarImage src="/placeholder.svg" />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{user.email?.split("@")[0] || "ユーザー"}</p>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
        onClick={onLogout}
      >
        <LogOut className="w-4 h-4 mr-2" />
        ログアウト
      </Button>
    </div>
  )
}
