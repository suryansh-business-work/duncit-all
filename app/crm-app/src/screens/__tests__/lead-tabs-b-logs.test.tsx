import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import type { Lead } from '@/features/leads/useLead';
import { makeManualLogSchema } from '@/forms/manual-log';
import * as docs from '@/graphql/leadTabsB';
import { fallbackT } from '@/i18n/fallback';
import { gqlRequest } from '@/services/graphql.client';
import { renderWithTheme } from '@/test-utils';
import { htmlToText, manualLogHtml, parseManualLogHtml } from '../lead/tabs/ManualLogsHtml';
import { ManualLogsTab } from '../lead/tabs/ManualLogsTab';

jest.mock('crm-telephony', () => ({ CrmTelephony: null }));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));

/** Lead › Manual Logs: the team's notes by day, @mentions, edits, deletes and their history. */

const request = gqlRequest as jest.Mock;
const ASHA = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const MEERA = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();
const log = (over: Record<string, unknown>) => ({
  id: 'n0',
  type: 'NOTE',
  summary: '',
  target: '',
  body_html: '',
  body_text: '',
  created_by: 'u1',
  created_at: minutesAgo(5),
  updated_by: null,
  updated_at: null,
  deleted_by: null,
  deleted_at: null,
  is_deleted: false,
  can_change: false,
  ...over,
});
const LOGS = [
  log({
    id: 'n1',
    summary: 'Visited',
    body_html: `<p>Liked the turf, ask <span data-type="mention" data-id="${ASHA}" data-label="Asha">@Asha</span></p>`,
    body_text: 'Liked the turf, ask @Asha',
    updated_by: 'u1',
    updated_at: minutesAgo(2),
    can_change: true,
  }),
  log({
    id: 'n2',
    created_by: 'u2',
    deleted_by: 'u2',
    deleted_at: minutesAgo(1),
    is_deleted: true,
  }),
  log({
    id: 'n3',
    summary: 'Old call',
    body_html: '<p>Budget <b>5k</b></p>',
    created_by: 'u2',
    created_at: daysAgo(45),
  }),
  log({ id: null, type: 'NOTE_CREATED', target: 'n1', created_by: 'u1' }),
];
const LEAD: Lead = {
  id: 'v1',
  name: 'Smash Arena',
  city: 'Pune',
  lead_status: 'Contacted',
  priority: 'High',
  assigned_to: 'Asha',
  next_follow_up_date: null,
  contacts: [],
  activity_log: [],
};

type Handler = (vars: Record<string, unknown>) => unknown;
const serve = (overrides: Map<unknown, Handler> = new Map()) =>
  request.mockImplementation(async (doc: unknown, vars: Record<string, unknown> = {}) => {
    const handler = overrides.get(doc);
    if (handler) return handler(vars);
    if (doc === docs.CrmAppLeadLogsDocument) return { venue: { id: 'v1', activity_log: LOGS } };
    if (doc === docs.CrmAppUsersByIdsDocument)
      return {
        crmUsersByIds: [
          {
            id: 'u1',
            name: 'Asha Rao',
            email: 'asha@duncit.com',
            roles: ['CRM_MANAGER'],
            is_staff: true,
          },
          { id: 'u2', name: 'Ravi', email: null, roles: [], is_staff: false },
        ],
      };
    if (doc === docs.CrmAppMentionSearchDocument)
      return { crmAssignableUsers: [{ id: MEERA, name: 'Meera Shah', email: 'meera@duncit.com' }] };
    if (doc === docs.CrmAppAddManualLogDocument) return { addCrmManualLog: { id: 'n9' } };
    if (doc === docs.CrmAppUpdateManualLogDocument) return { updateCrmManualLog: { id: 'n1' } };
    if (doc === docs.CrmAppDeleteManualLogDocument) return { deleteCrmManualLog: { id: 'n1' } };
    throw new Error('unexpected operation');
  });
/** The first of several nodes with one test id (a name shows on a card and in the history). */
const first = (testID: string) => {
  const [node] = screen.getAllByTestId(testID);
  if (!node) throw new Error(`no ${testID}`);
  return node;
};
const callsTo = (doc: unknown) => request.mock.calls.filter(([d]) => d === doc);
const onChanged = jest.fn();
const renderTab = () =>
  renderWithTheme(<ManualLogsTab kind="VENUE_LEAD" id="v1" lead={LEAD} onChanged={onChanged} />);

beforeEach(() => {
  jest.clearAllMocks();
  serve();
});

