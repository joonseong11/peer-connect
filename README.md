# Peer Connect · SvelteKit

Peer Connect is a private invitation-based developer network that we are bringing to life with SvelteKit and Supabase. The current iteration focuses on polished marketing/landing UI and Google OAuth onboarding.

## Prerequisites

- Node.js 20+ with Corepack (`corepack enable`)
- pnpm (Corepack will provide the correct version)
- A Supabase project with Google OAuth credentials

## Environment Variables

Copy `.env.example` to `.env` and fill in the values from your Supabase dashboard:

```bash
cp .env.example .env
```

| Key | Description |
| --- | --- |
| `PUBLIC_SUPABASE_URL` | Supabase project URL (e.g. `https://xxxxx.supabase.co`) |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) API key |

> These variables are marked `PUBLIC_` because both the client and server need them for OAuth flows. Keep your service role key out of the frontend.

## Supabase Configuration Steps

1. **Create Google OAuth credentials** in the Supabase Auth Providers settings.
   - Authorized redirect URI: `http://localhost:5173/auth/callback` (for development)
2. **Add Site URL** under Authentication → URL configuration:
   - `http://localhost:5173` for local development
3. **Enable email confirmations (optional)** if you want a second factor before entering the community.

### Profiles Table

`/profile` 페이지에서 데이터를 저장하려면 다음과 같은 테이블과 RLS 정책을 추천합니다.

```sql
create table if not exists public.profiles (
  user_id uuid primary key references auth.users not null,
  full_name text not null,
  role text not null,
  email text,
  career_history text,
  introduction text,
  contact_linkedin text,
  contact_github text,
  contact_email text,
  photo_url text,
  updated_at timestamptz default timezone('utc'::text, now())
);

alter table public.profiles enable row level security;

create policy "Users can manage their own profile"
on public.profiles
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Members can browse profiles"
on public.profiles
for select using (true);
```

> 위 정책을 적용하면 로그인된 사용자만 자신의 프로필을 읽고 수정할 수 있습니다.
> `email` 컬럼은 모임 알림 및 추천서 알림 발송에 사용되며, 프로필 저장 시 자동으로 현재 로그인한 사용자의 이메일이 채워집니다.
> `contact_linkedin`, `contact_github`, `contact_email` 컬럼은 프로필 상세 페이지의 연락처 카드에 출력됩니다. 필요하지 않다면 비워두어도 됩니다.

### Endorsements Table

동료 추천 기능을 사용하려면 아래 테이블과 정책을 추가하세요.

```sql
create table if not exists public.endorsements (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.profiles (user_id) on delete cascade,
  author_id uuid not null references public.profiles (user_id) on delete cascade,
  content text not null,
  created_at timestamptz default timezone('utc'::text, now()),
  constraint endorsements_min_length check (char_length(content) >= 50),
  constraint endorsements_unique_pair unique (author_id, target_user_id)
);

alter table public.endorsements enable row level security;

create policy "All members can read endorsements"
on public.endorsements for select
using (true);

create policy "Members create endorsements for others"
on public.endorsements for insert
with check (auth.uid() = author_id and author_id <> target_user_id);

create policy "Authors can delete their endorsement"
on public.endorsements for delete
using (auth.uid() = author_id);

create policy "Members can read their endorsement status"
on public.endorsements for select
using (auth.uid() = author_id or auth.uid() = target_user_id);
```

> `endorsements` 테이블은 `profiles`와 외래키로 연결되어 있으므로, 회원 가입 직후 `profiles` 테이블에 레코드가 있어야 추천 데이터를 저장할 수 있습니다.

> **Note:** 현재 앱에서는 초대 기능을 테스트 목적으로 비활성화했습니다. 위 스키마를 적용해 두면, 이후 `src/lib/config.ts`의 `INVITES_ENABLED` 값을 `true`로 바꿔 기능을 다시 활성화할 수 있습니다.

