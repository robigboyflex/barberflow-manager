
-- Messages table for owner-cashier communication
CREATE TABLE public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    sender_type text NOT NULL CHECK (sender_type IN ('owner', 'cashier')),
    sender_id text NOT NULL,
    sender_name text NOT NULL,
    content text NOT NULL,
    reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Owners can view/manage messages in their shops
CREATE POLICY "Owners can manage messages in own shops"
ON public.messages FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = messages.shop_id AND shops.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM shops WHERE shops.id = messages.shop_id AND shops.owner_id = auth.uid()));

-- Allow insert via RPC for staff (cashiers)
CREATE POLICY "Messages insert via RPC"
ON public.messages FOR INSERT
TO public
WITH CHECK (false);

-- RPC for cashier to send a message
CREATE OR REPLACE FUNCTION public.send_staff_message(
    p_staff_id uuid,
    p_session_token text,
    p_content text,
    p_reply_to uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_staff RECORD;
    v_message_id uuid;
BEGIN
    IF NOT validate_staff_session(p_staff_id, p_session_token) THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
    END IF;

    SELECT * INTO v_staff FROM staff WHERE id = p_staff_id AND is_active = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Staff not found or inactive';
    END IF;

    IF p_content IS NULL OR trim(p_content) = '' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Message content required';
    END IF;

    INSERT INTO messages (shop_id, sender_type, sender_id, sender_name, content, reply_to)
    VALUES (v_staff.shop_id, 'cashier', p_staff_id::text, v_staff.name, trim(p_content), p_reply_to)
    RETURNING id INTO v_message_id;

    RETURN v_message_id;
END;
$$;

-- RPC for cashier to fetch messages
CREATE OR REPLACE FUNCTION public.get_staff_messages(
    p_staff_id uuid,
    p_session_token text,
    p_limit integer DEFAULT 50
)
RETURNS TABLE(id uuid, shop_id uuid, sender_type text, sender_id text, sender_name text, content text, reply_to uuid, is_read boolean, created_at timestamp with time zone, reply_content text, reply_sender_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_shop_id uuid;
BEGIN
    IF NOT validate_staff_session(p_staff_id, p_session_token) THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
    END IF;

    SELECT staff.shop_id INTO v_shop_id FROM staff WHERE staff.id = p_staff_id AND is_active = true;
    IF v_shop_id IS NULL THEN
        RAISE EXCEPTION 'Staff not found';
    END IF;

    RETURN QUERY
    SELECT 
        m.id, m.shop_id, m.sender_type, m.sender_id, m.sender_name,
        m.content, m.reply_to, m.is_read, m.created_at,
        rm.content AS reply_content, rm.sender_name AS reply_sender_name
    FROM messages m
    LEFT JOIN messages rm ON rm.id = m.reply_to
    WHERE m.shop_id = v_shop_id
    ORDER BY m.created_at DESC
    LIMIT p_limit;
END;
$$;

-- RPC to mark messages as read (for cashier)
CREATE OR REPLACE FUNCTION public.mark_staff_messages_read(
    p_staff_id uuid,
    p_session_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_shop_id uuid;
BEGIN
    IF NOT validate_staff_session(p_staff_id, p_session_token) THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: Session expired or invalid';
    END IF;

    SELECT staff.shop_id INTO v_shop_id FROM staff WHERE staff.id = p_staff_id AND is_active = true;

    UPDATE messages SET is_read = true
    WHERE messages.shop_id = v_shop_id AND sender_type = 'owner' AND is_read = false;
END;
$$;

-- RPC to clear activities for a specific date (owner only)
CREATE OR REPLACE FUNCTION public.clear_activities_by_date(
    p_owner_id uuid,
    p_date date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_deleted integer;
BEGIN
    -- Prevent clearing today's activities
    IF p_date = CURRENT_DATE THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: Cannot clear today''s activities';
    END IF;

    DELETE FROM activities
    WHERE shop_id IN (SELECT id FROM shops WHERE owner_id = p_owner_id)
      AND DATE(created_at) = p_date;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
