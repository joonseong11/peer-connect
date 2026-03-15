# Peer Connect Design Tokens

## 목적

이 문서는 `Private Technical Salon` 방향을 실제 UI 구현에 사용할 수 있는 공통 디자인 토큰으로 정리한 문서다. 목표는 "예쁜 취향"을 말하는 것이 아니라, 실제 컴포넌트와 레이아웃이 같은 언어를 쓰도록 기준을 만드는 데 있다.

관련 문서:

- [redesign-direction.md](/Users/jujeon/dev/peer-connect-svelte/docs/ui-ux/redesign-direction.md)
- [wireframes.md](/Users/jujeon/dev/peer-connect-svelte/docs/ui-ux/wireframes.md)

## 토큰 설계 원칙

- 시맨틱 이름을 우선한다. `green-500` 같은 이름보다 `--color-accent-primary` 같은 이름을 쓴다.
- 브랜드 토큰과 컴포넌트 토큰을 분리한다.
- 유리 효과는 기본값이 아니라 예외값이다.
- 페이지마다 스타일을 새로 만들지 않고, 표면과 계층을 조합해 해결한다.
- 라이트 모드 기준으로 먼저 완성하고, 필요하면 이후 다크 모드를 확장한다.

## Token Layers

### 1. Brand Tokens

- 컬러
- 타이포그래피
- 코너 반경
- 그림자
- 모션

### 2. Semantic Tokens

- 배경
- 표면
- 텍스트
- 경계선
- 액션
- 상태

### 3. Component Tokens

- 버튼
- 입력 필드
- 카드
- 태그
- 배지
- 내비게이션

## Color Tokens

### Brand Palette

| Token | Value | Role |
| --- | --- | --- |
| `--color-ink-950` | `#14213D` | 가장 중요한 헤드라인, 진한 표면 |
| `--color-ink-800` | `#243B53` | 일반 강조 텍스트, 상단 바 |
| `--color-ink-700` | `#334E68` | 보조 헤드라인 |
| `--color-paper-50` | `#FFFDF8` | 기본 페이지 배경 |
| `--color-paper-100` | `#F7F3EC` | 약한 섹션 배경 |
| `--color-stone-200` | `#ECE7DF` | 보더, 구분선, 비활성 표면 |
| `--color-stone-300` | `#D8D1C7` | 강한 구분선 |
| `--color-forest-700` | `#1F6B57` | 기본 강조색, 주요 CTA |
| `--color-forest-600` | `#2B7A63` | hover/accent fill |
| `--color-forest-100` | `#E7F4EF` | 옅은 성공/강조 배경 |
| `--color-amber-600` | `#C67C2E` | 초대, 추천, 핵심 메타 |
| `--color-amber-100` | `#FBF1E4` | 초대 관련 약한 배경 |
| `--color-danger-600` | `#B42318` | 위험 액션 |
| `--color-danger-100` | `#FEECEB` | 위험 배경 |
| `--color-success-600` | `#157347` | 성공 상태 |
| `--color-success-100` | `#E8F6EE` | 성공 배경 |

### Semantic Color Mapping

| Token | Value |
| --- | --- |
| `--color-bg-page` | `var(--color-paper-50)` |
| `--color-bg-section-soft` | `var(--color-paper-100)` |
| `--color-bg-surface` | `#FFFFFF` |
| `--color-bg-surface-muted` | `#FCFAF6` |
| `--color-bg-surface-strong` | `var(--color-ink-950)` |
| `--color-border-default` | `var(--color-stone-200)` |
| `--color-border-strong` | `var(--color-stone-300)` |
| `--color-text-primary` | `#1E293B` |
| `--color-text-secondary` | `#52606D` |
| `--color-text-muted` | `#7B8794` |
| `--color-text-inverse` | `#FFFDF8` |
| `--color-accent-primary` | `var(--color-forest-700)` |
| `--color-accent-primary-hover` | `var(--color-forest-600)` |
| `--color-accent-secondary` | `var(--color-amber-600)` |
| `--color-link` | `var(--color-forest-700)` |
| `--color-link-hover` | `#175845` |

## Typography Tokens

### Font Families

권장 조합:

- `--font-heading`: `SUIT Variable`, `Pretendard Variable`, `sans-serif`
- `--font-body`: `Pretendard Variable`, `sans-serif`
- `--font-mono`: `JetBrains Mono`, `Fira Mono`, `monospace`

### Font Weight

