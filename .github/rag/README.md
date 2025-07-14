# 🤖 ToppifyGO RAG System

包括的なRetrieval-Augmented Generationシステム for GitHub Copilot

## 🎯 機能

### 1. 📚 コードベース分析RAG
- TypeScript/JavaScript/SQL ファイルの自動インデックス化
- 関数・クラス・コンポーネントの意味検索
- 依存関係とアーキテクチャの理解

### 2. 📖 ドキュメント検索RAG  
- README、コメント、JSDocの検索
- プロジェクト仕様書・設計書の検索
- APIドキュメント生成

### 3. 🛠️ 開発支援RAG
- コード生成・リファクタリング提案
- バグパターン検出・修正提案
- テストケース生成

### 4. 🌐 汎用RAG
- 任意のテキストファイル対応
- マルチモーダル対応（画像・図表）
- 外部ドキュメント統合

## 🏗️ アーキテクチャ

```
RAG Pipeline:
Document Loader → Text Splitter → Embeddings → Vector Store → Retriever → LLM
```

## 🚀 クイックスタート

```bash
cd .github/rag
npm install
python -m pip install -r requirements.txt
npm run setup
npm run index
npm run serve
```

## 📁 ディレクトリ構造

- `src/` - ソースコード
- `data/` - インデックス化されたデータ
- `config/` - 設定ファイル
- `scripts/` - セットアップ・実行スクリプト
- `embeddings/` - 埋め込みベクター保存
- `api/` - REST API サーバー

## 🔧 設定

環境変数 `.env`:
```env
OPENAI_API_KEY=your_key
PINECONE_API_KEY=your_key
SUPABASE_URL=your_url
SUPABASE_KEY=your_key
```

## 📊 対応ファイル形式

- **コード**: `.ts`, `.js`, `.tsx`, `.jsx`, `.sql`, `.py`
- **ドキュメント**: `.md`, `.txt`, `.json`
- **設定**: `.yaml`, `.toml`, `.env`
- **その他**: `.csv`, `.xml`, `.html`
