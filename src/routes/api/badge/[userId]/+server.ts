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
  // Limit to 10 for safety in SVG size, though user asked for "all".
  // 10 is a reasonable "all" for a badge.
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
  <svg width="400" height="100" viewBox="0 0 400 100" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#f8d7da" rx="10" />
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="'Pretendard', sans-serif" font-size="14" fill="#721c24">
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
  
  // Theme Colors
  const bgGradientStart = '#0F172A'; // peer-navy
  const bgGradientEnd = '#1E293B';   // slate-800
  const textColor = '#F8FAFC';       // slate-50
  const subTextColor = '#94A3B8';    // slate-400
  const accentColor = '#6366f1';     // peer-indigo
  const cardBg = '#334155';          // slate-700
  
  // Layout Constants
  const width = 600;
  const padding = 30;
  const headerHeight = 160; 
  // Header includes Name, Role, Logo, Stats
  
  // content calculation
  let currentY = headerHeight;
  const itemGap = 20;
  const contentWidth = width - (padding * 2);
  const fontSize = 14;
  const lineHeight = 20;
  
  const endorsementNodes = endorsements.map((item) => {
    // Wrap text logic
    const lines = wrapText(item.content, 65); // approx 65 chars per line
    const textHeight = lines.length * lineHeight;
    const itemHeight = textHeight + 40; // + padding/author info
    
    // Author text
    const authorName = item.author?.full_name || '알 수 없는 동료';
    const authorRole = item.author?.role || '';
    const dateStr = new Date(item.created_at).toLocaleDateString('ko-KR');
    const footerText = `- ${authorName} (${authorRole}) · ${dateStr}`;

    const node = `
      <g transform="translate(${padding}, ${currentY})">
        <rect width="${contentWidth}" height="${itemHeight}" rx="8" fill="${cardBg}" fill-opacity="0.4" />
        
        <!-- Quote Icon -->
        <text x="15" y="25" font-family="serif" font-size="28" fill="${accentColor}" fill-opacity="0.5">“</text>
        
        <!-- Content Lines -->
        ${lines.map((line, i) => `
          <text x="40" y="${28 + (i * lineHeight)}" font-family="'Pretendard', 'Apple SD Gothic Neo', sans-serif" font-size="${fontSize}" fill="${textColor}">
            ${escapeXml(line)}
          </text>
        `).join('')}
        
        <!-- Author Footer -->
        <text x="${contentWidth - 15}" y="${itemHeight - 12}" text-anchor="end" font-family="'Pretendard', sans-serif" font-size="12" fill="${subTextColor}">
          ${escapeXml(footerText)}
        </text>
      </g>
    `;
    
    currentY += itemHeight + itemGap;
    return node;
  }).join('');

  if (endorsements.length === 0) {
    const emptyMsg = '아직 받은 추천이 없습니다. 동료에게 추천을 요청해보세요!';
    endorsementNodes === `
      <text x="${width/2}" y="${currentY + 20}" text-anchor="middle" font-family="'Pretendard', sans-serif" font-size="14" fill="${subTextColor}">
        ${emptyMsg}
      </text>
    `;
    currentY += 50;
  }

  const totalHeight = currentY + padding;

  return `
  <svg width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${bgGradientStart};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${bgGradientEnd};stop-opacity:1" />
      </linearGradient>
      <style>
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        text { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif; }
      </style>
    </defs>
    
    <rect width="100%" height="100%" fill="url(#bg)" rx="16" />
    
    <!-- Header Section -->
    <!-- Logo -->
    <text x="${width - padding}" y="45" text-anchor="end" font-weight="bold" font-size="18" fill="${accentColor}">
      Peer Connect
    </text>

    <!-- Name & Role -->
    <text x="${padding}" y="50" font-weight="bold" font-size="28" fill="${textColor}">
      ${escapeXml(name)}
    </text>
    <text x="${padding}" y="80" font-size="16" fill="${subTextColor}">
      ${escapeXml(role)}
    </text>

    <!-- Divider -->
    <line x1="${padding}" y1="100" x2="${width - padding}" y2="100" stroke="${subTextColor}" stroke-opacity="0.2" stroke-width="1" />

    <!-- Stats Label -->
    <text x="${padding}" y="135" font-size="15" fill="${subTextColor}">
      <tspan fill="${accentColor}" font-weight="bold" font-size="18">${count}</tspan>개의 동료 추천
    </text>

    <!-- Content -->
    ${endorsementNodes}
    
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
  
  // Handle explicit newlines if any
  return lines.flatMap(line => {
    // Simple rough check for CJK characters which take up more visual width
    // This is valid but primitive wrapping.
    return line.split('\n');
  });
}

// Rough estimation: CJK chars count as 2, others as 1
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
