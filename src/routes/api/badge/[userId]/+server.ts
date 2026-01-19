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
    return new Response(getErrorSvg('User not found'), {
      headers: { 'Content-Type': 'image/svg+xml' }
    });
  }

  // 2. Fetch Endorsements (Count and Latest)
  const { count, data: latestEndorsements } = await supabase
    .from('endorsements')
    .select('content, author:profiles!endorsements_author_id_fkey(full_name)', { count: 'exact' })
    .eq('target_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  const endorsementCount = count ?? 0;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const latestEndorsementRaw = latestEndorsements?.[0] as any;
  const latestEndorsement = latestEndorsementRaw ? {
    content: latestEndorsementRaw.content,
    author: Array.isArray(latestEndorsementRaw.author) 
      ? latestEndorsementRaw.author[0] 
      : latestEndorsementRaw.author
  } : null;

  // 3. Generate SVG
  const svg = generateSvg(profile, endorsementCount, latestEndorsement);

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
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#721c24">
      ${message}
    </text>
  </svg>
  `;
}

function generateSvg(
  profile: { full_name: string | null; role: string | null },
  count: number,
  latestEndorsement: { content: string; author: { full_name: string | null } | null } | null
) {
  // Safe defaults
  const name = profile.full_name || 'Anonymous';
  const role = profile.role || 'Member';
  const endorsementText = count === 1 ? 'Endorsement' : 'Endorsements';
  
  // Truncate function for SVG text
  const truncate = (str: string, max: number) => 
    str.length > max ? str.slice(0, max) + '...' : str;

  const quote = latestEndorsement 
    ? `"${truncate(latestEndorsement.content, 60)}"` 
    : 'No recommendations yet.';
  
  const authorName = latestEndorsement?.author?.full_name 
    ? `- ${latestEndorsement.author.full_name}` 
    : '';

  // Theme Colors
  const bgGradientStart = '#0F172A';
  const bgGradientEnd = '#1E293B';
  const textColor = '#F8FAFC'; // slate-50
  const subTextColor = '#94A3B8'; // slate-400
  const accentColor = '#38BDF8'; // sky-400
  
  return `
  <svg width="500" height="220" viewBox="0 0 500 220" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${bgGradientStart};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${bgGradientEnd};stop-opacity:1" />
      </linearGradient>
    </defs>
    
    <rect width="100%" height="100%" fill="url(#bg)" rx="12" />
    
    <!-- Header: Name & Role -->
    <text x="30" y="50" font-family="'Segoe UI', Ubuntu, Sans-Serif" font-weight="bold" font-size="24" fill="${textColor}">
      ${escapeXml(name)}
    </text>
    <text x="30" y="80" font-family="'Segoe UI', Ubuntu, Sans-Serif" font-size="16" fill="${subTextColor}">
      ${escapeXml(role)}
    </text>

    <!-- Divider -->
    <line x1="30" y1="100" x2="470" y2="100" stroke="${subTextColor}" stroke-opacity="0.2" stroke-width="1" />

    <!-- Stats -->
    <text x="30" y="140" font-family="'Segoe UI', Ubuntu, Sans-Serif" font-weight="bold" font-size="32" fill="${accentColor}">
      ${count}
    </text>
    <text x="80" y="136" font-family="'Segoe UI', Ubuntu, Sans-Serif" font-size="14" fill="${subTextColor}">
      ${endorsementText} on Peer Connect
    </text>

    <!-- Latest Quote (Bubble) -->
    <rect x="30" y="160" width="440" height="40" rx="4" fill="#334155" fill-opacity="0.5" />
    <text x="45" y="185" font-family="'Segoe UI', Ubuntu, Sans-Serif" font-size="13" font-style="italic" fill="${textColor}">
      ${escapeXml(quote)} ${escapeXml(authorName)}
    </text>
  </svg>
  `;
}

function escapeXml(unsafe: string): string {
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
