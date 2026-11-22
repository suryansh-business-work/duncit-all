/**
 * The pure rules around a turn: quotas, undo plans, the meta parameters the
 * server owns, the upload allowlist, the evaluator's JSON, tool arguments and
 * the suggestion bubbles for a page.
 */
import { rollbackPlanFor } from '../../actions/askDuncit.rollback';
import { ratio, sinceDays } from '../../analytics/askDuncit.analytics';
import { parseEvaluation } from '../../evaluation/askDuncit.evaluation';
import { isTrustedUploadUrl, kindOf } from '../../files/askDuncit.files';
import { suggestionsFor } from '../../graphql/askDuncit.bootstrap';
import { keywordsOf } from '../../knowledge/askDuncit.knowledge';
import { chatProviderOf, supportsAttachments } from '../../llm/askDuncit.providers';
import { reasonFor, stripMetaParams } from '../../mcp/askDuncit.run';
import { quotaRefusalFor } from '../../quota/askDuncit.quota';
import { parseArguments } from '../../turn/askDuncit.tools';

describe('quotaRefusalFor', () => {
  const policy = { messages_per_minute: 5, messages_per_day: 100, tokens_per_day: 10_000 };

  it('admits a message under every limit', () => {
    expect(quotaRefusalFor({ lastMinute: 4, messagesToday: 100, tokensToday: 9999 }, policy)).toBeNull();
  });

  it('refuses the burst before the daily limits', () => {
    expect(quotaRefusalFor({ lastMinute: 5, messagesToday: 500, tokensToday: 0 }, policy)).toBe('RATE_LIMIT');
  });

  it('refuses the message that goes past the day’s count (already incremented)', () => {
    expect(quotaRefusalFor({ lastMinute: 0, messagesToday: 101, tokensToday: 0 }, policy)).toBe('DAILY_MESSAGES');
  });

  it('refuses once the day’s tokens are spent', () => {
    expect(quotaRefusalFor({ lastMinute: 0, messagesToday: 1, tokensToday: 10_000 }, policy)).toBe('DAILY_TOKENS');
  });
});

describe('rollbackPlanFor', () => {
  it('undoes a follow with the matching unfollow, on the same id only', () => {
    expect(rollbackPlanFor('followPod', { pod_id: 'p1', extra: 'x' })).toEqual({ field: 'unfollowPod', args: { pod_id: 'p1' } });
    expect(rollbackPlanFor('blockUser', { user_id: 'u9' })).toEqual({ field: 'unblockUser', args: { user_id: 'u9' } });
  });

  it('offers nothing for an edit with no exact inverse, or a call missing its id', () => {
    expect(rollbackPlanFor('updateMyProfile', { input: {} })).toBeNull();
    expect(rollbackPlanFor('followClub', {})).toBeNull();
  });
});

describe('server-owned meta parameters', () => {
  it('drops every mcp_* key the model sent, so it cannot confirm on its own', () => {
    expect(stripMetaParams({ pod_id: 'p1', mcp_confirm: true, mcp_reason: 'x', mcp_guard: 'warn' })).toEqual({ pod_id: 'p1' });
  });

  it('treats non-objects as no arguments', () => {
    expect(stripMetaParams(null)).toEqual({});
    expect(stripMetaParams(['a'])).toEqual({});
  });

  it('prefixes the reason and falls back when it is too short', () => {
    expect(reasonFor('join the yoga pod')).toBe('Ask Duncit: join the yoga pod');
    expect(reasonFor('')).toBe('Requested by the person in Ask Duncit');
    expect(reasonFor('x'.repeat(900))).toHaveLength(500);
  });
});

