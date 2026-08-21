import mongoose from 'mongoose';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { AiPromptModel } from '@modules/ai/prompt/prompt.model';
import { resolvePrompt } from '@modules/ai/prompt/prompt.service';
import { CODE_PROMPT_BY_KEY } from '@modules/ai/prompt/catalog';
import { openaiChat, type OpenAiChatResult } from '@services/openai/openai.client';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { uploadSettingService } from '@modules/platform/uploadSetting/uploadSetting.service';
import { normalizeSurface } from '@modules/platform/uploadSetting/uploadSetting.model';
import {
  AiMonitoringSettingModel,
  MediaScanLogModel,
  type IAiMonitoringSetting,
  type IMediaScanLog,
  type MonitoringAction,
  type MonitoringResult,
} from './aiMonitoring.model';

/**
 * The prompt the image check runs on. It is a system prompt in the AI Prompt
 * Library, NOT a second copy on the settings document: two stores for one
 * prompt is how "I changed it and nothing happened" happens. AI Portal >
 * AI Monitoring > Settings edits this key, the Prompt Library edits this key,
 * and `reviewImageWithAi` reads this key.
 */
export const IMAGE_SCAN_PROMPT_KEY = 'upload.image_scan';
/** The turn that names the folder, so the same picture is judged in context. */
export const IMAGE_SCAN_USER_PROMPT_KEY = 'upload.image_scan.user';

/** The model the image check runs on — cheap, fast and vision-capable. */
const SCAN_MODEL = 'gpt-4o-mini';

/**
 * Verdict to what the platform did about it. A single derivation, so the
 * Action Taken column can never disagree with the AI Result beside it.
 */
export function actionForResult(risk: MonitoringResult): MonitoringAction {
  if (risk === 'LOW') return 'ALLOWED';
  if (risk === 'MEDIUM' || risk === 'HIGH') return 'FLAGGED';
  return 'NONE';
}

export const aiMonitoringSettingService = {
  /** The singleton, created on first read. */
  async get(): Promise<IAiMonitoringSetting> {
    const existing = await AiMonitoringSettingModel.findOne({ key: 'default' });
    if (existing) return existing;
    return AiMonitoringSettingModel.findOneAndUpdate(
      { key: 'default' },
      { $setOnInsert: { key: 'default' } },
      { new: true, upsert: true },
    ) as Promise<IAiMonitoringSetting>;
  },

  /**
   * What an upload surface reads. A blank field comes back as null on purpose:
   * the client then renders its own localized fallback, so an untouched setting
   * follows the reader's language instead of pinning everyone to English.
   */
  async publicConfig() {
    const doc = await this.get();
    const text = (value: string) => (value.trim() ? value.trim() : null);
    return {
      chip_enabled: doc.chip_enabled,
      chip_label: text(doc.chip_label),
      dialog_title: text(doc.dialog_title),
      dialog_intro: text(doc.dialog_intro),
      dialog_points: doc.dialog_points.map((p) => p.trim()).filter(Boolean),
      dialog_footnote: text(doc.dialog_footnote),
      dismiss_label: text(doc.dismiss_label),
    };
  },

  /**
   * The AI portal's Settings page: the copy plus the live image prompt.
   *
   * The catalogue default stands in when the library row has not been seeded
   * yet — the same body `resolvePrompt` would use for the next scan. Handing
   * back an empty box would show an operator a blank prompt for a check that is
   * running, and make them retype it to save anything else on the page.
   *
   * The model is read the same way: the scan sends whatever the library row
   * names, so a page reporting the constant would report the wrong thing the
   * moment somebody changed the model in the Prompt Library.
   */
  async adminSettings() {
    const [config, prompt] = await Promise.all([
      this.publicConfig(),
      AiPromptModel.findOne({ key: IMAGE_SCAN_PROMPT_KEY }).lean(),
    ]);
    const catalogDefault = CODE_PROMPT_BY_KEY.get(IMAGE_SCAN_PROMPT_KEY)?.content ?? '';
    return {
      ...config,
      image_prompt: (prompt?.content ?? '').trim() || catalogDefault,
      image_prompt_id: prompt ? String(prompt._id) : null,
      image_prompt_key: IMAGE_SCAN_PROMPT_KEY,
      image_scan_model: (prompt?.target_model ?? '').trim() || SCAN_MODEL,
    };
  },

  /**
   * Save the copy and, when supplied, the image prompt. The prompt is written
   * straight to its Prompt Library row so the next scan picks it up — there is
   * no second copy to keep in step.
   */
  async update(input: {
    chip_enabled?: boolean | null;
    chip_label?: string | null;
    dialog_title?: string | null;
    dialog_intro?: string | null;
    dialog_points?: string[] | null;
    dialog_footnote?: string | null;
    dismiss_label?: string | null;
    image_prompt?: string | null;
  }) {
    const doc = await this.get();
    if (input.chip_enabled != null) doc.chip_enabled = input.chip_enabled;
    if (input.chip_label != null) doc.chip_label = input.chip_label.slice(0, 80);
    if (input.dialog_title != null) doc.dialog_title = input.dialog_title.slice(0, 160);
    if (input.dialog_intro != null) doc.dialog_intro = input.dialog_intro.slice(0, 1000);
    if (input.dialog_points != null) {
      doc.dialog_points = input.dialog_points
        .map((p) => String(p).trim().slice(0, 300))
        .filter(Boolean)
        .slice(0, 12);
    }
    if (input.dialog_footnote != null) doc.dialog_footnote = input.dialog_footnote.slice(0, 500);
    if (input.dismiss_label != null) doc.dismiss_label = input.dismiss_label.slice(0, 60);
    await doc.save();

    if (input.image_prompt?.trim()) {
      await AiPromptModel.updateOne(
        { key: IMAGE_SCAN_PROMPT_KEY },
        { $set: { content: input.image_prompt.trim() } },
      );
    }
    return this.adminSettings();
  },
};

