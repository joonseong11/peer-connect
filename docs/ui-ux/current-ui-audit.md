# Peer Connect Current UI/UX Audit

## 목적

이 문서는 현재 Peer Connect의 UI/UX 상태를 코드 기준으로 기록하고, 리디자인 전에 무엇을 유지하고 무엇을 버려야 하는지 명확히 하기 위한 기준 문서다.

## 제품 한 줄 정의

Peer Connect는 초대 기반의 프라이빗 개발자 네트워크다. 핵심 경험은 다음 네 가지다.

- 믿을 수 있는 동료 탐색
- 프로필 기반 신뢰 형성
- 모임/교류 생성
- 초대와 추천을 통한 네트워크 확장

## 현재 화면 범위

- 랜딩: [`src/routes/+page.svelte`](/Users/jujeon/dev/peer-connect-svelte/src/routes/+page.svelte)
- 헤더/푸터: [`src/lib/components/AppHeader.svelte`](/Users/jujeon/dev/peer-connect-svelte/src/lib/components/AppHeader.svelte), [`src/routes/+layout.svelte`](/Users/jujeon/dev/peer-connect-svelte/src/routes/+layout.svelte)
- 멤버 목록/상세: [`src/routes/members/+page.svelte`](/Users/jujeon/dev/peer-connect-svelte/src/routes/members/+page.svelte), [`src/routes/members/[userId]/+page.svelte`](/Users/jujeon/dev/peer-connect-svelte/src/routes/members/[userId]/+page.svelte)
- 모임 목록/상세/작성: [`src/routes/gatherings/+page.svelte`](/Users/jujeon/dev/peer-connect-svelte/src/routes/gatherings/+page.svelte), [`src/routes/gatherings/[gatheringId]/+page.svelte`](/Users/jujeon/dev/peer-connect-svelte/src/routes/gatherings/[gatheringId]/+page.svelte), [`src/routes/gatherings/new/+page.svelte`](/Users/jujeon/dev/peer-connect-svelte/src/routes/gatherings/new/+page.svelte)
- 프로필 작성/마이페이지/설정/초대: [`src/routes/profile/+page.svelte`](/Users/jujeon/dev/peer-connect-svelte/src/routes/profile/+page.svelte), [`src/routes/mypage/+page.svelte`](/Users/jujeon/dev/peer-connect-svelte/src/routes/mypage/+page.svelte), [`src/routes/mypage/profile/+page.svelte`](/Users/jujeon/dev/peer-connect-svelte/src/routes/mypage/profile/+page.svelte), [`src/routes/mypage/settings/+page.svelte`](/Users/jujeon/dev/peer-connect-svelte/src/routes/mypage/settings/+page.svelte), [`src/routes/invite/+page.svelte`](/Users/jujeon/dev/peer-connect-svelte/src/routes/invite/+page.svelte)

## 현재 디자인 시스템 요약

현재 UI는 전반적으로 아래 패턴에 강하게 묶여 있다.

- 거의 모든 페이지가 `glass-panel` 카드 위에 올라간다.
- 카드 대부분이 `rounded-3xl`, `bg-white/85~90`, `border-slate-200/60`, `shadow-glass`를 사용한다.
- 메인 강조색은 `peer-indigo`, 보조색은 `peer-sky`, 기본 텍스트는 `peer-navy`, `peer-slate`다.
- 바디 배경은 큰 라디얼 그라데이션 배경 하나로 통일된다.
- 버튼 체계는 `btn`, `btn-primary`, `btn-secondary`, `btn-ghost` 중심이다.

관련 파일:

- 글로벌 스타일: [`src/app.css`](/Users/jujeon/dev/peer-connect-svelte/src/app.css)
- 토큰/색상: [`tailwind.config.cjs`](/Users/jujeon/dev/peer-connect-svelte/tailwind.config.cjs)

## 잘하고 있는 점

- 초반 인상은 깔끔하다. 개발자 네트워크라는 주제에 맞게 과하게 가볍지 않다.
- 공통 컴포넌트와 클래스가 단순해서 구현 일관성은 높다.
- 에러, 로딩, 포커스 상태를 기본 수준 이상으로 챙기고 있다.
- 랜딩 카피는 서비스 성격을 비교적 명확하게 설명한다.
- 멤버, 모임, 초대, 추천이라는 제품 축이 코드상으로는 이미 잘 나뉘어 있다.

## 핵심 문제

### 1. 모든 화면이 너무 비슷하게 생겼다

랜딩, 목록, 상세, 폼, 설정 화면이 모두 같은 흰색 유리 카드와 같은 반경, 같은 경계선, 같은 그림자 언어를 사용한다. 결과적으로 사용자는 페이지 목적이 달라도 같은 밀도의 카드 나열로 인식한다.

영향:

- 정보 우선순위가 약하다.
- 제품 내부에서 화면 간 성격 차이가 거의 없다.
- 사용자가 "지금 나는 탐색 중인가, 작성 중인가, 관리 중인가"를 직감하기 어렵다.

### 2. 브랜드 톤이 랜딩에서 제품 내부로 이어지지 않는다

랜딩은 “프라이빗 네트워크”, “신뢰”, “성장”이라는 정체성을 말하지만, 로그인 후 실제 제품 화면은 거의 일반적인 CRUD 카드/폼처럼 보인다.

영향:

- 마케팅 경험과 제품 경험이 분리된다.
- 폐쇄형 커뮤니티 특유의 긴장감, 품질감, 사람 중심의 온도가 약하다.

### 3. 정보 구조가 평평하다

대부분 페이지가 아래 구조를 반복한다.

1. 제목 + 설명
2. 큰 카드 섹션
3. 내부 카드 리스트 또는 폼

