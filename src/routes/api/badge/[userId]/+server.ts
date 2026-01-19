import { getSupabaseAdminClient } from '$lib/server/supabaseAdmin';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const userId = params.userId;
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    throw error(500, 'Server configuration error');
  }

  // 1. Fetch Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile) {
    return new Response(getErrorSvg('사용자를 찾을 수 없습니다.'), {
      headers: { 'Content-Type': 'image/svg+xml' }
    });
  }

  // 2. Fetch Endorsements (Count and All)
  // Limit to 20 for badge
  const { count, data: endorsements } = await supabase
    .from('endorsements')
    .select('content, created_at, author:profiles!endorsements_author_id_fkey(full_name, role)', { count: 'exact' })
    .eq('target_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  const endorsementCount = count ?? 0;
  
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const cleanEndorsements = (endorsements ?? []).map((e: any) => ({
    content: e.content,
    created_at: e.created_at,
    author: Array.isArray(e.author) ? e.author[0] : e.author
  }));

  // 3. Generate SVG
  const svg = generateSvg(profile, endorsementCount, cleanEndorsements);

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=60, s-maxage=60' // 1 minute cache
    }
  });
};

function getErrorSvg(message: string) {
  return `
  <svg width="600" height="150" viewBox="0 0 600 150" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#fff" stroke="#e2e8f0" rx="4" />
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="'Pretendard', sans-serif" font-size="14" fill="#ef4444">
      ${message}
    </text>
  </svg>
  `;
}

