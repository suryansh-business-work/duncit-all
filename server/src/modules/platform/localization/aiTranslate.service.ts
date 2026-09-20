import { GraphQLError } from 'graphql';
import type { AuthUser } from '@context';
import { requestIdentity } from '@observability/requestIdentity';
import { BackgroundJobModel } from '@modules/platform/backgroundJob/backgroundJob.model';
import { scheduleJob } from '@modules/platform/backgroundJob/backgroundJob.runner';
import { actorOf, toJob } from '@modules/platform/backgroundJob/backgroundJob.service';
import { LocaleModel, TranslationModel, type ILocale } from './localization.model';
import { PROJECTABLE_LOCALE, localizationService } from './localization.service';
import {
  AI_TRANSLATE_SCOPES,
  outdatedFilter,
  pendingFilter,
  type AiTranslateScope,
  type TranslateNamespace,
} from './aiTranslate.scope';
import type { AiTranslateParams } from './aiTranslate.step';

/**
 * AI translation: fill languages in from the default one, through OpenAI.
 *
 * Each language is its own background job (backgroundJob.runner), so the work
 * is on the server and nothing on the page is holding it: a refresh, a page
 * change or closing the console leaves it running, the header's progress ring
 * reads the same row from any console, and a deploy mid-run resumes from the
 * last key instead of failing.
 *
 * The text lands on `values.<code>` — the field the admin's own editor writes —
 * so `publicTranslations` serves it to mWeb, native, every portal and the
 * websites with no further step.
 */

export interface AiTranslationInput extends TranslateNamespace {
  locales: string[];
  scope: AiTranslateScope;
}

const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });

/** How a locale is named to the model and in the header — its English name, else its own. */
const languageName = (doc: Pick<ILocale, 'english_label' | 'label' | 'code'>) =>
  (doc.english_label ?? '').trim() || doc.label.trim() || doc.code;

function scopeOf(value: string): AiTranslateScope {
  const scope = AI_TRANSLATE_SCOPES.find((known) => known === value);
  if (!scope) throw badInput('Choose what to translate');
  return scope;
}

async function requireSource(): Promise<string> {
  const source = await localizationService.defaultLocaleCode();
  if (!source) throw badInput('Set a default language first — it is what gets translated');
  return source;
}

/** The distinct target codes asked for, never the source. */
function targetCodes(locales: readonly string[], source: string): string[] {
  const codes = [...new Set(locales.map((code) => code.trim()).filter(Boolean))];
  if (codes.length === 0) throw badInput('Choose at least one language');
  if (codes.includes(source)) {
    throw badInput('The default language is the source everything is translated from');
  }
  if (!codes.every((code) => PROJECTABLE_LOCALE.test(code))) {
    throw badInput('One of the languages has a code that cannot be translated into');
  }
  return codes;
}

