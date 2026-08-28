/**
 * Who you are about to write to: the card behind the info button, everything
 * about them that helps you tell one Rahul from another.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CoworkerInfoButton from '../src/staff-chat/CoworkerInfoButton';
import type { Coworker } from '../src/staff-chat/queries';

const PERSON: Coworker = {
  id: 'u-1',
  name: 'Vikram N',
  email: 'vikram@duncit.com',
  photo: '',
  roles: ['CRM_MANAGER'],
  phone: '+91 90000 00000',
  city: 'Bengaluru',
} as Coworker;

describe('CoworkerInfoButton', () => {
  it('opens the card with their details, and closes it again', async () => {
    const { getByLabelText } = render(<CoworkerInfoButton person={PERSON} />);

    fireEvent.click(getByLabelText('About Vikram N'));
    expect(document.body.querySelector('[role="presentation"]')).not.toBeNull();
    expect(document.body.textContent).toContain('Bengaluru');

    fireEvent.keyDown(document.body.querySelector('[role="presentation"]') as HTMLElement, {
      key: 'Escape',
      code: 'Escape',
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it('says so plainly for someone with no console access at all', () => {
    const person = { ...PERSON, roles: [] };
    const { getByLabelText } = render(<CoworkerInfoButton person={person} />);

    fireEvent.click(getByLabelText('About Vikram N'));

    expect(document.body.textContent).toContain('No staff console assigned.');
  });
});
