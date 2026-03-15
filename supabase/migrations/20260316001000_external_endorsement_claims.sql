CREATE TABLE IF NOT EXISTS "public"."external_endorsement_claims" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "author_name_snapshot" "text" NOT NULL,
    "hidden_invite_id" "uuid",
    "claim_token_hash" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "claimed_by_user_id" "uuid",
    "materialized_endorsement_id" "uuid",
    "expires_at" timestamp with time zone NOT NULL,
    "claimed_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "external_endorsement_claims_content_min_length" CHECK (("char_length"("content") >= 20)),
    CONSTRAINT "external_endorsement_claims_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'claimed'::"text", 'revoked'::"text"])))
);

ALTER TABLE "public"."external_endorsement_claims" OWNER TO "postgres";

ALTER TABLE ONLY "public"."external_endorsement_claims"
    ADD CONSTRAINT "external_endorsement_claims_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."external_endorsement_claims"
    ADD CONSTRAINT "external_endorsement_claims_claim_token_hash_key" UNIQUE ("claim_token_hash");

CREATE INDEX "external_endorsement_claims_author_status_idx" ON "public"."external_endorsement_claims" USING "btree" ("author_id", "status");
CREATE INDEX "external_endorsement_claims_claimed_by_idx" ON "public"."external_endorsement_claims" USING "btree" ("claimed_by_user_id");
CREATE INDEX "external_endorsement_claims_expires_at_idx" ON "public"."external_endorsement_claims" USING "btree" ("expires_at");

ALTER TABLE ONLY "public"."external_endorsement_claims"
    ADD CONSTRAINT "external_endorsement_claims_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."external_endorsement_claims"
    ADD CONSTRAINT "external_endorsement_claims_hidden_invite_id_fkey" FOREIGN KEY ("hidden_invite_id") REFERENCES "public"."invites"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."external_endorsement_claims"
    ADD CONSTRAINT "external_endorsement_claims_claimed_by_user_id_fkey" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."external_endorsement_claims"
    ADD CONSTRAINT "external_endorsement_claims_materialized_endorsement_id_fkey" FOREIGN KEY ("materialized_endorsement_id") REFERENCES "public"."endorsements"("id") ON DELETE SET NULL;

ALTER TABLE "public"."external_endorsement_claims" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors create external endorsement claims" ON "public"."external_endorsement_claims" FOR INSERT WITH CHECK (("auth"."uid"() = "author_id"));
CREATE POLICY "Authors read external endorsement claims" ON "public"."external_endorsement_claims" FOR SELECT USING (("auth"."uid"() = "author_id"));
CREATE POLICY "Authors update external endorsement claims" ON "public"."external_endorsement_claims" FOR UPDATE USING (("auth"."uid"() = "author_id")) WITH CHECK (("auth"."uid"() = "author_id"));

GRANT ALL ON TABLE "public"."external_endorsement_claims" TO "authenticated";
GRANT ALL ON TABLE "public"."external_endorsement_claims" TO "service_role";

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
    v_token text := encode(gen_random_bytes(24), 'hex');
    v_token_hash text := encode(digest(v_token, 'sha256'), 'hex');
    v_invite_code text := 'EXT' || upper(encode(gen_random_bytes(12), 'hex'));
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

REVOKE ALL ON FUNCTION "public"."create_external_endorsement_claim"("uuid", "text", "text", integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."create_external_endorsement_claim"("uuid", "text", "text", integer) TO "service_role";

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
    v_invite_code text := upper(encode(gen_random_bytes(8), 'hex'));
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

REVOKE ALL ON FUNCTION "public"."create_visible_invite"("uuid", smallint, integer, boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."create_visible_invite"("uuid", smallint, integer, boolean, integer) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."create_visible_invite"("uuid", smallint, integer, boolean, integer) TO "service_role";

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
    v_token_hash text := encode(digest(p_token, 'sha256'), 'hex');
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

REVOKE ALL ON FUNCTION "public"."claim_external_endorsement"("text", "uuid") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."claim_external_endorsement"("text", "uuid") TO "service_role";
