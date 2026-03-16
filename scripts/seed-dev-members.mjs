#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const REQUIRED_ENV_VARS = ['PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const DEFAULT_COUNT = 20;
const DEFAULT_NAMESPACE = 'dev-seed-20260316';
const DEFAULT_INVITE_CODE = 'DEVSEED20260316';
const PAGE_SIZE = 500;
const ALLOWED_PROJECT_REFS = new Set(['mgavbcotlixgjfybgnyc', '127.0.0.1', 'localhost']);

const seedProfiles = [
  {
    fullName: '김하늘',
    role: 'Frontend Engineer',
    introduction: '디자인 시스템과 인터랙션 품질에 집착하는 프론트엔드 엔지니어입니다.',
    careerHistory: '핀테크, 커머스, SaaS 제품에서 웹 프론트엔드와 디자인 시스템을 구축했습니다.'
  },
  {
    fullName: '박도윤',
    role: 'Backend Engineer',
    introduction: '안정적인 API와 데이터 모델링을 좋아하는 백엔드 엔지니어입니다.',
    careerHistory: '예약 플랫폼과 B2B SaaS에서 Node.js, PostgreSQL, 배치 시스템을 운영했습니다.'
  },
  {
    fullName: '이서윤',
    role: 'Product Designer',
    introduction: '복잡한 흐름을 간결한 경험으로 바꾸는 프로덕트 디자이너입니다.',
    careerHistory: '헬스케어와 협업툴에서 UX 리서치, IA 설계, 프로토타이핑을 담당했습니다.'
  },
  {
    fullName: '최지훈',
    role: 'iOS Engineer',
    introduction: 'Swift와 UIKit, SwiftUI를 오가며 제품 완성도를 높이는 iOS 개발자입니다.',
    careerHistory: '모빌리티 앱과 구독형 서비스 앱에서 iOS 클라이언트 개발을 리드했습니다.'
  },
  {
    fullName: '정유진',
    role: 'Android Engineer',
    introduction: '사용성 좋은 안드로이드 앱을 만드는 데 관심이 많은 엔지니어입니다.',
    careerHistory: '커뮤니티 앱과 핀테크 앱에서 Kotlin 기반 안드로이드 개발을 맡았습니다.'
  },
  {
    fullName: '한민준',
    role: 'Full Stack Engineer',
    introduction: '작은 팀에서 빠르게 가설을 만들고 검증하는 풀스택 엔지니어입니다.',
    careerHistory: '초기 스타트업에서 프론트엔드, 백엔드, 인프라를 두루 맡아 서비스 출시를 반복했습니다.'
  },
  {
    fullName: '오지민',
    role: 'Data Analyst',
    introduction: '사용자 행동 데이터를 제품 개선 인사이트로 연결하는 데이터 분석가입니다.',
    careerHistory: '리텐션 분석, 대시보드 설계, 실험 결과 분석으로 제품 의사결정을 지원했습니다.'
  },
  {
    fullName: '서현우',
    role: 'DevOps Engineer',
    introduction: '배포 자동화와 모니터링 체계를 만드는 데 강점이 있는 DevOps 엔지니어입니다.',
    careerHistory: 'AWS와 Kubernetes 기반 운영 환경에서 CI/CD와 관측성 체계를 정비했습니다.'
  },
  {
    fullName: '윤채원',
    role: 'QA Engineer',
    introduction: '릴리즈 전에 리스크를 줄이는 테스트 전략을 설계하는 QA 엔지니어입니다.',
    careerHistory: '웹과 모바일 통합 QA, E2E 자동화, 회귀 테스트 체계 구축을 담당했습니다.'
  },
  {
    fullName: '임태성',
    role: 'Product Manager',
    introduction: '문제 정의와 우선순위 조정에 집중하는 프로덕트 매니저입니다.',
    careerHistory: 'B2B 운영툴과 크리에이터 플랫폼에서 로드맵과 실험 설계를 이끌었습니다.'
  },
  {
    fullName: '신예린',
    role: 'Frontend Engineer',
    introduction: '접근성과 성능을 함께 챙기는 프론트엔드 개발자입니다.',
    careerHistory: '교육 서비스와 콘텐츠 플랫폼에서 Svelte, React 기반 제품을 개발했습니다.'
  },
  {
    fullName: '조현민',
    role: 'Backend Engineer',
    introduction: '서비스가 커져도 유지보수 가능한 구조를 고민하는 백엔드 엔지니어입니다.',
    careerHistory: '인증, 결제, 메시징 도메인 중심으로 마이크로서비스를 설계하고 운영했습니다.'
  },
  {
    fullName: '강나연',
    role: 'UX Researcher',
    introduction: '정성 리서치와 인터뷰로 문제의 본질을 찾는 UX 리서처입니다.',
    careerHistory: '인터뷰 설계, 사용성 테스트, VOC 분석을 통해 서비스 방향성을 정리했습니다.'
  },
  {
    fullName: '백시우',
    role: 'Security Engineer',
    introduction: '서비스 초기부터 보안 기본기를 심는 데 관심이 많은 보안 엔지니어입니다.',
    careerHistory: '권한 설계, 시크릿 관리, 취약점 점검, 보안 가이드 정비 업무를 맡았습니다.'
  },
  {
    fullName: '노수빈',
    role: 'Growth Marketer',
    introduction: '실험 기반으로 유입과 전환을 개선하는 그로스 마케터입니다.',
    careerHistory: '퍼포먼스 마케팅, CRM 캠페인, 랜딩 페이지 실험을 통해 성과를 만들었습니다.'
  },
  {
    fullName: '문재윤',
    role: 'Data Engineer',
    introduction: '분석하기 좋은 데이터 파이프라인을 만드는 데이터 엔지니어입니다.',
    careerHistory: '이벤트 수집, ELT 파이프라인, 데이터 웨어하우스 모델링을 구축했습니다.'
  },
  {
    fullName: '유다은',
    role: 'Brand Designer',
    introduction: '브랜드 톤과 제품 화면의 연결감을 설계하는 디자이너입니다.',
    careerHistory: '브랜드 리뉴얼과 마케팅 페이지 디자인, 캠페인 비주얼 제작을 진행했습니다.'
  },
  {
    fullName: '장서준',
    role: 'Solutions Architect',
    introduction: '비즈니스 요구사항을 현실적인 시스템 구조로 번역하는 아키텍트입니다.',
    careerHistory: '엔터프라이즈 SaaS 도입 프로젝트에서 아키텍처 설계와 기술 검토를 담당했습니다.'
  },
  {
    fullName: '홍가은',
    role: 'ML Engineer',
    introduction: '제품에 맞는 머신러닝 워크플로를 설계하는 ML 엔지니어입니다.',
    careerHistory: '추천 시스템 실험, 모델 서빙, 피처 파이프라인 운영 경험이 있습니다.'
  },
  {
    fullName: '류현서',
    role: 'Customer Success Manager',
    introduction: '고객의 문제를 제품 개선과 운영 체계로 연결하는 CSM입니다.',
    careerHistory: 'B2B SaaS 온보딩, 운영 프로세스 설계, VOC 정리와 확산을 담당했습니다.'
  }
];