이 구조는 빠르게 만들기엔 좋지만, 장기적으로는 화면마다 같은 리듬을 만들어 제품 전체를 지루하게 만든다.

영향:

- 첫 화면에서 읽어야 할 핵심 정보가 눈에 꽂히지 않는다.
- 상세 페이지도 “읽는 페이지”보다는 “박스 모음”처럼 보인다.

### 4. 탐색 경험이 약하다

지금 구조는 방문자가 콘텐츠를 발견하는 흐름보다 링크를 따라 이동하는 흐름에 가깝다.

예시:

- 멤버 목록은 탐색 도구보다 카드 모음에 가깝다.
- 모임 목록은 분류/필터/상태 개념 없이 최신 글 목록에 가깝다.
- 마이페이지는 허브이지만 여전히 링크 카드 집합 수준이다.

영향:

- 커뮤니티 활력이나 네트워크 밀도가 드러나지 않는다.
- "어디부터 보면 좋은지"에 대한 제품의 가이드가 없다.

### 5. 프로필과 모임의 정보 밀도가 낮다

핵심 데이터가 거의 전부 긴 텍스트 블록과 단순 메타 정보로 표현된다.

누락되거나 약한 요소:

- 기술 분야/관심사/활동 태그
- 추천 수, 최근 활동, 연결 맥락 같은 신뢰 신호
- 모임 상태, 분야, 참여 난이도, 형식 같은 빠른 분류 기준

영향:

- 스캔성이 약하다.
- 사용자들이 빠르게 비교하거나 선택하기 어렵다.

### 6. 액션 표현이 일관되지 않다

버튼 체계는 어느 정도 정리되어 있지만, 일부 중요한 액션은 시각적 언어가 약하다.

예시:

- 게시글 수정/삭제는 아이콘 혹은 문자 기호 중심이라 해석 비용이 있다.
- 상단 로그인 버튼은 헤더 안에서 상대적으로 존재감이 약하다.
- “다음에 무엇을 해야 하는지”를 알려주는 1순위 액션이 페이지마다 다르게 보인다.

### 7. 상태 설계가 기능적이지만 매력적이지 않다

빈 상태, 성공 상태, 경고 상태는 대부분 텍스트 문장과 테두리 박스 수준에서 처리된다.

영향:

- 제품이 사람을 안내하는 느낌보다 시스템 메시지를 보여주는 느낌이 강하다.
- 초대 기반 커뮤니티의 희소성과 기대감을 살리지 못한다.

### 8. 접근성과 대비에 잠재 리스크가 있다

투명 배경 위의 `slate-500` 계열 텍스트, 유리 효과, 밝은 인디고 계열 포커스/상태색이 반복된다. 실제 렌더링 상황에서는 대비가 떨어질 가능성이 있다.

특히 주의할 점:

- 작은 본문과 보조 텍스트
- 상태 안내 박스
- 유리 배경 위의 링크/버튼

## 화면별 진단

### 랜딩

- 장점: 서비스 소개는 충분하다. 가치 제안도 명확하다.
- 문제: 시각적으로 너무 안전하다. “프라이빗 개발자 네트워크”의 독특한 긴장감이 약하다.
- 문제: 가입 전 랜딩과 가입 후 제품 사이의 경험 차이가 크다.

### 멤버 목록/상세

- 장점: 프로필, 추천, 연락처 정보가 기능적으로 잘 묶여 있다.
- 문제: 디렉터리 경험이 아니라 카드 열람 경험에 가깝다.
- 문제: 멤버 간 차이를 빨리 파악할 수 있는 신호가 적다.

### 모임 라운지

- 장점: 생성, 상세, 댓글 흐름이 기능적으로 이어진다.
- 문제: 게시판형이 너무 강해서 “살아 있는 커뮤니티”보다 “글 목록”처럼 보인다.
- 문제: 모임 특성을 파악할 필터나 상태 정보가 부족하다.

### 프로필 작성

- 장점: 필수 입력과 자유 입력의 균형이 나쁘지 않다.
- 문제: 긴 단일 폼이라 심리적 진입장벽이 있다.
- 문제: 사용자가 왜 이 정보를 써야 하는지, 완료하면 무엇이 좋아지는지 시각적으로 잘 보이지 않는다.

### 마이페이지/설정/초대

- 장점: 기능이 분리돼 있어 관리가 쉽다.
- 문제: 허브 경험이라기보다 링크 카드 모음이다.
- 문제: 가장 중요한 정보나 다음 행동을 한눈에 파악하기 어렵다.

## 유지할 것

- 지금의 친절한 카피 톤
- 과도하게 장식적이지 않은 기본 방향
- 추천/초대/모임이라는 제품 고유 구조
- 기본 포커스/에러/로딩 처리 습관

## 버릴 것

- 모든 화면에 동일하게 적용되는 glass 카드 중심 구조
- “제목 + 설명 + 카드 리스트”의 반복 리듬
- 인디고/스카이 중심의 안전한 SaaS 톤에 대한 의존
- 상세 화면까지 모두 같은 밀도의 카드 묶음으로 처리하는 방식

## 결론

현재 UI는 "정돈되어 있지만 기억에 남지 않는 상태"에 가깝다. 기능은 이미 의미 있는 수준까지 갖춰졌지만, 제품 경험은 아직 브랜드가 아니다.

리디자인의 핵심 목표는 예쁘게 만드는 것이 아니라 아래 세 가지다.

- 제품 내부에서도 Peer Connect만의 온도와 긴장감을 느끼게 만들기
- 탐색, 관계 형성, 작성, 관리 화면의 성격을 분명하게 나누기
- 신뢰와 커뮤니티 밀도를 더 빠르게 읽히게 만들기
