# Peer Connect Information Architecture

## 목적

이 문서는 `Private Technical Salon` 방향을 실제 제품 구조로 번역한 정보구조 초안이다. 단순히 메뉴를 나누는 것이 아니라, 사용자가 어떤 흐름으로 서비스 안을 이동해야 하는지 정의한다.

관련 방향 문서:

- [current-ui-audit.md](/Users/jujeon/dev/peer-connect-svelte/docs/ui-ux/current-ui-audit.md)
- [redesign-direction.md](/Users/jujeon/dev/peer-connect-svelte/docs/ui-ux/redesign-direction.md)

## 핵심 IA 원칙

- 로그인 전과 로그인 후의 첫 화면 목적을 분리한다.
- 탐색, 관계 형성, 작성, 관리의 성격을 서로 다른 레이어로 나눈다.
- 사용자는 언제나 “지금 어디 있는지”와 “다음에 무엇을 해야 하는지”를 바로 이해해야 한다.
- 멤버와 모임은 카드 모음이 아니라 탐색 가능한 디렉터리/라운지로 설계한다.
- 프로필 작성, 초대, 설정은 관리 흐름으로 묶되, 마이페이지에서 우선순위를 분명히 보여준다.

## 최상위 구조

### 로그인 전

- `/`
  - 브랜드 랜딩
  - 가치 제안
  - 커뮤니티 신뢰 신호
  - 초대 기반 운영 원리
  - 가입 진입
- `/privacy`
  - 정책 페이지
- `/auth/login`
  - 로그인 진입
- `/auth/callback`
  - 인증 복귀

### 로그인 후

- `/`
  - 멤버 홈
  - 최근 활동, 추천 요청, 모임 추천, 네트워크 탐색 진입
- `/members`
  - 멤버 디렉터리
- `/members/[userId]`
  - 멤버 프로필 상세
- `/gatherings`
  - 모임 라운지
- `/gatherings/new`
  - 모임 작성
- `/gatherings/[gatheringId]`
  - 모임 상세
- `/invite`
  - 초대 관리
- `/mypage`
  - 개인 대시보드
- `/mypage/profile`
  - 내 프로필 상세 보기
- `/profile`
  - 프로필 수정/작성
- `/mypage/avatar`
  - 아바타 수정
- `/mypage/settings`
  - 알림/계정 설정

## 내비게이션 구조

### 글로벌 내비게이션

비로그인:

- 서비스 소개
- 커뮤니티 방식
- 로그인

로그인:

- 홈
- 멤버
- 모임
- 초대
- 내 활동

보조 액션:

- 검색
- 프로필 메뉴
- 로그아웃

## 추천 메뉴 라벨

현재보다 목적이 더 드러나는 라벨로 간다.

- `소개`보다 `왜 Peer Connect인가`
- `멤버`는 유지
- `모임 라운지`는 `모임`
- `마이페이지`는 메뉴 레벨에서는 `내 활동`
- `프로필 설정`은 `프로필 편집`

## 페이지군별 역할

### 1. Home

목적:

- 로그인 전에는 가입을 설득한다.
- 로그인 후에는 활동을 시작하게 한다.

로그인 후 홈에서 보여줄 것:

- 오늘의 네트워크 신호
- 새로 올라온 추천/모임
- 내가 해야 할 다음 행동
- 추천 멤버

### 2. Members

목적:

- 사람을 비교하고, 신뢰를 읽고, 연결 결정을 돕는다.

필수 정보:

- 이름
- 역할
- 핵심 관심사
- 추천 수
- 최근 활동

### 3. Gatherings

목적:

- 커뮤니티 활동 발견
- 참여 판단
- 직접 개설

필수 정보:

- 모임 형식
- 현재 상태
- 주최자
- 모집 맥락
- 참여 방식

### 4. Profile

목적:

- 나를 신뢰 가능한 동료로 표현
- 프로필 품질 개선 유도

필수 정보:

- 기본 정보
- 경력/소개
- 공개용 링크
- 완료도

### 5. My Activity

목적:

- 관리 페이지 모음이 아니라 개인 대시보드

핵심 블록:

- 프로필 상태
- 받은 추천
- 최근 활동
- 초대 상태
- 설정 바로가기

### 6. Invite

목적:

- 네트워크 확장
- 초대 상태 관리
- 관계 맥락 확인

핵심 블록:

- 사용 가능한 초대
- 내가 받은 초대
- 보낸 초대 상태

## 추천 사이트맵

