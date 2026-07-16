import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import * as dialogIndex from './index';
import { useServiceDetails, type ServiceDetails } from './useServiceDetails';
import type { StatusService } from '../../types';

vi.mock('./useServiceDetails', () => ({ useServiceDetails: vi.fn() }));

const ServiceDetailsDialog = dialogIndex.ServiceDetailsDialog;

const service: StatusService = {
  key: 'api',
  name: 'API',
  url: 'https://a.test',
  description: 'Core API',
  health: 'https://a.test/health',
};

const details = (over: Partial<ServiceDetails> = {}): ServiceDetails => ({
  probe: null,
  probeError: null,
  health: null,
  healthError: false,
  history: null,
  historyError: false,
  ...over,
});

afterEach(() => vi.clearAllMocks());

describe('ServiceDetailsDialog', () => {
  it('re-exports the dialog and hook from the index', () => {
    expect(typeof dialogIndex.ServiceDetailsDialog).toBe('function');
    expect(dialogIndex.useServiceDetails).toBeDefined();
  });

  it('is closed when no service is selected', () => {
    vi.mocked(useServiceDetails).mockReturnValue(details());
    render(<ServiceDetailsDialog service={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows an operational dot and the health section for a healthy probe', () => {
    vi.mocked(useServiceDetails).mockReturnValue(
      details({ probe: { url: 'x', ok: true, statusCode: 200, statusText: 'OK', ssl: null } }),
    );
    render(<ServiceDetailsDialog service={service} onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'API' })).toBeTruthy();
    expect(screen.getByText('Server health')).toBeTruthy();
    expect(screen.getByText('200 OK')).toBeTruthy();
  });

  it('shows an error dot when the probe is down', () => {
    vi.mocked(useServiceDetails).mockReturnValue(
      details({ probe: { url: 'x', ok: false, statusCode: 500, statusText: 'Err', ssl: null } }),
    );
    render(<ServiceDetailsDialog service={service} onClose={vi.fn()} />);
    expect(screen.getByText('500 Err')).toBeTruthy();
  });

  it('shows an error dot when probing errored', () => {
    vi.mocked(useServiceDetails).mockReturnValue(details({ probeError: 'timeout' }));
    render(<ServiceDetailsDialog service={service} onClose={vi.fn()} />);
    expect(screen.getByText('timeout')).toBeTruthy();
  });

  it('hides the health section for a service without a health endpoint', () => {
    vi.mocked(useServiceDetails).mockReturnValue(details());
    render(<ServiceDetailsDialog service={{ ...service, health: undefined }} onClose={vi.fn()} />);
    expect(screen.queryByText('Server health')).toBeNull();
  });

  it('calls onClose from the close button', () => {
    vi.mocked(useServiceDetails).mockReturnValue(details());
    const onClose = vi.fn();
    render(<ServiceDetailsDialog service={service} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close details'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
