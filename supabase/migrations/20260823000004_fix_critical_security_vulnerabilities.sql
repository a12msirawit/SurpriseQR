-- 1. อัปเดต Bucket 'slips' ให้เป็น Private
UPDATE storage.buckets
SET public = FALSE
WHERE id = 'slips';

-- 2. ปรับปรุง RPC increment_credits ตรวจสอบสิทธิ์การใช้งาน
DROP FUNCTION IF EXISTS public.increment_credits(UUID, NUMERIC);

CREATE OR REPLACE FUNCTION public.increment_credits(user_id UUID, amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM user_id
     AND current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.profiles
  SET credits = credits + amount
  WHERE id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_credits(UUID, NUMERIC) TO authenticated;

-- 3. ปรับปรุง get_card_with_details ซ่อน pin_code และ user_id สำหรับผู้เข้าชมทั่วไป
CREATE OR REPLACE FUNCTION public.get_card_with_details(card_hash_id TEXT)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'card', (
      SELECT CASE
        WHEN auth.uid() = cards.user_id THEN json_build_object(
          'id', cards.id,
          'user_id', cards.user_id,
          'template_id', cards.template_id,
          'recipient_name', cards.recipient_name,
          'sender_name', cards.sender_name,
          'message', cards.message,
          'image_url', cards.image_url,
          'audio_url', cards.audio_url,
          'pin_code', cards.pin_code,
          'hash_id', cards.hash_id,
          'expiry_date', cards.expiry_date,
          'unlock_at', cards.unlock_at,
          'view_count', cards.view_count,
          'created_at', cards.created_at
        )
        ELSE json_build_object(
          'id', cards.id,
          'template_id', cards.template_id,
          'recipient_name', cards.recipient_name,
          'sender_name', cards.sender_name,
          'message', cards.message,
          'image_url', cards.image_url,
          'audio_url', cards.audio_url,
          'hash_id', cards.hash_id,
          'expiry_date', cards.expiry_date,
          'unlock_at', cards.unlock_at,
          'view_count', cards.view_count,
          'created_at', cards.created_at
        )
      END
      FROM public.cards
      WHERE cards.hash_id = card_hash_id
      LIMIT 1
    ),
    'scenes', (
      SELECT json_agg(json_build_object(
        'id', card_scenes.id,
        'scene_order', card_scenes.scene_order,
        'scene_type', card_scenes.scene_type,
        'content', card_scenes.content
      ) ORDER BY card_scenes.scene_order)
      FROM public.card_scenes
      WHERE card_scenes.card_id = (
        SELECT cards.id
        FROM public.cards
        WHERE cards.hash_id = card_hash_id
        LIMIT 1
      )
    ),
    'reactions', (
      SELECT json_agg(json_build_object(
        'id', reactions.id,
        'reaction_type', reactions.reaction_type,
        'message', reactions.message,
        'created_at', reactions.created_at
      ) ORDER BY reactions.created_at DESC)
      FROM public.reactions
      WHERE reactions.card_id = (
        SELECT cards.id
        FROM public.cards
        WHERE cards.hash_id = card_hash_id
        LIMIT 1
      )
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_card_with_details(TEXT) TO anon, authenticated;