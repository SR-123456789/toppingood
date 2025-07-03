"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // エラーをログに記録
    console.error("App Error:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-orange-600 mb-4">ToppinGOOD</h1>
        <p className="text-gray-600 mb-4">エラーが発生しました</p>
        <p className="text-sm text-gray-500 mb-6">
          ページの読み込み中に問題が発生しました。
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 mr-2"
        >
          再試行
        </button>
        <button
          onClick={() => window.location.href = "/"}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          ホームに戻る
        </button>
      </div>
    </div>
  )
}
