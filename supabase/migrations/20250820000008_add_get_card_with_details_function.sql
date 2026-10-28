-- Function to get card with scenes and reactions
CREATE OR REPLACE FUNCTION public.get_card_with_details(card_hash_id TEXT)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'card', (
      SELECT json_build_object(
        'id', id,
        'user_id', user_id,
        'template_id', template_id,
        'recipient_name', recipient_name,
        'sender_name', sender_name,
        'message', message,
        'image_url', image_url,
        'audio_url', audio_url,
        'pin_code', pin_code,
        'hash_id', hash_id,
        'expiry_date', expiry_date,
        'unlock_at', unlock_at,
        'view_count', view_count,
        'created_at', created_at
      )
      FROM public.cards
      WHERE hash_id = card_hash_id
      LIMIT 1
    ),
    'scenes', (
      SELECT json_agg(json_build_object(
        'id', id,
        'scene_order', scene_order,
        'scene_type', scene_type,
        'content', content
      ))
      FROM public.card_scenes
      WHERE card_id = (SELECT id FROM public.cards WHERE hash_id = card_hash_id LIMIT 1)
      ORDER BY scene_order
    ),
    'reactions', (
      SELECT json_agg(json_build_object(
        'id', id,
        'reaction_type', reaction_type,
        'message', message,
        'created_at', created_at
      ))
      FROM public.reactions
      WHERE card_id = (SELECT id FROM public.cards WHERE hash_id = card_hash_id LIMIT 1)
      ORDER BY created_at DESC
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_card_with_details(TEXT) TO anon, authenticated;
