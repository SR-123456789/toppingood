-- postsテーブルに新しいカラムを追加
ALTER TABLE posts ADD COLUMN cooking_time INTEGER;
ALTER TABLE posts ADD COLUMN budget INTEGER;
ALTER TABLE posts ADD COLUMN tags TEXT[];

-- インデックスを追加（ソート性能向上のため）
CREATE INDEX idx_posts_cooking_time ON posts (cooking_time);
CREATE INDEX idx_posts_budget ON posts (budget);
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);

-- コメント追加
COMMENT ON COLUMN posts.cooking_time IS '調理時間（分）';
COMMENT ON COLUMN posts.budget IS '予算（円）';
COMMENT ON COLUMN posts.tags IS 'タグ（配列）';

-- 既存データの確認（optional）
-- SELECT id, menu_name, cooking_time, budget, tags FROM posts LIMIT 5;