describe('ManualLogsTab', () => {
  it('lists the logs by day with their authors, edits, deleted placeholders and history', async () => {
    renderTab();
    expect(await screen.findByText('Visited')).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppLeadLogsDocument)[0]?.[1]).toMatchObject({
      id: 'v1',
      venue: true,
      host: false,
    });
    expect(screen.getByText('Liked the turf, ask @Asha')).toBeOnTheScreen();
    expect(screen.getByText('Budget 5k')).toBeOnTheScreen();
    expect(screen.getByText('This log was deleted')).toBeOnTheScreen();
    expect(screen.getByText(/^Edited /)).toBeOnTheScreen();
    expect(screen.getByText('Log activity')).toBeOnTheScreen();
    expect(screen.getByText('Created')).toBeOnTheScreen();
    expect(await screen.findAllByText('Asha Rao')).not.toHaveLength(0);
    expect(callsTo(docs.CrmAppUsersByIdsDocument)[0]?.[1]).toEqual({ ids: ['u1', 'u2'] });
    // Only the log the server lets this user change offers edit and delete.
    expect(screen.getAllByTestId('manual-log-edit')).toHaveLength(1);
  });

  it('keeps a window: the last 30 days leave out an older log', async () => {
    renderTab();
    expect(await screen.findByText('Old call')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('manual-log-range-month'));
    expect(screen.queryByText('Old call')).toBeNull();
    expect(screen.getByText('Visited')).toBeOnTheScreen();
  });

  it('opens a person: staff with email and roles, a former member without them', async () => {
    renderTab();
    await screen.findAllByText('Asha Rao');
    fireEvent.press(first('person-u1'));
    expect(screen.getByText('asha@duncit.com')).toBeOnTheScreen();
    expect(screen.getByText('CRM_MANAGER')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('person-sheet-close'));
    fireEvent.press(first('person-u2'));
    expect(
      screen.getByText(
        'This person is no longer on the CRM team, so their contact details are hidden.',
      ),
    ).toBeOnTheScreen();
  });

  it('writes a log, refusing an empty one, and tags a teammate picked after "@"', async () => {
    renderTab();
    fireEvent.press(await screen.findByTestId('manual-log-add'));
    await act(async () => fireEvent.press(screen.getByTestId('manual-log-save')));
    expect(screen.getByText('Write something in the log before saving.')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('manual-log-title'), 'Follow up');
    fireEvent.changeText(screen.getByTestId('manual-log-body'), 'Call @Me');
    fireEvent.press(await screen.findByTestId(`mention-${MEERA}`));
    expect(callsTo(docs.CrmAppMentionSearchDocument)[0]?.[1]).toEqual({ search: 'Me', limit: 8 });
    expect(screen.getByTestId('manual-log-body').props.value).toBe('Call @Meera Shah ');
    await act(async () => fireEvent.press(screen.getByTestId('manual-log-save')));
    expect(callsTo(docs.CrmAppAddManualLogDocument)[0]?.[1]).toEqual({
      input: {
        entity_type: 'VENUE_LEAD',
        entity_id: 'v1',
        summary: 'Follow up',
        body_html: `<p>Call <span data-type="mention" class="rich-text-mention" data-id="${MEERA}" data-label="Meera Shah">@Meera Shah</span></p>`,
        body_text: 'Call @Meera Shah',
      },
    });
    await waitFor(() => expect(screen.queryByTestId('manual-log-form')).toBeNull());
    expect(onChanged).toHaveBeenCalled();
  });

  it('edits a log with its mention kept, and keeps the form open with the reason when refused', async () => {
    renderTab();
    fireEvent.press(await screen.findByTestId('manual-log-edit'));
    expect(screen.getByText('Edit manual log')).toBeOnTheScreen();
    expect(screen.getByTestId('manual-log-body').props.value).toBe('Liked the turf, ask @Asha');
    fireEvent.changeText(screen.getByTestId('manual-log-title'), 'Second visit');
    await act(async () => fireEvent.press(screen.getByTestId('manual-log-save')));
    expect(callsTo(docs.CrmAppUpdateManualLogDocument)[0]?.[1]).toEqual({
      input: {
        entity_type: 'VENUE_LEAD',
        entity_id: 'v1',
        log_id: 'n1',
        summary: 'Second visit',
        body_html: `<p>Liked the turf, ask <span data-type="mention" class="rich-text-mention" data-id="${ASHA}" data-label="Asha">@Asha</span></p>`,
        body_text: 'Liked the turf, ask @Asha',
      },
    });

    serve(
      new Map<unknown, Handler>([
        [
          docs.CrmAppUpdateManualLogDocument,
          () => Promise.reject(new Error('Only the person who wrote this log can change it.')),
        ],
      ]),
    );
    await waitFor(() => expect(screen.queryByTestId('manual-log-form')).toBeNull());
    fireEvent.press(screen.getByTestId('manual-log-edit'));
    await act(async () => fireEvent.press(screen.getByTestId('manual-log-save')));
    expect(
      await screen.findByText('Only the person who wrote this log can change it.'),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('manual-log-cancel'));
    expect(screen.queryByTestId('manual-log-form')).toBeNull();
  });

  it('deletes a log only after confirming, and says when the delete fails', async () => {
    renderTab();
    fireEvent.press(await screen.findByTestId('manual-log-delete'));
    expect(screen.getByText('Delete this log?')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('manual-log-delete-confirm-cancel'));
    expect(callsTo(docs.CrmAppDeleteManualLogDocument)).toHaveLength(0);

    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppDeleteManualLogDocument, () => Promise.reject(new Error('Log not found'))],
      ]),
    );
    fireEvent.press(screen.getByTestId('manual-log-delete'));
    await act(async () => fireEvent.press(screen.getByTestId('manual-log-delete-confirm-confirm')));
    expect(callsTo(docs.CrmAppDeleteManualLogDocument)[0]?.[1]).toEqual({
      entity_type: 'VENUE_LEAD',
      entity_id: 'v1',
      log_id: 'n1',
    });
    expect(await screen.findByText('Log not found')).toBeOnTheScreen();
  });

  it('says when there are no logs, and offers a retry when they cannot be read', async () => {
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppLeadLogsDocument, () => Promise.reject(new Error('Network down'))],
      ]),
    );
    renderTab();
    expect(await screen.findByText('Network down')).toBeOnTheScreen();
    serve(
      new Map<unknown, Handler>([
        [docs.CrmAppLeadLogsDocument, () => ({ venue: { id: 'v1', activity_log: [] } })],
      ]),
    );
    fireEvent.press(screen.getByTestId('state-retry'));
    expect(
      await screen.findByText(
        'No manual logs in this window. Capture conversations, follow-ups, or decisions here.',
      ),
    ).toBeOnTheScreen();
    expect(callsTo(docs.CrmAppUsersByIdsDocument)).toHaveLength(0);
  });
});

