import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { SubmissionPanel } from '@/components/challenge/tools/SubmissionPanel';
import type { PanelProps } from '@/components/challenge/tools/ToolCard';
import { uploadToImagekitDirect } from '@/services/imagekit-upload';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/services/imagekit-upload', () => ({ uploadToImagekitDirect: jest.fn() }));

const mockFormProps = jest.fn();
jest.mock('@/components/challenge/tools/SubmissionForm', () => ({
  SubmissionForm: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable } = require('react-native');
    mockFormProps(props);
    return <Pressable testID="form-stub" onPress={() => undefined} />;
  },
}));

const upload = jest.mocked(uploadToImagekitDirect);

const COMPETITORS = [
  { competitor_id: 'c1', name: 'Team Red' },
  { competitor_id: 'c2', name: 'Team Blue' },
];
const entry = (id: string, competitor: string) => ({
  id,
  competitor_id: competitor,
  media_url: `https://cdn/${id}.jpg`,
  media_type: 'IMAGE',
  caption: '',
});
const tool = (entries: unknown[] = [], config: Record<string, unknown> = {}) =>
  ({
    instance_id: 't1',
    label: 'Photo drop',
    config_json: JSON.stringify(config),
    state_json: JSON.stringify({ entries }),
  }) as unknown as PanelProps['tool'];

const actionsOf = (patch: Partial<PanelProps['actions']> = {}) =>
  ({
    busy: false,
    error: '',
    fail: jest.fn(),
    submit: jest.fn().mockResolvedValue(true),
    removeEntry: jest.fn().mockResolvedValue(true),
    ...patch,
  }) as unknown as PanelProps['actions'];

const challengeOf = (
  status: string,
  viewer: { can_manage: boolean; my_competitor_id: string | null },
) =>
  ({ id: 'ch1', status, competitors: COMPETITORS, viewer }) as unknown as PanelProps['challenge'];

