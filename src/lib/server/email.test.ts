import { beforeEach, describe, expect, it, vi } from 'vitest';

const envState = {
  apiKey: '',
  fromEmail: '',
  replyToEmail: ''
};

vi.mock('$env/static/private', () => ({
  get RESEND_API_KEY() {
    return envState.apiKey;
  },
  get RESEND_FROM_EMAIL() {
    return envState.fromEmail;
  },
  get RESEND_REPLY_TO_EMAIL() {
    return envState.replyToEmail;
  }
}));

describe('sendEmail', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    envState.apiKey = '';
    envState.fromEmail = '';
    envState.replyToEmail = '';
    vi.stubGlobal('fetch', vi.fn());
  });

  it('skips sending when RESEND_API_KEY is missing', async () => {
    const { sendEmail } = await import('./email');

    await expect(
      sendEmail({
        to: 'member@example.com',
        subject: 'Hello',
        html: '<p>Hello</p>'
      })
    ).resolves.toEqual({ ok: false, skipped: true });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends formatted payloads with reply-to and unsubscribe headers', async () => {
    envState.apiKey = 'resend-key';
    envState.fromEmail = 'Peer Connect <hello@peer.test>';
    envState.replyToEmail = 'reply@peer.test';
    (fetch as any).mockResolvedValue(new Response('', { status: 200 }));

    const { sendEmail } = await import('./email');

    await sendEmail({
      to: [{ name: '멤버', email: 'member@example.com' }],
      subject: 'Subject',
      html: '<p>Hello</p>',
      text: 'Hello',
      listUnsubscribe: {
        mailto: 'unsubscribe@peer.test',
        url: 'https://peer.test/unsubscribe'
      }
    });

    const [, request] = (fetch as any).mock.calls[0];
    const body = JSON.parse(request.body);

    expect(body).toMatchObject({
      from: 'Peer Connect <hello@peer.test>',
      to: ['멤버 <member@example.com>'],
      subject: 'Subject',
      text: 'Hello',
      reply_to: 'reply@peer.test'
    });
    expect(body.headers).toMatchObject({
      'List-Unsubscribe':
        '<mailto:unsubscribe@peer.test>, <https://peer.test/unsubscribe>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    });
  });

  it('returns failure details when Resend responds with an error', async () => {
    envState.apiKey = 'resend-key';
    (fetch as any).mockResolvedValue(
      new Response('bad request', {
        status: 400
      })
    );

    const { sendEmail } = await import('./email');

    await expect(
      sendEmail({
        to: 'member@example.com',
        subject: 'Subject',
        html: '<p>Hello</p>'
      })
    ).resolves.toEqual({
      ok: false,
      status: 400,
      error: 'bad request'
    });
  });
});
