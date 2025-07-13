/**
 * ネイティブアプリ専用の自動アカウント作成ユーティリティ
 * Admin APIはバックエンド（API Routes）で実行される
 */

import { createClient } from '@supabase/supabase-js'
import { generateUniqueUsername, generateDisplayName } from '@/lib/username-generator'
import { isNativeApp } from '@/lib/platform-utils'

interface NativeAccountInfo {
  email: string
  password: string
  userId?: string
  created: boolean
}

const NATIVE_ACCOUNT_STORAGE_KEY = 'toppifygo_native_account'

// createClientを関数内で遅延初期化する
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    console.error('Supabase環境変数が設定されていません:', { url: !!url, key: !!key })
    throw new Error('Supabase環境変数が設定されていません')
  }
  
  return createClient(url, key)
}

/**
 * ローカルストレージからネイティブアカウント情報を取得
 */
function getNativeAccountFromStorage(): NativeAccountInfo | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(NATIVE_ACCOUNT_STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored)
  } catch (error) {
    console.error('ネイティブアカウント情報の取得に失敗:', error)
    return null
  }
}

/**
 * ローカルストレージにネイティブアカウント情報を保存
 */
function saveNativeAccountToStorage(accountInfo: NativeAccountInfo): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(NATIVE_ACCOUNT_STORAGE_KEY, JSON.stringify(accountInfo))
  } catch (error) {
    console.error('ネイティブアカウント情報の保存に失敗:', error)
  }
}

/**
 * バックエンドAPI経由でネイティブアカウントを作成
 */
async function createNativeAccountViaAPI(): Promise<{ email: string; password: string; user: any } | null> {
  try {
    const response = await fetch('/api/native-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'アカウント作成に失敗しました')
    }

    const data = await response.json()
    console.log('Native account created via API:', data.user?.id)
    return data
  } catch (error) {
    console.error('API経由でのアカウント作成に失敗:', error)
    return null
  }
}

/**
 * ネイティブアプリ用のアカウントを自動作成または取得
 */
export async function ensureNativeAccount(): Promise<NativeAccountInfo | null> {
  // ネイティブアプリでない場合は何もしない
  if (!isNativeApp()) {
    return null
  }

  // 既存のアカウント情報をチェック
  let accountInfo = getNativeAccountFromStorage()
  
  if (accountInfo?.created) {
    return accountInfo
  }

  try {
    // バックエンドAPI経由でアカウント作成
    const apiResult = await createNativeAccountViaAPI()
    if (!apiResult) {
      return null
    }

    // API Route経由でプロフィール作成
    try {
      const profileResponse = await fetch('/api/create-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: apiResult.user.id })
      })

      const profileData = await profileResponse.json()
      
      if (!profileResponse.ok) {
        localStorage.setItem('toppifygo_profile_error', JSON.stringify({
          status: profileResponse.status,
          statusText: profileResponse.statusText,
          data: profileData,
          userId: apiResult.user.id
        }))
      } else {
        localStorage.setItem('toppifygo_profile_success', JSON.stringify({
          status: profileResponse.status,
          data: profileData,
          userId: apiResult.user.id
        }))
      }
    } catch (profileError) {
      localStorage.setItem('toppifygo_profile_error', JSON.stringify({
        error: 'Network or parsing error',
        details: profileError,
        userId: apiResult.user.id
      }))
    }

    // アカウント情報を保存
    accountInfo = {
      email: apiResult.email,
      password: apiResult.password,
      userId: apiResult.user.id,
      created: true
    }
    
    saveNativeAccountToStorage(accountInfo)
    return accountInfo

  } catch (error) {
    // エラー情報をローカルストレージに保存
    localStorage.setItem('toppifygo_account_error', JSON.stringify(error))
    return null
  }
}

/**
 * ネイティブアプリでの自動ログイン
 */
