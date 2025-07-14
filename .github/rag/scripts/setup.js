const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

/**
 * RAGシステムのセットアップスクリプト
 */
async function setup() {
  console.log('🚀 ToppifyGO RAGシステムをセットアップ中...');

  try {
    // 必要なディレクトリを作成
    const dirs = [
      'data',
      'data/vectors',
      'data/cache',
      'data/processed',
      'config',
      'logs',
      'src/embeddings',
      'src/vectorstore',
      'src/retrieval',
      'src/api',
      'src/chat',
      'src/loaders',
      'src/utils'
    ];

    for (const dir of dirs) {
      const dirPath = path.join(__dirname, '..', dir);
      await fs.ensureDir(dirPath);
      console.log(`✅ ディレクトリ作成: ${dir}`);
    }

    // 設定ファイルをコピー
    const envExample = path.join(__dirname, '..', '.env.example');
    const envFile = path.join(__dirname, '..', '.env');
    
    if (!await fs.pathExists(envFile)) {
      await fs.copy(envExample, envFile);
      console.log('✅ .envファイルを作成しました。APIキーを設定してください。');
    }

    // 初期設定ファイルを作成
    await createConfigFiles();

    console.log('🎉 セットアップ完了！');
    console.log('');
    console.log('次のステップ:');
    console.log('1. .envファイルでAPIキーを設定');
    console.log('2. npm run index でコードベースをインデックス化');
    console.log('3. npm run serve でAPIサーバーを起動');

  } catch (error) {
    console.error('❌ セットアップエラー:', error);
    process.exit(1);
  }
}

async function createConfigFiles() {
  // RAG設定ファイル
  const ragConfig = {
    embedding: {
      model: "text-embedding-3-small",
      dimension: 1536,
      chunkSize: 1000,
      chunkOverlap: 200
    },
    vectorStore: {
      type: "pinecone", // or "supabase" or "chroma"
      indexName: "toppifygo-rag"
    },
    retrieval: {
      topK: 5,
      scoreThreshold: 0.7,
      maxTokens: 4000
    },
    generation: {
      model: "gpt-4",
      temperature: 0.1,
      maxTokens: 2000
    }
  };

  const configPath = path.join(__dirname, '..', 'config', 'rag.json');
  await fs.writeJson(configPath, ragConfig, { spaces: 2 });
  console.log('✅ RAG設定ファイル作成');

  // ファイル処理設定
  const fileConfig = {
    supportedExtensions: ['.ts', '.js', '.tsx', '.jsx', '.sql', '.py', '.md', '.txt', '.json', '.yaml', '.toml'],
    excludePatterns: ['node_modules', 'dist', 'build', '.next', '.git', 'coverage'],
    maxFileSize: '10MB',
    encoding: 'utf8'
  };

  const fileConfigPath = path.join(__dirname, '..', 'config', 'files.json');
  await fs.writeJson(fileConfigPath, fileConfig, { spaces: 2 });
  console.log('✅ ファイル処理設定ファイル作成');
}

if (require.main === module) {
  setup();
}

module.exports = { setup };
