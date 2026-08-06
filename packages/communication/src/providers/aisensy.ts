import { CommunicationConfigError, CommunicationProviderError } from '../errors';
import { HttpTransport, type RetryPolicy } from '../transport';
import type {
  CommunicationLogger,
  WhatsAppProvider,
  WhatsAppSendOptions,
  WhatsAppSendResult,
} from '../types';

/**
 * AiSensy — the first provider.
 *
 * Two things about their API decide the shape of this file:
 *  - the API key travels in the BODY, not a header, so it is redacted by the
 *    transport rather than by a header allow-list;
 *  - success is reported as `success: "true"` — the STRING — alongside HTTP
 *    200, so a `res.ok` check on its own reports failures as sends.
 */

const DEFAULT_BASE_URL = 'https://backend.aisensy.com';
const CAMPAIGN_PATH = '/campaign/t1/api/v2';

/**
 * A setting that may be a fixed string or read live. The getter form is what
 * lets a rotated key or a swapped host apply without restarting the process.
 */
export type ConfigValue =
  string | (() => string | null | undefined | Promise<string | null | undefined>);

export interface AiSensyConfig {
  /** The campaign API key. A function is allowed so a rotated key applies without a restart. */
  apiKey: ConfigValue;
  /** Defaults to AiSensy's own host. Point it elsewhere for a sandbox. */
  baseUrl?: ConfigValue;
  fetchImpl?: typeof fetch;
  retry?: Partial<RetryPolicy>;
  timeoutMs?: number;
  logger?: CommunicationLogger;
}

/** Accept a value or a getter for it, so config can be static or live. */
async function resolve(value: ConfigValue | undefined): Promise<string> {
  if (typeof value === 'function') return (await value()) ?? '';
  return value ?? '';
}

/** Trim trailing slashes without a regex — `/\/+$/` backtracks (Sonar S8786). */
function withoutTrailingSlash(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') end -= 1;
  return url.slice(0, end);
}

/** AiSensy's own words for a failure, whichever field it used this time. */
function reasonFrom(body: Record<string, unknown>, status: number): string {
  const message = body.message ?? body.errorMessage ?? body.error;
  return typeof message === 'string' && message ? message : `HTTP ${status}`;
}

export class AiSensyProvider implements WhatsAppProvider {
  readonly name = 'aisensy';

  private readonly config: AiSensyConfig;
  private readonly transport: HttpTransport;

  constructor(config: AiSensyConfig) {
    this.config = config;
    this.transport = new HttpTransport({
      provider: this.name,
      fetchImpl: config.fetchImpl,
      retry: config.retry,
      timeoutMs: config.timeoutMs,
      logger: config.logger,
    });
  }

  async isConfigured(): Promise<boolean> {
    return Boolean(await resolve(this.config.apiKey));
  }

  async send(options: WhatsAppSendOptions): Promise<WhatsAppSendResult> {
    const apiKey = await resolve(this.config.apiKey);
    if (!apiKey) {
      throw new CommunicationConfigError(
        'AiSensy has no API key configured. Set it before sending.',
        this.name,
      );
    }

    const baseUrl = withoutTrailingSlash((await resolve(this.config.baseUrl)) || DEFAULT_BASE_URL);

    const response = await this.transport.request<Record<string, unknown>>({
      url: `${baseUrl}${CAMPAIGN_PATH}`,
      method: 'POST',
      body: this.toPayload(options, apiKey),
    });

    // AiSensy answers 200 with `success: "true"` as a STRING. Trusting res.ok
    // alone reports every rejected template as a successful send.
    // `data` is always an object — the transport falls back to `{}` when the
    // body will not parse — so there is nothing to guard against here.
    const success = response.data.success;
    const succeeded = success === true || success === 'true';
    if (!response.ok || !succeeded) {
      const status = response.status;
      throw new CommunicationProviderError(
        `AiSensy rejected the message: ${reasonFrom(response.data, status)} (HTTP ${status})`,
        {
          provider: this.name,
          status,
          // A key or a template problem repeats identically; a 429 or a 5xx may not.
          retryable: status === 429 || status >= 500,
          cause: response.data,
        },
      );
    }

    const messageId = response.data.submitted_message_id;
    return {
      messageId: typeof messageId === 'string' && messageId ? messageId : null,
      provider: this.name,
      raw: response.data,
    };
  }

  /** The package's options in AiSensy's own field names. */
  private toPayload(options: WhatsAppSendOptions, apiKey: string): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      apiKey,
      campaignName: options.campaign,
      // The package's contract is E.164 (`+91…`); AiSensy wants the same number
      // without the plus. Mapping it here is what keeps the leading `+` from
      // leaking into every call site as a provider quirk.
      destination: options.to.replace(/^\+/, ''),
      // AiSensy records a name against every send and rejects an empty one.
      userName: options.name ?? options.to,
      // Templates are positional, and AiSensy takes them as strings.
      templateParams: (options.variables ?? []).map(String),
    };

    if (options.media?.url) {
      payload.media = options.media.filename
        ? { url: options.media.url, filename: options.media.filename }
        : { url: options.media.url };
    }
    if (options.source) payload.source = options.source;
    if (options.tags?.length) payload.tags = options.tags;
    if (options.attributes && Object.keys(options.attributes).length > 0) {
      payload.attributes = options.attributes;
    }
    // Carried so AiSensy's reporting can group by it; the template's own
    // approved category is still what Meta enforces.
    if (options.category) payload.templateCategory = options.category;

    return payload;
  }
}