| Token | Value |
| --- | --- |
| `--font-weight-regular` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--font-weight-bold` | `700` |

### Type Scale

| Token | Size / Line Height | Usage |
| --- | --- | --- |
| `--text-display-lg` | `56px / 1.05` | 랜딩 hero headline |
| `--text-display-md` | `44px / 1.08` | 로그인 후 상단 hero |
| `--text-heading-xl` | `36px / 1.15` | 페이지 메인 제목 |
| `--text-heading-lg` | `28px / 1.2` | 섹션 제목 |
| `--text-heading-md` | `22px / 1.25` | 카드/패널 제목 |
| `--text-heading-sm` | `18px / 1.3` | 서브섹션 제목 |
| `--text-body-lg` | `18px / 1.7` | 랜딩 본문, 강조 설명 |
| `--text-body-md` | `16px / 1.7` | 기본 본문 |
| `--text-body-sm` | `14px / 1.6` | 메타와 보조 설명 |
| `--text-caption` | `12px / 1.5` | 캡션, 보조 상태 |
| `--text-code-sm` | `13px / 1.5` | 초대 코드, 시스템 값 |

### Type Usage Rules

- 헤드라인은 `font-heading`만 사용한다.
- 본문은 `font-body`로 통일한다.
- 초대 코드, 수치, 날짜, 상태 메타는 `font-mono`를 우선 사용한다.
- `text-muted`는 작은 텍스트에만 제한적으로 사용한다.
- 랜딩을 제외하면 한 화면에서 display size를 1개 이상 남발하지 않는다.

## Spacing Tokens

### Base Scale

| Token | Value |
| --- | --- |
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-10` | `40px` |
| `--space-12` | `48px` |
| `--space-14` | `56px` |
| `--space-16` | `64px` |
| `--space-20` | `80px` |

### Layout Usage

- 섹션 간 간격: `48px` 이상
- 카드 내부 패딩 기본값: `24px`
- hero 패널 패딩: `32px` 또는 `40px`
- form field 간 간격: `16px`
- label과 input 간 간격: `8px`

## Radius Tokens

| Token | Value | Usage |
| --- | --- | --- |
| `--radius-xs` | `10px` | 배지, 칩 |
| `--radius-sm` | `14px` | 인풋, 세그먼트 |
| `--radius-md` | `20px` | 기본 카드 |
| `--radius-lg` | `28px` | hero, 강조 패널 |
| `--radius-pill` | `999px` | pill 버튼, 태그 |

규칙:

- 기본 카드에 `28px`를 쓰지 않는다.
- 기본 입력 필드에 pill shape를 쓰지 않는다.
- 프로필 아바타와 사진은 `20px` 또는 원형만 허용한다.

## Shadow Tokens

| Token | Value |
| --- | --- |
| `--shadow-xs` | `0 1px 2px rgba(20, 33, 61, 0.06)` |
| `--shadow-sm` | `0 6px 18px rgba(20, 33, 61, 0.06)` |
| `--shadow-md` | `0 12px 28px rgba(20, 33, 61, 0.10)` |
| `--shadow-lg` | `0 24px 48px rgba(20, 33, 61, 0.14)` |
| `--shadow-focus` | `0 0 0 3px rgba(31, 107, 87, 0.18)` |

규칙:

- 기본 표면은 그림자보다 보더와 배경 대비로 분리한다.
- hover 시 그림자보다 배경과 보더 변화를 먼저 사용한다.
- glass shadow는 기본 토큰에서 제외한다.

## Motion Tokens

| Token | Value |
| --- | --- |
| `--duration-fast` | `120ms` |
| `--duration-base` | `180ms` |
| `--duration-slow` | `260ms` |
| `--easing-standard` | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| `--easing-emphasized` | `cubic-bezier(0.22, 1, 0.36, 1)` |

### Motion Rules

- hover는 `120ms`~`180ms`
- 화면 진입은 `180ms`~`260ms`
- 대형 이동 애니메이션보다 페이드와 배경 변화 위주
- `prefers-reduced-motion` 대응 필수

## Border Tokens

| Token | Value |
| --- | --- |
| `--border-width-default` | `1px` |
| `--border-width-strong` | `1.5px` |
| `--border-width-focus` | `2px` |

## Surface Tokens

### Surface Types

| Token | Usage |
| --- | --- |
| `--surface-page` | 페이지 기본 배경 |
| `--surface-panel` | 일반 카드, 섹션 래퍼 |
| `--surface-panel-muted` | 보조 카드, 빈 상태 |
| `--surface-panel-strong` | hero, featured band |
| `--surface-highlight` | 추천/초대/상태 강조 패널 |

### Suggested Values

```css
:root {
  --surface-page: var(--color-bg-page);
  --surface-panel: #ffffff;
  --surface-panel-muted: #fcfaf6;
  --surface-panel-strong: var(--color-ink-950);
  --surface-highlight: var(--color-forest-100);
}
```

## Button Tokens

### Primary Button

- background: `--color-accent-primary`
- text: `--color-text-inverse`
- hover: `--color-accent-primary-hover`
- radius: `--radius-pill`
- height: `44px` desktop, `42px` compact
- padding-x: `20px`

### Secondary Button