```text
Public
/
|- Hero
|- Trust Signals
|- Sample Members
|- Sample Gatherings
|- How Invitations Work
|- CTA
|
|- /privacy
|- /auth/login
|- /auth/callback

Authenticated
/
|- Today Signal
|- Suggested Members
|- Active Gatherings
|- Endorsement Prompt
|- Profile Completion
|
|- /members
|  |- filters
|  |- list/grid toggle
|  |- member cards
|
|- /members/[userId]
|  |- profile hero
|  |- trust signals
|  |- activity
|  |- endorsements
|
|- /gatherings
|  |- featured
|  |- filters
|  |- lounge feed
|
|- /gatherings/new
|  |- format selection
|  |- detail form
|  |- publish action
|
|- /gatherings/[gatheringId]
|  |- event summary
|  |- host info
|  |- detail body
|  |- comments
|
|- /invite
|  |- invite inventory
|  |- sent invites
|  |- received invite context
|
|- /mypage
|  |- dashboard
|  |- profile status
|  |- invitation status
|  |- settings shortcuts
|
|- /mypage/profile
|- /profile
|- /mypage/avatar
|- /mypage/settings
```

## 주요 사용자 흐름

### 흐름 1. 신규 방문자에서 가입까지

1. 랜딩 진입
2. 커뮤니티 신뢰 신호 확인
3. 초대 기반 운영 방식 이해
4. 로그인
5. 프로필 작성 또는 홈 진입

### 흐름 2. 로그인 후 활동 시작

1. 홈 진입
2. 추천 멤버 또는 모임 노출
3. 멤버 상세 또는 모임 상세 이동
4. 추천 남기기 또는 댓글/참여 의사 남기기

### 흐름 3. 내 프로필 품질 개선

1. 홈 또는 마이페이지에서 프로필 완성도 확인
2. 프로필 편집 이동
3. 기본 정보, 소개, 링크 보완
4. 저장 후 내 프로필 보기

### 흐름 4. 네트워크 확장

1. 마이페이지 또는 초대 화면 진입
2. 사용 가능한 초대 확인
3. 초대 링크 복사 또는 발급
4. 초대한 멤버의 연결 상태 확인

## 현재 라우트와의 매핑

큰 라우트 이동 없이도 1차 개편이 가능하도록 매핑을 잡는다.

| 현재 라우트 | 개편 후 역할 | 비고 |
| --- | --- | --- |
| `/` | 비로그인 랜딩 / 로그인 홈 | 세션 분기 유지 |
| `/members` | 멤버 디렉터리 | 필터, 정렬, 보기 전환 추가 |
| `/members/[userId]` | 멤버 프로필 상세 | 프로필 hero와 신뢰 신호 강화 |
| `/gatherings` | 모임 라운지 | 게시판에서 라운지형 구조로 전환 |
| `/gatherings/new` | 모임 작성 | 단계적 작성 구조 적용 가능 |
| `/gatherings/[gatheringId]` | 모임 상세 | 참여 판단 정보 상단화 |
| `/mypage` | 개인 대시보드 | 링크 허브에서 대시보드로 변경 |
| `/profile` | 프로필 편집 | 단계형 폼으로 전환 |
| `/mypage/profile` | 내 프로필 보기 | 편집과 보기 역할 분리 유지 |
| `/invite` | 초대 관리 | 브랜드화된 초대 인벤토리 |
| `/mypage/settings` | 설정 | 위험 구역 분리 강화 |

## breadcrumb 규칙

3단계 이상 깊이에서 breadcrumb 또는 명확한 상위 링크를 사용한다.

예시:

- 홈 / 멤버 / 김소연
- 홈 / 모임 / LLM 프롬프트 엔지니어링 스터디
- 내 활동 / 설정

## 검색과 필터 전략

### 멤버

- 역할
- 관심사
- 추천 수
- 최근 활동 기준 정렬

### 모임

- 형식
- 모집 상태
- 최신순 / 인기순
- 온라인 / 오프라인

## 1차 IA 적용 범위

바로 구현에 들어갈 때는 아래 범위만 먼저 바꿔도 체감이 크다.

- 로그인 후 홈 추가 또는 `/` 내부 분기 강화
- 글로벌 내비게이션 재정의
- 멤버 디렉터리 구조 개편
- 모임 라운지 구조 개편
- 마이페이지를 대시보드로 재정의

## 결론

이 IA의 핵심은 페이지 수를 늘리는 것이 아니다. 같은 라우트를 유지하더라도, 각 화면이 맡는 역할을 분명히 나눠 사용자에게 더 명확한 리듬을 주는 데 있다.
