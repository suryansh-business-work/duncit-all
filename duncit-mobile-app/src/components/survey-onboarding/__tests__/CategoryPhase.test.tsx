import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { CategoryPhase } from '@/components/survey-onboarding/CategoryPhase';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

const cat = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id,
  name,
  is_active: true,
  sort_order: 0,
  ...over,
});

beforeEach(() => mockRequest.mockReset());

function routeLevels() {
  mockRequest.mockImplementation((_doc: never, vars: { level?: string }) => {
    if (vars?.level === 'SUPER')
      return Promise.resolve({
        categories: [
          // Two entries without sort_order get compared against each other, so
          // both the `a.` and `b.sort_order ?? 0` fallbacks are exercised.
          cat('sup3', 'Cherry', { sort_order: undefined }),
          cat('sup4', 'Date', { sort_order: undefined }),
          cat('sup1', 'Banana', { sort_order: 1 }),
          cat('sup2', 'Apple', { sort_order: 1 }),
          cat('sup0', 'Hidden', { is_active: false }),
        ],
      });
    if (vars?.level === 'CATEGORY') return Promise.resolve({ categories: [cat('c1', 'Cat')] });
    if (vars?.level === 'SUB') return Promise.resolve({ categories: [cat('sb1', 'Sub')] });
    return Promise.resolve({ categories: [] });
  });
}

describe('CategoryPhase', () => {
  it('drills super → category → sub, filtering inactive entries, then continues', async () => {
    routeLevels();
    const onContinue = jest.fn();
    renderWithProviders(<CategoryPhase busy={false} error={null} onContinue={onContinue} />);

    fireEvent.press(await screen.findByTestId('cat-sup1'));
    fireEvent.press(await screen.findByTestId('cat-c1'));
    fireEvent.press(await screen.findByTestId('cat-sb1'));
    expect(screen.queryByTestId('cat-sup0')).toBeNull(); // inactive filtered out

    fireEvent.press(screen.getByTestId('primary-action'));
    expect(onContinue).toHaveBeenCalledWith({
      super_category_id: 'sup1',
      category_id: 'c1',
      sub_category_id: 'sb1',
    });
  });

  it('coalesces a missing categories list to empty', async () => {
    mockRequest.mockImplementation(() => Promise.resolve({})); // no `categories` field
    renderWithProviders(<CategoryPhase busy={false} error={null} onContinue={jest.fn()} />);
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(screen.queryByTestId('cat-sup1')).toBeNull();
  });

  it('shows the error message and tolerates a load failure', async () => {
    mockRequest.mockRejectedValue(new Error('down'));
    renderWithProviders(
      <CategoryPhase busy={false} error="Pick a category" onContinue={jest.fn()} />,
    );
    expect(screen.getByText('Pick a category')).toBeOnTheScreen();
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
  });

  it('ignores categories that resolve after unmount', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    mockRequest.mockImplementation((_doc: never, vars: { level?: string }) =>
      vars?.level === 'SUPER'
        ? new Promise((r) => {
            resolve = r;
          })
        : Promise.resolve({ categories: [] }),
    );
    const { unmount } = renderWithProviders(
      <CategoryPhase busy={false} error={null} onContinue={jest.fn()} />,
    );
    unmount();
    await act(async () => {
      resolve({ categories: [cat('sup1', 'Super')] });
    });
    expect(mockRequest).toHaveBeenCalled();
  });
});
