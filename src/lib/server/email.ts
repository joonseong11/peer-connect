import { RESEND_API_KEY, RESEND_FROM_EMAIL } from '$env/static/private';

type EmailRecipient = string | { name?: string | null; email: string };

export type SendEmailOptions = {
	to: EmailRecipient | EmailRecipient[];
	subject: string;
	html: string;
	text?: string;
	replyTo?: string | string[];
};

const formatRecipient = (recipient: EmailRecipient) => {
	if (typeof recipient === 'string') {
		return recipient;
	}

	return recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email;
};

export const sendEmail = async (options: SendEmailOptions) => {
	if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
		console.warn('[email] RESEND_API_KEY or RESEND_FROM_EMAIL is not configured; skipping email send.');
		return { ok: false, skipped: true };
	}

	const to = Array.isArray(options.to) ? options.to : [options.to];

	try {
		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${RESEND_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: RESEND_FROM_EMAIL,
				to: to.map(formatRecipient),
				subject: options.subject,
				html: options.html,
				text: options.text,
				reply_to: options.replyTo
			})
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
