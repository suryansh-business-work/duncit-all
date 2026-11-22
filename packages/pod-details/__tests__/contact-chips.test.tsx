/**
 * The shared contact chips: one dialable link per channel the person filled
 * in, nothing for the ones they did not, and a click that stays on the chip.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ContactChips, { contactLinks } from '../src/ContactChips';

const t = (key: string) => key.split('.').pop() ?? key;

describe('contactLinks', () => {
  it('strips separators so every number dials', () => {
    const links = contactLinks({ email: 'a@b.com', phone: '+91 98765-43210', whatsapp: '+91 (987) 654' }, t);
    expect(links.map((l) => l.href)).toEqual(['mailto:a@b.com', 'tel:+919876543210', 'https://wa.me/91987654']);
    expect(links.map((l) => l.key)).toEqual(['email', 'phone', 'whatsapp']);
  });

  it('skips blank channels', () => {
    expect(contactLinks({ email: null, phone: '   ', whatsapp: '' }, t)).toEqual([]);
  });
});

describe('ContactChips', () => {
  it('renders a chip per channel with test ids, only WhatsApp opening a new tab', () => {
    render(<ContactChips contact={{ email: 'm@x.com', whatsapp: '+91 11111' }} testId="host-contact" />);
    expect(screen.getByTestId('host-contact-email')).toHaveAttribute('href', 'mailto:m@x.com');
    expect(screen.getByTestId('host-contact-whatsapp')).toHaveAttribute('target', '_blank');
    expect(screen.queryByTestId('host-contact-phone')).not.toBeInTheDocument();
  });

  it('renders nothing for a person with no channel', () => {
    const { container } = render(<ContactChips contact={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not let a chip click reach a clickable row behind it', () => {
    const onRow = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div onClick={onRow}>
        <ContactChips contact={{ email: 'm@x.com' }} testId="c" />
      </div>,
    );
    fireEvent.click(screen.getByTestId('c-email'));
    expect(onRow).not.toHaveBeenCalled();
  });
});