function generateSvg(
  profile: { full_name: string | null; role: string | null },
  count: number,
  endorsements: Array<{ content: string; created_at: string; author: { full_name: string | null; role: string | null } | null }>
) {
  const name = profile.full_name || '익명 사용자';
  const role = profile.role || 'Peer Connect 멤버';
  
  // Design Constants
  const width = 800;
  const padding = 24;
  const headerHeight = 160; 
  
  // Colors (from Image Design)
  const colors = {
    headerBg: '#1e293b',    // Dark blue/slate background for header
    bodyBg: '#ffffff',      // White body
    borderColor: '#e2e8f0', // Light slate border
    nameText: '#ffffff',    // White name
    roleText: '#94a3b8',    // Light gray role
    logoText: '#64748b',    // Peer Connect label
    badgeBgStart: '#f59e0b',// Amber 500
    badgeBgEnd: '#ea580c',  // Orange 600
    sectionTitle: '#334155',// Slate 700
    cardBg: '#ffffff',      // White card
    cardBorder: '#cbd5e1',  // Slate 300
    quoteText: '#1e293b',   // Slate 800
    metaText: '#64748b',    // Slate 500
    footerText: '#64748b'   // Slate 500
  };

  // Content Layout Calculation
  let currentY = headerHeight + 30; // Start below header
  const contentWidth = width - (padding * 2);

  // Section Title
  const titleY = currentY + 10;
  const titleHtml = `
    <g transform="translate(${padding}, ${currentY})">
      <!-- Icon (Users) -->
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M16 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke="${colors.sectionTitle}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="scale(0.8) translate(0, 5)" />
      <text x="30" y="20" font-family="'Pretendard', sans-serif" font-weight="bold" font-size="18" fill="${colors.sectionTitle}">동료 추천서</text>
    </g>
  `;
  currentY += 40;

  // List of Endorsements
  const cardGap = 16;
  const cardInnerPadding = 20;

  let endorsementNodes = endorsements.map((item) => {
    // Wrap text logic
    const lines = wrapText(item.content, 85); // Wider cards allow more chars
    const lineHeight = 24;
    const textHeight = lines.length * lineHeight;
    
    // Height calculation: padding top + text + padding middle + footer + padding bottom
    const cardHeight = cardInnerPadding + textHeight + 20 + 20 + cardInnerPadding;
    
    // Author text
    const authorName = item.author?.full_name || '알 수 없는 동료';
    const authorRole = item.author?.role || '';
    const dateStr = new Date(item.created_at).getFullYear() + '년'; // Format: 2025년
    const authorText = `${authorName} · ${authorRole}`;

    const node = `
      <g transform="translate(${padding}, ${currentY})">
        <!-- Card Box -->
        <rect width="${contentWidth}" height="${cardHeight}" rx="12" fill="${colors.cardBg}" stroke="${colors.cardBorder}" stroke-width="1" />
        
        <!-- Content -->
        ${lines.map((line, i) => `
          <text x="${cardInnerPadding}" y="${cardInnerPadding + 20 + (i * lineHeight)}" font-family="'Pretendard', sans-serif" font-size="15" fill="${colors.quoteText}">
            ${escapeXml(line)}
          </text>
        `).join('')}
        
        <!-- Footer (Name & Date) -->
        <text x="${cardInnerPadding}" y="${cardHeight - cardInnerPadding}" font-family="'Pretendard', sans-serif" font-weight="bold" font-size="14" fill="${colors.quoteText}">
          ${escapeXml(authorName)} <tspan font-weight="normal" fill="${colors.metaText}">· ${escapeXml(authorRole)}</tspan>
        </text>
        
        <text x="${contentWidth - cardInnerPadding}" y="${cardHeight - cardInnerPadding}" text-anchor="end" font-family="'Pretendard', sans-serif" font-size="14" fill="${colors.metaText}">
          ${dateStr}
        </text>
      </g>
    `;
    
    currentY += cardHeight + cardGap;
    return node;
  }).join('');

  if (endorsements.length === 0) {
    const emptyMsg = '아직 작성된 추천서가 없어요. 클릭하여 추천서 작성하러 가기';
    const emptyNode = `
      <g transform="translate(${width/2}, ${currentY + 60})" text-anchor="middle">
        <text y="0" font-family="'Pretendard', sans-serif" font-size="16" fill="${colors.quoteText}" font-weight="bold">
          ${escapeXml(emptyMsg)}
        </text>
        <rect x="-240" y="-30" width="480" height="50" rx="25" fill="none" stroke="${colors.badgeBgEnd}" stroke-width="2" stroke-dasharray="6 4" />
      </g>
    `;
    endorsementNodes += emptyNode;
    currentY += 120; // Increase height for empty state
  }

  // Footer "More" Text (Static for now as requested design)
  // Or purely dynamic "Show All" means we don't need "More".
  // But strictly following image style:
  // " + 1개의 추천서 더보기 "
  // We will add a small spacer and footer signature.
  currentY += 20;
  
  const footerHtml = `
    <g transform="translate(${padding}, ${currentY})">
        <!-- Certified Icon -->
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="${colors.footerText}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" transform="scale(0.8) translate(0,0)" />
        <text x="24" y="14" font-family="'Pretendard', sans-serif" font-size="13" fill="${colors.footerText}">신뢰할 수 있는 동료</text>
    </g>
    <!-- Handle -->
    <text x="${width - padding}" y="${currentY + 14}" text-anchor="end" font-family="'Pretendard', sans-serif" font-size="13" fill="${colors.footerText}">
      @${role === 'Peer Connect 멤버' ? 'peerconnect' : 'user'}
    </text>
  `;
  currentY += 40; // Footer height

  return `
  <svg width="${width}" height="${currentY}" viewBox="0 0 ${width} ${currentY}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <style>
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        text { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif; }
      </style>
      <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${colors.badgeBgStart};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${colors.badgeBgEnd};stop-opacity:1" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.25"/>
      </filter>
    </defs>
    
    <!-- Overall Background (Border) -->
    <rect width="100%" height="100%" fill="${colors.bodyBg}" stroke="${colors.borderColor}" stroke-width="1" rx="4" />
    
    <!-- Header Background -->
    <path d="M0.5 0.5 h${width-1} v${headerHeight} h-${width-1} v-${headerHeight} z" fill="${colors.headerBg}" />

    <!-- Header Content -->
    <!-- Peer Connect Label -->
    <text x="${padding}" y="40" font-size="14" fill="${colors.logoText}">Peer Connect</text>
    
    <!-- Name -->
    <text x="${padding}" y="80" font-weight="bold" font-size="32" fill="${colors.nameText}">${escapeXml(name)}</text>
    
    <!-- Role -->
    <text x="${padding}" y="110" font-size="18" fill="${colors.roleText}">${escapeXml(role)}</text>

    <!-- Count Badge -->
    <g transform="translate(${width - padding - 80}, 30)">
        <rect width="80" height="85" rx="12" fill="url(#badgeGradient)" filter="url(#shadow)" />
        <text x="40" y="45" text-anchor="middle" font-weight="bold" font-size="36" fill="#fff">${count}</text>
        <text x="40" y="70" text-anchor="middle" font-size="13" fill="#fff" fill-opacity="0.9">추천서</text>
    </g>

    <!-- Body Content -->
    ${titleHtml}
    ${endorsementNodes}
    ${footerHtml}

  </svg>
  `;
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    if (getErrorLength(currentLine + " " + words[i]) < maxChars) {
      currentLine += " " + words[i];
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  
  return lines.flatMap(line => line.split('\n'));
}

function getErrorLength(str: string): number {
  let len = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    len += (c > 128) ? 2 : 1;
  }
  return len;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
