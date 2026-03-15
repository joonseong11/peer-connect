# Peer Connect Wireframe Draft

## 목적

이 문서는 1차 리디자인에서 우선 손볼 핵심 화면의 레이아웃 골격을 텍스트 와이어프레임으로 정리한 초안이다. 비주얼 스타일보다 정보 우선순위와 화면 리듬에 집중한다.

관련 문서:

- [redesign-direction.md](/Users/jujeon/dev/peer-connect-svelte/docs/ui-ux/redesign-direction.md)
- [information-architecture.md](/Users/jujeon/dev/peer-connect-svelte/docs/ui-ux/information-architecture.md)

## 공통 레이아웃 규칙

- 헤더는 항상 얇고 단단하게 유지한다.
- 각 페이지는 `Hero`, `Primary Content`, `Secondary Rail`의 세 구획을 기본 리듬으로 삼는다.
- 카드 남발을 피하고, 한 화면당 시각적으로 가장 강한 표면은 1개만 둔다.
- 보조 정보는 메타 라인, 태그, 리스트로 축약한다.

## 1. Public Landing

### 목적

- Peer Connect의 성격을 빠르게 이해시킨다.
- 신뢰 기반 네트워크라는 차별점을 보여준다.
- 로그인으로 자연스럽게 이어진다.

### 구조

```text
[Global Header]
Logo | Why Peer Connect | Invitation Model | Login

[Hero]
eyebrow: Private developer network
headline: 믿을 만한 동료와 더 깊게 연결되는 기술 네트워크
supporting copy
Primary CTA: Google로 시작하기
Secondary CTA: 커뮤니티 둘러보기
Right visual:
- sample member cards
- endorsement quote
- activity stats

[Trust Signals]
추천 수 | 활발한 멤버 수 | 진행 중인 모임 수 | 초대 기반 운영

[Featured Members]
3 member highlights
- role
- specialty tags
- short endorsement

[Featured Gatherings]
2-3 sample gatherings
- format
- host
- why join

[Invitation Model]
step 1 초대
step 2 프로필/추천
step 3 교류 확장

[Final CTA]
headline
login CTA

[Footer]
privacy
```

### 포인트

- 현재보다 섹션 수는 비슷해도 카드 수는 줄인다.
- 실제 사람과 활동이 hero 안에서 먼저 보이게 한다.
- “소개 보기”보다 “왜 이 구조가 신뢰를 만드는가”에 초점을 둔다.

## 2. Authenticated Home

### 목적

- 로그인 직후 바로 행동을 시작하게 한다.
- “내가 이 네트워크 안에서 어디에 서 있는지”를 한눈에 보여준다.

### 구조

```text
[Header]
Logo | Home | Members | Gatherings | Invite | My Activity | Search | Profile Menu

[Hero Summary]
headline: 오늘의 Peer Connect
subcopy: 최근 네트워크 변화 요약
right side summary chips:
- 받은 추천 n개
- 새 모임 n개
- 프로필 완성도 n%

[Primary Grid]
left 8 cols:
  [Suggested Members]
  member row / compact cards x 3

  [Active Gatherings]
  featured gathering list x 3

right 4 cols:
  [Next Best Action]
  complete profile / leave endorsement / create gathering

  [Invite Status]
  available invites
  recent accepted invite

  [My Snapshot]
  profile updated date
  recent activity
```

### 포인트

- 현재의 랜딩을 로그인 후에도 보여주지 않는다.
- 홈은 마케팅이 아니라 행동 시작 화면이어야 한다.

## 3. Members Directory

### 목적

- 멤버를 더 빨리 스캔하고, 비교하고, 들어가게 만든다.

### 구조

```text
[Page Intro]
breadcrumb
title: 멤버 디렉터리
supporting text

[Filter Bar]
search input
role filter
interest filter
sort: recent activity / endorsement / newest
view toggle: list / grid

[Content]
left 3 cols:
  [Curated Panel]
  지금 눈여겨볼 멤버
  small explanation

right 9 cols:
  [Member Results]
  repeated member rows/cards
  each item includes:
  - avatar
  - name + role
  - 2-3 tags
  - one-line intro
  - endorsement count
  - recent activity
  - CTA: 프로필 보기
```

### 카드보다 행(row) 구조를 추천하는 이유

- 프로필 비교가 더 쉽다.
- 스캔 속도가 빨라진다.
- 추천 수, 태그, 최근 활동 같은 메타를 넣기 좋다.

## 4. Member Profile Detail

### 목적

- 이 사람이 어떤 사람인지 5초 안에 이해시킨다.
- 추천을 남길지, 연락할지, 연결할지 결정하게 한다.

### 구조

