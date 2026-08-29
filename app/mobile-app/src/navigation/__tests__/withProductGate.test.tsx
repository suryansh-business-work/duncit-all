import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';

import { withProductGate } from '@/navigation/withProductGate';
import { useFeatureFlagsStore } from '@/stores/feature-flags.store';

const mockNavigate = jest.fn();
let mockReady = true;
jest.mock('@/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: () => mockReady,
    navigate: (name: string) => mockNavigate(name),
  },
}));

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRequest = require('@/services/graphql.client').graphqlRequest as jest.Mock;

function Shop({ label }: Readonly<{ label: string }>) {
  return <Text testID="shop">{label}</Text>;
}
const GatedShop = withProductGate(Shop);

const flags = (enabled: boolean) => ({
  publicFeatureFlags: [{ key: 'is_product_visible', enabled }],
});

beforeEach(() => {
  mockNavigate.mockClear();
  mockReady = true;
  mockRequest.mockReset();
  useFeatureFlagsStore.getState().reset();
});

describe('withProductGate', () => {
  it('renders the screen, with its props, once products are on', async () => {
    mockRequest.mockResolvedValue(flags(true));
    render(<GatedShop label="Pod Shop" />);
    expect(await screen.findByTestId('shop')).toHaveTextContent('Pod Shop');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('sends the visitor Home when products are off', async () => {
    mockRequest.mockResolvedValue(flags(false));
    render(<GatedShop label="Pod Shop" />);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Home'));
    expect(screen.queryByTestId('shop')).toBeNull();
  });

  it('waits on the pending flag set instead of bouncing a product deep link', async () => {
    // The answer never lands, so the gate only ever sees `pending`.
    mockRequest.mockReturnValue(new Promise(() => undefined));
    render(<GatedShop label="Pod Shop" />);
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.queryByTestId('shop')).toBeNull();
  });

  it('does not navigate before the container is ready', async () => {
    mockReady = false;
    mockRequest.mockResolvedValue(flags(false));
    render(<GatedShop label="Pod Shop" />);
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('names itself after the screen it wraps, for the navigator tree', () => {
    expect(GatedShop.displayName).toBe('withProductGate(Shop)');
  });
});
