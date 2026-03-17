# Blog Feed Design — 동료 블로그 RSS 수집 및 피드

## Overview

멤버 프로필에 블로그 URL을 추가하고, RSS를 자동 수집하여 Peer Connect 내에서 동료들의 블로그 글을 모아볼 수 있는 기능.

**목적**: 재방문 이유 생성. 동료의 글이 자동으로 흘러들어와 플랫폼 방문 동기를 부여.

**Phase**: PRODUCT.md Phase 2 (재방문 이유 만들기) — 우선 구현 대상

---

## Database Changes

### 1. profiles 테이블 컬럼 추가

```sql
ALTER TABLE profiles ADD COLUMN contact_blog text;
```

- Nullable, 기존 contact_linkedin/contact_github/contact_email과 동일 패턴
- 블로그 URL 저장 (예: `https://velog.io/@username`, `https://myblog.tistory.com`)

### 2. blog_posts 테이블 (신규)

```sql
CREATE TABLE blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
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
```

- `url UNIQUE`: 동일 글 중복 수집 방지
- `summary`: RSS description에서 추출, HTML 태그 제거 후 plain text, 200자 제한
- `thumbnail_url`: RSS의 enclosure 또는 media:thumbnail (content 내 img 파싱은 V1에서 제외)
- `author_id`: profiles.user_id FK, CASCADE 삭제
- `created_at`: 기존 테이블 패턴과 일관성 유지

### RLS (Row Level Security)

```sql
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- 읽기: 인증된 사용자 모두 가능
CREATE POLICY "Authenticated users can read blog posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (true);

-- 쓰기 권한을 authenticated/anon에서 명시적으로 제거
-- (프로젝트의 ALTER DEFAULT PRIVILEGES가 authenticated에게 ALL을 부여하므로 반드시 필요)
REVOKE INSERT, UPDATE, DELETE ON blog_posts FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON blog_posts FROM anon;
```

---

## RSS Feed Fetching

### Cron Endpoint

- **Path**: `/src/routes/api/cron/blog-fetch/+server.ts`
- **Method**: GET
- **Auth**: 기존 gathering-digest와 동일 패턴 (인증 없음, Vercel Cron에서만 호출)
- **Schedule**: 1일 1회 (Vercel cron: `0 22 * * *` = KST 07:00)
- **DB 클라이언트**: `getSupabaseAdminClient()` (service_role key) 사용

### Vercel Cron 설정

`vercel.json`에 cron 설정 추가 필요:

```json
{
  "crons": [
    { "path": "/api/cron/gathering-digest", "schedule": "0 22 * * *" },
    { "path": "/api/cron/blog-fetch", "schedule": "0 22 * * *" }
  ]
}
```

### Feed Discovery Logic

블로그 URL에서 RSS 피드를 자동 탐색:

```
1. URL에서 직접 피드 가져오기 시도 (Content-Type 확인)
2. 실패 시, 일반적인 피드 경로 시도:
   - /rss
   - /feed
   - /feed.xml
   - /atom.xml
   - /rss.xml
   - /index.xml
3. 플랫폼별 패턴:
   - velog.io/@{user} → velog.io/rss/@{user}
   - {name}.tistory.com → {name}.tistory.com/rss
   - medium.com/@{user} → medium.com/feed/@{user}
4. 실패 시: HTML에서 <link rel="alternate" type="application/rss+xml"> 탐색
```

### URL 보안 검증

사용자 입력 URL을 서버에서 fetch하므로 SSRF 방지 필수:

- **HTTPS만 허용** (`http://`, `file://`, `ftp://` 거부)
- **사설 IP 차단**: 127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x
- **응답 크기 제한**: 최대 1MB
- **리다이렉트 제한**: 최대 3회
- 프로필 저장 시에도 URL 형식 + HTTPS 검증

### Feed Parsing

- RSS 2.0 및 Atom 형식 지원
- XML 파싱: `fast-xml-parser` 사용
- HTML 제거: 정규식 기반 태그 스트리핑 (별도 라이브러리 없이)
- 각 항목에서 추출:
  - `title`: RSS item title
  - `url`: RSS item link (canonical)
  - `summary`: description → HTML 태그 제거 → plain text → 200자 제한
  - `thumbnail_url`: enclosure 또는 media:thumbnail만 (V1)
  - `published_at`: pubDate 또는 published. 없으면 `fetched_at`을 fallback으로 사용

### Storage Policy

- 멤버당 최신 5개 글만 유지
- 수집 시 기존 글 중 가장 오래된 것 삭제 (5개 초과 시)
- `url UNIQUE` 제약으로 이미 저장된 글은 스킵
- 사용자가 `contact_blog`를 삭제해도 기존 blog_posts는 유지 (다음 수집 시 새 글이 안 들어올 뿐)

### Error Handling

- 개별 블로그 피드 실패 시 해당 멤버만 스킵, 다른 멤버 계속 처리
- 연속 3회 실패한 블로그는 로그만 남기고 계속 시도 (자동 비활성화 없음)
- 타임아웃: 피드당 10초

