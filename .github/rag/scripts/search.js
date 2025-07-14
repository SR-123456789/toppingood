const fs = require('fs-extra');
const path = require('path');
const { OpenAI } = require('openai');
const readline = require('readline');
require('dotenv').config();

/**
 * シンプルな検索スクリプト
 */
async function search() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const ragRoot = path.join(__dirname, '..');
  const vectorPath = path.join(ragRoot, 'data', 'vectors', 'embeddings.json');

  if (!await fs.pathExists(vectorPath)) {
    console.error('❌ ベクターデータが見つかりません。npm run index を実行してください。');
    process.exit(1);
  }

  const vectorData = await fs.readJson(vectorPath);
  console.log(`📚 ${vectorData.length}個のチャンクから検索します`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const query = await new Promise(resolve => {
    rl.question('🔍 検索クエリを入力してください: ', resolve);
  });

  rl.close();

  if (!query.trim()) {
    console.log('❌ クエリが入力されていません');
    return;
  }

  console.log('🔍 検索中...');

  try {
    // クエリの埋め込み生成
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    });
    const queryEmbedding = response.data[0].embedding;

    // コサイン類似度計算
    const results = vectorData.map(item => ({
      ...item,
      similarity: cosineSimilarity(queryEmbedding, item.embedding)
    }));

    // 類似度でソート
    results.sort((a, b) => b.similarity - a.similarity);
    
    const topResults = results.slice(0, 5);

    console.log(`\n📝 検索結果 (上位5件):`);
    console.log('=====================================');

    topResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.metadata.filePath}`);
      console.log(`   類似度: ${(result.similarity * 100).toFixed(1)}%`);
      console.log(`   タイプ: ${result.metadata.type}`);
      console.log(`   内容: ${result.content.substring(0, 200)}...`);
      console.log('   ' + '─'.repeat(50));
    });

  } catch (error) {
    console.error('❌ 検索エラー:', error.message);
  }
}

function cosineSimilarity(a, b) {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (normA * normB);
}

if (require.main === module) {
  search();
}

module.exports = { search };
