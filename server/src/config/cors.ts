import type { CorsOptions } from 'cors';

// Browser-facing origins we trust. Reflects only matching origins back so
// `credentials: true` works (browsers reject `*` with credentials).
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  /^https?:\/\/([a-z0-9-]+\.)?duncit\.com$/,
];

export const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true; // server-to-server, curl, mobile webviews, etc.
  return ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin));
};

export const corsOptions: CorsOptions = {
  origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: [
    'Authorization',
    'Content-Type',
    'X-Requested-With',
    'Apollo-Require-Preflight',
    'X-Apollo-Operation-Name',
    'X-DUID',
  ],
  maxAge: 600,
  optionsSuccessStatus: 204,
};