const loadEnvFile = () => {
  const envPath = resolve(process.cwd(), '.env');

  if (!existsSync(envPath)) {
    return;
  }

  const contents = readFileSync(envPath, 'utf8');

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
};

const parseArgs = () => {
  const options = {
    count: DEFAULT_COUNT,
    namespace: DEFAULT_NAMESPACE,
    inviteCode: DEFAULT_INVITE_CODE,
    dryRun: false
  };

  for (const arg of process.argv.slice(2)) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith('--count=')) {
      const count = Number.parseInt(arg.slice('--count='.length), 10);
      if (!Number.isFinite(count) || count <= 0) {
        throw new Error(`Invalid count: ${arg}`);
      }
      options.count = count;
      continue;
    }

    if (arg.startsWith('--namespace=')) {
      options.namespace = arg.slice('--namespace='.length).trim();
      continue;
    }

    if (arg.startsWith('--invite-code=')) {
      options.inviteCode = arg.slice('--invite-code='.length).trim().toUpperCase();
    }
  }

  return options;
};

const assertRequiredEnv = () => {
  for (const envKey of REQUIRED_ENV_VARS) {
    if (!process.env[envKey]) {
      throw new Error(`Missing required environment variable: ${envKey}`);
    }
  }
};

const assertAllowedEnvironment = () => {
  const rawUrl = process.env.PUBLIC_SUPABASE_URL;

  if (!rawUrl) {
    throw new Error('PUBLIC_SUPABASE_URL is required');
  }

  let host;

  try {
    host = new URL(rawUrl).hostname;
  } catch {
    throw new Error(`Invalid PUBLIC_SUPABASE_URL: ${rawUrl}`);
  }

  const matchedRef =
    [...ALLOWED_PROJECT_REFS].find((candidate) => host === candidate || host.includes(candidate)) ?? null;

  if (!matchedRef) {
    throw new Error(
      `Refusing to run seed-dev-members against non-approved Supabase host: ${host}`
    );
  }
};