describe('manual log HTML', () => {
  it('reads the words of a rich body: blocks as lines, list items as dashes, entities decoded', () => {
    expect(
      htmlToText(
        '<p>Hi &amp; <b>there</b></p><ul><li>One</li><li>Two</li></ul><p>&#39;x&#x27;&nbsp;y<br/>z</p>',
      ),
    ).toBe("Hi & there\n- One\n- Two\n\n'x' y\nz");
    expect(htmlToText(null)).toBe('');
    expect(htmlToText('<p>&#99999999;ok</p>')).toBe('ok');
  });

  it('writes typed text as escaped paragraphs with each live mention as the editor’s span', () => {
    const html = manualLogHtml(' Hi <b> @Asha Rao & @Asha\nline ', [
      { id: 'a1', label: 'Asha' },
      { id: 'a2', label: 'Asha Rao' },
      { id: 'a3', label: 'Gone' },
    ]);
    expect(html).toBe(
      '<p>Hi &lt;b&gt; <span data-type="mention" class="rich-text-mention" data-id="a2" data-label="Asha Rao">@Asha Rao</span> &amp; ' +
        '<span data-type="mention" class="rich-text-mention" data-id="a1" data-label="Asha">@Asha</span></p><p>line</p>',
    );
  });

  it('reads a stored body back to text and the people it mentions, once each', () => {
    const parsed = parseManualLogHtml(
      '<p>Hi <span data-type="mention" data-id="a1" data-label="Asha &amp; Co">@Asha &amp; Co</span>, ' +
        '<span class="x">plain</span> <span data-type="mention" data-id="a2">@Ravi</span> ' +
        '<span data-type="mention" data-label="No id">@No id</span> ' +
        '<span data-type="mention" data-id="a1" data-label="Asha &amp; Co"><span>@Asha &amp; Co</span></span> ' +
        '<span data-type="mention" data-id="a4" data-label="Zed">',
    );
    expect(parsed.mentions).toEqual([
      { id: 'a1', label: 'Asha & Co' },
      { id: 'a2', label: 'Ravi' },
      { id: 'a4', label: 'Zed' },
    ]);
    expect(parsed.text).toBe('Hi @Asha & Co, plain @Ravi @No id @Asha & Co @Zed');
    expect(parseManualLogHtml(undefined)).toEqual({ text: '', mentions: [] });
  });
});

describe('manual log rules', () => {
  const schema = makeManualLogSchema(fallbackT);
  const messages = (input: unknown) => {
    const result = schema.safeParse(input);
    return result.success ? [] : result.error.issues.map((issue) => issue.message);
  };

  it('needs the log itself; the title is optional but capped like the server', () => {
    expect(messages({ summary: '', body: 'Met the owner', mentions: [] })).toEqual([]);
    expect(messages({ summary: '', body: '   ', mentions: [] })).toEqual([
      'Write something in the log before saving.',
    ]);
    expect(messages({ summary: 'x'.repeat(201), body: 'ok', mentions: [] })).toEqual([
      'Keep it under 200 characters',
    ]);
  });

  it('refuses a log whose stored HTML would pass the server’s limit', () => {
    expect(messages({ summary: '', body: 'x'.repeat(100_000), mentions: [] })).toEqual([
      'This log is too long. Split it into two logs.',
    ]);
  });
});
