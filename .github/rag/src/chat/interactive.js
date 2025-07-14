const readline = require('readline');
const { OpenAI } = require('openai');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

/**
 * インタラクティブなRAGチャットインターフェース
 */
class InteractiveRAGChat {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.ragRoot = path.join(__dirname, '../..');
    this.vectorData = null;
    this.metadata = null;
    this.conversationHistory = [];
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🤖 ToppifyGO RAG> '
    });
  }

  async init() {
    console.log('🚀 ToppifyGO RAG Chat System');
    console.log('============================');
    
    try {
      // ベクターデータの存在確認
      const vectorPath = path.join(this.ragRoot, 'data', 'vectors', 'embeddings.json');
      const hasVectorData = await fs.pathExists(vectorPath);
      
      if (!hasVectorData) {
        console.log('📚 初回起動: コードベースをインデックス化します...');
        await this.autoIndex();
      }
      
      await this.loadData();
      console.log(`📚 ${this.vectorData.length}個のコードチャンクが利用可能`);
      console.log('💡 質問を入力してください（:help でヘルプ、:quit で終了）');
      console.log('');
      
      this.startChat();
    } catch (error) {
      console.error('❌ 初期化エラー:', error.message);
      console.log('💡 手動で npm run index を実行してください');
      process.exit(1);
    }
  }

  async loadData() {
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

  async autoIndex() {
    console.log('🔄 自動インデックス化を開始...');
    
    try {
      // CodebaseIndexerを動的にインポート
      const { CodebaseIndexer } = require('../../scripts/index-codebase.js');
      const indexer = new CodebaseIndexer();
      
      await indexer.indexCodebase();
      console.log('✅ 自動インデックス化完了！');
      
    } catch (error) {
      console.error('❌ 自動インデックス化失敗:', error.message);
      throw error;
    }
  }

  startChat() {
    this.rl.prompt();
    
    this.rl.on('line', async (input) => {
      const trimmed = input.trim();
      
      if (trimmed === ':quit' || trimmed === ':exit') {
        console.log('👋 さようなら！');
        this.rl.close();
        return;
      }
      
      if (trimmed === ':help') {
        this.showHelp();
        this.rl.prompt();
        return;
      }
      
      if (trimmed === ':stats') {
        this.showStats();
        this.rl.prompt();
        return;
      }
      
      if (trimmed === ':clear') {
        this.conversationHistory = [];
        console.log('🗑️ 会話履歴をクリアしました');
        this.rl.prompt();
        return;
      }
      
      if (trimmed.startsWith(':search ')) {
        const query = trimmed.substring(8);
        await this.performSearch(query);
        this.rl.prompt();
        return;
      }
      
      if (trimmed.startsWith(':analyze ')) {
        const filePath = trimmed.substring(9);
        await this.analyzeFile(filePath);
        this.rl.prompt();
        return;
      }
      
      if (trimmed === ':reindex') {
        console.log('🔄 コードベースを再インデックス化します...');
        await this.autoIndex();
        await this.loadData();
        console.log('✅ 再インデックス化完了！');
        this.rl.prompt();
        return;
      }
      
      if (trimmed === '') {
        this.rl.prompt();
        return;
      }
      
      // 通常の質問処理
      await this.handleQuestion(trimmed);
      this.rl.prompt();
    });
    
    this.rl.on('close', () => {
      process.exit(0);
    });
  }

  showHelp() {
    console.log(`
📖 ToppifyGO RAG Chat ヘルプ

基本コマンド:
  :help               このヘルプを表示
  :quit, :exit        チャットを終了
  :clear              会話履歴をクリア
  :stats              システム統計を表示

検索・分析コマンド:
  :search <クエリ>     セマンティック検索を実行
  :analyze <ファイル>   特定ファイルを分析
  :reindex            コードベースを再インデックス化

質問例:
  • "認証システムはどう実装されていますか？"
  • "ユーザー名生成のロジックを教えて"
  • "データベーススキーマを説明して"
  • "バグを修正するにはどうすればいい？"
  • "テストケースを生成して"

特徴:
  ✅ コードベース全体から関連情報を検索
  ✅ 文脈を理解した回答
  ✅ コード生成・分析・デバッグ支援
  ✅ 日本語対応
`);
  }

  showStats() {
    if (this.metadata) {
      console.log(`
📊 システム統計

インデックス情報:
  • 最終更新: ${new Date(this.metadata.indexedAt).toLocaleString('ja-JP')}
  • ファイル数: ${this.metadata.totalFiles}
  • チャンク数: ${this.metadata.totalChunks}
  • 会話履歴: ${this.conversationHistory.length}

ファイルタイプ別:
${Object.entries(this.metadata.fileTypes || {})
  .map(([type, count]) => `  • ${type}: ${count}個`)
  .join('\n')}
`);
    } else {
      console.log('📊 統計情報が利用できません');
    }
  }

  async performSearch(query) {
    console.log(`🔍 検索中: "${query}"`);
    
    try {
      const results = await this.semanticSearch(query, 5);
      console.log(`\n📝 検索結果 (${results.length}件):`);
      
      results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.metadata.filePath} (類似度: ${(result.similarity * 100).toFixed(1)}%)`);
        console.log(`   タイプ: ${result.metadata.type}`);
        console.log(`   内容: ${result.content.substring(0, 200)}...`);
      });
    } catch (error) {
      console.error('❌ 検索エラー:', error.message);
    }
  }

  async analyzeFile(filePath) {
    console.log(`🔍 ファイル分析: ${filePath}`);
    
    try {
      const matchingChunks = this.vectorData.filter(item => 
        item.metadata.filePath.includes(filePath)
      );
      
      if (matchingChunks.length === 0) {
        console.log('❌ ファイルが見つかりません');
        return;
      }
      
      console.log(`\n📝 ${filePath} の分析:`);
      console.log(`   チャンク数: ${matchingChunks.length}`);
      console.log(`   ファイルタイプ: ${matchingChunks[0].metadata.type}`);
      
      // ファイル全体のコンテンツを結合
      const fullContent = matchingChunks
        .map(chunk => chunk.content)
        .join('\n');
      
      // AIによる分析
      const analysis = await this.analyzeCode(fullContent, filePath);
      console.log(`\n🤖 AI分析結果:\n${analysis}`);
      
    } catch (error) {
      console.error('❌ 分析エラー:', error.message);
    }
  }

  async handleQuestion(question) {
    console.log('🤔 考え中...');
    
    try {
      // 関連コンテキストを検索
      const searchResults = await this.semanticSearch(question, 5);
      
      // 回答生成
      const response = await this.generateResponse(question, searchResults);
      
      // 会話履歴に追加
      this.conversationHistory.push(
        { role: 'user', content: question },
        { role: 'assistant', content: response }
      );
      
      // 回答表示
      console.log(`\n🤖 回答:\n${response}\n`);
      
      // 参考ファイル表示
      if (searchResults.length > 0) {
        console.log('📚 参考ファイル:');
        searchResults.forEach((result, index) => {
          console.log(`   ${index + 1}. ${result.metadata.filePath} (${(result.similarity * 100).toFixed(1)}%)`);
        });
        console.log('');
      }
      
    } catch (error) {
      console.error('❌ 質問処理エラー:', error.message);
    }
  }

  async semanticSearch(query, topK = 5) {
    // クエリの埋め込み生成
    const queryEmbedding = await this.generateQueryEmbedding(query);
    
    // コサイン類似度計算
    const results = this.vectorData.map(item => ({
      ...item,
      similarity: this.cosineSimilarity(queryEmbedding, item.embedding)
    }));

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

  async generateResponse(question, searchResults) {
    const relevantContext = searchResults.map(result => 
      `ファイル: ${result.metadata.filePath}\n${result.content}`
    ).join('\n\n---\n\n');

    const recentHistory = this.conversationHistory.slice(-6); // 最近の3往復

    const systemPrompt = `あなたはToppifyGOプロジェクトの専門的なアシスタントです。
以下のコードベースコンテキストを参考に、正確で有用な回答を提供してください。

コードベースコンテキスト:
${relevantContext}

会話履歴:
${recentHistory.map(h => `${h.role}: ${h.content}`).join('\n')}

回答ガイドライン:
- 具体的で実用的な内容を提供
- コード例は適切にフォーマット
- ToppifyGOプロジェクトの構造と規約に従う
- 不明な点は素直に「分からない」と回答
- 日本語で分かりやすく説明`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    return response.choices[0].message.content;
  }

  async analyzeCode(code, filePath) {
    const prompt = `以下のコードファイルを分析してください:

ファイル: ${filePath}

コード:
\`\`\`
${code.substring(0, 3000)}${code.length > 3000 ? '\n...(省略)' : ''}
\`\`\`

以下の観点で分析してください:
- ファイルの目的と機能
- 主要なクラス・関数
- 依存関係
- 改善点やリスクがあれば指摘`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1000
    });

    return response.choices[0].message.content;
  }
}

async function main() {
  const chat = new InteractiveRAGChat();
  await chat.init();
}

if (require.main === module) {
  main();
}

module.exports = { InteractiveRAGChat };
