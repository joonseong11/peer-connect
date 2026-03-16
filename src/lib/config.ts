import { env } from '$env/dynamic/private';

export const INVITES_ENABLED = true;

export const INVITE_CARD_SLOT_COUNT = 2;

export const INVITE_UNLIMITED_SLOT_INDEX = 2;

const parseUnlimitedUserIds = (value: string | undefined) =>
  value
    ? value
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    : [];

export const INVITE_UNLIMITED_USER_IDS = parseUnlimitedUserIds(env.INVITE_UNLIMITED_USER_IDS);

export const INVITE_FALLBACK_CODE = env.INVITE_FALLBACK_CODE
  ? env.INVITE_FALLBACK_CODE.trim().toUpperCase()
  : null;