/** Parse the strict-JSON AI verdict; null on any shape mismatch. */
export function parseScanVerdict(
  content: string,
): { risk: 'LOW' | 'MEDIUM' | 'HIGH'; summary: string } | null {
  try {
    const parsed = JSON.parse(content) as { risk?: unknown; summary?: unknown };
    const risk = (typeof parsed.risk === 'string' ? parsed.risk : '').toUpperCase();
    if (risk !== 'LOW' && risk !== 'MEDIUM' && risk !== 'HIGH') return null;
    return {
      risk,
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 1000) : '',
    };
  } catch {
    return null;
  }
}

/** The outcome fields a finished check writes back onto its row. */
interface ScanOutcome {
  risk: MonitoringResult;
  status: IMediaScanLog['status'];
  summary: string;
  error: string;
}

/**
 * Turn one OpenAI answer into the row's verdict fields.
 *
 * A missing key is SKIPPED, not FAILED: nothing broke, the platform simply
 * declined to call out. Colouring the two the same sends an operator hunting
 * for a fault that is a setting.
 */
function outcomeFromResponse(res: OpenAiChatResult): ScanOutcome {
  if (!res.ok) {
    return {
      risk: 'PENDING',
      status: res.code === 'NOT_CONFIGURED' ? 'SKIPPED' : 'FAILED',
      summary:
        res.code === 'NOT_CONFIGURED'
          ? 'AI review did not run — OpenAI is not configured.'
          : 'AI review did not run — OpenAI was unavailable.',
      error: res.message,
    };
  }
  const verdict = parseScanVerdict(res.content);
  if (!verdict) {
    return {
      risk: 'PENDING',
      status: 'FAILED',
      summary: 'AI returned an answer this check could not read.',
      error: res.content.slice(0, 500),
    };
  }
  return {
    risk: verdict.risk,
    status: 'COMPLETED',
    summary: verdict.summary || 'No comment returned.',
    error: '',
  };
}

/**
 * Best-effort AI vision review of a stored monitoring row. Every ending is
 * recorded — a verdict, an unreadable answer, an outage — because "the AI never
 * looked at it" and "the AI looked and it was fine" must not be the same row.
 * Nothing here throws: an upload is never held up by monitoring.
 */