export async function autoSignInNative(): Promise<{ success: boolean; error?: string; details?: any }> {
  if (!isNativeApp()) {
    return { success: false, error: 'Not a native app' }
  }

  try {
    const accountInfo = await ensureNativeAccount()
    
    if (!accountInfo?.created) {
      return { success: false, error: 'No valid account info found', details: accountInfo }
    }

    if (!accountInfo.email || !accountInfo.password) {
      return { success: false, error: 'Invalid credentials in account info', details: accountInfo }
    }

    const supabase = getSupabaseClient()
    
    // まず現在のセッション状態を確認
    const { data: currentSession } = await supabase.auth.getSession()
    if (currentSession.session) {
      // 既にログイン済み
      localStorage.setItem('toppifygo_login_info', JSON.stringify({
        type: 'already_logged_in',
        userId: currentSession.session.user?.id,
        email: currentSession.session.user?.email,
        timestamp: new Date().toISOString()
      }))
      return { success: true }
    }

    // ログイン試行
    localStorage.setItem('toppifygo_login_attempt', JSON.stringify({
      email: accountInfo.email,
      timestamp: new Date().toISOString()
    }))

    return { success: true }
  } catch (error: any) {
    localStorage.setItem('toppifygo_auto_login_error', JSON.stringify({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }))
    return { success: false, error: error.message || 'Unknown error', details: error }
  }
}

/**
 * 保存されたネイティブアカウントでログイン
 */
export async function signInWithNativeAccount(): Promise<any> {
  const accountInfo = getNativeAccountFromStorage()
  if (!accountInfo) {
    throw new Error('保存されたアカウント情報がありません')
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: accountInfo.email,
    password: accountInfo.password,
  })

  if (error) {
    throw error
  }

  return data
}

/**
 * ネイティブアカウント情報をクリア（デバッグ用）
 */
export function clearNativeAccount(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(NATIVE_ACCOUNT_STORAGE_KEY)
    console.log('ネイティブアカウント情報をクリアしました')
  } catch (error) {
    console.error('ネイティブアカウント情報のクリアに失敗:', error)
  }
}

/**
 * ネイティブアカウント情報の存在確認
 */
export function hasNativeCredentials(): boolean {
  return getNativeAccountFromStorage() !== null
}

/**
 * デバッグ情報を取得（ネイティブアプリでエラー確認用）
 */
export function getDebugInfo(): {
  isNative: boolean;
  hasCredentials: boolean;
  accountError?: any;
  profileError?: any;
  profileSuccess?: any;
  sessionSuccess?: any;
  loginAttempt?: any;
  loginError?: any;
  sessionError?: any;
  autoLoginError?: any;
  loginInfo?: any;
  credentials?: any;
} {
  const isNative = isNativeApp()
  const hasCredentials = hasNativeCredentials()
  
  let accountError, profileError, profileSuccess, sessionSuccess, 
      loginAttempt, loginError, sessionError, autoLoginError, loginInfo, credentials
  
  try {
    const accountErrorStr = localStorage.getItem('toppifygo_account_error')
    if (accountErrorStr) accountError = JSON.parse(accountErrorStr)
    
    const profileErrorStr = localStorage.getItem('toppifygo_profile_error')
    if (profileErrorStr) profileError = JSON.parse(profileErrorStr)
    
    const profileSuccessStr = localStorage.getItem('toppifygo_profile_success')
    if (profileSuccessStr) profileSuccess = JSON.parse(profileSuccessStr)
    
    const sessionSuccessStr = localStorage.getItem('toppifygo_session_success')
    if (sessionSuccessStr) sessionSuccess = JSON.parse(sessionSuccessStr)

    const loginAttemptStr = localStorage.getItem('toppifygo_login_attempt')
    if (loginAttemptStr) loginAttempt = JSON.parse(loginAttemptStr)

    const loginErrorStr = localStorage.getItem('toppifygo_login_error')
    if (loginErrorStr) loginError = JSON.parse(loginErrorStr)

    const sessionErrorStr = localStorage.getItem('toppifygo_session_error')
    if (sessionErrorStr) sessionError = JSON.parse(sessionErrorStr)

    const autoLoginErrorStr = localStorage.getItem('toppifygo_auto_login_error')
    if (autoLoginErrorStr) autoLoginError = JSON.parse(autoLoginErrorStr)

    const loginInfoStr = localStorage.getItem('toppifygo_login_info')
    if (loginInfoStr) loginInfo = JSON.parse(loginInfoStr)
    
    if (hasCredentials) {
      credentials = getNativeAccountFromStorage()
    }
  } catch (e) {
    // ignore
  }
  
  return {
    isNative,
    hasCredentials,
    accountError,
    profileError,
    profileSuccess,
    sessionSuccess,
    loginAttempt,
    loginError,
    sessionError,
    autoLoginError,
    loginInfo,
    credentials
  }
}

