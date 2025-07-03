"use client"

import { HomeContainer } from "@/components/containers/home-container"
import type { PostWithProfile } from "@/app/page"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface HomeClientProps {
  user: SupabaseUser | null
  initialPosts: PostWithProfile[]
}

export function HomeClient({ user, initialPosts }: HomeClientProps) {
  try {
    return <HomeContainer user={user} initialPosts={initialPosts} />
  } catch (error) {
    console.error("Error in HomeClient:", error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-orange-600 mb-4">ToppinGOOD</h1>
          <p className="text-gray-600 mb-4">コンテンツの読み込みに失敗しました</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            再読み込み
          </button>
        </div>
      </div>
    )
  }
}
