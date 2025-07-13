/**
 * ネイティブアプリの触覚フィードバック機能
 */

import { isNativeApp } from '@/lib/platform-utils'

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        hapticFeedback?: {
          postMessage: (message: any) => void
        }
      }
    }
  }
}

export type HapticIntensity = 'light' | 'medium' | 'heavy'

/**
 * 触覚フィードバックを発火する
 * @param intensity フィードバックの強度
 */
export function triggerHapticFeedback(intensity: HapticIntensity = 'medium'): void {
  try {
    // ネイティブアプリでのみ触覚フィードバックを実行
    if (!isNativeApp()) {
      return
    }

    // WebViewのネイティブアプリ内でのみ動作
    if (typeof window !== 'undefined' && window.webkit?.messageHandlers?.hapticFeedback) {
      window.webkit.messageHandlers.hapticFeedback.postMessage(intensity)
    }
  } catch (error) {
    // エラーが発生してもサイレントに処理
    console.debug('Haptic feedback not available:', error)
  }
}
