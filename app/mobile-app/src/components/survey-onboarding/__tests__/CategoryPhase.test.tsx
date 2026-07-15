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
    expect(onContinue).toHaveBeenCalledWith(
      { super_category_id: 'sup1', category_id: 'c1', sub_category_id: 'sb1' },
      { super: 'Banana', category: 'Cat', sub: 'Sub' },
    );
  });

  it('blocks Continue with a Super Category message when nothing is picked', async () => {
    routeLevels();
    const onContinue = jest.fn();
    renderWithProviders(<CategoryPhase busy={false} error={null} onContinue={onContinue} />);
    await screen.findByTestId('cat-sup1');

    fireEvent.press(screen.getByTestId('primary-action'));
    expect(await screen.findByTestId('category-error')).toHaveTextContent(
      'Please select a Super Category.',
    );
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('requires a Category once a Super is picked, then a Sub once a Category is picked', async () => {
    routeLevels();
    const onContinue = jest.fn();
    renderWithProviders(<CategoryPhase busy={false} error={null} onContinue={onContinue} />);

    // Super picked, category offered but unpicked → category message.
    fireEvent.press(await screen.findByTestId('cat-sup1'));
    await screen.findByTestId('cat-c1');
    fireEvent.press(screen.getByTestId('primary-action'));
    expect(await screen.findByTestId('category-error')).toHaveTextContent(
      'Please select a Category.',
    );
    expect(onContinue).not.toHaveBeenCalled();

    // Category picked, sub offered but unpicked → sub message.
    fireEvent.press(screen.getByTestId('cat-c1'));
    await screen.findByTestId('cat-sb1');
    fireEvent.press(screen.getByTestId('primary-action'));
    expect(await screen.findByTestId('category-error')).toHaveTextContent(
      'Please select a Sub-Category.',
    );
    expect(onContinue).not.toHaveBeenCalled();

    // Sub picked → continues with the full scope (validation error cleared on pick).
    fireEvent.press(screen.getByTestId('cat-sb1'));
    expect(screen.queryByTestId('category-error')).toBeNull();
    fireEvent.press(screen.getByTestId('primary-action'));
    expect(onContinue).toHaveBeenCalledWith(
      { super_category_id: 'sup1', category_id: 'c1', sub_category_id: 'sb1' },
      { super: 'Banana', category: 'Cat', sub: 'Sub' },
    );
  });

  it('continues with only a super when no deeper levels are offered', async () => {
    mockRequest.mockImplementation((_doc: never, vars: { level?: string }) =>
      Promise.resolve({
        categories: vars?.level === 'SUPER' ? [cat('only', 'Only')] : [],
      }),
    );
    const onContinue = jest.fn();
    renderWithProviders(<CategoryPhase busy={false} error={null} onContinue={onContinue} />);
    fireEvent.press(await screen.findByTestId('cat-only'));
    fireEvent.press(screen.getByTestId('primary-action'));
    expect(onContinue).toHaveBeenCalledWith(
      { super_category_id: 'only', category_id: '', sub_category_id: '' },
      { super: 'Only', category: '', sub: '' },
    );
  });

  it('disables already-held options and blocks picking them', async () => {
    routeLevels();
    const onContinue = jest.fn();
    renderWithProviders(
      <CategoryPhase busy={false} error={null} onContinue={onContinue} disabledIds={['sup1']} />,
    );
    const held = await screen.findByTestId('cat-sup1');
    expect(held).toBeDisabled();
    fireEvent.press(held);
    // A held leaf is non-pressable: no category list loads beneath it.
    expect(screen.queryByTestId('cat-c1')).toBeNull();
    // A sibling stays enabled and selectable.
    fireEvent.press(await screen.findByTestId('cat-sup2'));
    expect(await screen.findByTestId('cat-c1')).toBeOnTheScreen();
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
