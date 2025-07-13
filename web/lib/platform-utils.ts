/**
 * プラットフォーム検出ユーティリティ
 */

// ネイティブアプリのUser Agent
const NATIVE_USER_AGENT = 'ToppifyGO-App iOS'

/**
 * 現在のプラットフォームがネイティブアプリかどうかを判定
 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  return window.navigator.userAgent.includes(NATIVE_USER_AGENT)
}

/**
 * 現在のプラットフォームがWebモバイルかどうかを判定
 */
export function isWebMobile(): boolean {
  if (typeof window === 'undefined') return false
  if (isNativeApp()) return false
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    window.navigator.userAgent
  )
}

/**
 * 現在のプラットフォームがWebデスクトップかどうかを判定
 */
export function isWebDesktop(): boolean {
  if (typeof window === 'undefined') return false
  return !isNativeApp() && !isWebMobile()
}

/**
 * プラットフォーム情報を取得
 */
export function getPlatformInfo() {
  return {
    isNative: isNativeApp(),
    isWebMobile: isWebMobile(),
    isWebDesktop: isWebDesktop(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
  }
}

/**
 * プラットフォーム別のスタイリング用クラス名を生成
 */
export function getPlatformClasses(): string {
  const platform = getPlatformInfo()
  
  if (platform.isNative) return 'platform-native'
  if (platform.isWebMobile) return 'platform-web-mobile'
  if (platform.isWebDesktop) return 'platform-web-desktop'
  
  return 'platform-unknown'
}
