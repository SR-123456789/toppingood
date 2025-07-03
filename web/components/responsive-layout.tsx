"use client"

import type React from "react"

import { SidebarNavigationContainer } from "@/components/containers/sidebar-navigation-container"
import { FooterNavigation } from "@/components/footer-navigation"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface ResponsiveLayoutProps {
  children: React.ReactNode
  user: SupabaseUser | null
}

export function ResponsiveLayout({ children, user }: ResponsiveLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* PC版サイドバー */}
      <SidebarNavigationContainer user={user} />

      {/* メインコンテンツ */}
      <div className="lg:ml-64">{children}</div>

      {/* モバイル版フッター */}
      <div className="lg:hidden">
        <FooterNavigation user={user} />
      </div>
    </div>
  )
}
