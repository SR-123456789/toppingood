"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Home, Search, ChefHat, User } from "lucide-react"
import { SidebarNavigation } from "@/components/ui/sidebar-navigation"
import { LoginDialog } from "@/components/auth/login-dialog"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface SidebarNavigationContainerProps {
  user: SupabaseUser | null
}

export function SidebarNavigationContainer({ user }: SidebarNavigationContainerProps) {
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

  const handleMenuClick = (item: any) => {
    if (item.requireAuth) {
      requireLogin(() => router.push(item.path))
    } else {
      router.push(item.path)
    }
  }

  const handleCreatePost = () => {
    requireLogin(() => router.push("/create"))
  }

  return (
    <>
      <SidebarNavigation
        user={user}
        menuItems={menuItems}
        currentPath={pathname}
        onMenuClick={handleMenuClick}
        onCreatePost={handleCreatePost}
        onLogin={() => setShowLoginDialog(true)}
        onLogout={handleLogout}
      />
      <LoginDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} />
    </>
  )
}
