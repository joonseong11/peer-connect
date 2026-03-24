// Augment generated environment types with the variables required by the app.
declare module '$env/static/public' {
  export const PUBLIC_APP_URL: string;
}

declare module '$env/static/private' {
  export const RESEND_API_KEY: string | undefined;
  export const RESEND_FROM_EMAIL: string | undefined;
  export const RESEND_REPLY_TO_EMAIL: string | undefined;
  export const SUPABASE_SERVICE_ROLE_KEY: string | undefined;
}
