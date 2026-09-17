import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  blankCreatePodForm,
  type CreatePodFormValues,
  type CreatePodLocation,
} from '../../create-pod.types';
import LocalityField from '../LocalityField';

// The device lookup has its own spec; stand it in so each test can say what the
// device answered, and when.
const device = vi.hoisted(() => ({
  detecting: false,
  failed: false,
  enabled: undefined as boolean | undefined,
  onFound: (_id: string, _zone: string): void => undefined,
}));
vi.mock('../useDeviceLocality', () => ({
  useDeviceLocality: (
    _locations: unknown,
    enabled: boolean,
    onFound: (id: string, zone: string) => void,
  ) => {
    device.enabled = enabled;
    device.onFound = onFound;
    return { detecting: device.detecting, failed: device.failed };
  },
}));

// The header picker has its own spec (drilldown, GPS, map). Stand it in with
// buttons for the three ways it hands a pick back.
vi.mock('../../../../../components/app-header/LocationDialog', () => ({
  default: ({
    open,
    draftLocationId,
    setDraftLocationId,
    setDraftZone,
    onApply,
    onAutoApply,
    onClose,
  }: {
    open: boolean;
    draftLocationId: string;
    setDraftLocationId: (id: string) => void;
    setDraftZone: (zone: string) => void;
    onApply: () => void;
    onAutoApply: (id: string, zone: string) => void;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="mock-location-dialog" data-draft={draftLocationId}>
        <button
          type="button"
          onClick={() => {
            setDraftLocationId('loc-lucknow');
            setDraftZone('Hazratganj');
          }}
        >
          draft-hazratganj
        </button>
        <button type="button" onClick={onApply}>
          apply
        </button>
        <button type="button" onClick={() => onAutoApply('loc-pune', 'Baner')}>
          auto-baner
        </button>
        <button type="button" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
}));

const lucknow: CreatePodLocation = {
  id: 'loc-lucknow',
  location_name: 'Lucknow',
  city: 'Lucknow',
  state: 'Uttar Pradesh',
  location_zones: [{ zone_name: 'Gomti Nagar' }, { zone_name: 'Hazratganj' }],
};
const pune: CreatePodLocation = {
  id: 'loc-pune',
  location_name: 'Pune',
  city: 'Pune',
  state: 'Maharashtra',
  location_zones: [{ zone_name: 'Baner' }],
};
const LOCATIONS = [lucknow, pune];

let formRef: ReturnType<typeof useForm<CreatePodFormValues, any, CreatePodFormValues>> | null = null;

function Harness({ initial = {} }: Readonly<{ initial?: Partial<CreatePodFormValues> }>) {
  const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
    defaultValues: { ...blankCreatePodForm, ...initial },
  });
  formRef = form;
  return <LocalityField form={form} locations={LOCATIONS} />;
}

const chip = () => screen.getByTestId('create-pod-locality-selected');
const press = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
  Object.assign(device, { detecting: false, failed: false, enabled: undefined });
  formRef = null;
});

describe('LocalityField', () => {
  it('asks the device for a fresh pod and says so while it looks', () => {
    device.detecting = true;

    render(<Harness />);

    expect(screen.getByRole('heading', { name: 'Locality' })).toBeInTheDocument();
    expect(screen.getByText('The clubs on the next step come from this area')).toBeInTheDocument();
    expect(device.enabled).toBe(true);
    expect(chip()).toHaveTextContent('Finding your locality…');
    expect(chip()).toHaveAttribute('aria-live', 'polite');
  });

  it('opens on the area the device found', () => {
    render(<Harness />);
    expect(chip()).toHaveTextContent('No location selected');

    act(() => device.onFound('loc-lucknow', 'Gomti Nagar'));

    expect(chip()).toHaveTextContent('Gomti Nagar, Lucknow');
    expect(formRef?.getValues()).toMatchObject({ location_id: 'loc-lucknow', locality: 'Gomti Nagar' });
  });

  it('keeps a resumed draft on its own area without asking the device', () => {
    render(<Harness initial={{ location_id: 'loc-lucknow', locality: 'Hazratganj' }} />);

    expect(device.enabled).toBe(false);
    expect(chip()).toHaveTextContent('Hazratganj, Lucknow');
  });

  it('asks the host to pick when the device cannot be placed', () => {
    device.failed = true;

    render(<Harness />);

    expect(screen.getByTestId('create-pod-locality-detect-failed')).toHaveTextContent(
      "We couldn't find your locality from this device. Use Edit location to choose it.",
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows no failure while the device lookup is fine', () => {
    render(<Harness />);

    expect(screen.queryByTestId('create-pod-locality-detect-failed')).not.toBeInTheDocument();
  });

  it('applies an edited draft from Edit location and closes the picker', () => {
    render(<Harness initial={{ location_id: 'loc-lucknow', locality: 'Gomti Nagar' }} />);

    fireEvent.click(screen.getByTestId('create-pod-edit-location'));
    expect(screen.getByTestId('mock-location-dialog')).toHaveAttribute('data-draft', 'loc-lucknow');
    press('draft-hazratganj');
    press('apply');

    expect(screen.queryByTestId('mock-location-dialog')).not.toBeInTheDocument();
    expect(chip()).toHaveTextContent('Hazratganj, Lucknow');
  });

  it('lets a pick made during the lookup win over its late answer', () => {
    device.detecting = true;
    render(<Harness />);

    fireEvent.click(screen.getByTestId('create-pod-edit-location'));
    press('auto-baner');
    act(() => device.onFound('loc-lucknow', 'Gomti Nagar'));

    expect(formRef?.getValues()).toMatchObject({ location_id: 'loc-pune', locality: 'Baner' });
  });

  it('closes the picker without changing the pod', () => {
    render(<Harness initial={{ location_id: 'loc-pune', locality: '' }} />);

    fireEvent.click(screen.getByTestId('create-pod-edit-location'));
    press('close');

    expect(screen.queryByTestId('mock-location-dialog')).not.toBeInTheDocument();
    // A city with no area picked reads as the city alone.
    expect(chip()).toHaveTextContent(/^Pune$/);
  });
});
