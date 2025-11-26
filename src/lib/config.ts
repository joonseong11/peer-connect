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

const unlimitedEnv =
  typeof process !== 'undefined' && process.env?.INVITE_UNLIMITED_USER_IDS
    ? process.env.INVITE_UNLIMITED_USER_IDS
    : undefined;

export const INVITE_UNLIMITED_USER_IDS = parseUnlimitedUserIds(unlimitedEnv);

const fallbackCodeEnv =
  typeof process !== 'undefined' && process.env?.INVITE_FALLBACK_CODE
    ? process.env.INVITE_FALLBACK_CODE
    : undefined;

export const INVITE_FALLBACK_CODE = fallbackCodeEnv ? fallbackCodeEnv.trim().toUpperCase() : null;
