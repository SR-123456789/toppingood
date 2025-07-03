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
  interval = 8000,
}: AnimatedImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!autoPlay) return

    // 最初のズーム開始
    if (imageRef.current) {
      imageRef.current.style.transition = "transform 8000ms linear"
      imageRef.current.style.transform = window.innerWidth >= 768 ? "scale(1.3)" : "scale(1.4)"
    }

    const timer = setInterval(() => {
      if (images.length > 1) {
        // 画像切り替え時：トランジションを無効化
        if (imageRef.current) {
          imageRef.current.style.transition = "none"
          imageRef.current.style.transform = "scale(1)"
        }

        // 次の画像に切り替え
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)

        // 次のフレームでズーム開始
        requestAnimationFrame(() => {
          if (imageRef.current) {
            imageRef.current.style.transition = "transform 8000ms linear"
            imageRef.current.style.transform = window.innerWidth >= 768 ? "scale(1.3)" : "scale(1.4)"
          }
        })
      }
    }, interval)

    return () => clearInterval(timer)
  }, [autoPlay, images.length, interval])

  // 画像が変わった時にズームを再開始
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (imageRef.current) {
        imageRef.current.style.transition = "transform 8000ms linear"
        imageRef.current.style.transform = window.innerWidth >= 768 ? "scale(1.3)" : "scale(1.4)"
      }
    }, 50)

    return () => clearTimeout(timeoutId)
  }, [currentIndex])

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        ref={imageRef}
        src={images[currentIndex] || "/placeholder.svg?height=300&width=300"}
        alt={alt}
        fill
        className="object-cover"
        priority
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        style={{
          transform: "scale(1)",
          transition: "none",
        }}
      />

      {/* 画像インジケーター（複数画像の場合のみ） */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
          {images.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                index === currentIndex ? "bg-white shadow-lg scale-125" : "bg-white bg-opacity-60"
              }`}
            />
          ))}
        </div>
      )}

      {/* グラデーションオーバーレイ */}
      {images.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      )}
    </div>
  )
}
