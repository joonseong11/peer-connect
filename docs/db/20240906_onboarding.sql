-- Adds onboarding metadata to profiles so we can detect first-time completions.
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS profile_completed_at timestamptz;

-- Mark existing profiles as completed if they have been updated before.
UPDATE profiles
SET profile_completed_at = COALESCE(profile_completed_at, updated_at, NOW())
WHERE profile_completed_at IS NULL;

-- Allow nested replies in gathering comments.
ALTER TABLE gathering_comments
ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES gathering_comments (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS gathering_comments_parent_idx
ON gathering_comments (gathering_id, parent_comment_id);

-- Track whether inviters have been prompted about a redeemed invite.
ALTER TABLE invite_redemptions
ADD COLUMN IF NOT EXISTS inviter_notified_at timestamptz;
