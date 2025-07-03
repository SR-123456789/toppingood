"use client"

import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface MobileHeaderProps {
  onCreatePost: () => void
  onLogin: () => void
  onLogout: () => void
  user: any
}

export function MobileHeader({ onCreatePost, onLogin, onLogout, user }: MobileHeaderProps) {
  return (
    <header className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-bold text-orange-600">ToppinGOOD</h1>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full"
            onClick={onCreatePost}
          >
            <Plus className="w-5 h-5" />
          </Button>
          {user ? (
            <Button variant="outline" size="sm" onClick={onLogout} className="text-xs bg-transparent">
              ログアウト
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onLogin} className="text-xs bg-transparent">
              ログイン
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
