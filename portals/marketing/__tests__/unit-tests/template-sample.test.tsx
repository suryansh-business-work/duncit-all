/**
 * The WhatsApp template preview — the bubble an operator checks before a
 * campaign goes to thousands of numbers.
 *
 * There is deliberately ONE preview, used both for a catalogue row and for a
 * send about to go out, because a second one is a second thing that can
 * disagree with what actually arrives. So it has to be right in both modes:
 *
 *  - with no values it shows the SHAPE. The {{n}} stay visible and highlighted,
 *    which is what tells an operator how many things they will have to supply.
 *  - with values it shows the MESSAGE. Each {{n}} is replaced by what was typed,
 *    and a variable nobody filled falls back to the placeholder rather than
 *    silently becoming an empty gap in a sentence.
 *
 * The dynamic button link is the part that is easiest to get wrong, and the
 * costliest: AiSensy numbers a URL's parameter AFTER the body's own variables,
 * so a link matched on the button's position instead of its label points at the
 * wrong thing in every message that goes out. It is matched on the label here,
 * and only where there is a {{n}} to fill.
 */
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '../testkit';
import TemplateSample from '../../src/pages/whatsapp-campaigns-page/wa-aisensy/TemplateSample';
import {
  approvedTemplateGroups,
  bodySegments,
  campaignRows,
  campaignSearchText,
  filledButtonUrl,
  paramContext,
  paramsLabel,
  templateRowId,
  templateSearchText,
} from '../../src/pages/whatsapp-campaigns-page/wa-aisensy/helpers';
import type { AisensyCampaign, AisensyTemplate } from '../../src/pages/whatsapp-campaigns-page/queries';

const template = (over: Partial<AisensyTemplate> = {}): AisensyTemplate => ({
  id: 'tpl-1',
  name: 'pod_reminder',
  status: 'APPROVED',
  category: 'UTILITY',
  language: 'en',
  body: 'Hi {{1}}, your pod at {{2}} starts in an hour.',
  param_count: 2,
  header: 'Duncit',
  header_format: 'TEXT',
  needs_media: false,
  footer: 'Reply STOP to opt out',
  buttons: ['Open pod'],
  cta_buttons: [
    { type: 'URL', text: 'Open pod', url: 'https://duncit.com/p/{{3}}', url_param: 3 },
  ],
  ...over,
});

const sample = (props: Partial<Parameters<typeof TemplateSample>[0]> = {}) =>
  renderWithProviders(<TemplateSample template={template()} {...props} />);

