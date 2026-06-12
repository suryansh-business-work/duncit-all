import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useOnboardingFlow } from '@/components/survey-onboarding/useOnboardingFlow';

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
      default:
        return Promise.resolve({});
    }
  });
}

beforeEach(() => mockRequest.mockReset());

describe('useOnboardingFlow', () => {
  it('skips the survey to the meeting step when none is configured', async () => {
    route({ meeting: null, survey: null });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    await waitFor(() => expect(result.current.phase).toBe('category'));
    await act(async () => {
      await result.current.chooseCategory(SCOPE);
    });
    expect(result.current.phase).toBe('meeting');
  });

  it('walks the gate even when a meeting was already requested (request upserts)', async () => {
    route({ meeting: { id: 'm1' }, survey: null });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    expect(result.current.phase).toBe('category');
    await act(async () => {
      await result.current.chooseCategory(SCOPE);
    });
    expect(result.current.phase).toBe('meeting');
  });

  it('surfaces a category load error', async () => {
    route({ meeting: null, failSurvey: true });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    await waitFor(() => expect(result.current.phase).toBe('category'));
    await act(async () => {
      await result.current.chooseCategory(SCOPE);
    });
    expect(result.current.error).toBeTruthy();
  });

  it('validates required survey answers, then submits to the meeting step', async () => {
    route({ meeting: null, survey: SURVEY });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    await waitFor(() => expect(result.current.phase).toBe('category'));
    await act(async () => {
      await result.current.chooseCategory(SCOPE);
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
      await result.current.chooseCategory(SCOPE);
    });
    act(() => result.current.answer.toggle(SURVEY.questions[0] as never, 'A'));
    await act(async () => {
      await result.current.submitSurvey();
    });
    expect(result.current.error).toBeTruthy();
  });

  it('validates the meeting date, then requests with empty notes', async () => {
    route({ meeting: null, survey: null });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    await waitFor(() => expect(result.current.phase).toBe('category'));
    await act(async () => {
      await result.current.chooseCategory(SCOPE);
    });

    await act(async () => {
      await result.current.submitMeeting();
    });
    expect(result.current.error).toMatch(/date & time/);

    act(() => result.current.setWhen('2026-07-01 15:30'));
    await act(async () => {
      await result.current.submitMeeting();
    });
    expect(result.current.phase).toBe('done');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ input: expect.objectContaining({ notes: null }) }),
      { auth: true },
    );
  });

  it('surfaces a meeting request error', async () => {
    route({ meeting: null, survey: null, failMeeting: true });
    const { result } = renderHook(() => useOnboardingFlow('HOST' as never));
    await waitFor(() => expect(result.current.phase).toBe('category'));
    await act(async () => {
      await result.current.chooseCategory(SCOPE);
    });
    act(() => result.current.setWhen('2026-07-01 15:30'));
    await act(async () => {
      await result.current.submitMeeting();
    });
    expect(result.current.error).toBeTruthy();
  });
});
