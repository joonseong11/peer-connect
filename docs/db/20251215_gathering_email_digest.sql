-- Add email_sent column to gatherings table for daily digest functionality
-- This allows us to batch gathering notifications instead of sending individual emails

ALTER TABLE public.gatherings
ADD COLUMN IF NOT EXISTS email_sent boolean DEFAULT false;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_gatherings_email_sent
ON public.gatherings(email_sent, created_at)
WHERE email_sent = false;

COMMENT ON COLUMN public.gatherings.email_sent IS
'Indicates whether this gathering has been included in a daily digest email. Used to batch notifications and reduce email volume.';
