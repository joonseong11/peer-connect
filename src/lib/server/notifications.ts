import { PUBLIC_APP_URL } from '$env/static/public';
import { sendEmail } from './email';

type MeetingAnnouncementInput = {
  recipients: Array<{ email: string; name?: string | null }>;
  post: {
    id: string;
    title: string;
    authorName: string;
    content: string;
  };
};

type EndorsementNotificationInput = {
  target: { email: string; name?: string | null; userId: string };
  authorName: string;
  content: string;
};

type GatheringCommentNotificationInput = {
  target: { email: string; name?: string | null; userId: string };
  post: { id: string; title: string };
  comment: { authorName: string; content: string };
  kind: 'post' | 'reply';
};

const getAppUrl = () => {
  if (PUBLIC_APP_URL) {
    return PUBLIC_APP_URL.replace(/\/$/, '');
  }

  if (typeof process !== 'undefined' && process.env.VITE_PUBLIC_APP_URL) {
    return process.env.VITE_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  return 'http://localhost:5173';
};

const createExcerpt = (content: string, length = 160) => {
  const plain = content.replace(/\s+/g, ' ').trim();
  return plain.length > length ? `${plain.slice(0, length)}…` : plain;
};

const buildNotificationSettingsUrl = (appUrl: string, campaign: string) =>
  `${appUrl}/mypage?utm_source=email&utm_medium=notification&utm_campaign=${campaign}#notifications`;

const notificationFooterHtml = (manageUrl: string) =>
  `
                <hr style="margin: 32px 0; border: none; border-top: 1px solid rgba(148, 163, 184, 0.3);" />
                <p style="margin: 16px 0 0; font-size: 13px; line-height: 1.6; color: #475569;">
                        더 이상 이 알림을 받고 싶지 않다면 <a href="${manageUrl}" style="color: #2563eb;">알림 설정</a>에서 수신을 차단할 수 있습니다.
                </p>
        `.trim();

const notificationFooterText = (manageUrl: string) =>
  `알림 수신을 중단하려면 다음 링크에서 설정을 변경하세요: ${manageUrl}`;

export const notifyMeetingCreated = async (input: MeetingAnnouncementInput) => {
  if (input.recipients.length === 0) {
    return { ok: true, skipped: true };
  }

  const appUrl = getAppUrl();
  const postUrl = `${appUrl}/gatherings/${input.post.id}`;
  const excerpt = createExcerpt(input.post.content, 180);

  const subject = 'PEER CONNECT 에서 동료를 찾고 있습니다.';
  const manageUrl = buildNotificationSettingsUrl(appUrl, 'gathering-announcement');

  const html = `
                <p><strong>${input.post.authorName}</strong>님이 새 모임을 공유했습니다.</p>
                <h2 style="margin: 24px 0 12px; font-size: 20px;">${input.post.title}</h2>
                <p style="margin: 0 0 24px; line-height: 1.6;">${excerpt}</p>
                <a href="${postUrl}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;">자세히 확인하기</a>
                ${notificationFooterHtml(manageUrl)}
        `.trim();

  const text = `
${input.post.authorName}님이 새 모임을 공유했습니다.
제목: ${input.post.title}
내용: ${excerpt}

자세히 확인하기: ${postUrl}

${notificationFooterText(manageUrl)}
`.trim();

  return sendEmail({
    to: input.recipients,
    subject,
    html,
    text,
    listUnsubscribe: { url: manageUrl }
  });
};

export const notifyEndorsementReceived = async (input: EndorsementNotificationInput) => {
  const appUrl = getAppUrl();
  const endorsementUrl = `${appUrl}/members/${input.target.userId}`;
  const subject = `PEER CONNECT에서 ${input.authorName}님이 당신에게 추천서를 남겼습니다.`;
  const manageUrl = buildNotificationSettingsUrl(appUrl, 'endorsement-notification');

  const html = `
                <p><strong>${input.authorName}</strong>님이 아래 내용으로 당신에게 추천서를 남겼습니다.</p>
                <blockquote style="margin: 24px 0; padding: 16px 20px; background: #f1f5f9; border-radius: 16px; line-height: 1.6;">
                        ${input.content.replace(/\n/g, '<br />')}
                </blockquote>
                <a href="${endorsementUrl}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;">추천서 확인하러 가기</a>
                ${notificationFooterHtml(manageUrl)}
        `.trim();

  const text = `
${input.authorName}님이 당신에게 추천서를 남겼습니다.

${input.content}

추천서 확인하러 가기: ${endorsementUrl}

${notificationFooterText(manageUrl)}
`.trim();

  return sendEmail({
    to: { name: input.target.name, email: input.target.email },
    subject,
    html,
    text,
    listUnsubscribe: { url: manageUrl }
  });
};

export const notifyGatheringCommentReceived = async (input: GatheringCommentNotificationInput) => {
  const appUrl = getAppUrl();
  const postUrl = `${appUrl}/gatherings/${input.post.id}`;
  const actionLabel = input.kind === 'reply' ? '답글 확인하기' : '댓글 확인하기';
  const description =
    input.kind === 'reply'
      ? `<strong>${input.comment.authorName}</strong>님이 당신의 댓글에 답글을 남겼습니다.`
      : `<strong>${input.comment.authorName}</strong>님이 &lt;${input.post.title}&gt; 글에 댓글을 남겼습니다.`;
  const subject =
    input.kind === 'reply'
      ? `PEER CONNECT에서 ${input.comment.authorName}님이 내 댓글에 답글을 남겼습니다.`
      : `PEER CONNECT에서 ${input.comment.authorName}님이 내 모임 글에 댓글을 남겼습니다.`;

  const excerpt = createExcerpt(input.comment.content, 220);
  const manageUrl = buildNotificationSettingsUrl(appUrl, 'comment-notification');

  const html = `
                <p>${description}</p>
                <blockquote style="margin: 24px 0; padding: 16px 20px; background: #eef2ff; border-radius: 16px; line-height: 1.6;">
                        ${input.comment.content.replace(/\n/g, '<br />')}
                </blockquote>
                <a href="${postUrl}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#4338ca;color:#ffffff;text-decoration:none;font-weight:600;">${actionLabel}</a>
                ${notificationFooterHtml(manageUrl)}
        `.trim();

  const text = `
${input.comment.authorName}님이 새 ${input.kind === 'reply' ? '답글' : '댓글'}을 남겼습니다.

${excerpt}

${actionLabel}: ${postUrl}

${notificationFooterText(manageUrl)}
`.trim();

  return sendEmail({
    to: { name: input.target.name, email: input.target.email },
    subject,
    html,
    text,
    listUnsubscribe: { url: manageUrl }
  });
};
