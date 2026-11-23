import { fenceUntrusted, inspectUntrusted } from '@modules/ai/askDuncit/guard/askDuncit.guard';
import { INTEL_SOURCES, type IntelSource } from '../../intel.constants';
import { hybridSearch } from '../../index/intel.search';
import type { MessageCitation } from '../intelChat.models';
import { failed, str, type IntelTool } from './intel.tool.types';

/**
 * search_knowledge — hybrid retrieval over everything indexed that this turn
 * may read. Results are numbered [S1]… and returned fenced as untrusted data;
 * the citations the answer may use are exactly these, nothing else.
 */

const INDEXED: readonly IntelSource[] = ['MEDIA', 'GITHUB', 'SLACK', 'GMAIL', 'MONGODB'];

export const searchTool: IntelTool = {
  def: {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description: 'Search indexed company knowledge: uploaded files (PDF/images/text), GitHub code, docs, issues, PRs and commits, Slack threads, Gmail threads and MongoDB collection schemas. Returns numbered passages [S1], [S2]… to cite.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What to look for. Include exact identifiers, error codes or names when known.' },
          sources: { type: 'array', items: { type: 'string', enum: [...INDEXED] }, description: 'Optional: limit to these sources.' },
          top_k: { type: 'integer', minimum: 1, maximum: 12 },
        },
        required: ['query'],
      },
    },
  },
  available: (ctx) => ctx.sources.some((s) => INDEXED.includes(s)),
  async run(ctx, args) {
    const query = str(args.query, 2000);
    if (!query) return failed('search_knowledge', 'Search', 'query is required');
    const asked = Array.isArray(args.sources) ? (args.sources as string[]).filter((s): s is IntelSource => (INTEL_SOURCES as readonly string[]).includes(s)) : [];
    const sources = (asked.length ? asked : ctx.sources).filter((s) => ctx.sources.includes(s) && INDEXED.includes(s));
    const res = await hybridSearch({
      query,
      scopes: ctx.scopes,
      sources,
      userId: ctx.actor.user.id,
      level: ctx.actor.level,
      topK: Number(args.top_k) || ctx.settings.embeddings.top_k,
      settings: ctx.settings,
    });
    if (!res.ok) return failed('search_knowledge', `Search: ${query.slice(0, 60)}`, res.message);
    if (res.hits.length === 0) {
      return { content: JSON.stringify({ result: 'NO_RESULTS', note: 'Nothing indexed matches. Say so; do not answer from memory as if sourced.' }), call: { name: 'search_knowledge', title: `Search: ${query.slice(0, 60)}`, status: 'OK', summary: 'No results' } };
    }
    // Numbered after any passages earlier searches in this turn returned, so every [S#] is unique.
    const hits = res.hits.map((h, i) => ({ ...h, ref: `S${ctx.citationBase + i + 1}` }));
    ctx.citationBase += hits.length;
    const citations: MessageCitation[] = hits.map((h) => ({ ref: h.ref, title: h.title, url: h.url, source: h.source, environment: h.environment, snippet: h.text.slice(0, 300), page: h.page, line_start: h.line_start, line_end: h.line_end }));
    const body = hits
      .map((h) => {
        const parts = [h.source.toLowerCase(), h.environment.toLowerCase()];
        if (h.page) parts.push('page ' + h.page);
        if (h.line_start) parts.push('lines ' + h.line_start + '-' + (h.line_end ?? h.line_start));
        return `[${h.ref}] ${h.title} (${parts.join(', ')})\n${h.text}`;
      })
      .join('\n\n');
    return {
      content: fenceUntrusted('search_knowledge', body, inspectUntrusted(body).length > 0),
      citations,
      call: { name: 'search_knowledge', title: `Search: ${query.slice(0, 60)}`, status: 'OK', summary: `${res.hits.length} passage(s)` },
    };
  },
};
