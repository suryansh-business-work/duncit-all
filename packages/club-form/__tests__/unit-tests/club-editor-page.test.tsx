/**
 * The full-page "New Club / Edit Club" editor: the shared ClubForm on the left
 * and the live member preview on the right — which is also the only place the
 * form's two-column `preview` layout is exercised.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@duncit/category', () => import('../mocks/categoryMock'));
vi.mock('@duncit/location', () => import('../mocks/locationMock'));

import ClubEditorPage from '../../src/editor/ClubEditorPage';
import { blankClubFormValues, type ClubFormConfig, type ClubFormValues } from '../../src/types';

const config: ClubFormConfig = { showAdmins: false, showVerified: false, showIsActive: false };

const validValues = (overrides: Partial<ClubFormValues> = {}): ClubFormValues => ({
  ...blankClubFormValues,
  club_name: 'Sunset Club',
  club_description: 'Weekend badminton in Indiranagar.',
  super_category_id: 'S1',
  category_id: 'C1',
  location_id: 'L1',
  locality: 'Indiranagar',
  feature_text: 'https://ik.imagekit.io/duncit/club.png',
  community_link: 'https://chat.whatsapp.com/community',
  group_link: 'https://chat.whatsapp.com/group',
  who_we_are: ['A weekend group'],
  what_we_do: ['Doubles every Sunday'],
  perks: ['Shuttles included'],
  values: ['Turn up on time'],
  ...overrides,
});

function renderPage(props: Partial<React.ComponentProps<typeof ClubEditorPage>> = {}) {
  const onBack = props.onBack ?? vi.fn();
  const onSubmit = props.onSubmit ?? vi.fn();
  const utils = render(
    <ClubEditorPage
      eyebrow="Admin · Clubs"
      backLabel="Back to clubs"
      initialValues={validValues()}
      config={config}
      busy={false}
      error={null}
      onBack={onBack}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return { onBack, onSubmit, ...utils };
}

describe('ClubEditorPage', () => {
  it('titles a club without an id "New Club" and shows the eyebrow, intro and extras', () => {
    renderPage({ intro: <p>Intro copy</p>, titleExtras: <button type="button">AI fill</button> });

    expect(screen.getByText('Admin · Clubs')).toBeInTheDocument();
    expect(screen.getByText('New Club')).toBeInTheDocument();
    expect(screen.getByText('Intro copy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AI fill' })).toBeInTheDocument();
  });

  it('titles an existing club "Edit Club" unless a heading is given', () => {
    const { unmount } = renderPage({ initialValues: validValues({ id: 'club-1' }) });
    expect(screen.getByText('Edit Club')).toBeInTheDocument();
    unmount();

    renderPage({ initialValues: validValues({ id: 'club-1' }), heading: 'Editing Sunset Club' });
    expect(screen.getByText('Editing Sunset Club')).toBeInTheDocument();
    expect(screen.queryByText('Edit Club')).not.toBeInTheDocument();
  });

  it('renders the form beside the live member preview', () => {
    renderPage();

    expect(screen.getByLabelText(/Club name/)).toHaveValue('Sunset Club');
    expect(screen.getByText('Member preview')).toBeInTheDocument();
    expect(screen.getByText('In the clubs list')).toBeInTheDocument();
    expect(screen.getByText('On the club page')).toBeInTheDocument();
  });

  it('sends both the back button and the form Cancel to onBack', async () => {
    const user = userEvent.setup();
    const { onBack } = renderPage();

    await user.click(screen.getByRole('button', { name: 'Back to clubs' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it('forwards a save and the RHF methods to its callbacks', async () => {
    const user = userEvent.setup();
    const onReady = vi.fn();
    const { onSubmit } = renderPage({ onReady });

    expect(onReady).toHaveBeenCalledWith(expect.objectContaining({ handleSubmit: expect.any(Function) }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ club_name: 'Sunset Club' }), { draft: false });
  });
});