### Gatherings (모임 라운지) Tables

모임 라운지 게시판과 댓글 기능을 사용하려면 아래 테이블과 정책을 추가하세요.

```sql
create table if not exists public.gatherings (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (user_id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz default timezone('utc'::text, now()),
  updated_at timestamptz default timezone('utc'::text, now())
);

alter table public.gatherings enable row level security;

create policy "Members can read gatherings"
on public.gatherings for select
using (true);

create policy "Members manage their gatherings"
on public.gatherings for all
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create table if not exists public.gathering_comments (
  id uuid primary key default gen_random_uuid(),
  gathering_id uuid not null references public.gatherings (id) on delete cascade,
  author_id uuid not null references public.profiles (user_id) on delete cascade,
  content text not null,
  created_at timestamptz default timezone('utc'::text, now()),
  updated_at timestamptz default timezone('utc'::text, now())
);

alter table public.gathering_comments enable row level security;

create policy "Members can read gathering comments"
on public.gathering_comments for select
using (true);

create policy "Members manage their gathering comments"
on public.gathering_comments for all
using (auth.uid() = author_id)
with check (auth.uid() = author_id);
```

### Email Notifications

이메일 알림을 사용하려면 [Resend](https://resend.com/) 또는 호환되는 트랜잭션 메일 서비스를 설정하고 아래 환경 변수를 추가하세요.

| Key | Description |
| --- | --- |
| `RESEND_API_KEY` | Resend API Key (서버 전용) |
| `RESEND_FROM_EMAIL` | 발신 이메일 주소 (예: `Peer Connect <community@yourdomain.com>`) |
| `PUBLIC_APP_URL` | 이메일 링크에 사용할 서비스 기본 URL (예: `https://peerconnect.example.com`) |

`PUBLIC_APP_URL` 값은 개발 환경에서 `http://localhost:5173`로 지정해두면 편리합니다. Resend가 아닌 다른 서비스(예: AWS SES)를 사용한다면 `src/lib/server/email.ts`를 원하는 클라이언트 코드로 커스터마이징하세요.

### Profile Photo Storage

프로필 사진 업로드를 사용하려면 Supabase Storage에 `profile-photos` 버킷을 만든 뒤 Public 권한을 열어주세요.

1. Storage → Create bucket → `profile-photos` (Public)
2. RLS는 Storage 규칙을 이용해 `auth.role() = 'authenticated'`인 경우 업로드/삭제/읽기가 가능하도록 설정합니다.
3. 이미지는 `https://<project>.supabase.co/storage/v1/object/public/profile-photos/...` 형식의 URL로 노출됩니다.

### Notification Preference Columns

마이페이지의 이메일 알림 토글은 `profiles` 테이블에 다음 컬럼이 존재할 때 동작합니다. 기본값을 `true`로 두어 새 사용자에게 자동으로 알림이 활성화되도록 설정하세요.

```sql
alter table public.profiles
  add column if not exists notify_endorsements boolean not null default true,
  add column if not exists notify_gatherings boolean not null default true,
  add column if not exists notify_comments boolean not null default true;
```

서비스 운영 중 컬럼을 추가하는 경우, 기본값이 적용되도록 `NOT NULL` 제약과 `DEFAULT true`를 함께 지정해야 합니다.

### Account Deletion

회원 탈퇴 기능은 Supabase 인증 사용자를 제거해야 하므로 `SUPABASE_SERVICE_ROLE_KEY` 환경 변수가 설정되어 있어야 합니다. 서비스 역할 키 없이 애플리케이션을 실행하면 탈퇴 요청이 거부됩니다.

### Invites Table

초대권 슬롯과 사용 이력을 관리하려면 다음 테이블과 정책을 추가하세요. `slot_index`는
사용자별 카드 위치(1, 2, …)를, `max_redemptions`는 해당 카드의 최대 사용 가능 횟수를 뜻합니다.
베타 초대권처럼 무제한 사용이 가능한 카드는 `max_redemptions`를 `NULL`로 두고 `beta_unlimited`
컬럼을 `true`로 설정하세요.

```sql
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  inviter_user_id uuid references public.profiles (user_id) on delete cascade,
  slot_index smallint not null,
  max_redemptions integer,
  beta_unlimited boolean not null default false,
  created_at timestamptz default timezone('utc'::text, now()),
  deactivated_at timestamptz,
  constraint invites_inviter_slot_key unique (inviter_user_id, slot_index)
);

create table if not exists public.invite_redemptions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid references public.invites (id) on delete cascade,
  invitee_user_id uuid references public.profiles (user_id) on delete set null,
  redeemed_at timestamptz default timezone('utc'::text, now())
);

create unique index if not exists invite_redemptions_invitee_unique on public.invite_redemptions(invitee_user_id);
create index if not exists invite_redemptions_invite_id_idx on public.invite_redemptions(invite_id);

alter table public.invites enable row level security;
alter table public.invite_redemptions enable row level security;

create policy "Members view their invites"
on public.invites
for select using (
  auth.uid() = inviter_user_id
  or auth.uid() in (
    select invitee_user_id
    from public.invite_redemptions
    where invite_id = invites.id
  )
);

-- 베타 초대권 공유를 위해 인증된 사용자라면 코드 조회를 허용합니다.
create policy "Authenticated lookup invite codes"
on public.invites
for select using (auth.role() = 'authenticated');

create policy "Members create invites"
on public.invites
for insert with check (auth.uid() = inviter_user_id);

create policy "Invite owners manage cards"
on public.invites
for update using (auth.uid() = inviter_user_id)
with check (auth.uid() = inviter_user_id);

create policy "Invitees redeem codes"
on public.invite_redemptions
for insert with check (auth.uid() = invitee_user_id);

create policy "View invite redemption activity"
on public.invite_redemptions
for select using (
  auth.uid() = invitee_user_id
  or auth.uid() in (
    select inviter_user_id
    from public.invites
    where invites.id = invite_id
  )
);
```

> 기존 데이터가 있다면 각 사용자별로 `slot_index`와 `max_redemptions` 값을 채워
> 두 개의 초대권 슬롯 구조(1회용 2장)를 맞춰주세요. 특정 초대권을 무제한으로 전환하려면
> 해당 레코드의 `beta_unlimited`를 `true`로 설정하고 `max_redemptions`를 `NULL`로 두면 됩니다.

초대권 슬롯 개수와 베타 전용 슬롯 인덱스는 `src/lib/config.ts`에서 조정할 수 있습니다.
무제한 초대권을 특정 사용자에게만 부여하려면 서버 환경 변수 `INVITE_UNLIMITED_USER_IDS`에
유저 ID를 콤마로 구분해 넣고, `INVITE_UNLIMITED_SLOT_INDEX`로 무제한으로 만들 슬롯을 지정하세요.

최초 가입자를 위한 비상 초대 코드가 필요하다면 `INVITE_FALLBACK_CODE` 환경 변수를 설정하세요.
해당 코드는 첫 번째 가입자만 사용할 수 있으며, 사용 후 자동으로 비활성화됩니다.

## Development

Install dependencies and start the dev server:

```bash
corepack pnpm install
corepack pnpm dev
```

The landing page now exposes:

- Google OAuth login / logout
- Session-aware UI states (profile CTA, hero messaging)
- Supabase SSR integration with cookie-based sessions
- `/profile` route for creating/updating the authenticated member profile
- `/members` list and detail pages for exploring peers
- One-per-author endorsements with 50자 이상 검증 및 삭제 기능

## Next Ideas

- Build invite analytics dashboards (redemption funnels, share counts)
- Add board CRUD with optimistic updates and audit history
- Surface activity feeds or notifications for 새 추천/초대 이벤트
