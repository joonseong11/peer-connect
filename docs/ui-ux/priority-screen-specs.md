# Peer Connect Priority Screen Specs

## 목적

이 문서는 1차 구현 우선순위 5개 화면에 대해 실제 카피, 컴포넌트 구조, 데이터 우선순위를 정의한 스펙이다. 와이어프레임보다 한 단계 더 구체적이며, 구현 전에 화면마다 "무엇을 만들지"를 고정하는 용도다.

우선순위 화면:

1. Public Landing
2. Authenticated Home
3. Members Directory
4. Member Profile Detail
5. Gatherings Lounge

관련 문서:

- [design-tokens.md](/Users/jujeon/dev/peer-connect-svelte/docs/ui-ux/design-tokens.md)
- [wireframes.md](/Users/jujeon/dev/peer-connect-svelte/docs/ui-ux/wireframes.md)

## 공통 컴포넌트 인벤토리

### Layout

- `ShellHeader`
- `ShellFooter`
- `PageHero`
- `SectionBlock`
- `SectionHeader`
- `TwoColumnLayout`
- `SidebarPanel`
- `ContentContainer`

### Navigation and Meta

- `Breadcrumbs`
- `NavPill`
- `StatChip`
- `StatusBadge`
- `TagList`
- `MetaRow`
- `ActionBar`

### Cards and Lists

- `FeaturePanel`
- `MemberHighlightCard`
- `MemberRowCard`
- `EndorsementQuoteCard`
- `GatheringFeatureCard`
- `GatheringListItem`
- `NextActionCard`
- `EmptyStatePanel`

### Forms and Actions

- `SearchField`
- `FilterToolbar`
- `SegmentedToggle`
- `PrimaryButton`
- `SecondaryButton`
- `DangerButton`

## Voice and Copy Rules

- 문장은 짧고 단정하게 쓴다.
- 과장된 홍보 문구보다 신뢰와 밀도를 강조한다.
- 행동 유도 문구는 "가입하기"보다 "시작하기", "프로필 보완하기", "추천 남기기"처럼 구체적으로 쓴다.
- 개발자 제품 특성을 살리되 지나치게 차갑거나 기업 홍보처럼 쓰지 않는다.

## 1. Public Landing

### Route

- `/` when `session == null`

### Primary Goal

- 서비스 성격 이해
- 초대 기반 네트워크 구조 이해
- 로그인 클릭

### Success Event

- `Google로 시작하기` 클릭

### Page Modules

1. `ShellHeader`
2. `LandingHero`
3. `TrustSignalStrip`
4. `FeaturedMemberShowcase`
5. `FeaturedGatheringShowcase`
6. `InvitationModelSteps`
7. `FinalCTASection`
8. `ShellFooter`

### Recommended Copy

#### Hero eyebrow

- `Private developer network`

#### Hero headline

- `믿을 만한 동료와 더 깊게 연결되는 개발자 네트워크`

#### Hero supporting copy

- `Peer Connect는 초대 기반으로 운영되는 프라이빗 네트워크입니다. 프로필, 추천, 모임을 통해 서로의 실력과 맥락을 더 정확하게 이해할 수 있습니다.`

#### Hero primary CTA

- `Google로 시작하기`

#### Hero secondary CTA

- `어떻게 운영되나요`

#### Trust section heading

- `관계의 밀도를 높이는 구조`

#### Trust stat labels

- `활동 중인 멤버`
- `누적 추천`
- `최근 모임`
- `초대 기반 운영`

#### Invitation section heading

- `아무나 들어오는 커뮤니티가 아닙니다`

#### Invitation section body

- `초대, 프로필, 추천이라는 세 단계가 신뢰의 기본선을 만듭니다. 그래서 더 적은 잡음으로 더 깊은 대화를 시작할 수 있습니다.`

#### Final CTA heading

- `혼자 찾기 어려운 동료를, 더 정확하게 만나보세요`

#### Final CTA button

- `Peer Connect 시작하기`

### Component Structure

```text
LandingHero
|- SectionEyebrow
|- HeroHeadline
|- HeroBody
|- ActionGroup
|  |- PrimaryButton
|  |- SecondaryButton
|- HeroAside
   |- MemberHighlightCard x 2
   |- EndorsementQuoteCard
   |- StatChipRow

TrustSignalStrip
|- StatChip x 4

FeaturedMemberShowcase
|- SectionHeader
|- MemberHighlightCard x 3

FeaturedGatheringShowcase
|- SectionHeader
|- GatheringFeatureCard x 2

InvitationModelSteps
|- StepItem x 3
```

### Data Requirements

- featured member sample 2-3개
- featured gathering sample 2개
- endorsement sample 1개
- stats 3-4개

### Notes

- hero 오른쪽은 단순 일러스트보다 실제 멤버/추천/모임 데이터를 섞어 보여주는 것이 좋다.
- 현재처럼 동일한 흰 카드 4-5개를 반복하지 않는다.

## 2. Authenticated Home

### Route

- `/` when `session != null`

### Primary Goal

