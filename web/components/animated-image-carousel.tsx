"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"

interface AnimatedImageCarouselProps {
  images: string[]
  alt: string
  className?: string
  autoPlay?: boolean
  interval?: number
}

export function AnimatedImageCarousel({
  images,
  alt,
  className = "",
  autoPlay = true,
  interval = 6000,
}: AnimatedImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [nextIndex, setNextIndex] = useState(0)
  const [showNext, setShowNext] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 画像配列を準備（1枚の場合は同じ画像を複製）
  const imageArray = images.length > 0 ? images : ["/placeholder.svg?height=300&width=300"]
  const displayImages = imageArray.length === 1 ? [imageArray[0], imageArray[0]] : imageArray

  useEffect(() => {
    if (!autoPlay) return

    const startCycle = () => {
      // 次のインデックスを計算
      const next = (currentIndex + 1) % displayImages.length
      setNextIndex(next)
      setShowNext(true)
      
      // 500ms後にインデックス更新、次の画像を隠す（アニメーション速度を上げる）
      timeoutRef.current = setTimeout(() => {
        setCurrentIndex(next)
        setShowNext(false)
      }, 500)
    }

    const timer = setInterval(startCycle, interval)
    return () => {
      clearInterval(timer)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [autoPlay, interval, displayImages.length, currentIndex])

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* 現在の画像 - ズームエフェクト付き */}
      <div className="absolute inset-0">
        <Image
          key={`current-${currentIndex}`}
          src={displayImages[currentIndex]}
          alt={alt}
          fill
          className={`object-cover ${
            showNext 
              ? 'scale-120 -translate-x-full opacity-0 transition-all duration-500 ease-out' 
              : 'scale-100 translate-x-0 opacity-100 animate-zoom-slowly'
          }`}
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>

      {/* 次の画像 - 右からスライドイン */}
      {showNext && (
        <div className="absolute inset-0">
          <Image
            key={`next-${nextIndex}`}
            src={displayImages[nextIndex]}
            alt={alt}
            fill
            className="object-cover scale-100 translate-x-full animate-slide-in-simple"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}

      {/* 画像インジケーター（複数画像の場合のみ） */}
      {imageArray.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
          {imageArray.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                index === currentIndex % imageArray.length 
                  ? "bg-white shadow-lg scale-125" 
                  : "bg-white bg-opacity-60"
              }`}
            />
          ))}
        </div>
      )}

      {/* グラデーションオーバーレイ */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/20 to-transparent pointer-events-none z-10" />
    </div>
  )
}
