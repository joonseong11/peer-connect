import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendEmail } = vi.hoisted(() => ({
  sendEmail: vi.fn()
}));

vi.mock('$env/static/public', () => ({
  PUBLIC_APP_URL: 'https://peer-connect.test/'
}));

vi.mock('./email', () => ({
  sendEmail
}));

describe('notifications', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    sendEmail.mockResolvedValue({ ok: true });
  });

  it('skips gathering digest emails when recipients or posts are empty', async () => {
    const { notifyGatheringDigest } = await import('./notifications');

    await expect(
      notifyGatheringDigest({
        recipients: [],
        posts: [
          {
            id: 'post-1',
            title: '테스트 모임',
            authorName: '김개발',
            content: 'hello',
            created_at: '2026-03-15T10:00:00.000Z'
          }
        ]
      })
    ).resolves.toEqual({ ok: true, skipped: true });

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends digest emails with normalized app urls and unsubscribe links', async () => {
    const { notifyGatheringDigest } = await import('./notifications');

    await notifyGatheringDigest({
      recipients: [{ email: 'member@example.com', name: '멤버' }],
      posts: [
        {
          id: 'post-1',
          title: '새 모임',
          authorName: '김개발',
          content: '첫 번째 모임 본문입니다. '.repeat(20),
          created_at: '2026-03-15T10:00:00.000Z'
        },
        {
          id: 'post-2',
          title: '둘째 모임',
          authorName: '박개발',
          content: '둘째 모임 본문입니다.',
          created_at: '2026-03-15T11:00:00.000Z'
        }
      ]
    });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'PEER CONNECT에서 2개의 새로운 모임이 공유되었습니다.',
        listUnsubscribe: {
          url: 'https://peer-connect.test/mypage?utm_source=email&utm_medium=notification&utm_campaign=gathering-digest#notifications'
        }
      })
    );

    const payload = sendEmail.mock.calls[0][0];
    expect(payload.html).toContain('https://peer-connect.test/gatherings/post-1');
    expect(payload.text).toContain('https://peer-connect.test/gatherings/post-2');
  });

  it('renders endorsement content with preserved line breaks', async () => {
    const { notifyEndorsementReceived } = await import('./notifications');

    await notifyEndorsementReceived({
      target: {
        email: 'target@example.com',
        name: '대상자',
        userId: 'user-1'
      },
      authorName: '추천인',
      content: '첫 줄\n둘째 줄'
    });

    const payload = sendEmail.mock.calls[0][0];
    expect(payload.subject).toContain('추천인');
    expect(payload.html).toContain('첫 줄<br />둘째 줄');
    expect(payload.text).toContain('https://peer-connect.test/members/user-1');
  });
});
