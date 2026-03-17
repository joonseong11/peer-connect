-- Add blog URL to profiles
ALTER TABLE profiles ADD COLUMN contact_blog text;

-- Blog posts table
CREATE TABLE blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  CONSTRAINT blog_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL UNIQUE,
  summary text,
  thumbnail_url text,
  published_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blog_posts_author_id ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);

-- RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read blog posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (true);

-- Explicitly revoke write access (project default grants ALL to authenticated)
REVOKE INSERT, UPDATE, DELETE ON blog_posts FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON blog_posts FROM anon;