describe('bodySegments', () => {
  it('splits the body into words and variables, marking which is which', () => {
    const segments = bodySegments('Hi {{1}}, welcome.');

    expect(segments.filter((segment) => segment.variable)).toHaveLength(1);
    expect(segments.map((segment) => segment.text).join('')).toContain('Hi ');
  });

  it('leaves the placeholder visible when nothing has been typed for it', () => {
    const [, variable] = bodySegments('Hi {{1}}, welcome.');

    expect(variable?.text).toBe('{{1}}');
  });

  it('replaces a variable with what was typed for it', () => {
    const filled = bodySegments('Hi {{1}}, welcome.', ['Meera']);

    expect(filled.map((segment) => segment.text).join('')).toContain('Hi Meera');
  });

  it('falls back to the placeholder for a variable left blank, not to a gap', () => {
    const partial = bodySegments('Hi {{1}} at {{2}}.', ['Meera', '']);

    expect(partial.map((segment) => segment.text).join('')).toContain('{{2}}');
  });

  it('gives every segment a distinct key, so the list is stable across renders', () => {
    const segments = bodySegments('{{1}} and {{2}} and {{1}}');
    const ids = segments.map((segment) => segment.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('handles a body with no variables at all', () => {
    const segments = bodySegments('A plain announcement.');

    expect(segments.every((segment) => !segment.variable)).toBe(true);
  });
});

describe('filledButtonUrl', () => {
  it('leaves a static link alone — there is nothing in it to fill', () => {
    expect(filledButtonUrl('https://duncit.com/pods', 0, 'anything')).toBe(
      'https://duncit.com/pods'
    );
  });

  it('leaves the link as-is until a value is typed', () => {
    expect(filledButtonUrl('https://duncit.com/p/{{3}}', 3, '')).toBe('https://duncit.com/p/{{3}}');
  });

  it('fills the parameter at its position on the TEMPLATE, not the button', () => {
    // AiSensy numbers a dynamic link after the body's own variables, so a link
    // carrying {{3}} takes the third value — filling the first would point every
    // message at the wrong pod.
    expect(filledButtonUrl('https://duncit.com/p/{{3}}', 3, 'sunday-badminton')).toBe(
      'https://duncit.com/p/sunday-badminton'
    );
  });

  it('fills a link that is the first parameter too', () => {
    expect(filledButtonUrl('https://duncit.com/{{1}}', 1, 'shop')).toBe('https://duncit.com/shop');
  });
});

describe('TemplateSample', () => {
  it('draws the body, the header and the footer WhatsApp puts around it', () => {
    const { container } = sample();

    expect(container.textContent).toContain('Duncit');
    expect(container.textContent).toContain('starts in an hour');
    expect(container.textContent).toContain('Reply STOP to opt out');
  });

  it('shows the SHAPE with no values — the placeholders stay visible', () => {
    const { container } = sample();

    expect(container.textContent).toContain('{{1}}');
    expect(container.textContent).toContain('{{2}}');
  });

  it('shows the MESSAGE once the send values are handed to it', () => {
    const { container } = sample({ params: ['Meera', 'Court 2'] });

    expect(container.textContent).toContain('Hi Meera');
    expect(container.textContent).toContain('Court 2');
    expect(container.textContent).not.toContain('{{1}}');
  });

  it('draws the buttons WhatsApp adds under the bubble', () => {
    const { container } = sample();

    expect(container.textContent).toContain('Open pod');
  });

  it('shows a dynamic link only once it has something to fill it with', () => {
    const empty = sample();
    expect(empty.container.textContent).not.toContain('sunday-badminton');

    const filled = sample({ buttons: [{ index: 0, value: 'sunday-badminton' }] });
    expect(filled.container.textContent).toContain('sunday-badminton');
  });

  it('matches the link by LABEL, so a quick reply beside it is not mistaken for it', () => {
    const withQuickReply = template({
      buttons: ['Not now', 'Open pod'],
      cta_buttons: [
        { type: 'URL', text: 'Open pod', url: 'https://duncit.com/p/{{3}}', url_param: 3 },
      ],
    });

    const { container: preview } = renderWithProviders(
      <TemplateSample template={withQuickReply} buttons={[{ index: 0, value: 'sunday-badminton' }]} />
    );

    expect(preview.textContent).toContain('Not now');
    expect(preview.textContent).toContain('sunday-badminton');
  });

  it('draws a template with no header, no footer and no buttons', () => {
    const { container } = renderWithProviders(
      <TemplateSample
        template={template({ header: '', header_format: '', footer: '', buttons: [], cta_buttons: [] })}
      />
    );

    expect(container.textContent).toContain('starts in an hour');
  });

  it.each(['IMAGE', 'VIDEO', 'DOCUMENT'])('draws a %s header before any asset is chosen', (format) => {
    const { container } = renderWithProviders(
      <TemplateSample template={template({ header: '', header_format: format, needs_media: true })} />
    );

    expect(container.innerHTML).not.toBe('');
  });

  it('draws the asset once one has been chosen for the send', () => {
    const { container } = renderWithProviders(
      <TemplateSample
        template={template({ header: '', header_format: 'IMAGE', needs_media: true })}
        media={{ url: 'https://ik.imagekit.io/duncit/court.png', filename: 'court.png' }}
      />
    );

    expect(container.innerHTML).not.toBe('');
  });

  it('draws a document header, which is not a picture however the URL ends', () => {
    const { container } = renderWithProviders(
      <TemplateSample
        template={template({ header: '', header_format: 'DOCUMENT', needs_media: true })}
        media={{ url: 'https://cdn.duncit.com/terms.pdf?v=2', filename: 'terms.pdf' }}
      />
    );

    expect(container.innerHTML).not.toBe('');
  });

  it('ignores a header format WhatsApp does not have', () => {
    const { container } = renderWithProviders(
      <TemplateSample template={template({ header: '', header_format: 'CAROUSEL' })} />
    );

    expect(container.textContent).toContain('starts in an hour');
  });
});

/**
 * The rest of the catalogue helpers — the parts of the same file that decide
 * what an operator is shown about a template, rather than how it is drawn.
 */
describe('the catalogue helpers', () => {
  const campaign = (over: Partial<AisensyCampaign> = {}): AisensyCampaign => ({
    name: 'pod_reminder_live',
    status: 'LIVE',
    template_name: 'pod_reminder',
    type: 'ONE_TIME',
    media_url: '',
    media_filename: '',
    ...over,
  });

  it('marks only a LIVE campaign sendable — AiSensy refuses the rest', () => {
    const rows = campaignRows(
      [campaign(), campaign({ name: 'paused', status: 'PAUSED' })],
      [],
      true
    );

    expect(rows.map((row) => row.sendable)).toEqual([true, false]);
  });

  it('reads the status case-insensitively, because AiSensy is not consistent about it', () => {
    const [row] = campaignRows([campaign({ status: 'live' })], [], true);

    expect(row?.sendable).toBe(true);
  });

  it('falls back to the names the portal itself holds when AiSensy is not answering', () => {
    const rows = campaignRows([], [{ name: 'local_only', description: 'Reminder' }] as never, false);

    expect(rows).toEqual([
      { name: 'local_only', status: '', type: 'Reminder', template_name: '', sendable: true },
    ]);
  });

  it('searches a row across every column an operator can see', () => {
    const [row] = campaignRows([campaign()], [], true);

    const text = campaignSearchText(row as never);
    expect(text).toContain('pod_reminder_live');
    expect(text).toContain('LIVE');
    expect(text).toContain('ONE_TIME');
  });

  it('searches a template across its body too, not only its name', () => {
    expect(templateSearchText(template())).toContain('starts in an hour');
  });

  it('counts parameters in words, and gets the singular right', () => {
    expect(paramsLabel(1)).toBe('1 parameter');
    expect(paramsLabel(0)).toBe('0 parameters');
    expect(paramsLabel(3)).toBe('3 parameters');
  });

  it('keys a template row by name AND language — the same one exists once per language', () => {
    expect(templateRowId(template({ language: 'en' }))).not.toBe(
      templateRowId(template({ language: 'hi' }))
    );
  });

  it('labels a parameter with the sentence it lands in, not just its number', () => {
    const context = paramContext('Hi {{1}}, your pod at {{2}} starts in an hour.', 2);

    expect(context).toContain('{{2}}');
    expect(context).toContain('your pod at');
    expect(context).toContain('starts in an hour');
  });

  it('has no context to give for a placeholder the body does not carry', () => {
    expect(paramContext('Hi {{1}}.', 5)).toBe('');
  });

  it('flattens the wording onto one line, since a row is one line high', () => {
    const context = paramContext('Hi {{1}},\n\n  your pod is on.', 1);

    expect(context).not.toContain('\n');
  });

  it('separates approved templates nothing can send from the ones a campaign already does', () => {
    const groups = approvedTemplateGroups(
      [
        template({ name: 'pod_reminder' }),
        template({ name: 'never_sent' }),
        template({ name: 'still_in_review', status: 'PENDING' }),
      ],
      [campaign({ template_name: 'pod_reminder' })]
    );

    // A send addresses a CAMPAIGN, never a template, so an approved template
    // with none cannot go out at all — and AiSensy's own console never says so.
    expect(groups.bound.map((item) => item.name)).toEqual(['pod_reminder']);
    expect(groups.orphans.map((item) => item.name)).toEqual(['never_sent']);
  });

  it('leaves an unapproved template out of both groups', () => {
    const groups = approvedTemplateGroups([template({ status: 'REJECTED' })], []);

    expect(groups.bound).toHaveLength(0);
    expect(groups.orphans).toHaveLength(0);
  });
});
