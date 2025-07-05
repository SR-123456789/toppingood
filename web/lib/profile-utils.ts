import { createClient } from "@/lib/supabase/client"
import { generateUniqueUsername, generateDisplayName } from "@/lib/username-generator"

/**
 * プロフィールの存在確認と自動作成
 */
export async function ensureProfile(userId: string) {
  const supabase = createClient()
  
  // プロフィールの存在確認
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single()

  if (!profile) {
    // ユーザー名の重複チェック関数
    const checkUsernameExists = async (username: string): Promise<boolean> => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username)
        .single()
      
      return !!data
    }

    // ユニークなユーザー名を生成
    const uniqueUsername = await generateUniqueUsername(checkUsernameExists)
    const displayName = generateDisplayName()

    // プロフィールを作成
    const { error } = await supabase.from("profiles").insert({
      id: userId,
      username: uniqueUsername,
      display_name: displayName,
    })

    if (error) {
      console.error("Error creating profile:", error)
      throw error
    }
    
    console.log(`新しいプロフィールを作成しました: ${uniqueUsername} (${displayName})`)
  }
}
