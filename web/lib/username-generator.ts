// ユーザー名生成用のデータセット
const adjectives = [
  // 食べ物関連
  "おいしい", "美味", "香ばしい", "濃厚", "あっさり", "もちもち", "サクサク", "ふわふわ",
  "とろとろ", "プリプリ", "ジューシー", "クリーミー", "スパイシー", "マイルド",
  
  // 色
  "ゴールデン", "シルバー", "ルビー", "エメラルド", "サファイア", "パール", "オレンジ",
  "チョコ", "バニラ", "ストロベリー", "マッチャ", "キャラメル",
  
  // 性格・特徴
  "ハッピー", "スマイル", "ラッキー", "マジック", "キュート", "クール", "フレッシュ",
  "スペシャル", "プレミアム", "デラックス", "ウルトラ", "スーパー"
]

const nouns = [
  // 食べ物
  "ラーメン", "うどん", "そば", "パスタ", "カレー", "ハンバーガー", "ピザ", "寿司",
  "天ぷら", "焼肉", "餃子", "チャーハン", "オムライス", "カツ丼", "親子丼",
  
  // 動物
  "ネコ", "イヌ", "パンダ", "ウサギ", "ハムスター", "ペンギン", "コアラ", "リス",
  "フクロウ", "ライオン", "トラ", "ゾウ", "キリン",
  
  // 料理人・グルメ関連
  "シェフ", "クック", "グルメ", "フーディー", "マスター", "キング", "クイーン",
  "ハンター", "エクスプローラー", "コレクター", "クリエイター"
]

const suffixes = [
  "さん", "くん", "ちゃん", "マスター", "先生", "博士", "王", "姫", "キング", "クイーン",
  "ハンター", "マニア", "ファン", "ラバー", "エキスパート", "プロ"
]

/**
 * ランダムなユーザー名を生成する
 * 形式: [形容詞][名詞][接尾辞] または [形容詞][名詞]
 */
export function generateUsername(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  
  // 70%の確率で接尾辞を付ける
  const addSuffix = Math.random() < 0.7
  const suffix = addSuffix ? suffixes[Math.floor(Math.random() * suffixes.length)] : ""
  
  return `${adjective}${noun}${suffix}`
}

/**
 * ユニークなユーザー名を生成する（データベースチェック付き）
 */
export async function generateUniqueUsername(
  checkExistence: (username: string) => Promise<boolean>,
  maxAttempts: number = 10
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const username = generateUsername()
    const exists = await checkExistence(username)
    
    if (!exists) {
      return username
    }
    
    // 重複した場合は数字を付加
    if (i === maxAttempts - 1) {
      const randomNum = Math.floor(Math.random() * 999) + 1
      return `${username}${randomNum}`
    }
  }
  
  // フォールバック
  const timestamp = Date.now().toString().slice(-6)
  return `グルメ探検家${timestamp}`
}

/**
 * 表示名を生成する
 */
export function generateDisplayName(): string {
  const displayNames = [
    "グルメ初心者", "料理好き", "食べ歩き中", "トッピング研究家", "味覚探求者",
    "美食家の卵", "ラーメン愛好家", "カレー通", "スイーツハンター", "食の冒険者",
    "おいしいもの好き", "グルメ見習い", "料理研究中", "味の探検家", "食べることが趣味"
  ]
  
  return displayNames[Math.floor(Math.random() * displayNames.length)]
}
