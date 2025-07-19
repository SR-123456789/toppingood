import { createClient } from "@/lib/supabase/server"
import { HomeClient } from "@/components/home-client"
import type { Database } from "@/lib/types/database"
import { shuffleArray, getHourlyTimeSeed, getDailyRandomOffset, getSessionSeed } from "@/lib/random-utils"

type Post = Database["public"]["Tables"]["posts"]["Row"]
type Profile = Database["public"]["Tables"]["profiles"]["Row"]

export interface PostWithProfile extends Post {
  profile: Profile | null
}

async function checkTablesExist() {
  const supabase = await createClient()

  try {
    // テーブルの存在確認
    const { error } = await supabase.from("posts").select("id").limit(1)
    return !error
  } catch (error) {
    console.error("Tables do not exist:", error)
    return false
  }
}

async function getPosts(): Promise<PostWithProfile[]> {
  const supabase = await createClient()

  try {
    // まず全体のデータ数を確認
    const { count } = await supabase
      .from("posts")
      .select("*", { count: 'exact', head: true })

    if (!count || count === 0) {
      return []
    }

    // ランダム表示用の設定
    const randomOffset = Math.min(getDailyRandomOffset(), Math.max(0, count - 50))
    const timeSeed = getHourlyTimeSeed() + getSessionSeed()
    const fetchLimit = Math.min(50, count)

    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(randomOffset, randomOffset + fetchLimit - 1)

    if (postsError) {
      console.error("Error fetching posts:", postsError)
      return []
    }

    if (!posts || posts.length === 0) {
      return []
    }

    // 必要なユーザーIDのみでプロフィールを取得
    const userIds = [...new Set(posts.map((post) => post.user_id))]
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url") // 必要なフィールドのみ
      .in("id", userIds)

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
      // プロフィールが取得できなくても投稿は表示する
    }

    // 投稿とプロフィールを結合
    let postsWithProfiles: PostWithProfile[] = posts.map((post) => ({
      ...post,
      profile: profiles?.find((profile) => profile.id === post.user_id) || null,
    }))

    // ランダムシャッフルして最初の20件を返す
    postsWithProfiles = shuffleArray(postsWithProfiles, timeSeed)
    postsWithProfiles = postsWithProfiles.slice(0, 20)

    return postsWithProfiles
  } catch (error) {
    console.error("Error in getPosts:", error)
    return []
  }
}

async function getUser() {
  const supabase = await createClient()
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error("Error getting user:", error)
    return null
  }
}

export default async function HomePage() {
  try {
    // テーブルの存在確認
    const tablesExist = await checkTablesExist()

    if (!tablesExist) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-orange-600 mb-4">
              <a href="/">ToppinGOOD</a>
            </h1>
            <p className="text-gray-600 mb-4">データベースの初期化が必要です</p>
            <p className="text-sm text-gray-500">
              管理者にお問い合わせください。
              <br />
              SQLスクリプトを実行してデータベースを設定する必要があります。
            </p>
          </div>
        </div>
      )
    }

    const user = await getUser()
    const posts = await getPosts()

    // ログイン状態に関係なく投稿を表示
    return <HomeClient user={user} initialPosts={posts} />
  } catch (error) {
    console.error("Error in HomePage:", error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-orange-600 mb-4">
            <a href="/">ToppinGOOD</a>
          </h1>
          <p className="text-gray-600 mb-4">エラーが発生しました</p>
          <p className="text-sm text-gray-500">
            ページを再読み込みしてください。
          </p>
        </div>
      </div>
    )
  }
}
