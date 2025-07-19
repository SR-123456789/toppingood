// フィッシャー・イェーツアルゴリズムでの配列シャッフル
export function shuffleArray<T>(array: T[], seed?: number): T[] {
  const shuffled = [...array]
  let currentIndex = shuffled.length
  
  // シード値がある場合は疑似ランダム生成器を使用
  const random = seed ? createSeededRandom(seed) : Math.random

  while (currentIndex !== 0) {
    const randomIndex = Math.floor(random() * currentIndex)
    currentIndex--

    // 要素を交換
    ;[shuffled[currentIndex], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[currentIndex]
    ]
  }

  return shuffled
}

// シード付き疑似ランダム生成器
function createSeededRandom(seed: number) {
  let state = seed
  return function() {
    state = (state * 1664525 + 1013904223) % Math.pow(2, 32)
    return state / Math.pow(2, 32)
  }
}

// 時間ベースのシード生成（30分ごとに変わる）
export function getHourlyTimeSeed(): number {
  const now = new Date()
  const halfHour = Math.floor(now.getMinutes() / 30)
  const hourKey = now.getFullYear() * 10000000 + 
                  now.getMonth() * 100000 + 
                  now.getDate() * 1000 + 
                  now.getHours() * 10 +
                  halfHour
  return hourKey
}

// セッション固有のランダムシード生成
export function getSessionSeed(): number {
  // ブラウザセッション中は一定だが、リロード時に変わる
  if (typeof window !== 'undefined') {
    let sessionSeed = sessionStorage.getItem('toppingood_session_seed')
    if (!sessionSeed) {
      sessionSeed = Date.now().toString()
      sessionStorage.setItem('toppingood_session_seed', sessionSeed)
    }
    return parseInt(sessionSeed) % 1000000
  }
  return Date.now() % 1000000
}

// 日次でランダムオフセットを生成
export function getDailyRandomOffset(): number {
  const today = new Date()
  const dayKey = today.getFullYear() * 10000 + 
                 today.getMonth() * 100 + 
                 today.getDate()
  
  // セッションシードも組み合わせる
  const sessionSeed = getSessionSeed()
  const combinedSeed = dayKey + sessionSeed
  
  // 日付とセッションを組み合わせたシードでランダムオフセット生成（0-20の範囲に制限）
  const seededRandom = createSeededRandom(combinedSeed)
  return Math.floor(seededRandom() * 20)
}