const createSupabaseAdmin = () =>
  createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false
    }
  });

const pad = (value) => String(value).padStart(2, '0');

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildMembers = (count, namespace) => {
  const now = Date.now();

  return Array.from({ length: count }, (_, index) => {
    const template = seedProfiles[index % seedProfiles.length];
    const ordinal = index + 1;
    const slug = slugify(`${template.role}-${ordinal}`);
    const timestamp = new Date(now - index * 3 * 60 * 60 * 1000).toISOString();
    const email = `${namespace}.member${pad(ordinal)}@example.com`;

    return {
      ordinal,
      email,
      password: `PeerConnectSeed!${namespace}`,
      fullName: template.fullName,
      role: template.role,
      introduction: template.introduction,
      careerHistory: template.careerHistory,
      contactLinkedin: `https://www.linkedin.com/in/${slug}`,
      contactGithub: `https://github.com/${slug}`,
      contactEmail: email,
      updatedAt: timestamp,
      profileCompletedAt: timestamp
    };
  });
};

const listAllAuthUsers = async (supabase) => {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE
    });

    if (error) {
      throw error;
    }

    users.push(...(data?.users ?? []));

    if (!data || data.users.length < PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return users;
};

const ensureAuthUsers = async (supabase, members, namespace, dryRun) => {
  const authUsers = await listAllAuthUsers(supabase);
  const usersByEmail = new Map(
    authUsers
      .filter((user) => typeof user.email === 'string')
      .map((user) => [user.email.toLowerCase(), user])
  );

  const summary = {
    created: 0,
    reused: 0
  };
  const resolvedMembers = [];

  for (const member of members) {
    const existingUser = usersByEmail.get(member.email.toLowerCase());

    if (existingUser) {
      summary.reused += 1;
      resolvedMembers.push({
        ...member,
        userId: existingUser.id
      });
      continue;
    }

    if (dryRun) {
      summary.created += 1;
      resolvedMembers.push({
        ...member,
        userId: `dry-run-${member.ordinal}`
      });
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: member.email,
      password: member.password,
      email_confirm: true,
      user_metadata: {
        full_name: member.fullName,
        title: member.role,
        seed_namespace: namespace
      },
      app_metadata: {
        seed_namespace: namespace
      }
    });

    if (error || !data.user) {
      throw error ?? new Error(`Failed to create auth user for ${member.email}`);
    }

    summary.created += 1;
    resolvedMembers.push({
      ...member,
      userId: data.user.id
    });
  }

  return { members: resolvedMembers, summary };
};

const upsertProfiles = async (supabase, members, dryRun) => {
  const payload = members.map((member) => ({
    user_id: member.userId,
    full_name: member.fullName,
    role: member.role,
    career_history: member.careerHistory,
    introduction: member.introduction,
    updated_at: member.updatedAt,
    email: member.email,
    contact_linkedin: member.contactLinkedin,
    contact_github: member.contactGithub,
    contact_email: member.contactEmail,
    photo_url: null,
    notify_endorsements: true,
    notify_gatherings: true,
    notify_comments: true,
    profile_completed_at: member.profileCompletedAt
  }));

  if (dryRun) {
    return payload.length;
  }

  const { error } = await supabase.from('profiles').upsert(payload, {
    onConflict: 'user_id'
  });

  if (error) {
    throw error;
  }

  return payload.length;
};

