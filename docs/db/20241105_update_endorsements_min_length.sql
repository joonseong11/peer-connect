-- Reduce the minimum length requirement for endorsement content to 20 characters.
ALTER TABLE public.endorsements
DROP CONSTRAINT IF EXISTS endorsements_min_length;

ALTER TABLE public.endorsements
ADD CONSTRAINT endorsements_min_length CHECK (char_length(content) >= 20);