- background: `transparent`
- text: `--color-text-primary`
- border: `--color-border-default`
- hover background: `--color-bg-surface-muted`

### Tertiary / Link Button

- background: none
- text: `--color-link`
- padding minimal

### Danger Button

- background: `--color-danger-100`
- text: `--color-danger-600`
- border: transparent

## Form Tokens

### Input

- background: `#FFFFFF`
- border: `--color-border-default`
- radius: `--radius-sm`
- text: `--color-text-primary`
- placeholder: `--color-text-muted`
- focus border: `--color-accent-primary`
- focus shadow: `--shadow-focus`

### Input Heights

| Token | Value |
| --- | --- |
| `--field-height-md` | `48px` |
| `--field-height-lg` | `56px` |
| `--textarea-min-sm` | `120px` |
| `--textarea-min-md` | `168px` |

## Tag and Badge Tokens

### Interest Tag

- background: `--color-paper-100`
- text: `--color-ink-800`
- border: `--color-border-default`
- radius: `--radius-pill`

### Trust Badge

- background: `--color-amber-100`
- text: `--color-amber-600`

### Status Badge

- open: forest
- pending: amber
- danger: danger
- neutral: stone/ink

## Navigation Tokens

### Header

- background: `rgba(255, 253, 248, 0.92)`
- blur: `12px`
- border-bottom: `1px solid var(--color-border-default)`
- height target: `64px` to `72px`

### Active Nav Item

- text: `--color-text-primary`
- underline or bottom bar: `--color-accent-primary`
- inactive text: `--color-text-secondary`

## Layout Tokens

### Content Width

| Token | Value |
| --- | --- |
| `--container-reading` | `720px` |
| `--container-page` | `1180px` |
| `--container-wide` | `1280px` |

### Grid

- page grid: `12 columns`
- main + rail split:
  - `8 / 4`
  - `7 / 5`
  - `9 / 3`

## State Tokens

### Success

- surface: `--color-success-100`
- text: `--color-success-600`

### Warning

- surface: `--color-amber-100`
- text: `--color-amber-600`

### Error

- surface: `--color-danger-100`
- text: `--color-danger-600`

### Empty

- surface: `--surface-panel-muted`
- border: `--color-border-default`
- illustration optional, but text action must remain clear

## CSS Variable Draft

```css
:root {
  --color-ink-950: #14213d;
  --color-ink-800: #243b53;
  --color-paper-50: #fffdf8;
  --color-paper-100: #f7f3ec;
  --color-stone-200: #ece7df;
  --color-stone-300: #d8d1c7;
  --color-forest-700: #1f6b57;
  --color-forest-600: #2b7a63;
  --color-forest-100: #e7f4ef;
  --color-amber-600: #c67c2e;
  --color-amber-100: #fbf1e4;
  --color-danger-600: #b42318;
  --color-danger-100: #feeceb;

  --color-bg-page: var(--color-paper-50);
  --color-bg-surface: #ffffff;
  --color-border-default: var(--color-stone-200);
  --color-text-primary: #1e293b;
  --color-text-secondary: #52606d;
  --color-text-muted: #7b8794;
  --color-accent-primary: var(--color-forest-700);
  --color-accent-secondary: var(--color-amber-600);

  --radius-sm: 14px;
  --radius-md: 20px;
  --radius-lg: 28px;
}
```

## Tailwind Mapping Draft

권장 매핑:

- `peer-ink`
- `peer-paper`
- `peer-stone`
- `peer-forest`
- `peer-amber`
- `peer-danger`

권장 utility 예시:

- `bg-peer-page`
- `bg-peer-surface`
- `text-peer-primary`
- `text-peer-secondary`
- `border-peer-default`
- `shadow-peer-sm`
- `rounded-peer-card`
- `rounded-peer-hero`

## Accessibility Rules Attached To Tokens

- 본문 텍스트는 최소 `4.5:1` 대비
- 작은 메타 텍스트는 muted 색상을 남발하지 않는다
- focus state는 색만이 아니라 ring/outline로도 보여야 한다
- danger/warning/success 상태는 아이콘 또는 명시 라벨을 함께 쓴다
- icon-only button에는 항상 `aria-label`을 붙인다

## 1차 구현 우선 토큰

먼저 실제 코드에 반영할 우선 토큰은 아래다.

1. color semantic tokens
2. typography scale
3. radius tokens
4. button tokens
5. input tokens
6. panel/surface tokens

## 결론

이 토큰 세트의 목적은 지금의 "유리 카드 SaaS" 느낌을 벗기고, 더 단단하고 신뢰감 있는 제품 표면을 만드는 데 있다. 구현 단계에서는 기존 `peer-indigo`, `peer-sky` 중심 체계를 이 문서 기준의 semantic token 체계로 점진적으로 치환하면 된다.
