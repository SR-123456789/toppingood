const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const { OpenAI } = require('openai');
require('dotenv').config();

/**
 * RAG API Server
 * コードベース検索・質問応答・開発支援機能を提供
 */
class RAGServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.ragRoot = path.join(__dirname, '../..');
    this.vectorData = null;
    this.metadata = null;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.static(path.join(this.ragRoot, 'public')));
  }

  setupRoutes() {
    // ヘルスチェック
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // システム情報
    this.app.get('/api/info', async (req, res) => {
      try {
        await this.loadData();
        res.json({
          metadata: this.metadata,
          vectorCount: this.vectorData?.length || 0,
          status: 'ready'
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 🔍 セマンティック検索
    this.app.post('/api/search', async (req, res) => {
      try {
        const { query, topK = 5, fileType = null } = req.body;
        const results = await this.semanticSearch(query, topK, fileType);
        res.json({ results, query, topK });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 💬 質問応答 (RAG)
    this.app.post('/api/chat', async (req, res) => {
      try {
        const { message, context = [] } = req.body;
        const response = await this.chatWithRAG(message, context);
        res.json({ response, timestamp: new Date().toISOString() });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 🛠️ コード分析
    this.app.post('/api/analyze-code', async (req, res) => {
      try {
        const { code, filePath, analysisType = 'general' } = req.body;
        const analysis = await this.analyzeCode(code, filePath, analysisType);
        res.json({ analysis, filePath, analysisType });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 🔨 コード生成
    this.app.post('/api/generate-code', async (req, res) => {
      try {
        const { prompt, language = 'typescript', context = [] } = req.body;
        const code = await this.generateCode(prompt, language, context);
        res.json({ code, prompt, language });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 🐛 バグ検出・修正
    this.app.post('/api/debug-code', async (req, res) => {
      try {
        const { code, error = null, filePath } = req.body;
        const suggestions = await this.debugCode(code, error, filePath);
        res.json({ suggestions, code, error });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 📚 ドキュメント生成
    this.app.post('/api/generate-docs', async (req, res) => {
      try {
        const { code, filePath, docType = 'jsdoc' } = req.body;
        const documentation = await this.generateDocumentation(code, filePath, docType);
        res.json({ documentation, filePath, docType });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // 🧪 テスト生成
    this.app.post('/api/generate-tests', async (req, res) => {
      try {
        const { code, filePath, testFramework = 'jest' } = req.body;
        const tests = await this.generateTests(code, filePath, testFramework);
        res.json({ tests, filePath, testFramework });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  async loadData() {
    if (!this.vectorData || !this.metadata) {
      const vectorPath = path.join(this.ragRoot, 'data', 'vectors', 'embeddings.json');
      const metadataPath = path.join(this.ragRoot, 'data', 'metadata.json');
      
      if (await fs.pathExists(vectorPath)) {
        this.vectorData = await fs.readJson(vectorPath);
      } else {
        throw new Error('ベクターデータが見つかりません。npm run index を実行してください。');
      }
      
      if (await fs.pathExists(metadataPath)) {
        this.metadata = await fs.readJson(metadataPath);
      }
    }
  }

  async semanticSearch(query, topK = 5, fileType = null) {
    await this.loadData();
    
    // クエリの埋め込み生成
    const queryEmbedding = await this.generateQueryEmbedding(query);
    
    // コサイン類似度計算
    let results = this.vectorData.map(item => ({
      ...item,
      similarity: this.cosineSimilarity(queryEmbedding, item.embedding)
    }));

    // ファイルタイプでフィルタ
    if (fileType) {
      results = results.filter(item => item.metadata.type === fileType);
    }

    // 類似度でソート
    results.sort((a, b) => b.similarity - a.similarity);
    
    return results.slice(0, topK);
  }

  async generateQueryEmbedding(query) {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    });
    return response.data[0].embedding;
  }

  cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (normA * normB);
  }

  async chatWithRAG(message, context = []) {
    // 関連コンテキストを検索
    const searchResults = await this.semanticSearch(message, 5);
    const relevantContext = searchResults.map(result => 
      `File: ${result.metadata.filePath}\n${result.content}`
    ).join('\n\n---\n\n');

    const systemPrompt = `あなたはToppifyGOプロジェクトの専門的なアシスタントです。
以下のコードベースコンテキストを参考に、正確で有用な回答を提供してください。

コンテキスト:
${relevantContext}

以前の会話:
${context.map(c => `${c.role}: ${c.content}`).join('\n')}

回答は以下の点を心がけてください:
- 具体的で実用的な内容
- コード例がある場合は適切にフォーマット
- ToppifyGOプロジェクトの構造と規約に従う
- 日本語で回答`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    return response.choices[0].message.content;
  }

  async analyzeCode(code, filePath, analysisType) {
    const prompt = `以下のコードを分析してください:

ファイル: ${filePath}
分析タイプ: ${analysisType}

コード:
\`\`\`
${code}
\`\`\`

以下の観点で分析してください:
- コード品質
- セキュリティ問題
- パフォーマンス
- ベストプラクティス
- 改善提案`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1500
    });

    return response.choices[0].message.content;
  }

  async generateCode(prompt, language, context) {
    const contextStr = context.length > 0 ? 
      `参考コンテキスト:\n${context.join('\n\n')}` : '';

    const fullPrompt = `${language}で以下の要求に従ってコードを生成してください:

${prompt}

${contextStr}

要求:
- 高品質で読みやすいコード
- 適切なコメント付き
- エラーハンドリング
- TypeScript型定義（該当する場合）`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: fullPrompt }],
      temperature: 0.2,
      max_tokens: 2000
    });

    return response.choices[0].message.content;
  }

  async debugCode(code, error, filePath) {
    const prompt = `以下のコードのデバッグを支援してください:

ファイル: ${filePath}
エラー: ${error || '一般的なデバッグ'}

コード:
\`\`\`
${code}
\`\`\`

以下を提供してください:
- 問題の特定
- 修正提案
- 修正されたコード
- 再発防止策`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1500
    });

    return response.choices[0].message.content;
  }

  async generateDocumentation(code, filePath, docType) {
    const prompt = `以下のコードのドキュメントを${docType}形式で生成してください:

ファイル: ${filePath}

コード:
\`\`\`
${code}
\`\`\`

含めるべき内容:
- 関数/クラスの説明
- パラメータ説明
- 戻り値説明
- 使用例
- 注意事項`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1500
    });

    return response.choices[0].message.content;
  }

  async generateTests(code, filePath, testFramework) {
    const prompt = `以下のコードの${testFramework}テストを生成してください:

ファイル: ${filePath}

コード:
\`\`\`
${code}
\`\`\`

テスト要件:
- 単体テスト
- エッジケースのテスト
- エラーケースのテスト
- モック使用（必要に応じて）
- 適切なアサーション`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      max_tokens: 2000
    });

    return response.choices[0].message.content;
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 RAG Server running on http://localhost:${this.port}`);
      console.log(`📚 API Documentation: http://localhost:${this.port}/api/info`);
    });
  }
}

if (require.main === module) {
  const server = new RAGServer();
  server.start();
}

module.exports = { RAGServer };
