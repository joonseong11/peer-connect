


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."endorsements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "target_user_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    CONSTRAINT "endorsements_min_length" CHECK (("char_length"("content") >= 20))
);


ALTER TABLE "public"."endorsements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gathering_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gathering_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "parent_comment_id" "uuid"
);


ALTER TABLE "public"."gathering_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gatherings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "email_sent" boolean DEFAULT false
);


ALTER TABLE "public"."gatherings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invite_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invite_id" "uuid",
    "invitee_user_id" "uuid",
    "redeemed_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "inviter_notified_at" timestamp with time zone
);


ALTER TABLE "public"."invite_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "inviter_user_id" "uuid",
    "redeemed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "redeemed_at" timestamp with time zone,
    "slot_index" smallint,
    "max_redemptions" integer,
    "beta_unlimited" boolean DEFAULT false NOT NULL,
    "deactivated_at" timestamp with time zone
);


ALTER TABLE "public"."invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "career_history" "text",
    "introduction" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "photo_url" "text",
    "email" "text",
    "notify_endorsements" boolean DEFAULT true NOT NULL,
    "notify_gatherings" boolean DEFAULT true NOT NULL,
    "notify_comments" boolean DEFAULT true NOT NULL,
    "contact_linkedin" "text",
    "contact_github" "text",
    "contact_email" "text",
    "profile_completed_at" timestamp with time zone
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."endorsements"
    ADD CONSTRAINT "endorsements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."endorsements"
    ADD CONSTRAINT "endorsements_unique_pair" UNIQUE ("author_id", "target_user_id");



ALTER TABLE ONLY "public"."gathering_comments"
    ADD CONSTRAINT "gathering_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gatherings"
    ADD CONSTRAINT "gatherings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invite_redemptions"
    ADD CONSTRAINT "invite_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "gathering_comments_parent_idx" ON "public"."gathering_comments" USING "btree" ("gathering_id", "parent_comment_id");



CREATE INDEX "idx_gatherings_email_sent" ON "public"."gatherings" USING "btree" ("email_sent", "created_at") WHERE ("email_sent" = false);



CREATE INDEX "invite_redemptions_invite_id_idx" ON "public"."invite_redemptions" USING "btree" ("invite_id");



CREATE UNIQUE INDEX "invite_redemptions_invitee_unique" ON "public"."invite_redemptions" USING "btree" ("invitee_user_id");



ALTER TABLE ONLY "public"."endorsements"
    ADD CONSTRAINT "endorsements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."endorsements"
    ADD CONSTRAINT "endorsements_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gathering_comments"
    ADD CONSTRAINT "gathering_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gathering_comments"
    ADD CONSTRAINT "gathering_comments_gathering_id_fkey" FOREIGN KEY ("gathering_id") REFERENCES "public"."gatherings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gathering_comments"
    ADD CONSTRAINT "gathering_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."gathering_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gatherings"
    ADD CONSTRAINT "gatherings_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invite_redemptions"
    ADD CONSTRAINT "invite_redemptions_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "public"."invites"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invite_redemptions"
    ADD CONSTRAINT "invite_redemptions_invitee_user_id_fkey" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_inviter_user_id_fkey" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_redeemed_by_fkey" FOREIGN KEY ("redeemed_by") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "All members can read endorsements" ON "public"."endorsements" FOR SELECT USING (true);



CREATE POLICY "Authors can delete their endorsement" ON "public"."endorsements" FOR DELETE USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Create invites" ON "public"."invites" FOR INSERT WITH CHECK ((("inviter_user_id" IS NULL) OR ("auth"."uid"() = "inviter_user_id")));



CREATE POLICY "Enable read access for all users" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Endorsements are viewable by everyone." ON "public"."endorsements" FOR SELECT USING (true);



CREATE POLICY "Invite redemption visibility" ON "public"."invite_redemptions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Invitee delete redemption" ON "public"."invite_redemptions" FOR DELETE USING (("auth"."uid"() = "invitee_user_id"));



CREATE POLICY "Invitee redeem code" ON "public"."invite_redemptions" FOR INSERT WITH CHECK (("auth"."uid"() = "invitee_user_id"));



CREATE POLICY "Invitee update redemption" ON "public"."invite_redemptions" FOR UPDATE USING (("auth"."uid"() = "invitee_user_id")) WITH CHECK (("auth"."uid"() = "invitee_user_id"));



CREATE POLICY "Lookup invite codes" ON "public"."invites" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Manage invites" ON "public"."invites" FOR SELECT USING ((("inviter_user_id" IS NULL) OR ("auth"."uid"() = "inviter_user_id") OR ("auth"."uid"() IN ( SELECT "invite_redemptions"."invitee_user_id"
   FROM "public"."invite_redemptions"
  WHERE ("invite_redemptions"."invite_id" = "invites"."id")))));



CREATE POLICY "Members can read gathering comments" ON "public"."gathering_comments" FOR SELECT USING (true);



CREATE POLICY "Members can read gatherings" ON "public"."gatherings" FOR SELECT USING (true);



CREATE POLICY "Members create endorsements for others" ON "public"."endorsements" FOR INSERT WITH CHECK ((("auth"."uid"() = "author_id") AND ("author_id" <> "target_user_id")));



CREATE POLICY "Members manage their gathering comments" ON "public"."gathering_comments" USING (("auth"."uid"() = "author_id")) WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "Members manage their gatherings" ON "public"."gatherings" USING (("auth"."uid"() = "author_id")) WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Update invite status" ON "public"."invites" FOR UPDATE USING ((("inviter_user_id" IS NULL) OR ("auth"."uid"() = "inviter_user_id") OR ("auth"."uid"() IN ( SELECT "invite_redemptions"."invitee_user_id"
   FROM "public"."invite_redemptions"
  WHERE ("invite_redemptions"."invite_id" = "invites"."id"))))) WITH CHECK ((("inviter_user_id" IS NULL) OR ("auth"."uid"() = "inviter_user_id") OR ("auth"."uid"() IN ( SELECT "invite_redemptions"."invitee_user_id"
   FROM "public"."invite_redemptions"
  WHERE ("invite_redemptions"."invite_id" = "invites"."id")))));



CREATE POLICY "Users can manage their own profile" ON "public"."profiles" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "View fallback invites" ON "public"."invites" FOR SELECT USING (("inviter_user_id" IS NULL));



ALTER TABLE "public"."endorsements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gathering_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gatherings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invite_redemptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































GRANT ALL ON TABLE "public"."endorsements" TO "anon";
GRANT ALL ON TABLE "public"."endorsements" TO "authenticated";
GRANT ALL ON TABLE "public"."endorsements" TO "service_role";



GRANT ALL ON TABLE "public"."gathering_comments" TO "anon";
GRANT ALL ON TABLE "public"."gathering_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."gathering_comments" TO "service_role";



GRANT ALL ON TABLE "public"."gatherings" TO "anon";
GRANT ALL ON TABLE "public"."gatherings" TO "authenticated";
GRANT ALL ON TABLE "public"."gatherings" TO "service_role";



GRANT ALL ON TABLE "public"."invite_redemptions" TO "anon";
GRANT ALL ON TABLE "public"."invite_redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."invite_redemptions" TO "service_role";



GRANT ALL ON TABLE "public"."invites" TO "anon";
GRANT ALL ON TABLE "public"."invites" TO "authenticated";
GRANT ALL ON TABLE "public"."invites" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