---

## UI Changes

### 1. 프로필 수정 페이지 (`/profile`)

- 기존 contact_github, contact_linkedin, contact_email 아래에 블로그 URL 입력 추가
- Label: "블로그"
- Placeholder: "https://velog.io/@username"
- Validation: URL 형식 검증, HTTPS만 허용
- **서버 변경**: `profile/+page.server.ts`의 `PROFILE_FIELDS` 배열에 `contact_blog` 추가

### 2. 홈 대시보드 (`/`)

- 기존 "최근 모임" 섹션 아래에 "동료의 최근 글" 섹션 추가
- 최신 3개 표시
- 각 항목: 썸네일(있으면) + 제목 + 작성자 이름/역할 + 게시일
- "더보기" 링크 → `/blog`
- 블로그 글이 없으면 섹션 숨김
- **서버 변경**: `+page.server.ts`에 blog_posts 쿼리 추가 (profiles 조인으로 작성자 정보 포함)

### 3. 블로그 피드 페이지 (`/blog`) — 신규

- 네비게이션에 "블로그" 탭 추가
- 전체 블로그 글 목록, 최신순
- **페이지네이션**: 20개씩 로드, "더 보기" 버튼 (커서 기반, `published_at` 기준)
- 각 카드:
  - 썸네일 이미지 (없으면 숨김)
  - 글 제목 (클릭 → 원본 블로그로 새 탭)
  - 요약 (2줄 truncate)
  - 작성자: 프로필 사진 + 이름 + 역할 (클릭 → 멤버 프로필)
  - 게시일
- 인증 필요: `+page.server.ts`에서 세션 체크, 미인증 시 리다이렉트
- 초대 게이트 적용 (기존 layout 패턴)

### 4. 멤버 프로필 (`/members/[userId]`)

- 연락처 섹션에 블로그 링크 추가 (contact_blog가 있을 때)
- 기존 LinkedIn, GitHub, 이메일과 동일 패턴
- **서버 변경**: `members/[userId]/+page.server.ts` select 컬럼에 `contact_blog` 추가

### 5. 마이페이지 프로필 (`/mypage/profile`)

- 연결 채널 카운트에 블로그 포함
- 연락처 목록에 블로그 표시
- **서버 변경**: `mypage/profile/+page.server.ts` select 컬럼에 `contact_blog` 추가

---

## Navigation Change

`AppHeader.svelte` 네비게이션에 "블로그" 링크 추가:

```
Home | Members | Gatherings | Blog | Invite
```

- 인증된 사용자에게만 표시
- 경로: `/blog`

---

## Scope Exclusions (하지 않는 것)

- 블로그 글 전문 저장 (링크만, 원본으로 이동)
- 좋아요/댓글 기능 (1차에서는 읽기 전용)
- 실시간 수집 (1일 1회 배치)
- 블로그 글 검색
- 카테고리/태그 필터링
- 비인증 사용자에게 블로그 피드 공개
- RSS content 내 img 태그 파싱 (V1에서는 enclosure/media:thumbnail만)

---

## Affected Files (전체 변경 대상)

```
신규 파일:
  src/routes/api/cron/blog-fetch/+server.ts    -- RSS 수집 cron
  src/routes/blog/+page.server.ts              -- 블로그 피드 데이터 로드 (auth 체크 포함)
  src/routes/blog/+page.svelte                 -- 블로그 피드 UI
  src/lib/server/blogFeed.ts                   -- RSS 파싱/수집/보안검증 로직
  supabase/migrations/YYYYMMDDHHMMSS_blog_posts.sql

수정 파일:
  src/routes/profile/+page.svelte              -- contact_blog 입력 필드
  src/routes/profile/+page.server.ts           -- PROFILE_FIELDS에 contact_blog 추가
  src/routes/+page.server.ts                   -- 홈 대시보드에 blog_posts 쿼리 추가
  src/routes/+page.svelte                      -- 홈에 "동료의 최근 글" 섹션
  src/routes/members/[userId]/+page.svelte     -- 연락처에 블로그 표시
  src/routes/members/[userId]/+page.server.ts  -- select에 contact_blog 추가
  src/routes/mypage/profile/+page.svelte       -- 연락처에 블로그 표시
  src/routes/mypage/profile/+page.server.ts    -- select에 contact_blog 추가
  src/lib/components/AppHeader.svelte          -- 네비게이션에 블로그 탭
  vercel.json                                  -- cron 설정 추가
```

---

## Dependencies

- `fast-xml-parser`: RSS/Atom XML 파싱 (lightweight, no native deps)
- 기존 의존성만으로 나머지 처리 가능

---

## Testing

- `blogFeed.ts`: RSS 파싱 유닛 테스트 (RSS 2.0, Atom, 각 플랫폼 형식)
- Feed discovery: 플랫폼별 URL → 피드 URL 변환 테스트
- URL 보안 검증: 사설 IP 차단, HTTPS 강제 테스트
- HTML 태그 스트리핑 테스트
- Cron endpoint: 통합 테스트 (mock fetch)
