#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const REQUIRED_ENV_VARS = ['PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const PAGE_SIZE = 1000;
const UPSERT_CHUNK_SIZE = 200;
const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run');

for (const envKey of REQUIRED_ENV_VARS) {
  if (!process.env[envKey]) {
    console.error(`Missing required environment variable: ${envKey}`);
    process.exit(1);
  }
}

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false
  }
});

const normalizeEmail = (email) => {
  if (typeof email !== 'string') {
    return null;
  }

  const trimmed = email.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.toLowerCase();
};

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const chunkArray = (items, size) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const fetchAllProfiles = async () => {
  const profiles = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, email, contact_email', { count: 'exact' })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    profiles.push(...(data ?? []));

    if (!data || data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return profiles;
};

const fetchAllAuthUsers = async () => {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE
    });

    if (error) {
      throw error;
    }

    users.push(...(data?.users ?? []));

    if (!data || data.users.length < PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return users;
};

const buildUpdates = (profiles, authUsers) => {
  const authMap = new Map(authUsers.map((user) => [user.id, user]));
  const updates = [];
  let contactEmailBackfills = 0;

  for (const profile of profiles) {
    const authUser = authMap.get(profile.user_id);

    if (!authUser) {
      continue;
    }

    const oauthEmail = normalizeEmail(authUser.email);
    if (!oauthEmail) {
      continue;
    }

    const storedEmail = normalizeEmail(profile.email);
    if (storedEmail === oauthEmail) {
      continue;
    }

    const payload = {
      user_id: profile.user_id,
      email: oauthEmail,
      updated_at: new Date().toISOString()
    };

    const existingContactEmail = isNonEmptyString(profile.contact_email)
      ? profile.contact_email.trim()
      : null;
    const previousEmailRaw = isNonEmptyString(profile.email) ? profile.email.trim() : null;

    if (
      previousEmailRaw &&
      previousEmailRaw.toLowerCase() !== oauthEmail &&
      !existingContactEmail
    ) {
      payload.contact_email = previousEmailRaw;
      contactEmailBackfills += 1;
    }

    updates.push(payload);
  }

  return { updates, contactEmailBackfills };
};

const applyUpdates = async (updates) => {
  const chunks = chunkArray(updates, UPSERT_CHUNK_SIZE);
  let applied = 0;

  for (const chunk of chunks) {
    if (isDryRun) {
      continue;
    }

    const { error } = await supabase.from('profiles').upsert(chunk, {
      onConflict: 'user_id'
    });

    if (error) {
      throw error;
    }

    applied += chunk.length;
  }

  return isDryRun ? 0 : applied;
};

const main = async () => {
  console.log('Starting profile email backfill', isDryRun ? '(dry run mode)' : '');

  try {
    const [profiles, authUsers] = await Promise.all([fetchAllProfiles(), fetchAllAuthUsers()]);

    console.log(`Loaded ${profiles.length} profiles and ${authUsers.length} auth users.`);

    const { updates, contactEmailBackfills } = buildUpdates(profiles, authUsers);

    if (updates.length === 0) {
      console.log('No profiles require email synchronization. Done.');
      return;
    }

    console.log(
      `Found ${updates.length} profiles with missing or mismatched email addresses.` +
        (contactEmailBackfills > 0
          ? ` ${contactEmailBackfills} contact_email fields will be populated.`
          : '')
    );

    if (isDryRun) {
      console.log(
        'Dry run complete. Re-run without --dry-run to apply these updates to the database.'
      );
      return;
    }

    const appliedCount = await applyUpdates(updates);
    console.log(`Successfully synchronized ${appliedCount} profile records.`);
  } catch (error) {
    console.error('Failed to backfill profile emails:', error);
    process.exit(1);
  }
};

main();
