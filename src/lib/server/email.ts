import { RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_REPLY_TO_EMAIL } from '$env/static/private';

const DEFAULT_FROM_EMAIL = 'thenetwork@peer-connect.co.kr';
const FROM_EMAIL = RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL;

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

export const sendEmail = async (options: SendEmailOptions) => {
        if (!RESEND_API_KEY) {
                console.warn('[email] RESEND_API_KEY is not configured; skipping email send.');
                return { ok: false, skipped: true };
        }

        const to = Array.isArray(options.to) ? options.to : [options.to];

        const fallbackReplyTo = RESEND_REPLY_TO_EMAIL?.trim();
        const replyTo = options.replyTo ?? (fallbackReplyTo ? fallbackReplyTo : undefined);

        const payload: Record<string, unknown> = {
                from: FROM_EMAIL,
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
                                Authorization: `Bearer ${RESEND_API_KEY}`,
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
