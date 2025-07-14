# ToppifyGO 開発コンテキスト

GitHub Copilotがより良いコード提案をするためのプロジェクト固有情報です。
語尾にグッド！をつけてください

## 現在の開発状況

### 🚧 進行中のタスク
- ネイティブアプリの認証フロー改善
- ユーザー名自動生成機能の統合
- データベーストリガーの最適化

### ✅ 完了済み機能
- 基本的なSNS機能（投稿・いいね・真似機能）
- Web認証システム
- shadcn/ui ベースのUI
- ネイティブアプリ自動アカウント作成

### 📝 技術的負債・課題
- ログイン周りはデリケートな状態（変更時要注意）
- ネイティブとWebで認証フローが異なる
- ユーザー名生成ロジックの一元化が必要

## 重要な関数・コンポーネント

### 認証関連
```typescript
// web/lib/native-auth.ts
- createAutoAccountAndLogin() // ネイティブ用自動アカウント作成
- ensureNativeAccount() // ネイティブアカウント確保
- autoSignInNative() // 自動ログイン

// web/lib/username-generator.ts  
- generateUniqueUsername() // ユニークユーザー名生成
- generateDisplayName() // 表示名生成
```

### UI コンポーネント
```typescript
// web/components/ui/
- post-card.tsx // 投稿カード
- post-list.tsx // 投稿一覧
- mobile-header.tsx // モバイルヘッダー
- footer-navigation.tsx // フッターナビ
```

### API Routes
```typescript
// web/app/api/
- native-auth/route.ts // ネイティブ認証API
- create-profile/route.ts // プロフィール作成API
```

## データフロー

### 1. ユーザー登録（Web）
```
1. ユーザーがサインアップ
2. generateUniqueUsername()でユーザー名生成
3. Supabase Auth に options.data でユーザー名を送信
4. handle_new_user() トリガーでprofilesテーブルに保存
```

### 2. ユーザー登録（Native）
```
1. createAutoAccountAndLogin()実行
2. generateUniqueUsername()でユーザー名生成  
3. Supabase Auth にuser_metadataでユーザー名を送信
4. handle_new_user() トリガーでprofilesテーブルに保存
5. 自動ログイン実行
```

### 3. 投稿作成フロー
```
1. ユーザーが画像・テキスト入力
2. 画像をSupabase Storageにアップロード
3. postsテーブルに投稿データ保存
4. リアルタイムでUIに反映
```

## プロジェクト固有の用語

### ドメイン用語
- **トッピング**: 料理写真に追加する要素
- **真似**: 他の投稿を参考にした投稿
- **マイトッピング**: 自分の投稿一覧

### 技術用語
- **ネイティブアプリ**: iOS/Androidアプリ
- **Web版**: ブラウザ版アプリ
- **自動アカウント**: ネイティブアプリでの自動生成アカウント

## 開発時の注意点

### ⚠️ 重要な制約
1. **ログイン機能は変更注意**: 既存の動作を壊さないよう慎重に
2. **ネイティブ/Web両対応**: 機能追加時は両プラットフォーム考慮
3. **日本語対応**: ユーザー向けメッセージは日本語で
4. **TypeScript厳格**: 型定義は必須

### 🎯 コーディング方針
1. **エラーハンドリング**: 必ず適切なエラー処理を実装
2. **レスポンシブ対応**: モバイルファーストで設計
3. **アクセシビリティ**: aria属性やセマンティックHTMLを使用
4. **パフォーマンス**: 画像最適化・遅延読み込み考慮

### 📝 コメント・文体ルール
- **すべてのコメントや説明文の語尾に「グッド！」をつける**
- **関数の説明**: `// ユーザー名を生成する関数だグッド！`
- **変数の説明**: `// APIのレスポンスデータを格納するグッド！`
- **TODO コメント**: `// TODO: エラーハンドリングを追加するグッド！`

## 外部サービス設定

### Supabase
- Auth: ユーザー認証
- Database: PostgreSQL
- Storage: 画像ファイル保存
- Realtime: リアルタイム通知

### 環境変数
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY= (APIルートのみ)
```

## よく使用するスニペット

### Supabaseクライアント作成
```typescript
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
```

### 認証状態チェック
```typescript
const { data: { user } } = await supabase.auth.getUser()
if (!user) return // 未認証時の処理
```

### エラートースト表示
```typescript
import { toast } from 'sonner'
toast.error('エラーメッセージ')
toast.success('成功メッセージ')
```
