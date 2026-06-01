import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ContactCard from '@/components/contacts-tab/ContactCard';
import type { CrmContact } from '@/api/crm.types';

const contact: CrmContact = {
  name: 'Asha',
  role: 'Manager',
  mobile_number: '+919876543210',
  whatsapp_number: '+918888888888',
  email: 'asha@example.com',
};

describe('ContactCard', () => {
  it('calls onCall and onEmail from the number/email and the icon buttons', () => {
    const onCall = vi.fn();
    const onEmail = vi.fn();
    render(<ContactCard contact={contact} index={0} onCall={onCall} onEmail={onEmail} />);

    fireEvent.click(screen.getByText('+919876543210'));
    expect(onCall).toHaveBeenCalledWith(contact);

    fireEvent.click(screen.getByText('asha@example.com'));
    expect(onEmail).toHaveBeenCalledWith(contact);

    fireEvent.click(screen.getByRole('button', { name: /call contact/i }));
    fireEvent.click(screen.getByRole('button', { name: /email contact/i }));
    expect(onCall).toHaveBeenCalledTimes(2);
    expect(onEmail).toHaveBeenCalledTimes(2);
  });

  it('disables call/email icon buttons when the detail is missing', () => {
    render(
      <ContactCard
        contact={{ name: 'No Info', role: '', mobile_number: '', whatsapp_number: '', email: '' }}
        index={1}
        onCall={vi.fn()}
        onEmail={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /call contact/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /email contact/i })).toBeDisabled();
  });

  it('marks the first contact as Primary and links WhatsApp to wa.me digits', () => {
    render(<ContactCard contact={contact} index={0} onCall={vi.fn()} onEmail={vi.fn()} />);
    expect(screen.getByText('Primary')).toBeTruthy();
    const wa = screen.getByText('+918888888888', { selector: 'a' }) as HTMLAnchorElement;
    expect(wa.href).toContain('wa.me/918888888888');
  });
});
