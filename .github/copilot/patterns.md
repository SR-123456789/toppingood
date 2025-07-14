# ToppifyGO コード規約・パターン集

GitHub Copilotが参照するプロジェクト固有のコーディング規約とパターンです。

## TypeScript/React パターン

### 1. コンポーネント定義
```typescript
// 推奨パターン
interface ComponentProps {
  title: string
  isVisible?: boolean
}

export default function Component({ title, isVisible = false }: ComponentProps) {
  return (
    <div className="flex items-center justify-center">
      {isVisible && <h1 className="text-2xl font-bold">{title}</h1>}
    </div>
  )
}
```

### 2. APIルート定義
```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data } = await request.json()
    
    // 処理ロジック
    
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### 3. カスタムフック
```typescript
// hooks/use-example.ts
import { useState, useEffect } from 'react'

export function useExample(initialValue: string) {
  const [value, setValue] = useState(initialValue)
  
  useEffect(() => {
    // 副作用処理
  }, [])
  
  return { value, setValue }
}
```

## Supabase パターン

### 1. データ取得
```typescript
const { data, error } = await supabase
  .from('posts')
  .select('*, profiles(username, display_name)')
  .order('created_at', { ascending: false })
  .limit(10)

if (error) {
  console.error('Supabase error:', error)
  return
}
```

### 2. 認証チェック
```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

## スタイリング規約

### 1. Tailwind CSS
```typescript
// 推奨クラス組み合わせ
className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border"

// レスポンシブ対応
className="w-full sm:w-auto md:max-w-md lg:max-w-lg"

// ダークモード対応
className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
```

### 2. shadcn/ui コンポーネント使用
```typescript
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>タイトル</CardTitle>
  </CardHeader>
  <CardContent>
    <Button variant="default" size="lg">
      ボタン
    </Button>
  </CardContent>
</Card>
```

## コメント規約

### 1. 関数コメント
```typescript
/**
 * ユーザー名を自動生成する関数だグッド！
 * @param checkExistence 重複チェック関数
 * @returns 生成されたユニークなユーザー名
 */
async function generateUniqueUsername(checkExistence: Function): Promise<string> {
  // ランダムな組み合わせでユーザー名を作るグッド！
  const username = generateUsername()
  
  // 重複チェックして安全に生成するグッド！
  const exists = await checkExistence(username)
  
  return exists ? `${username}${Date.now()}` : username
}
```

### 2. インライン・説明コメント
```typescript
// APIのレスポンスデータを格納するグッド！
const responseData = await fetch('/api/posts')

// ユーザーが認証済みかチェックするグッド！ 
if (!user) {
  return { error: 'Unauthorized' }
}

// TODO: エラーハンドリングを改善するグッド！
// FIXME: パフォーマンス問題を修正するグッド！
```

### 3. JSDocコメント
```typescript
/**
 * 投稿を作成するコンポーネントだグッド！
 * @param props - コンポーネントのプロパティ
 * @param props.onSubmit - 投稿送信時のコールバック
 * @returns JSX要素
 */
interface CreatePostProps {
  onSubmit: (post: Post) => void
}
```

## エラーハンドリング

### 1. try-catch パターン
```typescript
try {
  const result = await riskyOperation()
  return { success: true, data: result }
} catch (error) {
  console.error('Operation failed:', error)
  return { success: false, error: error.message }
}
```

### 2. ユーザーフレンドリーなエラー
```typescript
// 日本語エラーメッセージ
const errorMessages = {
  INVALID_CREDENTIALS: 'ユーザー名またはパスワードが正しくありません',
  NETWORK_ERROR: 'ネットワークエラーが発生しました',
  SERVER_ERROR: 'サーバーエラーが発生しました'
}
```

## 命名規則

### 1. ファイル名
- コンポーネント: `user-profile.tsx`
- ユーティリティ: `date-utils.ts`
- API Routes: `route.ts`
- カスタムフック: `use-mobile.ts`

### 2. 変数・関数名
```typescript
// 変数: camelCase
const userProfile = {}
const isVisible = true

// 関数: camelCase
function generateUsername() {}
async function fetchUserData() {}

// コンポーネント: PascalCase
function UserProfile() {}
const PostCard = () => {}

// 定数: UPPER_SNAKE_CASE
const API_BASE_URL = ''
const MAX_FILE_SIZE = 1024 * 1024
```

## データベース操作

### 1. プロフィール作成
```typescript
const { error } = await supabase
  .from('profiles')
  .insert({
    id: user.id,
    username: generatedUsername,
    display_name: generatedDisplayName,
    avatar_url: ''
  })
```

### 2. 投稿作成
```typescript
const { data, error } = await supabase
  .from('posts')
  .insert({
    user_id: user.id,
    content: postContent,
    image_url: imageUrl
  })
  .select()
  .single()
```

## ネイティブアプリ対応

### 1. プラットフォーム判定
```typescript
import { isNativeApp } from '@/lib/platform-utils'

if (isNativeApp()) {
  // ネイティブアプリ固有の処理
}
```

### 2. 認証フロー
```typescript
// Web: 通常のSupabase Auth
// Native: createAutoAccountAndLogin()を使用
```