const FILE = { uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' };

const lastForm = () => mockFormProps.mock.calls.at(-1)?.[0];

beforeEach(() => {
  jest.clearAllMocks();
  upload.mockResolvedValue('https://cdn/new.jpg');
});

describe('SubmissionPanel — what shows', () => {
  it('draws the card with the tool label and its gallery', () => {
    renderWithProviders(
      <SubmissionPanel
        challenge={challengeOf('LIVE', { can_manage: false, my_competitor_id: 'c1' })}
        tool={tool([entry('e1', 'c1')])}
        actions={actionsOf()}
      />,
    );
    expect(screen.getByTestId('challenge-submission-t1')).toBeOnTheScreen();
    expect(screen.getByText('Photo drop')).toBeOnTheScreen();
    expect(screen.getByTestId('challenge-entry-e1')).toBeOnTheScreen();
    expect(screen.getByText('Team Red')).toBeOnTheScreen();
  });

  it('says why an action failed', () => {
    renderWithProviders(
      <SubmissionPanel
        challenge={challengeOf('LIVE', { can_manage: false, my_competitor_id: 'c1' })}
        tool={tool()}
        actions={actionsOf({ error: 'Window closed' })}
      />,
    );
    expect(screen.getByText('Window closed')).toBeOnTheScreen();
  });

  it('gives a competitor of a live challenge the form, marked as replacing when they already have an entry', () => {
    renderWithProviders(
      <SubmissionPanel
        challenge={challengeOf('LIVE', { can_manage: false, my_competitor_id: 'c1' })}
        tool={tool([entry('e1', 'c1')], { media_kind: 'IMAGE', allow_caption: false })}
        actions={actionsOf({ busy: true })}
      />,
    );
    expect(lastForm()).toMatchObject({
      testID: 'challenge-submission-t1',
      accepted: ['IMAGE'],
      allowCaption: false,
      competitors: undefined,
      replacing: true,
      saving: true,
    });
  });

  it('does not mark a competitor without an entry as replacing', () => {
    renderWithProviders(
      <SubmissionPanel
        challenge={challengeOf('SCHEDULED', { can_manage: false, my_competitor_id: 'c2' })}
        tool={tool([entry('e1', 'c1')])}
        actions={actionsOf()}
      />,
    );
    expect(lastForm()).toMatchObject({ replacing: false, saving: false, allowCaption: true });
    expect(lastForm().accepted).toEqual(['IMAGE', 'VIDEO', 'AUDIO']);
  });

  it('gives a host the competitor list and never marks it as replacing', () => {
    renderWithProviders(
      <SubmissionPanel
        challenge={challengeOf('LIVE', { can_manage: true, my_competitor_id: null })}
        tool={tool([entry('e1', 'c1')])}
        actions={actionsOf()}
      />,
    );
    expect(lastForm().competitors).toEqual(COMPETITORS);
    expect(lastForm().replacing).toBe(false);
  });

  it('hides the form once the challenge is no longer open', () => {
    renderWithProviders(
      <SubmissionPanel
        challenge={challengeOf('COMPLETED', { can_manage: true, my_competitor_id: 'c1' })}
        tool={tool()}
        actions={actionsOf()}
      />,
    );
    expect(screen.queryByTestId('form-stub')).toBeNull();
  });

  it('hides the form from a spectator who neither manages nor competes', () => {
    renderWithProviders(
      <SubmissionPanel
        challenge={challengeOf('LIVE', { can_manage: false, my_competitor_id: null })}
        tool={tool()}
        actions={actionsOf()}
      />,
    );
    expect(screen.queryByTestId('form-stub')).toBeNull();
  });
});

describe('SubmissionPanel — submitting', () => {
  const mount = (
    viewer: { can_manage: boolean; my_competitor_id: string | null },
    actions = actionsOf(),
  ) => {
    renderWithProviders(
      <SubmissionPanel challenge={challengeOf('LIVE', viewer)} tool={tool()} actions={actions} />,
    );
    return actions;
  };
  const submit = (values: Record<string, unknown>) =>
    lastForm().onSubmit(values) as Promise<boolean>;

  it('uploads the file to the challenge folder, then saves a competitor entry for themselves', async () => {
    const actions = mount({ can_manage: false, my_competitor_id: 'c1' });
    let saved = false;
    await act(async () => {
      saved = await submit({ file: FILE, caption: 'hi', competitor_id: 'ignored' });
    });
    expect(saved).toBe(true);
    expect(upload).toHaveBeenCalledWith(FILE, '/challenge-submissions');
    expect(actions.submit).toHaveBeenCalledWith('t1', {
      media_url: 'https://cdn/new.jpg',
      media_type: 'IMAGE',
      caption: 'hi',
      competitor_id: null,
    });
  });

  it('lets a host name the competitor the piece is for', async () => {
    const actions = mount({ can_manage: true, my_competitor_id: null });
    await act(async () => {
      await submit({
        file: { uri: 'file:///v.mp4', name: 'v.mp4', type: 'video/mp4' },
        caption: '',
        competitor_id: 'c2',
      });
    });
    expect(actions.submit).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ media_type: 'VIDEO', competitor_id: 'c2' }),
    );
  });

  it('reports the form as saving while the upload runs', async () => {
    let finish: (url: string) => void = () => undefined;
    upload.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    mount({ can_manage: false, my_competitor_id: 'c1' });
    expect(lastForm().saving).toBe(false);
    let pending: Promise<boolean> = Promise.resolve(false);
    await act(async () => {
      pending = submit({ file: FILE, caption: '', competitor_id: '' });
    });
    expect(lastForm().saving).toBe(true);
    await act(async () => {
      finish('https://cdn/x.jpg');
      await pending;
    });
    expect(lastForm().saving).toBe(false);
  });

  it.each([
    ['no file', { file: null, caption: '', competitor_id: '' }],
    [
      'a file of a kind a challenge cannot take',
      {
        file: { uri: 'f', name: 'f.pdf', type: 'application/pdf' },
        caption: '',
        competitor_id: '',
      },
    ],
  ])('uploads nothing for %s', async (_label, values) => {
    const actions = mount({ can_manage: false, my_competitor_id: 'c1' });
    let saved = true;
    await act(async () => {
      saved = await submit(values);
    });
    expect(saved).toBe(false);
    expect(upload).not.toHaveBeenCalled();
    expect(actions.submit).not.toHaveBeenCalled();
  });

  it('passes on the failure of an upload and does not save', async () => {
    upload.mockRejectedValueOnce(new Error('Upload refused'));
    const actions = mount({ can_manage: false, my_competitor_id: 'c1' });
    let saved = true;
    await act(async () => {
      saved = await submit({ file: FILE, caption: '', competitor_id: '' });
    });
    expect(saved).toBe(false);
    expect(actions.fail).toHaveBeenCalledWith('Upload refused');
    expect(actions.submit).not.toHaveBeenCalled();
    expect(lastForm().saving).toBe(false);
  });

  it('returns what the server answered when it refuses the entry', async () => {
    const actions = actionsOf({ submit: jest.fn().mockResolvedValue(false) as never });
    mount({ can_manage: false, my_competitor_id: 'c1' }, actions);
    let saved = true;
    await act(async () => {
      saved = await submit({ file: FILE, caption: '', competitor_id: '' });
    });
    expect(saved).toBe(false);
  });
});

