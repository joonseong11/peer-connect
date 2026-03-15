CREATE OR REPLACE FUNCTION "public"."create_external_endorsement_claim"(
    "p_author" "uuid",
    "p_author_name" "text",
    "p_content" "text",
    "p_quota" integer
)
RETURNS "jsonb"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
    v_invite_count integer;
    v_invite_id uuid;
    v_claim_id uuid;
    v_now timestamptz := timezone('utc'::text, now());
    v_expires_at timestamptz := v_now + interval '30 days';
    v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    v_token_hash text := md5(v_token);
    v_invite_code text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext(p_author::text));

    SELECT count(*)
    INTO v_invite_count
    FROM public.invites
    WHERE inviter_user_id = p_author;

    IF p_quota IS NOT NULL AND v_invite_count >= p_quota THEN
        RAISE EXCEPTION 'invite_quota_exhausted';
    END IF;

    INSERT INTO public.invites (code, inviter_user_id, slot_index, max_redemptions, beta_unlimited)
    VALUES (v_invite_code, p_author, NULL, 1, false)
    RETURNING id INTO v_invite_id;

    INSERT INTO public.external_endorsement_claims (
        author_id,
        content,
        author_name_snapshot,
        hidden_invite_id,
        claim_token_hash,
        status,
        expires_at,
        created_at,
        updated_at
    )
    VALUES (
        p_author,
        p_content,
        p_author_name,
        v_invite_id,
        v_token_hash,
        'active',
        v_expires_at,
        v_now,
        v_now
    )
    RETURNING id INTO v_claim_id;

    RETURN jsonb_build_object(
        'id', v_claim_id,
        'token', v_token,
        'status', 'active',
        'expires_at', v_expires_at,
        'created_at', v_now
    );
END;
$$;

CREATE OR REPLACE FUNCTION "public"."create_visible_invite"(
    "p_author" "uuid",
    "p_slot_index" smallint,
    "p_max_redemptions" integer,
    "p_beta_unlimited" boolean,
    "p_quota" integer
)
RETURNS "jsonb"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
    v_invite_count integer;
    v_existing_invite_id uuid;
    v_invite_id uuid;
    v_invite_code text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
BEGIN
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_author THEN
        RAISE EXCEPTION 'invite_not_authorized';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(p_author::text));

    SELECT id
    INTO v_existing_invite_id
    FROM public.invites
    WHERE inviter_user_id = p_author
      AND slot_index = p_slot_index
    LIMIT 1;

    IF v_existing_invite_id IS NOT NULL THEN
        RAISE EXCEPTION 'invite_slot_taken';
    END IF;

    SELECT count(*)
    INTO v_invite_count
    FROM public.invites
    WHERE inviter_user_id = p_author;

    IF p_quota IS NOT NULL AND v_invite_count >= p_quota THEN
        RAISE EXCEPTION 'invite_quota_exhausted';
    END IF;

    INSERT INTO public.invites (code, inviter_user_id, slot_index, max_redemptions, beta_unlimited)
    VALUES (v_invite_code, p_author, p_slot_index, p_max_redemptions, p_beta_unlimited)
    RETURNING id INTO v_invite_id;

    RETURN jsonb_build_object(
        'id', v_invite_id,
        'code', v_invite_code
    );
END;
$$;

CREATE OR REPLACE FUNCTION "public"."claim_external_endorsement"("p_token" "text", "p_claimant" "uuid")
RETURNS "jsonb"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
    v_claim public.external_endorsement_claims%ROWTYPE;
    v_endorsement_id uuid;
    v_outcome text := 'already-linked';
    v_now timestamptz := timezone('utc'::text, now());
    v_token_hash text := md5(p_token);
BEGIN
    SELECT *
    INTO v_claim
    FROM public.external_endorsement_claims
    WHERE claim_token_hash = v_token_hash
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'claim_not_found';
    END IF;

    IF v_claim.status = 'claimed' THEN
        RAISE EXCEPTION 'claim_already_claimed';
    END IF;

    IF v_claim.status = 'revoked' THEN
        RAISE EXCEPTION 'claim_revoked';
    END IF;

    IF v_claim.expires_at < v_now THEN
        RAISE EXCEPTION 'claim_expired';
    END IF;

    IF v_claim.author_id = p_claimant THEN
        RAISE EXCEPTION 'claim_self_not_allowed';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.invite_redemptions
        WHERE invitee_user_id = p_claimant
    ) THEN
        IF v_claim.hidden_invite_id IS NULL THEN
            RAISE EXCEPTION 'claim_missing_hidden_invite';
        END IF;

        INSERT INTO public.invite_redemptions (invite_id, invitee_user_id)
        VALUES (v_claim.hidden_invite_id, p_claimant)
        ON CONFLICT (invitee_user_id) DO NOTHING;
    END IF;

    INSERT INTO public.endorsements (author_id, target_user_id, content)
    VALUES (v_claim.author_id, p_claimant, v_claim.content)
    ON CONFLICT (author_id, target_user_id) DO NOTHING
    RETURNING id INTO v_endorsement_id;

    IF v_endorsement_id IS NULL THEN
        SELECT id
        INTO v_endorsement_id
        FROM public.endorsements
        WHERE author_id = v_claim.author_id
          AND target_user_id = p_claimant;
    ELSE
        v_outcome := 'claimed';
    END IF;

    UPDATE public.external_endorsement_claims
    SET status = 'claimed',
        claimed_by_user_id = p_claimant,
        materialized_endorsement_id = v_endorsement_id,
        claimed_at = v_now,
        updated_at = v_now
    WHERE id = v_claim.id;

    IF v_claim.hidden_invite_id IS NOT NULL THEN
        UPDATE public.invites
        SET deactivated_at = COALESCE(deactivated_at, v_now)
        WHERE id = v_claim.hidden_invite_id;
    END IF;

    RETURN jsonb_build_object(
        'outcome', v_outcome,
        'claim_id', v_claim.id,
        'endorsement_id', v_endorsement_id
    );
END;
$$;