- 로그인 직후 바로 다음 행동 시작
- 내 상태 파악
- 멤버 또는 모임 탐색 진입

### Success Event

- 추천 멤버 클릭
- 모임 클릭
- 다음 행동 카드 클릭

### Page Modules

1. `ShellHeader`
2. `HomeHeroSummary`
3. `SuggestedMembersSection`
4. `ActiveGatheringsSection`
5. `NextBestActionCard`
6. `InviteStatusPanel`
7. `MySnapshotPanel`

### Recommended Copy

#### Hero eyebrow

- `Today on Peer Connect`

#### Hero headline

- `오늘의 네트워크를 확인해보세요`

#### Hero body

- `새로운 추천, 새로 열린 모임, 아직 끝내지 않은 프로필 작업까지 지금 필요한 흐름만 모았습니다.`

#### Section headings

- `지금 눈여겨볼 멤버`
- `활발한 모임`
- `다음 행동`
- `초대 현황`
- `내 활동 요약`

#### Next action examples

- `프로필을 90%까지 완성해보세요`
- `추천을 기다리는 동료가 있어요`
- `이번 주 모임을 직접 열어보세요`

#### Home CTA labels

- `프로필 보완하기`
- `추천 남기러 가기`
- `모임 열기`
- `멤버 더 보기`
- `모임 더 보기`

### Component Structure

```text
HomeHeroSummary
|- SectionEyebrow
|- HeroHeadline
|- HeroBody
|- SummaryStatRow
   |- StatChip x 3

HomeMainGrid
|- MainColumn
|  |- SuggestedMembersSection
|  |  |- SectionHeader
|  |  |- MemberRowCard x 3
|  |- ActiveGatheringsSection
|     |- SectionHeader
|     |- GatheringListItem x 3
|- SideColumn
   |- NextBestActionCard
   |- InviteStatusPanel
   |- MySnapshotPanel
```

### Data Requirements

- suggested members 3명
- active gatherings 3개
- profile completion percentage
- invite inventory summary
- recent activity 2-3건

### Notes

- 이 화면은 랜딩 복제본이 되면 안 된다.
- 가장 중요한 것은 `다음 행동` 카드다. 모든 사용자에게 같은 CTA를 보여주지 말고 상태 기반으로 바꿔야 한다.

## 3. Members Directory

### Route

- `/members`

### Primary Goal

- 멤버 비교와 탐색
- 상세 프로필 이동

### Success Event

- 멤버 상세 클릭
- 필터 사용

### Page Modules

1. `ShellHeader`
2. `PageHero`
3. `FilterToolbar`
4. `CuratedMembersPanel`
5. `MemberResultsList`

### Recommended Copy

#### Page title

- `멤버 디렉터리`

#### Page body

- `함께 성장할 동료를 더 빠르게 찾을 수 있도록 역할, 관심사, 활동 신호를 기준으로 정리했습니다.`

#### Filter labels

- `역할`
- `관심사`
- `정렬`
- `보기`

#### Sort options

- `최근 활동순`
- `추천 많은 순`
- `최근 등록순`

#### Curated panel heading

- `지금 눈여겨볼 멤버`

#### Empty state

- `아직 조건에 맞는 멤버가 없습니다`
- `필터를 조금 넓혀 다시 살펴보세요`

#### Row actions

- `프로필 보기`
- `추천 보기`

### Component Structure

```text
MembersPageHero
|- Breadcrumbs
|- HeroHeadline
|- HeroBody

FilterToolbar
|- SearchField
|- SelectField(role)
|- SelectField(interest)
|- SelectField(sort)
|- SegmentedToggle(list/grid)

MembersContentGrid
|- CuratedMembersPanel
|  |- SectionHeader
|  |- MemberHighlightCard x 2
|- MemberResultsList
   |- MemberRowCard x N

MemberRowCard
|- Avatar
|- IdentityBlock
|  |- Name
|  |- Role
|  |- TagList
|- IntroSnippet
|- TrustMeta
|  |- EndorsementCount
|  |- RecentActivity
|- ActionGroup
   |- SecondaryButton("프로필 보기")
```

### Data Requirements

- role/interest metadata
- endorsement count
- recent activity or updated date
- short introduction

### Notes

- 1차 개편에서는 실제 검색 기능이 완전하지 않아도 된다. UI 먼저 만들어도 된다.
- 그리드 보기보다 리스트 보기를 기본값으로 권장한다.

## 4. Member Profile Detail

### Route

- `/members/[userId]`

### Primary Goal

- 인물 이해
- 신뢰 판단
- 추천 남기기

### Success Event

- 추천 제출
- 연락처 클릭

### Page Modules

1. `Breadcrumbs`
2. `MemberProfileHero`
3. `AboutSection`
4. `CareerTimelineSection`
5. `ContactPanel`
6. `ActivityPanel`
7. `EndorsementsFeed`
8. `EndorsementComposer`

### Recommended Copy

#### Hero heading

- `{name}`

#### Hero subline format

- `{role}`

#### Trust chips