export const aiTranslateService = {
  /** How much of the catalogue each active locale carries, and how much of it is out of date. */
  async coverage() {
    const [locales, source, total] = await Promise.all([
      LocaleModel.find({ is_active: true }).sort({ sort_order: 1, code: 1 }).select('code').lean(),
      localizationService.defaultLocaleCode(),
      TranslationModel.countDocuments({}),
    ]);
    return Promise.all(
      locales.map(async ({ code }) => {
        const safe = PROJECTABLE_LOCALE.test(code);
        const [translated, outdated] = await Promise.all([
          safe ? TranslationModel.countDocuments({ [`values.${code}`]: { $nin: ['', null] } }) : 0,
          safe && source && source !== code ? TranslationModel.countDocuments(outdatedFilter(source, code)) : 0,
        ]);
        return { locale: code, total_keys: total, translated_keys: translated, outdated_keys: outdated };
      }),
    );
  },

  /** Keys a run would send right now, per language — what the start dialog quotes. */
  async pending(input: AiTranslationInput) {
    const source = await requireSource();
    const scope = scopeOf(input.scope);
    const codes = targetCodes(input.locales, source);
    return Promise.all(
      codes.map(async (locale) => ({
        locale,
        keys: await TranslationModel.countDocuments(pendingFilter(source, locale, scope, input)),
      })),
    );
  },

  /**
   * One background job per language that has anything to send. Every language
   * is checked before any job is created, so a refused request starts nothing.
   */
  async start(user: AuthUser, input: AiTranslationInput, url?: string | null) {
    const source = await requireSource();
    const scope = scopeOf(input.scope);
    const codes = targetCodes(input.locales, source);
    const [sourceDoc, targets, running] = await Promise.all([
      LocaleModel.findOne({ code: source }).lean(),
      LocaleModel.find({ code: { $in: codes } }).lean(),
      BackgroundJobModel.find({ kind: 'AI_TRANSLATE', status: 'RUNNING', 'params.locale': { $in: codes } })
        .select('params')
        .lean(),
    ]);
    if (!sourceDoc) throw badInput('The default language is missing');
    if (targets.length !== codes.length) throw badInput('One of the languages is not set up any more');
    const busy = running.map((job) => String((job.params as { locale?: unknown }).locale));
    if (busy.length > 0) {
      throw badInput(`A translation is already running for ${busy.join(', ')} — wait for it or stop it first`);
    }

    const planned = await Promise.all(
      targets.map(async (target) => ({
        target,
        total: await TranslationModel.countDocuments(pendingFilter(source, target.code, scope, input)),
      })),
    );
    const work = planned.filter((plan) => plan.total > 0);
    if (work.length === 0) throw badInput('Nothing to translate — these languages are already in sync');

    const actor = actorOf(user);
    const identity = requestIdentity.current() ?? { user: actor };
    const jobs = await Promise.all(
      work.map(({ target, total }) => {
        const params: AiTranslateParams = {
          locale: target.code,
          source_locale: source,
          language: languageName(target),
          source_language: languageName(sourceDoc),
          scope,
          surface: input.surface?.trim() ?? '',
          page: input.page?.trim() ?? '',
        };
        return BackgroundJobModel.create({
          kind: 'AI_TRANSLATE',
          label: `${params.language} (${target.code})`,
          url: (url ?? '').slice(0, 2000),
          params,
          total,
          actor,
          identity,
        });
      }),
    );
    for (const job of jobs) scheduleJob(String(job.id));
    return jobs.map((job) => toJob(job));
  },

  /**
   * Record, once, what every existing translation was written against.
   *
   * Text written before these records were kept has none, and without one it
   * could never be seen to fall out of date. The only honest starting point is
   * "in sync with the default text as it stands now" — so this runs on boot
   * BEFORE any shipped English is revised, and a reword that lands in the same
   * boot is then correctly seen as a change.
   */
  async baselineSync(): Promise<number> {
    const source = await localizationService.defaultLocaleCode();
    if (!source || !PROJECTABLE_LOCALE.test(source)) return 0;
    const locales = await LocaleModel.find({ code: { $ne: source } }).select('code').lean();
    let stamped = 0;
    for (const { code } of locales) {
      if (!PROJECTABLE_LOCALE.test(code)) continue;
      // The native driver, because this is an update PIPELINE: it copies one
      // field of the document into another, which a plain update cannot.
      const result = await TranslationModel.collection.updateMany(
        {
          [`values.${code}`]: { $nin: ['', null] },
          [`values.${source}`]: { $nin: ['', null] },
          [`synced_from.${code}`]: { $exists: false },
        },
        [
          {
            $set: {
              synced_from: {
                $setField: {
                  field: code,
                  input: { $ifNull: ['$synced_from', {}] },
                  value: { $getField: { field: source, input: '$values' } },
                },
              },
            },
          },
        ],
      );
      stamped += result.modifiedCount;
    }
    return stamped;
  },
};
