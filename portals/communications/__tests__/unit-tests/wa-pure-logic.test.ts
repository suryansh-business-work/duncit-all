import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  boardIsHealthy,
  defaultUrlFor,
  effectiveMediaUrl,
  mediaStateFor,
  needsDefaultMedia,
  scenarioSearchText,
  statusKey,
  type WaDefaultUrls,
} from '../../src/pages/whatsapp-page/wa-automation/helpers';
import type { WaScenario } from '../../src/pages/whatsapp-page/wa-automation/queries';
import { buildScenarioLabels } from '../../src/pages/whatsapp-page/wa-automation/scenarioColumns/labels';
import {
  dynamicButtons,
  emptyTemplateFields,
  isDocumentHeader,
  refineTemplateFields,
  templateFieldsShape,
  toButtonInputs,
  toMediaInput,
  type TemplateFieldValues,
} from '../../src/pages/whatsapp-page/wa-campaign-form/template-fields';
import type { AisensyTemplate } from '../../src/pages/whatsapp-page/queries';
import { channelLabels, channelSummary } from '../../src/pages/msg91-otp/channels';
import { labelFor } from '../../src/pages/whatsapp-page/helpers';

const defaults: WaDefaultUrls = { image: 'https://cdn.example.test/i.png', document: '' };

const scenario = (over: Partial<WaScenario> = {}): WaScenario =>
  ({
    event_key: 'order_placed',
    campaign: 'order-camp',
    template_name: 'order_tpl',
    audience: 'USER',
    category: 'UTILITY',
    blocker: '',
    needs_media: true,
    template_header_format: 'IMAGE',
    media_url: '',
    override_media_url: '',
    ...over,
  }) as WaScenario;

describe('WhatsApp automation media rules', () => {
  it('picks the platform default by header kind, treating FILE as DOCUMENT', () => {
    const both = { image: 'img', document: 'doc' };
    expect(defaultUrlFor('image', both)).toBe('img');
    expect(defaultUrlFor(' FILE ', both)).toBe('doc');
    expect(defaultUrlFor('DOCUMENT', both)).toBe('doc');
    expect(defaultUrlFor('VIDEO', both)).toBe('');
  });

  it('resolves the media state in send-path order', () => {
    expect(mediaStateFor(scenario({ override_media_url: 'o', media_url: 'c' }), defaults)).toBe(
      'CUSTOM'
    );
    expect(mediaStateFor(scenario({ media_url: 'c' }), defaults)).toBe('CAMPAIGN');
    expect(mediaStateFor(scenario({ needs_media: false }), defaults)).toBe('NOT_NEEDED');
    expect(mediaStateFor(scenario(), defaults)).toBe('DEFAULT');
    expect(mediaStateFor(scenario({ template_header_format: 'VIDEO' }), defaults)).toBe('MISSING');
    expect(mediaStateFor(scenario({ template_header_format: 'FILE' }), defaults)).toBe('MISSING');
  });

  it('reports the URL a send would carry: override, campaign, then default', () => {
    expect(effectiveMediaUrl(scenario({ override_media_url: 'o', media_url: 'c' }), defaults)).toBe(
      'o'
    );
    expect(effectiveMediaUrl(scenario({ media_url: 'c' }), defaults)).toBe('c');
    expect(effectiveMediaUrl(scenario(), defaults)).toBe(defaults.image);
    expect(effectiveMediaUrl(scenario({ template_header_format: 'VIDEO' }), defaults)).toBe('');
  });

  it('flags the board only when a media row would fall through to nothing', () => {
    expect(needsDefaultMedia([scenario()], defaults)).toBe(false);
    expect(needsDefaultMedia([scenario(), scenario({ template_header_format: 'VIDEO' })], defaults)).toBe(
      true
    );
  });

  it('upper-cases statuses and builds the one search string', () => {
    expect(statusKey('approved')).toBe('APPROVED');
    expect(scenarioSearchText(scenario({ blocker: 'No campaign' }))).toBe(
      'order_placed order-camp order_tpl USER UTILITY No campaign'
    );
  });

  it('is healthy only with a readable catalogue, rows, and no blockers', () => {
    expect(boardIsHealthy([scenario()], true)).toBe(true);
    expect(boardIsHealthy([scenario()], false)).toBe(false);
    expect(boardIsHealthy([], true)).toBe(false);
    expect(boardIsHealthy([scenario({ blocker: 'x' })], true)).toBe(false);
  });

  it('builds labels from the translator, keyed by provisioning and media state', () => {
    const labels = buildScenarioLabels((key) => `t:${key}`);
    expect(labels.firesLabel).toBe('t:adminWhatsapp.firesLabel');
    expect(labels.provisionLabels.TEMPLATE).toEqual({
      label: 't:adminWhatsapp.provisionTemplate',
      hint: 't:adminWhatsapp.provisionTemplateHint',
    });
    expect(labels.mediaStateLabels.MISSING).toBe('t:adminWhatsapp.mediaNone');
    expect(Object.keys(labels.mediaStateLabels).sort()).toEqual(
      ['CAMPAIGN', 'CUSTOM', 'DEFAULT', 'MISSING', 'NOT_NEEDED']
    );
  });
});

