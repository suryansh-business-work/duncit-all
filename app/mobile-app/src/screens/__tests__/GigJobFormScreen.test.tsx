import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CreateGigJobDocument, UpdateGigJobDocument } from '@/graphql/gigs';
import { GigEventType, GigPosterRole } from '@/generated/graphql/graphql';
import { useGigContext } from '@/components/gigs/useGigContext';
import { useGigJob } from '@/components/gigs/useGigJob';
import { graphqlRequest } from '@/services/graphql.client';
import { GigJobFormScreen } from '@/screens/GigJobFormScreen';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
const mockReplace = jest.fn();
let mockParams: { id?: string } | undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockReplace }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/components/gigs/useGigContext', () => ({ useGigContext: jest.fn() }));
jest.mock('@/components/gigs/useGigJob', () => ({ useGigJob: jest.fn() }));
jest.mock('@/components/StackScreen', () => ({
  StackScreen: ({
    title,
    testID,
    children,
  }: {
    title: string;
    testID: string;
    children: unknown;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text, View } = require('react-native');
    return (
      <View testID={testID}>
        <Text testID="screen-title">{title}</Text>
        {children}
      </View>
    );
  },
}));
// The three field groups are tested on their own; here the form is judged by what it sends.
jest.mock('@/components/gigs/gig-form/GigWhatFields', () => ({
  GigWhatFields: ({
    posterRoles,
    categories,
    setValue,
  }: {
    posterRoles: string[];
    categories: unknown[];
    setValue: (name: string, value: unknown) => void;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable
        testID="what-stub"
        onPress={() => {
          setValue('title', 'Wedding DJ');
          setValue('category_id', 'cat1');
          setValue('roles', ['DJ']);
          setValue('location_id', 'loc1');
        }}
      >
        <Text>{`what:${posterRoles.join('+')}:${categories.length}`}</Text>
      </Pressable>
    );
  },
}));
jest.mock('@/components/gigs/gig-form/GigWhenWhereFields', () => ({
  GigWhenWhereFields: () => null,
}));
jest.mock('@/components/gigs/gig-form/GigContactFields', () => ({ GigContactFields: () => null }));

const contextMock = jest.mocked(useGigContext);
const jobMock = jest.mocked(useGigJob);
const request = jest.mocked(graphqlRequest) as unknown as jest.Mock;

const VIEWER = {
  poster_roles: ['HOST'],
  is_freelancer: false,
  default_contact: { name: 'Asha', phone: '+91 99999 00000', email: 'asha@x.com' },
};

const JOB = {
  id: 'g1',
  title: 'Wedding DJ',
  description: '',
  category_id: 'cat1',
  category_title: 'Music',
  roles: ['DJ'],
  event_type: 'EVENT',
  event_date: null,
  city: 'Lucknow',
  location_id: 'loc1',
  locality: '',
  location: '',
  budget: null,
  openings: 1,
  status: 'OPEN',
  poster_role: 'HOST',
  poster_name: 'Asha',
  interest_count: 0,
  is_mine: true,
  viewer_interested: false,
  created_at: '2026-10-01T10:00:00Z',
  contact: { name: 'Asha', phone: '+91 99999 00000', email: '' },
};

const mount = ({
  params = undefined as { id?: string } | undefined,
  context = {},
  gig = {},
}: {
  params?: { id?: string };
  context?: Record<string, unknown>;
  gig?: Record<string, unknown>;
} = {}) => {
  mockParams = params;
  contextMock.mockReturnValue({
    categories: [{ id: 'cat1', title: 'Music', examples: ['DJ'] }],
    viewer: VIEWER,
    failed: false,
    loading: false,
    refetch: jest.fn(),
    ...context,
  } as unknown as ReturnType<typeof useGigContext>);
  jobMock.mockReturnValue({
    job: null,
    missing: false,
    failed: false,
    loading: false,
    refetch: jest.fn(),
    replace: jest.fn(),
    ...gig,
  } as unknown as ReturnType<typeof useGigJob>);
  renderWithProviders(<GigJobFormScreen />);
};

const submit = async () =>
  act(async () => {
    fireEvent.press(screen.getByTestId('gig-form-submit'));
  });

beforeEach(() => {
  jest.clearAllMocks();
  request.mockReset();
});

