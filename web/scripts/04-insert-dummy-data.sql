-- ダミーユーザーのプロフィールを作成
INSERT INTO public.profiles (id, username, display_name, avatar_url, bio, created_at, updated_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'foodie_taro', '料理好きタロウ', '/placeholder.svg?height=100&width=100', 'トッピング研究家です！新しい味の組み合わせを日々探求中🍜✨', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'mimic_hanako', '真似っ子ハナコ', '/placeholder.svg?height=100&width=100', 'みんなのトッピングを真似するのが大好き💕簡単で美味しいものが好み', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'topping_master', 'トッピングマスター', '/placeholder.svg?height=100&width=100', 'トッピングで人生が変わる！毎日新しい発見を共有します🎉', NOW(), NOW()),
  ('44444444-4444-4444-4444-444444444444', 'simple_cook', 'シンプルクッカー', '/placeholder.svg?height=100&width=100', 'シンプルだけど美味しいトッピングが得意です。時短レシピも紹介中⏰', NOW(), NOW()),
  ('55555555-5555-5555-5555-555555555555', 'creative_eater', 'クリエイティブイーター', '/placeholder.svg?height=100&width=100', '変わったトッピングに挑戦するのが趣味！失敗も成功も全部シェア😄', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ダミー投稿データを作成
INSERT INTO public.posts (id, user_id, menu_name, topping_content, memo, image_urls, mimic_count, like_count, created_at, updated_at) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'カップヌードル',
    'キムチ + 粉チーズ',
    '意外にめっちゃ合う！チーズがまろやかにしてくれる✨ 辛さも程よくなって最高です',
    ARRAY['/placeholder.svg?height=300&width=300'],
    24,
    45,
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '2 hours'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '22222222-2222-2222-2222-222222222222',
    '白米',
    'バター + 醤油 + のり',
    'TikTokで見たやつ試してみた！簡単で美味しい。バターの香りと醤油の塩気が絶妙',
    ARRAY['/placeholder.svg?height=300&width=300'],
    156,
    89,
    NOW() - INTERVAL '5 hours',
    NOW() - INTERVAL '5 hours'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '33333333-3333-3333-3333-333333333333',
    'アイスクリーム',
    'オリーブオイル + 塩',
    '騙されたと思ってやってみて！本当に美味しいから。塩がアイスの甘さを引き立てる',
    ARRAY['/placeholder.svg?height=300&width=300'],
    89,
    67,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    '44444444-4444-4444-4444-444444444444',
    'トースト',
    'マヨネーズ + 砂糖',
    '関西では定番らしい！甘じょっぱくてクセになる味。朝食にぴったり',
    ARRAY['/placeholder.svg?height=300&width=300'],
    43,
    28,
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '3 hours'
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    '55555555-5555-5555-5555-555555555555',
    'ラーメン',
    'バニラアイス + コーン',
    '暑い日にぴったり！冷たいアイスが熱いラーメンと合うなんて驚き。コーンの食感もGood',
    ARRAY['/placeholder.svg?height=300&width=300'],
    12,
    35,
    NOW() - INTERVAL '6 hours',
    NOW() - INTERVAL '6 hours'
  ),
  (
    '10000000-0000-0000-0000-000000000006',
    '11111111-1111-1111-1111-111111111111',
    'おにぎり',
    'マヨネーズ + ツナ + チーズ',
    'コンビニ風だけど手作りの方が美味しい！チーズを追加するのがポイント',
    ARRAY['/placeholder.svg?height=300&width=300'],
    78,
    52,
    NOW() - INTERVAL '8 hours',
    NOW() - INTERVAL '8 hours'
  ),
  (
    '10000000-0000-0000-0000-000000000007',
    '22222222-2222-2222-2222-222222222222',
    'パスタ',
    'バター + 醤油 + にんにく',
    '和風パスタの定番！簡単だけど本格的な味になる。にんにくの香りがたまらない',
    ARRAY['/placeholder.svg?height=300&width=300'],
    95,
    71,
    NOW() - INTERVAL '12 hours',
    NOW() - INTERVAL '12 hours'
  ),
  (
    '10000000-0000-0000-0000-000000000008',
    '33333333-3333-3333-3333-333333333333',
    'サラダ',
    'ごま油 + 塩 + レモン',
    'ドレッシングいらず！シンプルだけど野菜の味が引き立つ。ヘルシーで美味しい',
    ARRAY['/placeholder.svg?height=300&width=300'],
    34,
    41,
    NOW() - INTERVAL '4 hours',
    NOW() - INTERVAL '4 hours'
  ),
  (
    '10000000-0000-0000-0000-000000000009',
    '44444444-4444-4444-4444-444444444444',
    'うどん',
    '卵 + バター + 黒胡椒',
    'カルボナーラ風うどん！意外な組み合わせだけど絶品。クリーミーで濃厚',
    ARRAY['/placeholder.svg?height=300&width=300'],
    67,
    38,
    NOW() - INTERVAL '7 hours',
    NOW() - INTERVAL '7 hours'
  ),
  (
    '10000000-0000-0000-0000-000000000010',
    '55555555-5555-5555-5555-555555555555',
    'ヨーグルト',
    'はちみつ + きなこ + バナナ',
    '健康的で美味しい！朝食やおやつにぴったり。きなこの香ばしさがアクセント',
    ARRAY['/placeholder.svg?height=300&width=300'],
    29,
    46,
    NOW() - INTERVAL '10 hours',
    NOW() - INTERVAL '10 hours'
  )
ON CONFLICT (id) DO NOTHING;

-- ダミーのいいねデータを作成
INSERT INTO public.likes (user_id, post_id, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000002', NOW() - INTERVAL '1 hour'),
  ('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '2 hours'),
  ('22222222-2222-2222-2222-222222222222', '10000000-0000-0000-0000-000000000001', NOW() - INTERVAL '30 minutes'),
  ('22222222-2222-2222-2222-222222222222', '10000000-0000-0000-0000-000000000004', NOW() - INTERVAL '3 hours'),
  ('33333333-3333-3333-3333-333333333333', '10000000-0000-0000-0000-000000000001', NOW() - INTERVAL '45 minutes'),
  ('33333333-3333-3333-3333-333333333333', '10000000-0000-0000-0000-000000000002', NOW() - INTERVAL '4 hours'),
  ('44444444-4444-4444-4444-444444444444', '10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1.5 hours'),
  ('55555555-5555-5555-5555-555555555555', '10000000-0000-0000-0000-000000000001', NOW() - INTERVAL '20 minutes')
ON CONFLICT (user_id, post_id) DO NOTHING;

-- ダミーの真似データを作成
INSERT INTO public.mimics (user_id, post_id, created_at) VALUES
  ('22222222-2222-2222-2222-222222222222', '10000000-0000-0000-0000-000000000001', NOW() - INTERVAL '1 hour'),
  ('33333333-3333-3333-3333-333333333333', '10000000-0000-0000-0000-000000000002', NOW() - INTERVAL '2 hours'),
  ('44444444-4444-4444-4444-444444444444', '10000000-0000-0000-0000-000000000001', NOW() - INTERVAL '30 minutes'),
  ('55555555-5555-5555-5555-555555555555', '10000000-0000-0000-0000-000000000003', NOW() - INTERVAL '3 hours'),
  ('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000005', NOW() - INTERVAL '45 minutes'),
  ('22222222-2222-2222-2222-222222222222', '10000000-0000-0000-0000-000000000004', NOW() - INTERVAL '4 hours')
ON CONFLICT (user_id, post_id) DO NOTHING;
