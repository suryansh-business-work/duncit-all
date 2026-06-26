import { act, renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useHostRequestFlow } from '@/components/survey-onboarding/useHostRequestFlow';

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
      qid: 'sec',
      type: 'SECTION',
      label: 'About',
      help: null,
      required: false,
      multi: false,
      options: [],
    },
    {
      qid: 'q1',
      type: 'MCQ',
      label: 'Pick many',
      help: null,
      required: true,
      multi: true,
      options: ['A', 'B'],
    },
    {
      qid: 'q2',
      type: 'TEXT',
      label: 'Your name',
      help: null,
      required: true,
      multi: false,
      options: [],
    },
    {
      qid: 'q3',
      type: 'TEXT',
      label: 'Anything else',
      help: null,
      required: false,
      multi: false,
      options: [],
    },
  ],
};

const SCOPE = { super_category_id: 's', category_id: 'c', sub_category_id: 'sb' };

function route({ survey = null, failSubmit = false }: { survey?: unknown; failSubmit?: boolean }) {
  mockRequest.mockImplementation((doc: never) => {
    switch (opName(doc)) {
      case 'ActiveSurveyFor':
        return Promise.resolve({ activeSurveyFor: survey });
      case 'SubmitHostRequest':
        return failSubmit
          ? Promise.reject(new Error('You already have an active request for this category'))
          : Promise.resolve({ submitHostRequest: { id: 'hr1' } });
      default:
        return Promise.resolve({});
    }
  });
}

beforeEach(() => mockRequest.mockReset());

describe('useHostRequestFlow', () => {
  it('submits straight to success when no survey is configured', async () => {
    route({ survey: null });
    const { result } = renderHook(() => useHostRequestFlow());
    await act(async () => {
      await result.current.chooseCategory(SCOPE);
    });
    expect(result.current.phase).toBe('success');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: expect.objectContaining({
          super_category_id: 's',
          category_id: 'c',
          sub_category_id: 'sb',
          survey_id: null,
          answers: [],
        }),
      }),
      { auth: true },
    );
  });

  it('coalesces empty taxonomy ids to null', async () => {
    route({ survey: null });
    const { result } = renderHook(() => useHostRequestFlow());
    await act(async () => {
      await result.current.chooseCategory({
        super_category_id: '',
        category_id: '',
        sub_category_id: '',
      });
    });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: expect.objectContaining({
          super_category_id: null,
          category_id: null,
          sub_category_id: null,
        }),
      }),
      { auth: true },
    );
  });

  it('surfaces an error when category resolution / direct submit fails', async () => {
    route({ survey: null, failSubmit: true });
    const { result } = renderHook(() => useHostRequestFlow());
    await act(async () => {
      await result.current.chooseCategory(SCOPE);
    });
    expect(result.current.phase).toBe('category');
    expect(result.current.error).toMatch(/already have an active request/i);
  });

  it('goes to the survey step when one is configured', async () => {
    route({ survey: SURVEY });
    const { result } = renderHook(() => useHostRequestFlow());
    await act(async () => {
      await result.current.chooseCategory(SCOPE);
    });
    expect(result.current.phase).toBe('survey');
    expect(result.current.survey?.id).toBe('sv1');
  });

  it('validates required survey answers before submitting', async () => {
    route({ survey: SURVEY });
    const { result } = renderHook(() => useHostRequestFlow());
    await act(async () => {
      await result.current.chooseCategory(SCOPE);
    });
    await act(async () => {
      await result.current.submitSurvey();
    });
    expect(result.current.error).toMatch(/Please answer: Pick many/);
    expect(result.current.phase).toBe('survey');
  });

  it('validates a required text answer (non-multi branch)', async () => {
    route({ survey: SURVEY });
    const { result } = renderHook(() => useHostRequestFlow());
    await act(async () => {
      await result.current.chooseCategory(SCOPE);
    });
    // Satisfy the required multi MCQ, leave the required TEXT empty.
    act(() => result.current.answer.toggle(SURVEY.questions[1] as never, 'A'));
    await act(async () => {
      await result.current.submitSurvey();
    });
    expect(result.current.error).toMatch(/Please answer: Your name/);
    expect(result.current.phase).toBe('survey');
  });

  it('submits the survey (multi + text answers) to success', async () => {
    route({ survey: SURVEY });
    const { result } = renderHook(() => useHostRequestFlow());
    await act(async () => {
      await result.current.chooseCategory(SCOPE);
    });
    act(() => result.current.answer.toggle(SURVEY.questions[1] as never, 'A'));
    act(() => result.current.answer.toggle(SURVEY.questions[1] as never, 'B'));
    act(() => result.current.answer.toggle(SURVEY.questions[1] as never, 'A'));
    act(() => result.current.answer.set('q2', { value: 'Asha' }));
    await act(async () => {
      await result.current.submitSurvey();
    });
    expect(result.current.phase).toBe('success');
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        input: expect.objectContaining({
          survey_id: 'sv1',
          answers: [
            { qid: 'q1', values: ['B'] },
            { qid: 'q2', value: 'Asha' },
            { qid: 'q3', value: '' },
          ],
        }),
      }),
      { auth: true },
    );
  });

  it('surfaces a CONFLICT error from submitHostRequest', async () => {
    route({ survey: SURVEY, failSubmit: true });
    const { result } = renderHook(() => useHostRequestFlow());
    await act(async () => {
      await result.current.chooseCategory(SCOPE);
    });
    act(() => result.current.answer.toggle(SURVEY.questions[1] as never, 'A'));
    act(() => result.current.answer.set('q2', { value: 'Asha' }));
    await act(async () => {
      await result.current.submitSurvey();
    });
    expect(result.current.phase).toBe('survey');
    expect(result.current.error).toMatch(/already have an active request/i);
  });

  it('exposes the chosen answer via get', async () => {
    route({ survey: SURVEY });
    const { result } = renderHook(() => useHostRequestFlow());
    await waitFor(() => expect(result.current.phase).toBe('category'));
    expect(result.current.answer.get('missing')).toEqual({ value: '', values: [] });
  });
});
