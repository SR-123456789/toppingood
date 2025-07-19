"use client"

import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, Share2 } from "lucide-react"
import { AnimatedImageCarousel } from "@/components/animated-image-carousel"
import type { PostWithProfile } from "@/app/page"

interface PostCardProps {
  post: PostWithProfile
  isLiked: boolean
  isMimicked: boolean
  onLike: (event: React.MouseEvent) => void
  onMimic: (event: React.MouseEvent) => void
  onPostClick: () => void
  formatTimeAgo: (dateString: string) => string
}

export function PostCard({ post, isLiked, isMimicked, onLike, onMimic, onPostClick, formatTimeAgo }: PostCardProps) {
  return (
    <Card
      className="mb-6 mx-4 lg:mx-0 shadow-sm border-0 bg-white cursor-pointer hover:shadow-md transition-shadow duration-300"
      onClick={onPostClick}
    >
      <CardContent className="p-0">
        {/* ユーザー情報 */}
        <div className="flex items-center gap-3 p-4 pb-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.profile?.avatar_url || "/placeholder.svg"} />
            <AvatarFallback>{post.profile?.display_name?.[0] || post.profile?.username?.[0] || "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {post.profile?.display_name || post.profile?.username || "匿名ユーザー"}
            </p>
            <p className="text-xs text-gray-500">{formatTimeAgo(post.created_at)}</p>
          </div>
        </div>

        {/* アニメーション付き投稿画像 */}
        <div className="relative">
          <AnimatedImageCarousel
            images={post.image_urls || ["/placeholder.svg?height=300&width=300"]}
            alt={`${post.menu_name}のトッピング`}
            className="w-full aspect-square"
            autoPlay={true}
            interval={8000}
          />
        </div>

        {/* 投稿内容 */}
        <div className="p-4">
          <div className="mb-3">
            <h3 className="font-bold text-lg mb-1">{post.menu_name}</h3>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200">
                {post.topping_content}
              </Badge>
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                {post.mimic_count}人が真似した
              </Badge>
            </div>
            {post.memo && <p className="text-sm text-gray-700 line-clamp-2">{post.memo}</p>}
          </div>

          {/* アクションボタン */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={onLike}
                className={`${isLiked ? "text-red-500" : "text-gray-600"} hover:scale-105 transition-transform flex-shrink-0`}
              >
                <Heart className={`w-4 h-4 sm:w-5 sm:h-5 mr-1 ${isLiked ? "fill-current" : ""}`} />
                <span className="hidden sm:inline">{post.like_count}</span>
                <span className="sm:hidden">{post.like_count}</span>
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:scale-105 transition-transform flex-shrink-0">
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-600 hover:scale-105 transition-transform flex-shrink-0">
                <Share2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
                <span className="text-xs sm:text-sm">共有</span>
              </Button>
            </div>
            <Button
              onClick={onMimic}
              className={`text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 rounded-full transition-all duration-300 hover:scale-105 whitespace-nowrap flex-shrink-0 ${
                isMimicked
                  ? "bg-orange-200 text-orange-800 hover:bg-orange-300"
                  : "bg-orange-500 hover:bg-orange-600 text-white"
              }`}
            >
              {isMimicked ? "真似済み" : "真似する"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