```text
[Breadcrumb]
Home / Members / Member Name

[Profile Hero]
avatar
name
role
one-line intro
trust chips:
- endorsements
- recent gathering activity
- key interests
Primary CTA: 추천 남기기
Secondary CTA: 연락처 보기

[Main Split]
left 7 cols:
  [About]
  long introduction

  [Career Timeline]
  line-based timeline list

  [Endorsements Feed]
  endorsement cards in chronological order

right 5 cols:
  [Quick Facts]
  role
  interests
  joined / updated

  [Contact]
  linkedin / github / email

  [Activity]
  recent gatherings
  recent endorsement received
```

### 포인트

- 지금처럼 소개와 연락처를 모두 비슷한 카드 밀도로 놓지 않는다.
- 상단 hero 하나에서 이 사람의 핵심 신뢰 정보가 끝나야 한다.

## 5. Gatherings Lounge

### 목적

- 게시판 느낌을 줄이고, 참여하고 싶은 활동을 고르게 한다.

### 구조

```text
[Page Intro]
title: 모임 라운지
copy
Primary CTA: 모임 열기

[Featured Band]
featured gathering
- format
- host
- why it matters
- join/comment CTA

[Control Bar]
filter by format
filter by status
sort
view toggle

[Lounge Feed]
gathering cards/list items
each item:
- title
- format badge
- host
- created time
- summary
- response count
- status
```

### 포인트

- 상단 featured 영역이 있어야 라운지가 산다.
- 모든 글이 동일한 무게로 나열되면 다시 게시판처럼 보인다.

## 6. Gathering Detail

### 목적

- 읽기 전에 참여 판단을 돕는다.
- 그 다음 상세 맥락과 댓글로 이어진다.

### 구조

```text
[Breadcrumb]
Home / Gatherings / Gathering Title

[Gathering Hero]
title
format badge
status badge
host identity
created / updated
summary sentence
Primary CTA: 댓글로 참여 의사 남기기

[Main Split]
left 8 cols:
  [What This Is]
  full content

  [Conversation]
  comments and replies

right 4 cols:
  [Host Card]
  avatar / name / role

  [Participation Info]
  expected participants
  how to join
  useful links

  [Related Gatherings]
  similar meetings
```

### 포인트

- 댓글은 중요하지만, 상세 정보보다 먼저 나오면 안 된다.
- 작성자 액션은 아이콘만 두지 말고 더 명시적으로 드러내는 것이 좋다.

## 7. Profile Edit

### 목적

- 긴 입력을 덜 무겁게 느끼게 한다.
- 작성 과정에서 품질을 높인다.

### 구조

```text
[Page Intro]
title: 프로필 편집
supporting copy
completion meter

[Form Layout]
left 7 cols:
  step 1 기본 정보
  step 2 소개와 경력
  step 3 링크와 연락처

right 5 cols:
  [Live Preview]
  avatar
  name / role
  intro preview
  trust preview

[Sticky Footer Actions]
save draft
save profile
```

### 포인트

- 지금의 단일 긴 폼보다 단계 감각이 중요하다.
- 미리보기는 사용자가 “이 정보가 어떻게 읽히는지”를 이해하게 만든다.

## 8. My Activity Dashboard

### 목적

- 관리 메뉴로 흩어진 상태를 개인 허브로 재정렬한다.

### 구조

```text
[Page Hero]
name
role
profile completion
Primary CTA: 프로필 보완하기

[Dashboard Grid]
left 8 cols:
  [Received Endorsements]
  latest endorsements

  [Recent Activity]
  my recent gathering / profile updates

right 4 cols:
  [Invite Inventory]
  available invites
  recent accepted invite

  [Profile Health]
  missing fields
  suggested actions

  [Settings Shortcuts]
  notifications
  avatar
  account
```

### 포인트

- “내 프로필 보기/설정/초대” 링크 카드 3개로 끝내지 않는다.
- 데이터가 없는 상태에서도 다음 행동이 분명해야 한다.

## 9. Invite Management

### 목적

- 초대를 단순 기능이 아니라 서비스의 핵심 자산처럼 보이게 한다.

### 구조

```text
[Page Intro]
title: 초대 관리
copy about trust and invitation value

[Inventory Summary]
available invites
used invites
linked members

[Invite Slots]
slot cards x N
each slot:
- state
- invite code
- share action
- linked member if redeemed
- timestamp

[Received Invite]
who invited me
when connected
CTA: 프로필 보러 가기 / 추천 남기기
```

### 포인트

- 슬롯 하나하나를 “자산”처럼 다뤄야 한다.
- 초대한 사람과 연결된 사람의 관계를 보여줘야 이 기능이 살아난다.

## 1차 구현 우선 화면

리디자인 1차는 아래 5개 화면만 먼저 잡는 것이 좋다.

1. Public Landing
2. Authenticated Home
3. Members Directory
4. Member Profile Detail
5. Gatherings Lounge

이 다섯 개만 바뀌어도 서비스의 인상이 거의 다시 정의된다.

## 결론

와이어프레임 초안의 핵심은 화려한 UI가 아니다. 무엇을 먼저 보게 할지, 어디서 행동하게 할지, 신뢰를 어떤 정보 조합으로 읽히게 할지를 먼저 설계하는 것이다.
