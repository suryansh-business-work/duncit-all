import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useOnboardingFlow } from '@/components/survey-onboarding/useOnboardingFlow';
import { useOnboardingDraftStore } from '@/stores/onboarding-draft.store';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
const opName = (doc: { definitions?: { name?: { value?: string } }[] }) =>
  doc?.definitions?.[0]?.name?.value;

const SURVEY = {
  id: 'sv1',
  kind: 'HOST',
  title: 'T',
  questions: [
    {
      qid: 'q1',
      type: 'MCQ',
      label: 'Pick',
      help: null,
      required: true,
      multi: true,
      options: ['A', 'B'],
    },
  ],
};

const SCOPE = { super_category_id: 's', category_id: '', sub_category_id: '' };
const FULL_SCOPE = { super_category_id: 's', category_id: 'c', sub_category_id: 'sb' };
const LABELS = { super: 'Sports', category: 'Cricket', sub: 'Box' };

function route({
  meeting = null,
  survey = undefined,
  failSurvey = false,
  failSubmit = false,
  failMeeting = false,
}: {
  meeting?: unknown;
  survey?: unknown;
  failSurvey?: boolean;
  failSubmit?: boolean;
  failMeeting?: boolean;
} = {}) {
  mockRequest.mockImplementation((doc: never) => {
    switch (opName(doc)) {
      case 'MyMeeting':
        return Promise.resolve({ myMeeting: meeting });
      case 'ActiveSurveyFor':
        return failSurvey
          ? Promise.reject(new Error('x'))
          : Promise.resolve({ activeSurveyFor: survey });
      case 'SubmitSurveyResponse':
        return failSubmit
          ? Promise.reject(new Error('x'))
          : Promise.resolve({ submitSurveyResponse: {} });
      case 'RequestMeeting':
        return failMeeting
          ? Promise.reject(new Error('x'))
          : Promise.resolve({ requestMeeting: { id: 'm1' } });
      case 'MeetingSlots':
        return Promise.resolve({
          meetingSlots: [
            {
              start_at: '2027-01-04T04:30:00.000Z',
              end_at: '2027-01-04T05:00:00.000Z',
              available: true,
            },
            {
              start_at: '2027-01-04T05:00:00.000Z',
              end_at: '2027-01-04T05:30:00.000Z',
              available: false,
            },
          ],
        });
      default:
        return Promise.resolve({});
    }
  });
}

beforeEach(() => mockRequest.mockReset());

