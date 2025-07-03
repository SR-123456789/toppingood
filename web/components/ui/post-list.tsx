"use client"

import type React from "react"

import { PostCard } from "@/components/ui/post-card"
import type { PostWithProfile } from "@/app/page"

interface PostListProps {
  posts: PostWithProfile[]
  likedPosts: string[]
  mimickedPosts: string[]
  onLike: (postId: string, event: React.MouseEvent) => void
  onMimic: (postId: string, event: React.MouseEvent) => void
  onPostClick: (postId: string) => void
  formatTimeAgo: (dateString: string) => string
}

export function PostList({
  posts,
  likedPosts,
  mimickedPosts,
  onLike,
  onMimic,
  onPostClick,
  formatTimeAgo,
}: PostListProps) {
  return (
    <div className="max-w-md mx-auto lg:max-w-lg xl:max-w-xl">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          isLiked={likedPosts.includes(post.id)}
          isMimicked={mimickedPosts.includes(post.id)}
          onLike={(event) => onLike(post.id, event)}
          onMimic={(event) => onMimic(post.id, event)}
          onPostClick={() => onPostClick(post.id)}
          formatTimeAgo={formatTimeAgo}
        />
      ))}
    </div>
  )
}