export async function reviewImageWithAi(log: IMediaScanLog): Promise<void> {
  const startedAt = Date.now();
  // The row must report the model that actually ran, which the library owns.
  let scanModel = SCAN_MODEL;
  let outcome: ScanOutcome = {
    risk: 'PENDING',
    status: 'FAILED',
    summary: 'AI review failed before a verdict was reached.',
    error: '',
  };
  try {
    // Both turns and the model come from the library, so an operator can retune
    // the whole scan from the AI portal — including the folder line, which is the
    // only context the model gets for judging the same picture differently in
    // /pods/covers than in /verification.
    const [system, user] = await Promise.all([
      resolvePrompt(IMAGE_SCAN_PROMPT_KEY),
      resolvePrompt(IMAGE_SCAN_USER_PROMPT_KEY, { folder: log.folder || '/' }),
    ]);
    scanModel = system.model || SCAN_MODEL;
    const res = await openaiChat({
      task: 'moderation.image_scan',
      detail: log.file_name || log.folder || '',
      model: scanModel,
      temperature: 0,
      max_tokens: 200,
      json: true,
      messages: [
        { role: 'system', content: system.content },
        {
          role: 'user',
          content: [
            { type: 'text', text: user.content },
            { type: 'image_url', image_url: { url: log.url } },
          ],
        },
      ],
    });
    outcome = outcomeFromResponse(res);
  } catch (err) {
    outcome.error = err instanceof Error ? err.message : String(err);
  }
  try {
    log.risk = outcome.risk;
    log.status = outcome.status;
    log.summary = outcome.summary;
    log.error = outcome.error;
    log.action = actionForResult(outcome.risk);
    log.ai_model = scanModel;
    log.duration_ms = Date.now() - startedAt;
    log.checked_at = new Date();
    await log.save();
  } catch (err) {
    logs.server.error('aiMonitoring', 'reviewImageWithAi', { error: err, msg: 'save failed' });
  }
}

/** Allowlists for the shared table engine (aiMonitoringLogsTable — DUNCIT TABLE CONTRACT v1). */
const MONITORING_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['file_name', 'folder', 'summary', 'url', 'error'],
  sortFields: {
    created_at: 'created_at',
    risk: 'risk',
    status: 'status',
    action: 'action',
    surface: 'surface',
    folder: 'folder',
  },
  filterFields: {
    risk: { type: 'enum' },
    status: { type: 'enum' },
    action: { type: 'enum' },
    surface: { type: 'enum' },
    folder: { type: 'string' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

/** Owner id to display name for the User/Entity column, in one round trip. */
async function resolveEntities(ids: string[]): Promise<Map<string, string>> {
  const valid = [...new Set(ids)].filter((id) => mongoose.isValidObjectId(id));
  if (!valid.length) return new Map();
  const users = await UserModel.find({ _id: { $in: valid } })
    .select('profile.first_name profile.last_name auth.email')
    .lean();
  return new Map(
    users.map((u: any) => {
      const name = [u.profile?.first_name, u.profile?.last_name].filter(Boolean).join(' ').trim();
      return [String(u._id), name || u.auth?.email || String(u._id)];
    }),
  );
}

const toPub = (d: IMediaScanLog, entities: Map<string, string>) => ({
  id: String(d._id),
  url: d.url,
  file_name: d.file_name,
  folder: d.folder,
  surface: d.surface,
  user_id: d.user_id ?? null,
  entity: (d.user_id ? entities.get(d.user_id) : null) ?? null,
  risk: d.risk,
  status: d.status,
  action: d.action,
  summary: d.summary,
  model: d.ai_model,
  duration_ms: d.duration_ms,
  error: d.error,
  checked_at: d.checked_at?.toISOString() ?? null,
  created_at: d.created_at?.toISOString?.() ?? '',
});

export const mediaScanService = {
  /**
   * Log the check and kick it off. Never throws — an upload must not fail
   * because monitoring hiccupped — and the row is written BEFORE the AI call,
   * so an image stays traceable even if the process dies mid-check.
   */
  async record(input: {
    url: string;
    fileName?: string;
    folder?: string;
    surface?: string;
    userId?: string | null;
  }): Promise<void> {
    if (mongoose.connection.readyState !== 1) return;
    try {
      const setting = await uploadSettingService.get(normalizeSurface(input.surface));
      if (!setting.ai_image_monitoring_enabled) return;
      const log = await MediaScanLogModel.create({
        url: input.url,
        file_name: input.fileName ?? '',
        folder: input.folder ?? '',
        surface: input.surface ?? '',
        user_id: input.userId ?? undefined,
        status: 'PENDING',
        action: 'NONE',
        summary: 'Queued for AI review.',
      });
      reviewImageWithAi(log).catch(() => undefined);
    } catch (err) {
      logs.server.error('aiMonitoring', 'record', { error: err, msg: 'record failed' });
    }
  },

  /** AI Portal > AI Monitoring > Logs — server-side page over the check history. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IMediaScanLog>(
      MediaScanLogModel,
      {},
      input,
      MONITORING_TABLE_CONFIG,
    );
    const entities = await resolveEntities(docs.map((d) => d.user_id ?? '').filter(Boolean));
    return { rows: docs.map((d) => toPub(d, entities)), total, page, page_size };
  },
};
