"use client"

import { HomeContainer } from "@/components/containers/home-container"
import type { PostWithProfile } from "@/app/page"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface HomeClientProps {
  user: SupabaseUser | null
  initialPosts: PostWithProfile[]
}

export function HomeClient({ user, initialPosts }: HomeClientProps) {
  return <HomeContainer user={user} initialPosts={initialPosts} />
}