describe('GigJobFormScreen — what shows', () => {
  it('titles a new post and an edit, and only reads a gig when editing', () => {
    mount();
    expect(screen.getByTestId('screen-title')).toHaveTextContent('gigJobs.form.createTitle');
    expect(jobMock).toHaveBeenCalledWith('', false);
  });

  it('titles an edit as editing and reads that gig', () => {
    mount({ params: { id: 'g1' }, gig: { job: JOB } });
    expect(screen.getByTestId('screen-title')).toHaveTextContent('gigJobs.form.editTitle');
    expect(jobMock).toHaveBeenCalledWith('g1', true);
  });

  it('shows a spinner while the context loads', () => {
    mount({ context: { loading: true } });
    expect(screen.getByLabelText('mweb.a11y.loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('gig-form-submit')).toBeNull();
  });

  it('shows a spinner while the gig being edited loads', () => {
    mount({ params: { id: 'g1' } });
    expect(screen.getByLabelText('mweb.a11y.loading')).toBeOnTheScreen();
  });

  it('says the form could not load when the context failed', () => {
    mount({ context: { failed: true } });
    expect(screen.getByTestId('gig-form-failed')).toBeOnTheScreen();
  });

  it('says the form could not load when the gig being edited failed to load', () => {
    mount({ params: { id: 'g1' }, gig: { failed: true } });
    expect(screen.getByTestId('gig-form-failed')).toBeOnTheScreen();
  });

  it('says the viewer may not post when they have no posting role', () => {
    mount({ context: { viewer: { ...VIEWER, poster_roles: [] } } });
    expect(screen.getByTestId('gig-form-not-allowed')).toBeOnTheScreen();
  });

  it('says the viewer may not post when the viewer is unknown', () => {
    mount({ context: { viewer: null } });
    expect(screen.getByTestId('gig-form-not-allowed')).toBeOnTheScreen();
  });

  it('says the viewer may not edit a gig that is not theirs', () => {
    mount({ params: { id: 'g1' }, gig: { job: { ...JOB, is_mine: false } } });
    expect(screen.getByTestId('gig-form-not-allowed')).toBeOnTheScreen();
  });

  it('says the viewer may not edit a gig that does not exist', () => {
    mount({ params: { id: 'g1' }, gig: { missing: true } });
    expect(screen.getByTestId('gig-form-not-allowed')).toBeOnTheScreen();
  });

  it('shows the form with the viewer roles and the categories', () => {
    mount();
    expect(screen.getByText('gigJobs.form.intro')).toBeOnTheScreen();
    expect(screen.getByTestId('what-stub')).toHaveTextContent('what:HOST:1');
    expect(screen.getByLabelText('gigJobs.form.submitCreate')).toBeOnTheScreen();
  });

  it('words the button for an edit', () => {
    mount({ params: { id: 'g1' }, gig: { job: JOB } });
    expect(screen.getByLabelText('gigJobs.form.submitEdit')).toBeOnTheScreen();
  });
});

describe('GigJobFormScreen — saving', () => {
  it('refuses to send a post that is not filled in, and sends nothing', async () => {
    mount();
    await submit();
    await act(async () => undefined);
    expect(request).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('saves an edit with the gig values, typed for the request, and opens the gig', async () => {
    request.mockResolvedValue({ updateGigJob: { id: 'g1' } });
    mount({ params: { id: 'g1' }, gig: { job: JOB } });
    await submit();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('GigJobDetail', { id: 'g1' }));
    expect(request).toHaveBeenCalledTimes(1);
    const [doc, vars, options] = request.mock.calls[0];
    expect(doc).toBe(UpdateGigJobDocument);
    expect(options).toEqual({ auth: true });
    expect(vars.id).toBe('g1');
    expect(vars.input).toMatchObject({
      title: 'Wedding DJ',
      category_id: 'cat1',
      roles: ['DJ'],
      poster_role: GigPosterRole.Host,
      event_type: GigEventType.Event,
    });
  });

  it('saves a new post through the create mutation and opens the gig the server made', async () => {
    request.mockResolvedValue({ createGigJob: { id: 'g9' } });
    mount({ context: { viewer: { ...VIEWER, poster_roles: ['HOST'] } } });
    fireEvent.press(screen.getByTestId('what-stub'));
    await submit();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('GigJobDetail', { id: 'g9' }));
    const [doc, vars] = request.mock.calls[0];
    expect(doc).toBe(CreateGigJobDocument);
    expect(vars.input).toMatchObject({
      title: 'Wedding DJ',
      category_id: 'cat1',
      roles: ['DJ'],
      poster_role: GigPosterRole.Host,
      contact_name: 'Asha',
    });
    expect(vars).not.toHaveProperty('id');
  });

  it('says why the save failed and stays on the form', async () => {
    request.mockRejectedValue({ errors: [{ message: 'Title is not allowed' }] });
    mount({ params: { id: 'g1' }, gig: { job: JOB } });
    await submit();
    expect(await screen.findByTestId('gig-form-error')).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByTestId('gig-form-submit')).toBeEnabled();
  });

  it('says the generic sentence when the failure carries no message', async () => {
    request.mockRejectedValue(undefined);
    mount({ params: { id: 'g1' }, gig: { job: JOB } });
    await submit();
    expect(await screen.findByTestId('gig-form-error')).toHaveTextContent(
      'gigJobs.form.saveFailed',
    );
  });

  it('blocks a second send while the first is in flight', async () => {
    let finish: (value: unknown) => void = () => undefined;
    request.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    mount({ params: { id: 'g1' }, gig: { job: JOB } });
    await submit();
    expect(screen.getByTestId('gig-form-submit')).toBeDisabled();
    await act(async () => finish({ updateGigJob: { id: 'g1' } }));
  });
});