/**
 * プロフィール作成をテストする関数（デバッグ用）
 */
export async function testCreateProfile(): Promise<any> {
  if (!isNativeApp()) {
    return { error: 'Not a native app' }
  }

  const accountInfo = getNativeAccountFromStorage()
  if (!accountInfo?.userId) {
    return { error: 'No user ID found' }
  }

  try {
    const response = await fetch('/api/create-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId: accountInfo.userId })
    })

    const data = await response.json()
    
    return {
      status: response.status,
      statusText: response.statusText,
      data
    }
  } catch (error) {
    return { error: 'Network error', details: error }
  }
}

/**
 * ランダムな認証情報を生成
 */
function generateRandomCredentials() {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8) // 6文字に制限
  
  return {
    email: `user${timestamp}${randomId}@auth.toppifygo.prep-an.com`, // より標準的なメール形式
    password: `Pass${timestamp}${randomId}!` // より簡潔なパスワード
  }
}

/**
 * ネイティブアプリ用の自動アカウント作成 + 自動ログイン
 */
export async function createAutoAccountAndLogin(): Promise<{ success: boolean; user?: any }> {
  if (!isNativeApp()) {
    console.log('❌ ネイティブアプリではありません')
    return { success: false }
  }

  // 既に認証情報があるかチェック
  const existingAuth = getNativeAccountFromStorage()
  if (existingAuth?.created) {
    console.log('⚠️ 既に認証情報が存在します')
    return { success: false }
  }

  const supabase = getSupabaseClient()

  try {
    console.log('🤖 自動アカウント作成を開始...')
    
    const credentials = generateRandomCredentials()
    console.log('📧 生成された認証情報:', credentials.email)
    
    // 1. アカウント作成
    console.log('📝 アカウント作成中...')
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          auto_generated: true,
          created_at: new Date().toISOString()
        }
      }
    })

    if (signUpError) {
      console.error('❌ 自動アカウント作成失敗:', signUpError.message)
      return { success: false }
    }

    console.log('✅ アカウント作成成功')

    // 2. 1.5秒後にログイン
    console.log('🔐 新しいアカウントでログイン中...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    })

    if (signInError) {
      console.error('❌ 自動ログイン失敗:', signInError.message)
      return { success: false }
    }

    if (signInData.user) {
      // 3. 認証情報をlocalStorageに保存
      console.log('💾 認証情報をlocalStorageに保存中...')
      const accountInfo: NativeAccountInfo = {
        email: credentials.email,
        password: credentials.password,
        userId: signInData.user.id,
        created: true
      }
      saveNativeAccountToStorage(accountInfo)
      
      // 4. セッション状態を確実にするため再度確認
      console.log('🔍 セッション状態確認中...')
      const { data: sessionCheck, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !sessionCheck.session) {
        console.log('⚠️ セッション確認でエラー、HomeContainer側でリロードされます')
      } else {
        console.log('✅ セッション確認完了')
      }
      
      console.log('🚀 自動アカウント作成とログイン完了:', signInData.user.email)
      
      return { success: true, user: signInData.user }
    }

    console.log('❌ ログイン成功したがユーザーデータがありません')
    return { success: false }
  } catch (error) {
    console.error('💥 自動アカウント作成エラー:', error)
    return { success: false }
  }
}
