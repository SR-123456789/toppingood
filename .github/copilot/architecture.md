# ToppifyGO プロジェクト情報

## プロジェクト概要
ToppifyGOは、美味しい料理の写真にトッピングを追加して共有するSNSアプリです。

## 技術スタック

### Web版
- **フロントエンド**: Next.js 14, TypeScript, Tailwind CSS
- **バックエンド**: Supabase (Auth, Database, Storage)
- **UI**: shadcn/ui コンポーネント
- **状態管理**: React Hooks
- **認証**: Supabase Auth
- **データベース**: PostgreSQL (Supabase)

### Native版 (iOS)
- **フレームワーク**: SwiftUI + WebKit
- **実装方式**: WebViewベースのハイブリッドアプリ
- **User-Agent**: `ToppifyGO-App iOS` でWeb版と区別
- **JavaScript連携**: WKScriptMessageHandler使用
- **ハプティックフィードバック**: `hapticFeedback`メッセージで実装
- **WebView設定**: ズーム無効化、進捗監視

## ハプティックフィードバック実装

JavaScript側から呼び出し:
```javascript
// ハプティックフィードバックをトリガー
window.webkit.messageHandlers.hapticFeedback.postMessage({});
```

Hook として:
```typescript
import { useCallback } from 'react';

export const useHaptic = () => {
  const triggerFeedback = useCallback(() => {
    if (window.webkit?.messageHandlers?.hapticFeedback) {
      window.webkit.messageHandlers.hapticFeedback.postMessage({});
    }
  }, []);

  return { triggerFeedback };
};
```

## アーキテクチャ

```
ToppifyGO アーキテクチャ概要
=======================================

Frontend (Next.js 14)
┌─────────────────────────────────────┐
│ web/app/                            │
│ ├── (routes)/                       │
│ │   ├── page.tsx         # ホーム    │
│ │   ├── create/          # 投稿作成  │
│ │   ├── profile/         # プロフィール│
│ │   └── my-toppings/     # マイ投稿  │
│ ├── api/                            │
│ │   ├── native-auth/     # ネイティブ認証│
│ │   └── create-profile/  # プロフィール作成│
│ └── globals.css                     │
└─────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ Components Layer                    │
│ ├── ui/ (shadcn/ui)                │
│ │   ├── button.tsx                  │
│ │   ├── card.tsx                    │
│ │   ├── post-card.tsx              │
│ │   └── post-list.tsx              │
│ ├── auth/                          │
│ │   ├── auth-form.tsx              │
│ │   └── login-dialog.tsx           │
│ └── containers/                    │
│     └── home-container.tsx         │
└─────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ Business Logic Layer               │
│ ├── lib/                           │
│ │   ├── native-auth.ts    # ネイティブ認証│
│ │   ├── username-generator.ts # ユーザー名│
│ │   ├── platform-utils.ts  # プラットフォーム│
│ │   └── supabase/          # DB接続│
│ └── hooks/                         │
│     ├── use-mobile.tsx             │
│     └── use-toast.ts               │
└─────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────┐
│ Supabase Backend                   │
│ ├── Auth                           │
│ │   ├── Web Auth                   │
│ │   └── Native Auto Account        │
│ ├── Database (PostgreSQL)          │
│ │   ├── profiles                   │
│ │   ├── posts                      │
│ │   ├── likes                      │
│ │   └── mimics                     │
│ ├── Storage                        │
│ │   └── post-images/               │
│ └── Functions/Triggers             │
│     └── handle_new_user()          │
└─────────────────────────────────────┘

データフロー例：投稿作成
========================

User Input → Create Page → API Route → Supabase
    │             │           │           │
    │             │           │           ▼
    │             │           │       ┌─────────┐
    │             │           │       │Database │
    │             │           │       │ posts   │
    │             │           │       └─────────┘
    │             │           │           │
    │             │           ▼           ▼
    │             │       ┌─────────┐ ┌─────────┐
    │             │       │Storage  │ │Realtime │
    │             │       │ images  │ │Updates  │
    │             │       └─────────┘ └─────────┘
    │             │                       │
    │             ▼                       │
    │       ┌─────────────┐               │
    │       │UI Update    │ ◀─────────────┘
    │       │Post List    │
    │       └─────────────┘
    │             │
    └─────────────┘

認証フロー差異
============

Web版:
User → Auth Form → Supabase Auth → DB Trigger → Profile Created

Native版:  
App Start → Auto Account Creation → Username Generation → 
Supabase Auth → DB Trigger → Profile Created → Auto Login
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
- WebViewベースのハイブリッドアプリ
- ユーザー名は日本語の楽しい名前を自動生成
- 画像アップロード・処理機能
- リアルタイム通知
- ネイティブ版とWeb版でのUI/UX差別化
