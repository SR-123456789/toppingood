"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Home, Search, ChefHat, User } from "lucide-react"
import { LoginDialog } from "@/components/auth/login-dialog"
import { triggerHapticFeedback } from "@/lib/haptic-feedback"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface FooterNavigationProps {
  user: SupabaseUser | null
}

export function FooterNavigation({ user }: FooterNavigationProps) {
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const handleTabNavigation = (path: string, requiresAuth: boolean = false) => {
    triggerHapticFeedback('medium')
    
    if (requiresAuth && !user) {
      triggerHapticFeedback('light')
      setShowLoginDialog(true)
      return
    }
    
    router.push(path)
  }

  const getActiveTab = () => {
    if (pathname === "/") return "home"
    if (pathname === "/search") return "search"
    if (pathname === "/my-toppings") return "my-topping"
    if (pathname === "/profile") return "profile"
    return "home"
  }

  const activeTab = getActiveTab()

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex items-center justify-around py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleTabNavigation("/")}
            className={`flex flex-col items-center gap-1 p-3 ${
              activeTab === "home" ? "text-orange-600" : "text-gray-600"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs">ホーム</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleTabNavigation("/search")}
            className={`flex flex-col items-center gap-1 p-3 ${
              activeTab === "search" ? "text-orange-600" : "text-gray-600"
            }`}
          >
            <Search className="w-5 h-5" />
            <span className="text-xs">探す</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleTabNavigation("/my-toppings", true)}
            className={`flex flex-col items-center gap-1 p-3 ${
              activeTab === "my-topping" ? "text-orange-600" : "text-gray-600"
            }`}
          >
            <ChefHat className="w-5 h-5" />
            <span className="text-xs">マイトッピング</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleTabNavigation("/profile", true)}
            className={`flex flex-col items-center gap-1 p-3 ${
              activeTab === "profile" ? "text-orange-600" : "text-gray-600"
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-xs">プロフィール</span>
          </Button>
        </div>
      </nav>

      <LoginDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} />
    </>
  )
}
