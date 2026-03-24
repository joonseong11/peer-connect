import { RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_REPLY_TO_EMAIL } from '$env/static/private';
import { createEmailSender } from '@peer/shared/server';
export type { SendEmailOptions } from '@peer/shared/server';

export const sendEmail = createEmailSender({
  apiKey: RESEND_API_KEY,
  fromEmail: RESEND_FROM_EMAIL,
  replyToEmail: RESEND_REPLY_TO_EMAIL
});
