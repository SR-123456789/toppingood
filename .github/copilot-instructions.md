# ToppifyGO プロジェクト情報

## プロジェクト概要
ToppifyGOは、美味しい料理の写真にトッピングを追加して共有するSNSアプリです。

## 技術スタック
- **フロントエンド**: Next.js 14, TypeScript, Tailwind CSS
- **バックエンド**: Supabase (Auth, Database, Storage)
- **UI**: shadcn/ui コンポーネント
- **状態管理**: React Hooks
- **認証**: Supabase Auth (Web + Native)
- **データベース**: PostgreSQL (Supabase)

## アーキテクチャ
```
web/
├── app/              # Next.js App Router
├── components/       # React コンポーネント
├── lib/              # ユーティリティ関数
├── hooks/            # カスタムフック
├── styles/           # CSS
└── scripts/          # データベーススクリプト
```

## 重要なファイル
- `web/lib/native-auth.ts` - ネイティブアプリ認証ロジック
- `web/lib/username-generator.ts` - ユーザー名生成ロジック
- `web/components/ui/` - shadcn/ui コンポーネント
- `web/app/api/` - API Routes

## データベーススキーマ
### profiles テーブル
- `id` (UUID) - ユーザーID
- `username` (TEXT) - ユーザー名
- `display_name` (TEXT) - 表示名
- `avatar_url` (TEXT) - アバター画像URL

### posts テーブル
- `id` (UUID) - 投稿ID
- `user_id` (UUID) - 投稿者ID
- `content` (TEXT) - 投稿内容
- `image_url` (TEXT) - 画像URL
- `like_count` (INTEGER) - いいね数
- `mimic_count` (INTEGER) - 真似された数

## 命名規則
- **ファイル名**: kebab-case (`user-profile.tsx`)
- **コンポーネント**: PascalCase (`UserProfile`)
- **関数**: camelCase (`generateUsername`)
- **CSS**: Tailwind classes

## 開発ガイドライン
- TypeScript厳格モード使用
- ESLint + Prettier設定済み
- コンポーネントはdefault export
- API RoutesはNext.js App Router形式
- エラーハンドリング必須

## 特別な要件
- ネイティブアプリとWeb両対応
- ユーザー名は日本語の楽しい名前を自動生成
- 画像アップロード・処理機能
- リアルタイム通知
