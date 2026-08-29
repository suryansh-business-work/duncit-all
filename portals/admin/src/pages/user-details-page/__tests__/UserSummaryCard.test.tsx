import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { formatDateTime } from '@duncit/app-settings';
import UserSummaryCard from '../UserSummaryCard';
import type { EditForm } from '../queries';
import { renderWithProviders } from './testkit';

const form = (over: Partial<EditForm> = {}): EditForm => ({
  first_name: 'Riya',
  last_name: 'Sharma',
  email: 'riya@example.com',
  phone_extension: '+91',
  phone_number: '9876543210',
  whatsapp_extension: '+91',
  whatsapp_number: '9998887776',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
  zone: 'West',
  assigned_city: 'Pune',
  assigned_zones: 'West, North',
  bio: 'Loves pods',
  profile_photo: '',
  status: 'ACTIVE',
  ...over,
});

const user = (over: Record<string, unknown> = {}) => ({
  email: 'riya@example.com',
  phone_extension: '+91',
  phone_number: '9876543210',
  whatsapp_extension: '+91',
  whatsapp_number: '9998887776',
  city: 'Pune',
  zone: 'West',
  assigned_city: 'Pune',
  assigned_zones: ['West', 'North'],
  is_email_verified: false,
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-02T00:00:00.000Z',
  ...over,
});

/** Finds the value cell for the row whose label cell reads `label`. */
const rowValue = (label: string) => {
  const cell = screen.getByText(label).closest('tr');
  if (!cell) throw new Error(`No row for ${label}`);
  return within(cell).getAllByRole('cell')[1];
};

describe('UserSummaryCard — name and photo', () => {
  it('shows the full name and the busy-aware photo button label', () => {
    renderWithProviders(
      <UserSummaryCard user={user()} form={form()} busy={false} onPhotoChange={vi.fn()} />,
    );

    expect(screen.getByText('Riya Sharma')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update Photo' })).toBeInTheDocument();
  });

  it('shows "Updating..." on the photo button while busy', () => {
    renderWithProviders(
      <UserSummaryCard user={user()} form={form()} busy onPhotoChange={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Updating...' })).toBeInTheDocument();
  });

  it("shows the first letter of the first name in the avatar", () => {
    const { container } = renderWithProviders(
      <UserSummaryCard user={user()} form={form({ first_name: 'meera' })} busy={false} onPhotoChange={vi.fn()} />,
    );

    expect(container.querySelector('.MuiAvatar-root')).toHaveTextContent('M');
  });

  it('falls back to "?" in the avatar when there is no first name', () => {
    const { container } = renderWithProviders(
      <UserSummaryCard user={user()} form={form({ first_name: '' })} busy={false} onPhotoChange={vi.fn()} />,
    );

    expect(container.querySelector('.MuiAvatar-root')).toHaveTextContent('?');
  });
});

describe('UserSummaryCard — status chip and verified badge', () => {
  it('shows the human status label for each status', () => {
    const { rerender } = renderWithProviders(
      <UserSummaryCard user={user()} form={form({ status: 'ACTIVE' })} busy={false} onPhotoChange={vi.fn()} />,
    );
    expect(screen.getByText('Active')).toBeInTheDocument();

    rerender(<UserSummaryCard user={user()} form={form({ status: 'INACTIVE' })} busy={false} onPhotoChange={vi.fn()} />);
    expect(screen.getByText('Inactive')).toBeInTheDocument();

    rerender(<UserSummaryCard user={user()} form={form({ status: 'SUSPENDED' })} busy={false} onPhotoChange={vi.fn()} />);
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('shows a Verified badge only when the email is verified', () => {
    renderWithProviders(
      <UserSummaryCard user={user({ is_email_verified: true })} form={form()} busy={false} onPhotoChange={vi.fn()} />,
    );
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('hides the Verified badge when the email is not verified', () => {
    renderWithProviders(
      <UserSummaryCard user={user({ is_email_verified: false })} form={form()} busy={false} onPhotoChange={vi.fn()} />,
    );
    expect(screen.queryByText('Verified')).toBeNull();
  });
});

describe('UserSummaryCard — field rows', () => {
  it('renders every field with a value, including formatted dates', () => {
    renderWithProviders(
      <UserSummaryCard user={user()} form={form()} busy={false} onPhotoChange={vi.fn()} />,
    );

    expect(rowValue('Email')).toHaveTextContent('riya@example.com');
    expect(rowValue('Phone')).toHaveTextContent('+91 9876543210');
    expect(rowValue('WhatsApp number')).toHaveTextContent('+91 9998887776');
    expect(rowValue('City')).toHaveTextContent('Pune');
    expect(rowValue('Zone')).toHaveTextContent('West');
    expect(rowValue('Assigned City')).toHaveTextContent('Pune');
    expect(rowValue('Assigned Zones')).toHaveTextContent('West, North');
    expect(rowValue('Created')).toHaveTextContent(formatDateTime('2025-01-01T00:00:00.000Z'));
    expect(rowValue('Updated')).toHaveTextContent(formatDateTime('2025-01-02T00:00:00.000Z'));
  });

  it('dashes every field that is missing', () => {
    renderWithProviders(
      <UserSummaryCard
        user={user({
          email: null,
          phone_extension: null,
          phone_number: null,
          whatsapp_extension: null,
          whatsapp_number: null,
          city: null,
          zone: null,
          assigned_city: null,
          assigned_zones: null,
          created_at: null,
          updated_at: null,
        })}
        form={form()}
        busy={false}
        onPhotoChange={vi.fn()}
      />,
    );

    expect(rowValue('Email')).toHaveTextContent('—');
    expect(rowValue('Phone')).toHaveTextContent('—');
    expect(rowValue('WhatsApp number')).toHaveTextContent('—');
    expect(rowValue('City')).toHaveTextContent('—');
    expect(rowValue('Zone')).toHaveTextContent('—');
    expect(rowValue('Assigned City')).toHaveTextContent('—');
    expect(rowValue('Assigned Zones')).toHaveTextContent('—');
    expect(rowValue('Created')).toHaveTextContent('—');
    expect(rowValue('Updated')).toHaveTextContent('—');
  });

  it('shows a phone number alone when there is no extension', () => {
    renderWithProviders(
      <UserSummaryCard
        user={user({ phone_extension: null, phone_number: '9876543210' })}
        form={form()}
        busy={false}
        onPhotoChange={vi.fn()}
      />,
    );

    expect(rowValue('Phone')).toHaveTextContent('9876543210');
  });
});
