import type { APIRoute } from 'astro';
import { buildRobotsTxt, ROBOTS_HEADERS } from '@duncit/brand/seo';
import { urlConfigs } from '../config/url-configs';
import { POLICY_READER_PATH } from '../lib/policy-page';

/** Open to crawlers, minus the policy reader shell, which only exists to be rewritten into. */
export const GET: APIRoute = () =>
  new Response(buildRobotsTxt(urlConfigs.siteUrl, [POLICY_READER_PATH]), { headers: ROBOTS_HEADERS });