- `추천 {n}개`
- `최근 모임 {n}회`
- `{interestTag}`

#### Primary CTA

- `추천 남기기`

#### Secondary CTA

- `연락처 보기`

#### Section headings

- `소개`
- `커리어`
- `연락처`
- `최근 활동`
- `동료 추천`

#### Endorsement composer title

- `함께 일한 맥락을 남겨주세요`

#### Endorsement composer help copy

- `좋았던 협업 방식이나 인상 깊었던 장면을 구체적으로 적어주면 더 큰 도움이 됩니다.`

#### No-contact fallback

- `공개된 연락처가 아직 없습니다`

### Component Structure

```text
MemberProfileHero
|- Breadcrumbs
|- Avatar
|- IdentityBlock
|  |- Name
|  |- Role
|  |- IntroLine
|- TrustChipRow
|- ActionGroup
   |- PrimaryButton("추천 남기기")
   |- SecondaryButton("연락처 보기")

TwoColumnLayout
|- MainColumn
|  |- AboutSection
|  |- CareerTimelineSection
|  |- EndorsementComposer
|  |- EndorsementsFeed
|- SideColumn
   |- ContactPanel
   |- ActivityPanel
   |- QuickFactsPanel
```

### Data Requirements

- profile hero fields
- interest tags
- endorsement count
- contact links
- recent gatherings or updated signal
- endorsements list

### Notes

- 현재처럼 상단 헤더와 하단 섹션이 모두 같은 밀도의 카드가 되지 않게 해야 한다.
- `추천 남기기` 액션은 페이지 상단과 추천 섹션 근처 두 군데까지만 둔다.

## 5. Gatherings Lounge

### Route

- `/gatherings`

### Primary Goal

- 참여할 모임 탐색
- 모임 생성

### Success Event

- 모임 상세 클릭
- `모임 열기` 클릭

### Page Modules

1. `PageHero`
2. `FeaturedGatheringBand`
3. `FilterToolbar`
4. `GatheringsFeed`
5. `CreateGatheringCTA`

### Recommended Copy

#### Page title

- `모임 라운지`

#### Page body

- `가볍게 만나도 좋고, 깊게 함께해도 좋습니다. 지금 Peer Connect에서 열리고 있는 모임을 확인해보세요.`

#### Primary CTA

- `모임 열기`

#### Featured band heading

- `지금 주목할 모임`

#### Filter labels

- `형식`
- `상태`
- `정렬`
- `보기`

#### Format badges

- `커피챗`
- `스터디`
- `세미나`
- `사이드프로젝트`
- `모각코`

#### Status badges

- `모집 중`
- `곧 시작`
- `회고 공유`

#### Empty state

- `아직 열린 모임이 없습니다`
- `첫 모임을 직접 열어보세요`

### Component Structure

```text
GatheringsHero
|- Breadcrumbs(optional)
|- HeroHeadline
|- HeroBody
|- ActionGroup
   |- PrimaryButton("모임 열기")

FeaturedGatheringBand
|- SectionHeader
|- GatheringFeatureCard

GatheringsControlBar
|- FilterToolbar
|  |- FormatFilter
|  |- StatusFilter
|  |- SortSelect
|  |- ViewToggle

GatheringsFeed
|- GatheringListItem x N

GatheringListItem
|- StatusBadge
|- FormatBadge
|- Title
|- HostMeta
|- Summary
|- MetaRow
|  |- CreatedTime
|  |- ResponseCount
|- SecondaryButton("자세히 보기")
```

### Data Requirements

- format
- status
- host identity
- response count
- short summary

### Notes

- 1차 구현에서는 실제 추천 로직이 없어도 featured 영역은 최신 글 중 1건을 기준으로 시작할 수 있다.
- 게시글 작성 CTA는 스크롤 하단에도 한 번 더 반복할 수 있다.

## Shared Copy Dictionary

반복 사용될 버튼/상태 카피는 먼저 통일한다.

### Buttons

- `Google로 시작하기`
- `어떻게 운영되나요`
- `멤버 더 보기`
- `모임 더 보기`
- `프로필 보기`
- `추천 남기기`
- `연락처 보기`
- `모임 열기`
- `자세히 보기`
- `프로필 보완하기`

### States

- `아직 공개된 정보가 없습니다`
- `지금 이 작업을 먼저 해보세요`
- `최근 활동이 아직 없습니다`
- `조건에 맞는 결과가 없습니다`

## 1차 구현 순서 제안

1. `ShellHeader`, `PageHero`, `SectionHeader`, `PrimaryButton`, `SecondaryButton`
2. `StatChip`, `StatusBadge`, `TagList`, `MetaRow`
3. `MemberRowCard`, `MemberHighlightCard`
4. `GatheringFeatureCard`, `GatheringListItem`
5. 페이지 조립

## 결론

이 스펙의 목적은 디자인 논의를 다시 추상으로 돌리지 않는 데 있다. 이제 구현 단계에서는 화면마다 이 문서의 모듈 구조와 카피를 기준으로 바로 컴포넌트를 쪼개고 붙이면 된다.
