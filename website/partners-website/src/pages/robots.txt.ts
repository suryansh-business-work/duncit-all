import type { APIRoute } from 'astro';
import { buildRobotsTxt, ROBOTS_HEADERS } from '@duncit/brand/seo';
import { urlConfigs } from '../config/url-configs';

export const GET: APIRoute = () => new Response(buildRobotsTxt(urlConfigs.siteUrl), { headers: ROBOTS_HEADERS });
