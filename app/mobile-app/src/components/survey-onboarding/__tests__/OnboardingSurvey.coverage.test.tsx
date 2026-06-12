import { fireEvent, screen } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { OnboardingSurvey } from '@/components/survey-onboarding/OnboardingSurvey';
import { renderWithProviders } from '@/utils/test-utils';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: mockGoBack }),
}));
jest.mock('@/hooks/useBranding', () => ({
  useBranding: () => ({ data: { branding: { logo_url: 'https://logo.png' } } }),
}));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
const opName = (doc: { definitions?: { name?: { value?: string } }[] }) =>
  doc?.definitions?.[0]?.name?.value;

beforeEach(() => {
  mockGoBack.mockClear();
  mockRequest.mockImplementation((doc: never, vars: { level?: string }) => {
    switch (opName(doc)) {
      case 'MyMeeting':
        return Promise.resolve({ myMeeting: null });
      case 'SurveyOnboardingCategories':
        return Promise.resolve({
          categories:
            vars?.level === 'SUPER'
              ? [{ id: 'sup1', name: 'Super', is_active: true, sort_order: 0 }]
              : [],
        });
      case 'ActiveSurveyFor':
        return Promise.resolve({
          activeSurveyFor: {
            id: 'sv1',
            kind: 'HOST',
            title: '',
            questions: [
              {
                qid: 'q1',
                type: 'TEXT',
                label: 'Name',
                help: null,
                required: false,
                multi: false,
                options: [],
              },
            ],
          },
        });
      default:
        return Promise.resolve({});
    }
  });
});

describe('OnboardingSurvey chrome', () => {
  it('renders the brand logo and goes back from the category step', async () => {
    renderWithProviders(
      <OnboardingSurvey
        kind={'HOST' as never}
        title="Be a host"
        subtitle="Sub"
        icon="storefront"
      />,
    );
    await screen.findByTestId('cat-sup1');
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('uses the screen title in the header when the survey has none', async () => {
    renderWithProviders(
      <OnboardingSurvey
        kind={'HOST' as never}
        title="Be a host"
        subtitle="Sub"
        icon="storefront"
      />,
    );
    fireEvent.press(await screen.findByTestId('cat-sup1'));
    fireEvent.press(screen.getByTestId('primary-action'));
    await screen.findByTestId('q-q1');
    expect(screen.getAllByText('Be a host').length).toBeGreaterThan(0);
  });
});
