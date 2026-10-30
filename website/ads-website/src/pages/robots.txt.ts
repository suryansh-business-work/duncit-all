import type { APIRoute } from 'astro';
import { buildRobotsTxt, ROBOTS_HEADERS } from '@duncit/brand/seo';
import { siteUrls } from '../config/site-config';

export const GET: APIRoute = () => new Response(buildRobotsTxt(siteUrls.siteUrl), { headers: ROBOTS_HEADERS });