describe('isTrustedUploadUrl', () => {
  const endpoint = 'https://ik.imagekit.io/duncit';

  it('accepts a file under the configured endpoint', () => {
    expect(isTrustedUploadUrl('https://ik.imagekit.io/duncit/ask/a.pdf', endpoint)).toBe(true);
  });

  it('refuses other hosts, other accounts on the same host, plain http and no endpoint', () => {
    expect(isTrustedUploadUrl('https://evil.test/duncit/a.pdf', endpoint)).toBe(false);
    expect(isTrustedUploadUrl('https://ik.imagekit.io/duncitx/a.pdf', endpoint)).toBe(false);
    expect(isTrustedUploadUrl('http://ik.imagekit.io/duncit/a.pdf', endpoint)).toBe(false);
    expect(isTrustedUploadUrl('https://ik.imagekit.io/duncit/a.pdf', '')).toBe(false);
    expect(isTrustedUploadUrl('not a url', endpoint)).toBe(false);
  });

  it('derives the attachment kind from the mime type', () => {
    expect(kindOf({ url: '', mime: 'image/png' })).toBe('IMAGE');
    expect(kindOf({ url: '', mime: 'application/pdf' })).toBe('PDF');
    expect(kindOf({ url: '', mime: 'text/csv' })).toBe('FILE');
  });
});

describe('parseEvaluation', () => {
  it('clamps confidence into 0–1 and reads the flags', () => {
    expect(parseEvaluation('{"confidence":1.7,"out_of_context":true,"resolved":false,"reason":"r"}')).toEqual({
      confidence: 1,
      out_of_context: true,
      resolved: false,
      reason: 'r',
    });
  });

  it('rejects JSON without a numeric confidence, and non-JSON', () => {
    expect(parseEvaluation('{"confidence":"high"}')).toBeNull();
    expect(parseEvaluation('not json')).toBeNull();
  });
});

describe('parseArguments', () => {
  it('reads a JSON object and refuses anything else', () => {
    expect(parseArguments('{"query":"pods"}')).toEqual({ query: 'pods' });
    expect(parseArguments('')).toEqual({});
    expect(parseArguments('[1,2]')).toBeNull();
    expect(parseArguments('{oops')).toBeNull();
  });
});

describe('suggestionsFor', () => {
  const all = [
    { id: 'a', label_key: 'k.a', label: null, context: null },
    { id: 'pod', label_key: 'k.pod', label: null, context: 'POD' },
    { id: 'club', label_key: 'k.club', label: null, context: 'CLUB' },
  ];

  it('puts the page’s own bubbles first and hides other pages’', () => {
    expect(suggestionsFor(all, 'POD').map((s) => s.id)).toEqual(['pod', 'a']);
    expect(suggestionsFor(all, '').map((s) => s.id)).toEqual(['a']);
  });
});

describe('providers', () => {
  it('routes OpenAI and Gemini chat models and refuses others', () => {
    expect(chatProviderOf('gpt-4o')).toBe('OPENAI');
    expect(chatProviderOf('o4-mini')).toBe('OPENAI');
    expect(chatProviderOf('gemini-2.5-flash')).toBe('GEMINI');
    expect(chatProviderOf('claude-opus-5-5')).toBeNull();
  });

  it('knows which models read attachments', () => {
    expect(supportsAttachments('gpt-4o')).toBe(true);
    expect(supportsAttachments('gpt-3.5-turbo')).toBe(false);
  });
});

describe('analytics helpers and knowledge keywords', () => {
  it('computes a safe ratio', () => {
    expect(ratio(1, 4)).toBe(0.25);
    expect(ratio(3, 0)).toBe(0);
  });

  it('clamps the window to 1–365 days', () => {
    const now = Date.UTC(2026, 10, 22);
    expect(sinceDays(0, now).getTime()).toBe(now - 86_400_000);
    expect(sinceDays(9999, now).getTime()).toBe(now - 365 * 86_400_000);
  });

  it('picks the longest distinct words of a question, earlier words first on a tie', () => {
    expect(keywordsOf('How do refunds work for cancelled pods?')).toEqual(['cancelled', 'refunds', 'work']);
  });

  it('ignores short words and repeats', () => {
    expect(keywordsOf('pod pod pod is it')).toEqual([]);
    expect(keywordsOf('Refund refund REFUND')).toEqual(['refund']);
  });
});
