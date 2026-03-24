const DEFAULT_FROM_EMAIL = 'thenetwork@peer-connect.co.kr';

type EmailRecipient = string | { name?: string | null; email: string };

type ListUnsubscribeOptions = {
  mailto?: string;
  url?: string;
};

export type SendEmailOptions = {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string | string[];
  headers?: Record<string, string>;
  listUnsubscribe?: ListUnsubscribeOptions;
};

export type EmailConfig = {
  apiKey: string | undefined;
  fromEmail?: string;
  replyToEmail?: string;
};

const formatRecipient = (recipient: EmailRecipient) => {
  if (typeof recipient === 'string') {
    return recipient;
  }

  return recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email;
};

const buildListUnsubscribeHeader = (options?: ListUnsubscribeOptions) => {
  if (!options) {
    return null;
  }

  const segments: string[] = [];

  if (options.mailto) {
    segments.push(`<mailto:${options.mailto.replace(/^mailto:/i, '')}>`);
  }

  if (options.url) {
    segments.push(`<${options.url}>`);
  }

  if (segments.length === 0) {
    return null;
  }

  return segments.join(', ');
};

export const createEmailSender = (config: EmailConfig) => {
  const fromEmail = config.fromEmail?.trim() || DEFAULT_FROM_EMAIL;

  return async (options: SendEmailOptions) => {
    if (!config.apiKey) {
      console.warn('[email] RESEND_API_KEY is not configured; skipping email send.');
      return { ok: false, skipped: true };
    }

    const to = Array.isArray(options.to) ? options.to : [options.to];

    const replyTo =
      options.replyTo ?? (config.replyToEmail?.trim() ? config.replyToEmail.trim() : undefined);

    const payload: Record<string, unknown> = {
      from: fromEmail,
      to: to.map(formatRecipient),
      subject: options.subject,
      html: options.html,
      text: options.text
    };

    if (replyTo) {
      payload.reply_to = replyTo;
    }

    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    const listUnsubscribeHeader = buildListUnsubscribeHeader(options.listUnsubscribe);

    if (listUnsubscribeHeader) {
      headers['List-Unsubscribe'] = listUnsubscribeHeader;

      if (options.listUnsubscribe?.url) {
        headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
      }
    }

    if (Object.keys(headers).length > 0) {
      payload.headers = headers;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('[email] Failed to send email', response.status, errorBody);
        return { ok: false, status: response.status, error: errorBody };
      }

      return { ok: true };
    } catch (error) {
      console.error('[email] Unexpected error while sending email', error);
      return { ok: false, error };
    }
  };
};