describe('WhatsApp send template fields', () => {
  const t = (key: string) => key;
  const values = (over: Partial<TemplateFieldValues> = {}): TemplateFieldValues => ({
    ...emptyTemplateFields(),
    ...over,
  });
  const issues = (v: TemplateFieldValues) => {
    const schema = z
      .object(templateFieldsShape(t))
      .superRefine((val, ctx) => refineTemplateFields(val as TemplateFieldValues, ctx, t));
    const parsed = schema.safeParse(v);
    return parsed.success ? [] : parsed.error.issues.map((i) => `${i.path.join('.')}:${i.message}`);
  };

  it('accepts an empty set of fields', () => {
    expect(issues(values())).toEqual([]);
  });

  it('requires every body parameter and CTA value to be non-blank', () => {
    const found = issues(
      values({ template_params: [{ value: '  ' }], buttons: [{ index: 0, value: '' }] })
    );
    expect(found).toContain('template_params.0.value:marketingWhatsapp.errorParamRequired');
    expect(found).toContain('buttons.0.value:marketingWhatsapp.errorButtonValue');
  });

  it('requires the header asset when the template needs one', () => {
    expect(issues(values({ media_required: true }))).toEqual([
      'media_url:marketingWhatsapp.errorMediaRequired',
    ]);
  });

  it('refuses a non-public asset URL and accepts an absolute public one', () => {
    expect(issues(values({ media_url: '/relative/file.png' }))).toEqual([
      'media_url:marketingWhatsapp.errorMediaUrl',
    ]);
    expect(issues(values({ media_url: 'https://cdn.example.test/a.png' }))).toEqual([]);
  });

  it('turns blank media into null and trims a real one', () => {
    expect(toMediaInput(values())).toBeNull();
    expect(
      toMediaInput(values({ media_url: ' https://cdn.example.test/a.pdf ', media_filename: ' a.pdf ' }))
    ).toEqual({ url: 'https://cdn.example.test/a.pdf', filename: 'a.pdf' });
  });

  it('trims button values and keeps their positions', () => {
    expect(toButtonInputs(values({ buttons: [{ index: 2, value: ' abc ' }] }))).toEqual([
      { index: 2, value: 'abc' },
    ]);
  });

  it('keeps only CTA buttons with a variable, addressed by their index', () => {
    const template = {
      header_format: 'FILE',
      cta_buttons: [
        { text: 'Static', url_param: 0 },
        { text: 'Track', url_param: 1 },
      ],
    } as unknown as AisensyTemplate;
    expect(dynamicButtons(template).map((b) => [b.text, b.position])).toEqual([['Track', 1]]);
    expect(dynamicButtons(null)).toEqual([]);
    expect(isDocumentHeader(template)).toBe(true);
    expect(isDocumentHeader({ header_format: 'IMAGE' } as unknown as AisensyTemplate)).toBe(false);
    expect(isDocumentHeader(null)).toBe(false);
  });
});

describe('MSG91 channel summary', () => {
  const labels = channelLabels((key) => key.replace('tech.msg91.channel', ''));

  it('lists channels in MSG91 order', () => {
    expect(labels.map((l) => l.key)).toEqual(['sms', 'whatsapp', 'email', 'voice']);
  });

  it('shows only the channels that carried something', () => {
    expect(channelSummary({ sms: 2, whatsapp: 0, email: 0, voice: 1 }, labels)).toBe(
      'Sms ×2 · Voice ×1'
    );
  });

  it('shows a dash when nothing was sent', () => {
    expect(channelSummary({ sms: 0, whatsapp: 0, email: 0, voice: 0 }, labels)).toBe('—');
  });
});

describe('labelFor', () => {
  const labels = { SENT: 'Delivered' };

  it('uses the supplied label for a known value', () => {
    expect(labelFor(labels, 'SENT')).toBe('Delivered');
  });

  it('shows an unknown value as it came rather than hiding it', () => {
    expect(labelFor(labels, 'BOUNCED')).toBe('BOUNCED');
  });
});