const ensureSeedInvite = async (supabase, inviteCode, count, dryRun) => {
  const { data: existingInvite, error: lookupError } = await supabase
    .from('invites')
    .select('id')
    .eq('code', inviteCode)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existingInvite) {
    if (!dryRun) {
      const { error } = await supabase
        .from('invites')
        .update({
          inviter_user_id: null,
          redeemed_by: null,
          slot_index: null,
          max_redemptions: count,
          beta_unlimited: false,
          deactivated_at: null
        })
        .eq('id', existingInvite.id);

      if (error) {
        throw error;
      }
    }

    return {
      id: existingInvite.id,
      created: false
    };
  }

  if (dryRun) {
    return {
      id: 'dry-run-invite',
      created: true
    };
  }

  const { data, error } = await supabase
    .from('invites')
    .insert({
      code: inviteCode,
      inviter_user_id: null,
      redeemed_by: null,
      slot_index: null,
      max_redemptions: count,
      beta_unlimited: false,
      deactivated_at: null
    })
    .select('id')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to create seed invite');
  }

  return {
    id: data.id,
    created: true
  };
};

const upsertInviteRedemptions = async (supabase, inviteId, members, dryRun) => {
  const payload = members.map((member, index) => {
    const redeemedAt = new Date(Date.now() - (members.length - index) * 60 * 60 * 1000).toISOString();

    return {
      invite_id: inviteId,
      invitee_user_id: member.userId,
      redeemed_at: redeemedAt,
      inviter_notified_at: redeemedAt
    };
  });

  if (dryRun) {
    return payload.length;
  }

  const { error } = await supabase.from('invite_redemptions').upsert(payload, {
    onConflict: 'invitee_user_id'
  });

  if (error) {
    throw error;
  }

  return payload.length;
};

const buildEndorsements = (members) =>
  members.map((member, index) => {
    const target = members[(index + 1) % members.length];

    return {
      author_id: member.userId,
      target_user_id: target.userId,
      content: `${target.fullName}님은 협업 맥락을 빠르게 이해하고 필요한 결정을 명확하게 정리해주는 믿을 만한 동료입니다.`
    };
  });

const upsertEndorsements = async (supabase, members, dryRun) => {
  const payload = buildEndorsements(members);

  if (dryRun) {
    return payload.length;
  }

  const { error } = await supabase.from('endorsements').upsert(payload, {
    onConflict: 'author_id,target_user_id'
  });

  if (error) {
    throw error;
  }

  return payload.length;
};

const buildGatherings = (members, namespace) => {
  const baseTime = Date.now();

  return [
    {
      author_id: members[0].userId,
      title: `[${namespace}] 프론트엔드 협업 루틴 공유`,
      content:
        '이번 분기에 프론트엔드 팀이 도입한 코드리뷰 체크리스트와 QA 핸드오프 방식을 정리했습니다. 운영하면서 좋았던 점과 아쉬웠던 점도 같이 이야기해보고 싶어요.',
      created_at: new Date(baseTime - 6 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseTime - 6 * 60 * 60 * 1000).toISOString()
    },
    {
      author_id: members[1].userId,
      title: `[${namespace}] API 스키마 버전 관리 팁`,
      content:
        '모바일과 웹이 함께 붙는 환경에서 API 스키마를 어떻게 안전하게 버전 관리하는지 사례를 공유합니다. 문서화와 배포 타이밍도 같이 얘기해봐요.',
      created_at: new Date(baseTime - 12 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseTime - 12 * 60 * 60 * 1000).toISOString()
    },
    {
      author_id: members[3].userId,
      title: `[${namespace}] 모바일 온보딩 개선 아이디어`,
      content:
        '첫 주차 유지율을 높이기 위해 온보딩 단계에서 무엇을 덜어내고 무엇을 남겨야 할지 고민 중입니다. 참고 사례가 있으면 같이 나눠주세요.',
      created_at: new Date(baseTime - 20 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseTime - 20 * 60 * 60 * 1000).toISOString()
    },
    {
      author_id: members[7].userId,
      title: `[${namespace}] 모니터링 대시보드 추천`,
      content:
        '작은 팀에서 과하지 않게 운영 가능한 에러 추적, 로그, 알람 조합을 찾고 있습니다. 현재 쓰는 스택과 운영 팁이 있다면 듣고 싶어요.',
      created_at: new Date(baseTime - 28 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseTime - 28 * 60 * 60 * 1000).toISOString()
    },
    {
      author_id: members[9].userId,
      title: `[${namespace}] PM이 보는 실험 우선순위`,
      content:
        '이번 달 실험 후보를 정리하면서 팀 리소스와 기대 효과를 같이 보는 기준이 필요했습니다. 각자 실험 우선순위를 정하는 기준이 궁금합니다.',
      created_at: new Date(baseTime - 36 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseTime - 36 * 60 * 60 * 1000).toISOString()
    },
    {
      author_id: members[15].userId,
      title: `[${namespace}] 데이터 파이프라인 운영 회고`,
      content:
        '최근 이벤트 적재 지연 이슈를 정리하면서 알게 된 병목 지점들을 공유합니다. 비슷한 문제를 겪으신 분들의 대응 경험도 듣고 싶습니다.',
      created_at: new Date(baseTime - 44 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(baseTime - 44 * 60 * 60 * 1000).toISOString()
    }
  ];
};

const insertGatherings = async (supabase, members, namespace, dryRun) => {
  const payload = buildGatherings(members, namespace);
  const titles = payload.map((entry) => entry.title);

  const { data: existingRows, error: lookupError } = await supabase
    .from('gatherings')
    .select('title')
    .in('title', titles);

  if (lookupError) {
    throw lookupError;
  }

  const existingTitles = new Set((existingRows ?? []).map((row) => row.title));
  const missing = payload.filter((entry) => !existingTitles.has(entry.title));

  if (dryRun || missing.length === 0) {
    return {
      inserted: missing.length,
      existing: payload.length - missing.length
    };
  }

  const { error } = await supabase.from('gatherings').insert(missing);

  if (error) {
    throw error;
  }

  return {
    inserted: missing.length,
    existing: payload.length - missing.length
  };
};

const fetchCounts = async (supabase) => {
  const tables = ['profiles', 'invites', 'invite_redemptions', 'endorsements', 'gatherings'];
  const counts = {};

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', {
      count: 'exact',
      head: true
    });

    if (error) {
      throw error;
    }

    counts[table] = count ?? 0;
  }

  return counts;
};

