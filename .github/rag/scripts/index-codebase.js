const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const { OpenAI } = require('openai');
require('dotenv').config();

/**
 * コードベースを自動インデックス化するスクリプト
 */
class CodebaseIndexer {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.projectRoot = path.join(__dirname, '../../..');
    this.ragRoot = path.join(__dirname, '..');
    this.config = this.loadConfig();
  }

  loadConfig() {
    const configPath = path.join(this.ragRoot, 'config', 'rag.json');
    const fileConfigPath = path.join(this.ragRoot, 'config', 'files.json');
    
    return {
      rag: require(configPath),
      files: require(fileConfigPath)
    };
  }

  async indexCodebase() {
    console.log('📚 ToppifyGOコードベースをインデックス化中...');

    try {
      // 1. ファイル収集
      const files = await this.collectFiles();
      console.log(`📁 ${files.length}個のファイルを発見`);

      // 2. テキスト抽出・チャンク化
      const chunks = await this.processFiles(files);
      console.log(`📝 ${chunks.length}個のチャンクを生成`);

      // 3. 埋め込み生成
      const embeddings = await this.generateEmbeddings(chunks);
      console.log(`🧠 ${embeddings.length}個の埋め込みを生成`);

      // 4. ベクターストアに保存
      await this.saveToVectorStore(chunks, embeddings);
      console.log('💾 ベクターストアに保存完了');

      // 5. メタデータ保存
      await this.saveMetadata(files, chunks);
      console.log('📊 メタデータ保存完了');

      console.log('🎉 インデックス化完了！');

    } catch (error) {
      console.error('❌ インデックス化エラー:', error);
      process.exit(1);
    }
  }

  async collectFiles() {
    const { supportedExtensions, excludePatterns } = this.config.files;
    
    const patterns = supportedExtensions.map(ext => `**/*${ext}`);
    const excludeGlobs = excludePatterns.map(pattern => `**/${pattern}/**`);

    const files = [];
    for (const pattern of patterns) {
      const matches = glob.sync(pattern, {
        cwd: this.projectRoot,
        ignore: excludeGlobs,
        absolute: true
      });
      files.push(...matches);
    }

    return [...new Set(files)]; // 重複除去
  }

  async processFiles(files) {
    const chunks = [];
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const relativePath = path.relative(this.projectRoot, file);
        
        // ファイルタイプ別の処理
        const fileChunks = await this.chunkFile(content, relativePath);
        chunks.push(...fileChunks);
        
      } catch (error) {
        console.warn(`⚠️ ファイル処理エラー: ${file}`, error.message);
      }
    }

    return chunks;
  }

  async chunkFile(content, filePath) {
    const { chunkSize, chunkOverlap } = this.config.rag.embedding;
    const ext = path.extname(filePath);
    
    // ファイルタイプ別の前処理
    let processedContent = content;
    if (['.ts', '.js', '.tsx', '.jsx'].includes(ext)) {
      processedContent = this.preprocessCode(content, filePath);
    } else if (ext === '.md') {
      processedContent = this.preprocessMarkdown(content, filePath);
    }

    // チャンク化
    const chunks = [];
    const lines = processedContent.split('\n');
    let currentChunk = '';
    let currentSize = 0;

    for (const line of lines) {
      if (currentSize + line.length > chunkSize && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            filePath,
            type: this.getFileType(filePath),
            chunkIndex: chunks.length,
            lines: currentChunk.split('\n').length
          }
        });
        
        // オーバーラップ処理
        const overlapLines = currentChunk.split('\n').slice(-Math.floor(chunkOverlap / 50));
        currentChunk = overlapLines.join('\n') + '\n' + line;
        currentSize = currentChunk.length;
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line;
        currentSize += line.length + 1;
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          filePath,
          type: this.getFileType(filePath),
          chunkIndex: chunks.length,
          lines: currentChunk.split('\n').length
        }
      });
    }

    return chunks;
  }

  preprocessCode(content, filePath) {
    // コード用の前処理
    return `// File: ${filePath}\n${content}`;
  }

  preprocessMarkdown(content, filePath) {
    // Markdown用の前処理
    return `# Document: ${filePath}\n${content}`;
  }

  getFileType(filePath) {
    const ext = path.extname(filePath);
    const typeMap = {
      '.ts': 'typescript',
      '.js': 'javascript', 
      '.tsx': 'react-typescript',
      '.jsx': 'react-javascript',
      '.sql': 'sql',
      '.py': 'python',
      '.md': 'markdown',
      '.txt': 'text',
      '.json': 'json',
      '.yaml': 'yaml',
      '.toml': 'toml'
    };
    return typeMap[ext] || 'unknown';
  }

  async generateEmbeddings(chunks) {
    const { model } = this.config.rag.embedding;
    const batchSize = 100;
    const embeddings = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const texts = batch.map(chunk => chunk.content);
      
      try {
        const response = await this.openai.embeddings.create({
          model,
          input: texts
        });
        
        const batchEmbeddings = response.data.map(item => item.embedding);
        embeddings.push(...batchEmbeddings);
        
        console.log(`🧠 埋め込み生成: ${Math.min(i + batchSize, chunks.length)}/${chunks.length}`);
        
      } catch (error) {
        console.error(`❌ 埋め込み生成エラー (batch ${i}-${i + batchSize}):`, error);
        throw error;
      }
    }

    return embeddings;
  }

  async saveToVectorStore(chunks, embeddings) {
    // JSONファイルとして保存（後でPinecone/Supabaseに移行可能）
    const vectorData = chunks.map((chunk, index) => ({
      id: `chunk_${index}`,
      embedding: embeddings[index],
      metadata: chunk.metadata,
      content: chunk.content
    }));

    const vectorPath = path.join(this.ragRoot, 'data', 'vectors', 'embeddings.json');
    await fs.writeJson(vectorPath, vectorData, { spaces: 2 });
  }

  async saveMetadata(files, chunks) {
    const metadata = {
      indexedAt: new Date().toISOString(),
      totalFiles: files.length,
      totalChunks: chunks.length,
      fileTypes: this.getFileTypeStats(files),
      config: this.config
    };

    const metadataPath = path.join(this.ragRoot, 'data', 'metadata.json');
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });
  }

  getFileTypeStats(files) {
    const stats = {};
    files.forEach(file => {
      const type = this.getFileType(file);
      stats[type] = (stats[type] || 0) + 1;
    });
    return stats;
  }
}

async function main() {
  const indexer = new CodebaseIndexer();
  await indexer.indexCodebase();
}

if (require.main === module) {
  main();
}

module.exports = { CodebaseIndexer };