describe('SubmissionPanel — removing an entry', () => {
  const mount = (
    status: string,
    viewer: { can_manage: boolean; my_competitor_id: string | null },
    actions = actionsOf(),
  ) => {
    renderWithProviders(
      <SubmissionPanel
        challenge={challengeOf(status, viewer)}
        tool={tool([entry('e1', 'c1'), entry('e2', 'c2')])}
        actions={actions}
      />,
    );
    return actions;
  };

  it('lets a competitor remove only their own entry while the challenge is open', () => {
    mount('LIVE', { can_manage: false, my_competitor_id: 'c1' });
    expect(screen.getByTestId('challenge-entry-remove-e1')).toBeOnTheScreen();
    expect(screen.queryByTestId('challenge-entry-remove-e2')).toBeNull();
  });

  it('takes the competitor remove button away once the challenge is complete', () => {
    mount('COMPLETED', { can_manage: false, my_competitor_id: 'c1' });
    expect(screen.queryByTestId('challenge-entry-remove-e1')).toBeNull();
  });

  it('lets a host take any entry down until the challenge is archived', () => {
    mount('COMPLETED', { can_manage: true, my_competitor_id: null });
    expect(screen.getByTestId('challenge-entry-remove-e1')).toBeOnTheScreen();
    expect(screen.getByTestId('challenge-entry-remove-e2')).toBeOnTheScreen();
  });

  it('gives a host no remove button on an archived challenge', () => {
    mount('ARCHIVED', { can_manage: true, my_competitor_id: null });
    expect(screen.queryByTestId('challenge-entry-remove-e1')).toBeNull();
  });

  it('asks first, naming the competitor, and removes on confirm', async () => {
    const actions = mount('LIVE', { can_manage: true, my_competitor_id: null });
    fireEvent.press(screen.getByTestId('challenge-entry-remove-e2'));
    expect(
      await screen.findByText('mweb.challenge.tools.removeEntryBody|Team Blue'),
    ).toBeOnTheScreen();
    expect(actions.removeEntry).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.press(screen.getByTestId('challenge-submission-t1-remove-confirm-confirm'));
    });
    await waitFor(() => expect(actions.removeEntry).toHaveBeenCalledWith('e2'));
    await waitFor(() => expect(screen.queryByText(/removeEntryBody/)).toBeNull());
  });

  it('names nobody in the question for an entry whose competitor left the roster', async () => {
    const actions = actionsOf();
    renderWithProviders(
      <SubmissionPanel
        challenge={challengeOf('LIVE', { can_manage: true, my_competitor_id: null })}
        tool={tool([entry('e9', 'gone')])}
        actions={actions}
      />,
    );
    fireEvent.press(screen.getByTestId('challenge-entry-remove-e9'));
    expect(await screen.findByText('mweb.challenge.tools.removeEntryBody|')).toBeOnTheScreen();
  });

  it('keeps the entry when the host backs out', async () => {
    const actions = mount('LIVE', { can_manage: true, my_competitor_id: null });
    fireEvent.press(screen.getByTestId('challenge-entry-remove-e1'));
    await screen.findByText('mweb.challenge.tools.removeEntryBody|Team Red');
    await act(async () => {
      fireEvent.press(screen.getByTestId('challenge-submission-t1-remove-confirm-cancel'));
    });
    expect(actions.removeEntry).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText(/removeEntryBody/)).toBeNull());
  });
});
