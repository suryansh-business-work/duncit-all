import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';
import ContactSummaryCard from '../ContactSummaryCard';
import { checkoutDefaults } from '../checkout';
import type { CheckoutContact, CheckoutForm } from '../queries';

const contact: CheckoutContact = {
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  phoneExtension: '+91',
  phoneNumber: '9876543210',
};

function Harness({ contact: value, loading }: Readonly<{ contact: CheckoutContact | null; loading: boolean }>) {
  const { control } = useForm<CheckoutForm>({ defaultValues: checkoutDefaults });
  return <ContactSummaryCard control={control} contact={value} loading={loading} />;
}

describe('ContactSummaryCard', () => {
  it('renders the resolved contact straight from the loaded me query', () => {
    render(<Harness contact={contact} loading={false} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('+91 9876543210')).toBeInTheDocument();
  });

  it('shows skeleton placeholders (no contact values) while me is loading', () => {
    const { container } = render(<Harness contact={null} loading />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(3);
  });
});
