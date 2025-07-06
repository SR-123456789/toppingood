/**
 * ネイティブアプリの触覚フィードバック機能
 */

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
    // WebViewのネイティブアプリ内でのみ動作
    if (typeof window !== 'undefined' && window.webkit?.messageHandlers?.hapticFeedback) {
      window.webkit.messageHandlers.hapticFeedback.postMessage(intensity)
    }
    // Web版では何もしない（エラーも出さない）
  } catch (error) {
    // エラーが発生してもサイレントに処理
    console.debug('Haptic feedback not available:', error)
  }
}

/**
 * ネイティブアプリかどうかを判定
 */
export function isNativeApp(): boolean {
  try {
    return typeof window !== 'undefined' && 
           !!window.webkit?.messageHandlers?.hapticFeedback
  } catch {
    return false
  }
}

/**
 * User-Agentでネイティブアプリかどうかを判定
 */
export function isNativeAppByUserAgent(): boolean {
  try {
    return typeof window !== 'undefined' && 
           window.navigator.userAgent.includes('ToppifyGO-App iOS')
  } catch {
    return false
  }
}
