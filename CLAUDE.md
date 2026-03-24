# Peer Connect — Agent Instructions

## Product Context

Peer Connect는 **신뢰 기반 개발자 네트워크**입니다.
프로덕트 철학, 현재 상태, 로드맵은 `.planning/PRODUCT.md`를 참조하세요.

작업 시작 전에 반드시 `.planning/PRODUCT.md`를 읽고, 현재 Phase와 우선순위를 확인하세요.

## Tech Stack

- **구조**: pnpm Workspaces 모노레포 (`apps/*`, `packages/*`)
- **프레임워크**: SvelteKit (SSR, Svelte 5 runes 문법 사용)
- **DB/Auth/Storage**: Supabase
- **스타일링**: Tailwind CSS (커스텀 `peer-*` 디자인 토큰, `packages/shared/src/tailwind.config.cjs`)
- **이메일**: Resend
- **배포**: Vercel (각 앱 별도 프로젝트)
- **패키지 매니저**: pnpm

## Monorepo Structure

```
apps/
  web/          — @peer/web: 서비스 앱 (기존 메인 앱)
  admin/        — @peer/admin: 어드민 앱 (CRUD 관리)
packages/
  shared/       — @peer/shared: 공유 서버유틸, 타입, Tailwind 토큰
supabase/       — 공유 DB 마이그레이션 (루트에 위치)
```

- **공유 패키지 import**: `@peer/shared/server`, `@peer/shared/utils`, `@peer/shared/config`, `@peer/shared/tailwind`
- **`$env` 규칙**: 공유 패키지에서는 SvelteKit `$env` 직접 사용 금지. 앱 레이어에서 파라미터로 주입.
- **빌드**: `pnpm build` (전체), `pnpm --filter @peer/web build` (개별)
- **개발**: `pnpm dev` (web), `pnpm dev:admin` (admin, port 5174)

## Conventions

- **언어**: UI 텍스트는 한국어. 코드(변수명, 주석, 커밋)는 영어.
- **날짜/시간**: `Date` 객체 직접 사용 가능 (dayjs 의존성 없음).
- **LSP 우선**: 코드 탐색 시 Grep/Glob 전에 LSP 도구를 먼저 사용할 것.
- **DB 변경**: 스키마 변경 시 `supabase/migrations/` 에 마이그레이션 파일 생성 필수.
- **브랜치**: `master` (prod), `develop` (staging). Feature 브랜치는 `feat/` 접두사.
- **커밋**: conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`).

## Key Files

```
apps/web/src/lib/config.ts                    — 기능 플래그 (초대 활성화 등)
apps/web/src/lib/server/invite.ts             — 초대 시스템 로직
apps/web/src/lib/server/externalEndorsement.ts — 외부 추천서 클레임
apps/web/src/lib/server/notifications.ts       — 이메일 알림
apps/web/src/routes/api/badge/                 — GitHub 배지 SVG 생성
apps/web/src/routes/members/                   — 멤버 디렉토리 & 프로필
apps/admin/src/hooks.server.ts                 — 어드민 인증 + is_admin 체크
packages/shared/src/server/                    — 공유 Supabase/이메일 유틸
packages/shared/src/tailwind.config.cjs        — 디자인 토큰 canonical source
.planning/PRODUCT.md                           — 프로덕트 비전 & 로드맵
```

## Autonomous Work Guidelines

에이전트가 자율적으로 프로덕트를 개선할 때의 기준:

1. `.planning/PRODUCT.md`의 Phase 순서를 존중 (Phase 1 → 2 → 3)
2. 작은 단위로 구현하고 독립 배포 가능하게
3. 기존 기능(인증, 초대, 추천서)을 깨뜨리지 않도록 보수적으로
4. 보안(인증, 권한)은 절대 타협하지 않음
5. 의사결정 우선순위: `사용자 가치 > 성장 > 기술적 완성도 > 코드 품질`
6. 작업 완료 후 `.planning/PRODUCT.md`의 변경 이력에 기록