const main = async () => {
  loadEnvFile();
  assertRequiredEnv();
  assertAllowedEnvironment();

  const options = parseArgs();
  const supabase = createSupabaseAdmin();
  const members = buildMembers(options.count, options.namespace);

  console.log(
    `[seed-dev-members] Starting ${options.dryRun ? 'dry run' : 'apply'} for ${options.count} members.`
  );

  const beforeCounts = await fetchCounts(supabase);
  const { members: resolvedMembers, summary: authSummary } = await ensureAuthUsers(
    supabase,
    members,
    options.namespace,
    options.dryRun
  );
  const profileCount = await upsertProfiles(supabase, resolvedMembers, options.dryRun);
  const invite = await ensureSeedInvite(
    supabase,
    options.inviteCode,
    options.count,
    options.dryRun
  );
  const redemptionCount = await upsertInviteRedemptions(
    supabase,
    invite.id,
    resolvedMembers,
    options.dryRun
  );
  const endorsementCount = await upsertEndorsements(supabase, resolvedMembers, options.dryRun);
  const gatheringResult = await insertGatherings(
    supabase,
    resolvedMembers,
    options.namespace,
    options.dryRun
  );
  const afterCounts = options.dryRun ? beforeCounts : await fetchCounts(supabase);

  console.log(`[seed-dev-members] Auth users created: ${authSummary.created}`);
  console.log(`[seed-dev-members] Auth users reused: ${authSummary.reused}`);
  console.log(`[seed-dev-members] Profiles upserted: ${profileCount}`);
  console.log(
    `[seed-dev-members] Seed invite: ${invite.created ? 'created' : 'reused'} (${options.inviteCode})`
  );
  console.log(`[seed-dev-members] Invite redemptions upserted: ${redemptionCount}`);
  console.log(`[seed-dev-members] Endorsements upserted: ${endorsementCount}`);
  console.log(
    `[seed-dev-members] Gatherings inserted: ${gatheringResult.inserted}, existing kept: ${gatheringResult.existing}`
  );
  console.log(`[seed-dev-members] Counts before: ${JSON.stringify(beforeCounts)}`);
  console.log(`[seed-dev-members] Counts after: ${JSON.stringify(afterCounts)}`);

  if (options.dryRun) {
    console.log('[seed-dev-members] Dry run complete. Re-run without --dry-run to apply.');
  }
};

main().catch((error) => {
  console.error('[seed-dev-members] Failed:', error);
  process.exit(1);
});
