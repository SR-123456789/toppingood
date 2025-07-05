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
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // 画像配列を準備（1枚の場合は同じ画像を複製）
  const imageArray = images.length > 0 ? images : ["/placeholder.svg?height=300&width=300"]
  const displayImages = imageArray.length === 1 ? [imageArray[0], imageArray[0]] : imageArray

  // 画像切り替え処理
  const switchToNext = () => {
    if (showNext) return // 既にアニメーション中の場合は無視
    
    const next = (currentIndex + 1) % displayImages.length
    setNextIndex(next)
    setShowNext(true)
    
    // 500ms後にインデックス更新、次の画像を隠す
    timeoutRef.current = setTimeout(() => {
      setCurrentIndex(next)
      setShowNext(false)
    }, 500)
  }

  // 前の画像への切り替え処理
  const switchToPrevious = () => {
    if (showNext) return // 既にアニメーション中の場合は無視
    
    const prev = (currentIndex - 1 + displayImages.length) % displayImages.length
    setNextIndex(prev)
    setShowNext(true)
    
    // 500ms後にインデックス更新、次の画像を隠す
    timeoutRef.current = setTimeout(() => {
      setCurrentIndex(prev)
      setShowNext(false)
    }, 500)
  }

  // 手動切り替え（タイマーをリセット）
  const handleManualSwitch = (direction: 'next' | 'prev') => {
    // 既存のタイマーをクリア
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    
    // 手動切り替え実行
    if (direction === 'next') {
      switchToNext()
    } else {
      switchToPrevious()
    }
    
    // 自動再生が有効な場合は新しいタイマーを開始
    if (autoPlay) {
      setTimeout(() => {
        intervalRef.current = setInterval(switchToNext, interval)
      }, 500) // アニメーション完了後に再開
    }
  }

  useEffect(() => {
    if (!autoPlay) return

    intervalRef.current = setInterval(switchToNext, interval)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

      {/* 左右の切り替えボタン（複数画像の場合のみ） */}
      {imageArray.length > 1 && (
        <>
          {/* 左ボタン（前の画像） */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleManualSwitch('prev')
            }}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200 hover:scale-110"
            aria-label="前の画像"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15,18 9,12 15,6"></polyline>
            </svg>
          </button>

          {/* 右ボタン（次の画像） */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleManualSwitch('next')
            }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-all duration-200 hover:scale-110"
            aria-label="次の画像"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,18 15,12 9,6"></polyline>
            </svg>
          </button>
        </>
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
