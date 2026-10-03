/**
 * Retry on the brand analytics alert. The hook's `error` is what the alert
 * shows; a retry that is refused again must leave that alert up and must not
 * escape as an unhandled promise rejection.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const apollo = vi.hoisted(() => ({ useQuery: vi.fn() }));
vi.mock('@apollo/client/react', () => apollo);

import { BrandAnalyticsPanel } from '../src/brand/analytics/BrandAnalyticsPanel';

describe('BrandAnalyticsPanel — Retry', () => {
  it('swallows a refused retry, keeping the alert with the reason on screen', async () => {
    const u = userEvent.setup();
    const refetch = vi.fn().mockRejectedValue(new Error('Still unavailable'));
    apollo.useQuery.mockReturnValue({ data: undefined, error: new Error('Analytics are down'), refetch });
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);

    try {
      render(<BrandAnalyticsPanel brandId="brand-42" />);
      await u.click(screen.getByTestId('brand-analytics-retry'));

      await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(unhandled).not.toHaveBeenCalled();
      expect(screen.getByTestId('brand-analytics-error')).toHaveTextContent('Analytics are down');
      expect(apollo.useQuery).toHaveBeenCalledWith(expect.anything(), {
        variables: { brand_doc_id: 'brand-42', days: 30 },
        fetchPolicy: 'cache-and-network',
      });
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });
});
