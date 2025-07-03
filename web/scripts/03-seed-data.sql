-- Insert sample users (these will be created when users sign up)
-- Sample posts data
INSERT INTO public.posts (id, user_id, menu_name, topping_content, memo, image_urls, mimic_count, like_count) VALUES
  (
    gen_random_uuid(),
    (SELECT id FROM public.profiles LIMIT 1),
    'カップヌードル',
    'キムチ + 粉チーズ',
    '意外にめっちゃ合う！チーズがまろやかにしてくれる✨',
    ARRAY['/placeholder.svg?height=300&width=300'],
    24,
    45
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM public.profiles LIMIT 1),
    '白米',
    'バター + 醤油 + のり',
    'TikTokで見たやつ試してみた！簡単で美味しい',
    ARRAY['/placeholder.svg?height=300&width=300'],
    156,
    89
  ),
  (
    gen_random_uuid(),
    (SELECT id FROM public.profiles LIMIT 1),
    'アイスクリーム',
    'オリーブオイル + 塩',
    '騙されたと思ってやってみて！本当に美味しいから',
    ARRAY['/placeholder.svg?height=300&width=300'],
    89,
    67
  );