describe('useOnboardingFlow', () => {
  it('prefills name, phone and extension from the signed-in profile', async () => {
    route({ meeting: null, survey: null });
    const { useMeStore } = jest.requireActual('@/stores/me.store');
    useMeStore.setState({
      data: {
        me: {
          user_id: 'u1',
          full_name: 'Asha Roy',
          phone_number: '9876543210',
          phone_extension: '+92',
          roles: [],
        },
      },
    });
    try {
      const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
      await waitFor(() => expect(result.current.name).toBe('Asha Roy'));
      expect(result.current.phone).toBe('9876543210');
      expect(result.current.ext).toBe('+92');
      expect(result.current.hasProfilePhone).toBe(true);
      expect(result.current.lockName).toBe(true);
    } finally {
      useMeStore.getState().reset();
    }
  });

  it('leaves the contact fields editable when the profile has no name or phone', async () => {
    route({ meeting: null, survey: null });
    const { useMeStore } = jest.requireActual('@/stores/me.store');
    useMeStore.setState({
      data: {
        me: { user_id: 'u2', full_name: '', phone_number: ' ', phone_extension: '', roles: [] },
      },
    });
    try {
      const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
      await waitFor(() => expect(result.current.phase).toBe('category'));
      expect(result.current.name).toBe('');
      expect(result.current.phone).toBe('');
      expect(result.current.ext).toBe('+91');
      expect(result.current.hasProfilePhone).toBe(false);
      expect(result.current.lockName).toBe(false);
    } finally {
      useMeStore.getState().reset();
    }
  });

  it('keeps the default extension when the profile phone has none', async () => {
    route({ meeting: null, survey: null });
    const { useMeStore } = jest.requireActual('@/stores/me.store');
    useMeStore.setState({
      data: {
        me: {
          user_id: 'u3',
          full_name: 'Asha Roy',
          phone_number: '9876543210',
          phone_extension: null,
          roles: [],
        },
      },
    });
    try {
      const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
      await waitFor(() => expect(result.current.phone).toBe('9876543210'));
      expect(result.current.ext).toBe('+91');
    } finally {
      useMeStore.getState().reset();
    }
  });

  it('skips the survey to the meeting step (and loads slots) when none is configured', async () => {
    route({ meeting: null, survey: null });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    await waitFor(() => expect(result.current.phase).toBe('category'));
    await act(async () => {
      await result.current.chooseCategory(SCOPE, LABELS);
    });
    expect(result.current.phase).toBe('meeting');
    await waitFor(() => expect(result.current.slots).toHaveLength(2));
    expect(result.current.slots[1]?.available).toBe(false);
  });

  it('captures the chosen category labels and can return to the category step to edit', async () => {
    route({ meeting: null, survey: null });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    await waitFor(() => expect(result.current.phase).toBe('category'));
    await act(async () => {
      await result.current.chooseCategory(FULL_SCOPE, LABELS);
    });
    expect(result.current.phase).toBe('meeting');
    expect(result.current.labels).toEqual(LABELS);
    expect(result.current.scope).toEqual(FULL_SCOPE);
    act(() => result.current.goToCategory());
    expect(result.current.phase).toBe('category');
  });

  it('walks the gate even when a meeting was already requested (request upserts)', async () => {
    route({ meeting: { id: 'm1' }, survey: null });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    expect(result.current.phase).toBe('category');
    await act(async () => {
      await result.current.chooseCategory(SCOPE, LABELS);
    });
    expect(result.current.phase).toBe('meeting');
  });

  it('surfaces a category load error', async () => {
    route({ meeting: null, failSurvey: true });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    await waitFor(() => expect(result.current.phase).toBe('category'));
    await act(async () => {
      await result.current.chooseCategory(SCOPE, LABELS);
    });
    expect(result.current.error).toBeTruthy();
  });

  it('validates required survey answers, then submits to the meeting step', async () => {
    route({ meeting: null, survey: SURVEY });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    await waitFor(() => expect(result.current.phase).toBe('category'));
    await act(async () => {
      await result.current.chooseCategory(SCOPE, LABELS);
    });
    expect(result.current.phase).toBe('survey');

    await act(async () => {
      await result.current.submitSurvey();
    });
    expect(result.current.error).toMatch(/Please answer/);

    act(() => result.current.answer.toggle(SURVEY.questions[0] as never, 'A'));
    await act(async () => {
      await result.current.submitSurvey();
    });
    expect(result.current.phase).toBe('meeting');
  });

  it('no-ops submitSurvey when no survey is loaded', async () => {
    route({ meeting: null, survey: null });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    await waitFor(() => expect(result.current.phase).toBe('category'));
    await act(async () => {
      await result.current.submitSurvey();
    });
    expect(result.current.phase).toBe('meeting');
  });

  it('surfaces a survey submit error', async () => {
    route({ meeting: null, survey: SURVEY, failSubmit: true });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    await waitFor(() => expect(result.current.phase).toBe('category'));
    await act(async () => {
      await result.current.chooseCategory(SCOPE, LABELS);
    });
    act(() => result.current.answer.toggle(SURVEY.questions[0] as never, 'A'));
    await act(async () => {
      await result.current.submitSurvey();
    });
    expect(result.current.error).toBeTruthy();
  });

  it('requires a slot and a phone, then books and keeps the slot for the thank-you', async () => {
    route({ meeting: null, survey: null });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    await waitFor(() => expect(result.current.phase).toBe('category'));
    await act(async () => {
      await result.current.chooseCategory(SCOPE, LABELS);
    });

    await act(async () => {
      await result.current.submitMeeting();
    });
    expect(result.current.error).toMatch(/slot/i);

    act(() => result.current.setSelectedSlot('2027-01-04T04:30:00.000Z'));
    await act(async () => {
      await result.current.submitMeeting();
    });
    expect(result.current.error).toMatch(/phone/i);

    act(() => result.current.setPhone('9876543210'));
    await act(async () => {
      await result.current.submitMeeting();
    });
    expect(result.current.phase).toBe('done');
    expect(result.current.bookedSlot).toBe('2027-01-04T04:30:00.000Z');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: expect.objectContaining({
          requested_at: '2027-01-04T04:30:00.000Z',
          contact_phone: '+91 9876543210',
          contact_name: null,
          notes: null,
          // Super present; empty category/sub coalesce to null.
          super_category_id: 's',
          category_id: null,
          sub_category_id: null,
        }),
      }),
      { auth: true },
    );
  });

  it('coalesces an empty super-category to null in the meeting request', async () => {
    route({ meeting: null, survey: null });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    await waitFor(() => expect(result.current.phase).toBe('category'));
    await act(async () => {
      await result.current.chooseCategory(
        {
          super_category_id: '',
          category_id: '',
          sub_category_id: '',
        },
        LABELS,
      );
    });
    act(() => result.current.setSelectedSlot('2027-01-04T04:30:00.000Z'));
    act(() => result.current.setPhone('9876543210'));
    await act(async () => {
      await result.current.submitMeeting();
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: expect.objectContaining({ super_category_id: null }),
      }),
      { auth: true },
    );
  });

  it('forwards the full chosen taxonomy into the meeting request', async () => {
    route({ meeting: null, survey: null });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    await waitFor(() => expect(result.current.phase).toBe('category'));
    await act(async () => {
      await result.current.chooseCategory(FULL_SCOPE, LABELS);
    });
    act(() => result.current.setSelectedSlot('2027-01-04T04:30:00.000Z'));
    act(() => result.current.setPhone('9876543210'));
    await act(async () => {
      await result.current.submitMeeting();
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: expect.objectContaining({
          super_category_id: 's',
          category_id: 'c',
          sub_category_id: 'sb',
        }),
      }),
      { auth: true },
    );
  });

  it('surfaces a booking error and refreshes the slot grid', async () => {
    route({ meeting: null, survey: null, failMeeting: true });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    await waitFor(() => expect(result.current.phase).toBe('category'));
    await act(async () => {
      await result.current.chooseCategory(SCOPE, LABELS);
    });
    act(() => result.current.setSelectedSlot('2027-01-04T04:30:00.000Z'));
    act(() => result.current.setPhone('9876543210'));
    act(() => result.current.setName('Asha'));
    await act(async () => {
      await result.current.submitMeeting();
    });
    expect(result.current.error).toBeTruthy();
    expect(result.current.phase).toBe('meeting');
  });

  it('restores a saved draft (step, category, survey and answers) on re-mount', async () => {
    route({ meeting: null, survey: SURVEY });
    useOnboardingDraftStore.getState().setDraft('HOST' as never, {
      phase: 'survey',
      scope: FULL_SCOPE,
      survey: SURVEY as never,
      answers: { q1: { value: '', values: ['A'] } },
    });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    expect(result.current.phase).toBe('survey');
    expect(result.current.survey?.id).toBe('sv1');
    expect(result.current.answer.get('q1').values).toEqual(['A']);
  });

  it('clears the saved draft once the meeting is booked', async () => {
    route({ meeting: null, survey: null });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    await waitFor(() => expect(result.current.phase).toBe('category'));
    await act(async () => {
      await result.current.chooseCategory(SCOPE, LABELS);
    });
    act(() => result.current.setSelectedSlot('2027-01-04T04:30:00.000Z'));
    act(() => result.current.setPhone('9876543210'));
    await act(async () => {
      await result.current.submitMeeting();
    });
    expect(result.current.phase).toBe('done');
    expect(useOnboardingDraftStore.getState().getDraft('HOST' as never)).toBeUndefined();
  });

  it('surfaces a slot load failure', async () => {
    route({ meeting: null, survey: null });
    mockRequest.mockImplementation((doc: never) => {
      if (opName(doc) === 'MeetingSlots') return Promise.reject(new Error('slots down'));
      if (opName(doc) === 'ActiveSurveyFor') return Promise.resolve({ activeSurveyFor: null });
      return Promise.resolve({});
    });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    await act(async () => {
      await result.current.chooseCategory(SCOPE, LABELS);
    });
    await waitFor(() => expect(result.current.error).toMatch(/slots/i));
  });
});
