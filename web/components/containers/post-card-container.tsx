"use client"

import type React from "react"

import { PostCard } from "@/components/ui/post-card"
import type { PostWithProfile } from "@/app/page"

interface PostCardContainerProps {
  post: PostWithProfile
  likedPosts: string[]
  mimickedPosts: string[]
  onLike: (postId: string, event: React.MouseEvent) => void
  onMimic: (postId: string, event: React.MouseEvent) => void
  onPostClick: (postId: string) => void
}

export function PostCardContainer({
  post,
  likedPosts,
  mimickedPosts,
  onLike,
  onMimic,
  onPostClick,
}: PostCardContainerProps) {
  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const postDate = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "たった今"
    if (diffInHours < 24) return `${diffInHours}時間前`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}日前`
  }

  return (
    <PostCard
      post={post}
      isLiked={likedPosts.includes(post.id)}
      isMimicked={mimickedPosts.includes(post.id)}
      onLike={(event) => onLike(post.id, event)}
      onMimic={(event) => onMimic(post.id, event)}
      onPostClick={() => onPostClick(post.id)}
      formatTimeAgo={formatTimeAgo}
    />
  )
}
