import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('../../../src/pages/connect/ConsentPanel', () => ({
  default: ({ requestId }: { requestId: string }) => <div data-testid="consent">consent:{requestId}</div>,
}));
vi.mock('../../../src/pages/connect/ConnectorsPanel', () => ({
  default: () => <div data-testid="connectors">connectors</div>,
}));

import ConnectPage from '../../../src/pages/connect/ConnectPage';

const renderAt = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <ConnectPage />
    </MemoryRouter>,
  );

describe('ConnectPage', () => {
  it('is the consent screen for the request the server sent the person here with', () => {
    renderAt('/connect?request=abc123');
    expect(screen.getByTestId('consent')).toHaveTextContent('consent:abc123');
    expect(screen.queryByTestId('connectors')).not.toBeInTheDocument();
  });

  it('lists the connectors when there is no request to answer', () => {
    renderAt('/connect');
    expect(screen.getByTestId('connectors')).toBeInTheDocument();
    expect(screen.queryByTestId('consent')).not.toBeInTheDocument();
  });

  it('treats an empty request parameter as no request', () => {
    renderAt('/connect?request=');
    expect(screen.getByTestId('connectors')).toBeInTheDocument();
  });
});
