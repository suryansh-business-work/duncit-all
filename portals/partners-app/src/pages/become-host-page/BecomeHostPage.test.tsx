import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import BecomeHostPage from './BecomeHostPage';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, STAY_PENDING, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';

/** The picker is @duncit/media-picker's; here it offers one upload and shows what the page asked of it. */
vi.mock('../../components/MediaPickerDialog', () => ({
  default: ({
    open,
    folder,
    accept,
    title,
    onPicked,
    onClose,
  }: {
    open: boolean;
    folder: string;
    accept: string;
    title: string;
    onPicked: (url: string) => void;
    onClose: () => void;
  }) =>
    open ? (
      <div role="dialog" aria-label={title} data-folder={folder} data-accept={accept}>
        <button type="button" onClick={() => onPicked('https://cdn.duncit.com/doc.pdf')}>
          pick file
        </button>
        <button type="button" onClick={onClose}>
          close picker
        </button>
      </div>
    ) : null,
}));

beforeEach(() => {
  globalThis.localStorage.clear();
});
afterEach(cleanup);

const account = (over: Record<string, unknown> = {}) => ({
  __typename: 'User',
  user_id: 'u1',
  full_name: 'Asha Rao',
  first_name: 'Asha',
  last_name: 'Rao',
  email: 'asha@duncit.com',
  roles: ['USER'],
  ...over,
});

const hostRecord = (over: Record<string, unknown> = {}) => ({
  __typename: 'Host',
  id: 'h1',
  step_completed: 0,
  status: 'DRAFT',
  full_name: 'Asha Rao',
  email: 'asha@duncit.com',
  phone: '9876543210',
  dob: '1990-05-10T00:00:00.000Z',
  aadhar_number: '123412341234',
  pan_number: 'ABCDE1234F',
  passport_photo_url: 'https://cdn.duncit.com/me.jpg',
  police_verification_url: '',
  full_address: '12 Main Street, Pune',
  reviewer_notes: null,
  ...over,
});

const page = (host: Record<string, unknown> | null, me = account()) => ({ me, myHost: host });
/** The server's answer to a step save: that step is now the last one completed. */
const stepSaved = (name: string, completed: number) => ({
  [name]: { __typename: 'Host', id: 'h1', step_completed: completed, status: 'DRAFT' },
});

/**
 * The page re-reads the host after every save and resumes at the step the server reports,
 * so the host answer follows the saves the way the server's would.
 */
const mount = (
  data: ReturnType<typeof page>,
  answers: Record<string, ScriptedAnswer> = {},
  sent: SentOperation[] = [],
) => {
  let completed = data.myHost?.step_completed ?? 0;
  const saved = (name: string, step: number) => () => {
    completed = step;
    return stepSaved(name, step);
  };
  return renderWithProviders(<BecomeHostPage />, {
    route: '/become-host',
    link: scriptedLink(
      {
        PartnerMyHost: () => ({ ...data, myHost: data.myHost && { ...data.myHost, step_completed: completed } }),
        PartnerH1: saved('submitHostStep1', 1),
        PartnerH2: saved('submitHostStep2', 2),
        PartnerH3: saved('submitHostStep3', 3),
        PartnerHFinal: { submitHostFinal: { __typename: 'Host', id: 'h1', status: 'SUBMITTED' } },
        WithdrawHostApplication: { withdrawHostApplication: { __typename: 'Host', id: 'h1', status: 'DRAFT', step_completed: 0 } },
        ...answers,
      },
      sent,
    ),
  });
};

const next =() => fireEvent.click(screen.getByRole('button', { name: 'Next' }));
const field = (label: RegExp) => screen.getByLabelText(label) as HTMLInputElement;
const calls = (sent: SentOperation[], name: string) => sent.filter((op) => op.name === name);

describe('BecomeHostPage — a new applicant', () => {
  it('shows a loading line until the account is read', () => {
    mount(page(null), { PartnerMyHost: STAY_PENDING });
    expect(screen.getByText('Loading...').getAttribute('role')).toBe('status');
  });

  it('opens on step one with the account name and a locked email', async () => {
    mount(page(null));
    expect(await screen.findByRole('heading', { name: 'Become a host' })).toBeTruthy();
    await waitFor(() => expect(field(/Full name/).value).toBe('Asha Rao'));
    expect(field(/^Email/).value).toBe('asha@duncit.com');
    expect(field(/^Email/).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Back' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('builds the name from first and last when the account has no full name', async () => {
    mount(page(null, account({ full_name: '' })));
    await waitFor(() => expect(field(/Full name/).value).toBe('Asha Rao'));
  });

  it('keeps what the applicant typed and does not move on while the phone is not valid', async () => {
    const sent: SentOperation[] = [];
    mount(page(null), {}, sent);
    await waitFor(() => expect(field(/Full name/).value).toBe('Asha Rao'));
    fireEvent.change(field(/Phone/), { target: { value: '123' } });
    next();
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(calls(sent, 'PartnerH1')).toHaveLength(0);
    expect(field(/Phone/).value).toBe('123');
  });

  it('saves step one with the account email and a null date of birth, then shows step two', async () => {
    const sent: SentOperation[] = [];
    mount(page(null), {}, sent);
    await waitFor(() => expect(field(/Full name/).value).toBe('Asha Rao'));
    fireEvent.change(field(/Phone/), { target: { value: '9876543210' } });
    next();
    await screen.findByLabelText(/Aadhar number/);
    expect(calls(sent, 'PartnerH1')[0].variables).toEqual({
      input: { full_name: 'Asha Rao', email: 'asha@duncit.com', phone: '9876543210', dob: null },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByLabelText(/Full name/)).toBeTruthy();
  });

  it('shows the server message when a step cannot be saved and stays on the step', async () => {
    mount(page(null), { PartnerH1: new Error('Phone already used') });
    await waitFor(() => expect(field(/Full name/).value).toBe('Asha Rao'));
    fireEvent.change(field(/Phone/), { target: { value: '9876543210' } });
    next();
    expect(await screen.findByText('Phone already used')).toBeTruthy();
    expect(screen.getByLabelText(/Full name/)).toBeTruthy();
  });
});

describe('BecomeHostPage — resuming an application', () => {
  it('opens on the step the server says is next, with the saved answers in it', async () => {
    mount(page(hostRecord({ step_completed: 1 })));
    expect(((await screen.findByLabelText(/Aadhar number/)) as HTMLInputElement).value).toBe('123412341234');
    expect(field(/PAN number/).value).toBe('ABCDE1234F');
    expect(screen.getByAltText('Passport-size photo')).toBeTruthy();
  });

  it('upper-cases the PAN as it is typed and refuses an Aadhar that is not 12 digits', async () => {
    const sent: SentOperation[] = [];
    mount(page(hostRecord({ step_completed: 1 })), {}, sent);
    await waitFor(() => expect(field(/Aadhar number/).value).toBe('123412341234'));
    fireEvent.change(field(/PAN number/), { target: { value: 'abcde1234f' } });
    expect(field(/PAN number/).value).toBe('ABCDE1234F');
    fireEvent.change(field(/Aadhar number/), { target: { value: '1234' } });
    next();
    expect(await screen.findByText('Aadhar must be 12 digits')).toBeTruthy();
    expect(calls(sent, 'PartnerH2')).toHaveLength(0);
  });

  it('saves step two with the answers as typed', async () => {
    const sent: SentOperation[] = [];
    mount(page(hostRecord({ step_completed: 1 })), {}, sent);
    await waitFor(() => expect(field(/Aadhar number/).value).toBe('123412341234'));
    next();
    // Exactly one step on: the Verify step, not the final one the saved step count would also point at.
    await screen.findByText('Police verification certificate');
    expect(calls(sent, 'PartnerH2')[0].variables).toEqual({
      input: {
        aadhar_number: '123412341234',
        pan_number: 'ABCDE1234F',
        passport_photo_url: 'https://cdn.duncit.com/me.jpg',
      },
    });
  });

  it('takes the passport photo from the picker, in the photo folder, images only', async () => {
    mount(page(hostRecord({ step_completed: 1, passport_photo_url: '' })));
    fireEvent.click(await screen.findByRole('button', { name: 'Upload' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.getAttribute('data-folder')).toBe('/hosts/photo');
    expect(dialog.getAttribute('data-accept')).toBe('image/*');
    fireEvent.click(screen.getByRole('button', { name: 'pick file' }));
    expect(await screen.findByAltText('Passport-size photo')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('takes the police certificate from the picker, in the documents folder, images or PDF', async () => {
    mount(page(hostRecord({ step_completed: 2 })));
    fireEvent.click(await screen.findByRole('button', { name: 'Upload' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.getAttribute('data-folder')).toBe('/hosts/docs');
    expect(dialog.getAttribute('data-accept')).toBe('image/*,application/pdf');
    fireEvent.click(screen.getByRole('button', { name: 'pick file' }));
    expect(await screen.findByText('Uploaded')).toBeTruthy();
  });

  it('closes the picker without changing anything', async () => {
    mount(page(hostRecord({ step_completed: 2 })));
    fireEvent.click(await screen.findByRole('button', { name: 'Upload' }));
    fireEvent.click(await screen.findByRole('button', { name: 'close picker' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('button', { name: 'Upload' })).toBeTruthy();
  });

  it('refuses step three without the certificate, then saves it once uploaded', async () => {
    const sent: SentOperation[] = [];
    mount(page(hostRecord({ step_completed: 2 })), {}, sent);
    await screen.findByRole('button', { name: 'Upload' });
    next();
    expect(await screen.findByText('Police verification is required')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    fireEvent.click(await screen.findByRole('button', { name: 'pick file' }));
    await screen.findByText('Uploaded');
    next();
    await screen.findByText("Submit your application for review.");
    expect(calls(sent, 'PartnerH3')[0].variables).toEqual({
      input: { police_verification_url: 'https://cdn.duncit.com/doc.pdf', full_address: '12 Main Street, Pune' },
    });
  });

  it('submits the finished application for review and re-reads it', async () => {
    const sent: SentOperation[] = [];
    mount(page(hostRecord({ step_completed: 3, police_verification_url: 'https://cdn.duncit.com/p.pdf' })), {}, sent);
    expect(await screen.findByText('asha@duncit.com', { exact: false })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() => expect(calls(sent, 'PartnerHFinal')).toHaveLength(1));
    await waitFor(() => expect(calls(sent, 'PartnerMyHost').length).toBeGreaterThanOrEqual(2));
  });
});

describe('BecomeHostPage — a draft with gaps in it', () => {
  const sparse = hostRecord({
    step_completed: null,
    full_name: null,
    email: 'host@duncit.com',
    phone: null,
    dob: null,
    aadhar_number: null,
    pan_number: null,
    passport_photo_url: null,
    police_verification_url: null,
    full_address: null,
  });

  it('starts at step one with empty answers, falling back to the account name', async () => {
    mount(page(sparse));
    await waitFor(() => expect(field(/Full name/).value).toBe('Asha Rao'));
    expect(field(/Phone/).value).toBe('');
  });

  it('shows the saved date of birth as a calendar day', async () => {
    mount(page(hostRecord({ step_completed: 0 })));
    await waitFor(() => expect(field(/Full name/).value).toBe('Asha Rao'));
    expect(screen.getByDisplayValue(/1990|10\/05|05\/10/)).toBeTruthy();
  });

  it('uses the email saved on the application when the account has none, and sends it', async () => {
    const sent: SentOperation[] = [];
    mount(page(sparse, account({ email: null })), {}, sent);
    await waitFor(() => expect(field(/^Email/).value).toBe('host@duncit.com'));
    fireEvent.change(field(/Phone/), { target: { value: '9876543210' } });
    next();
    await screen.findByLabelText(/Aadhar number/);
    expect(calls(sent, 'PartnerH1')[0].variables).toMatchObject({ input: { email: 'host@duncit.com' } });
  });

  it('leaves the email blank when neither the account nor the application has one', async () => {
    mount(page(hostRecord({ email: null }), account({ email: null })));
    await waitFor(() => expect(field(/Phone/).value).toBe('9876543210'));
    expect(field(/^Email/).value).toBe('');
  });

  it('opens step two empty, with no photo shown and an Upload button', async () => {
    mount(page(hostRecord({ step_completed: 1, aadhar_number: null, pan_number: null, passport_photo_url: null })));
    expect(((await screen.findByLabelText(/Aadhar number/)) as HTMLInputElement).value).toBe('');
    expect(field(/PAN number/).value).toBe('');
    expect(screen.queryByAltText('Passport-size photo')).toBeNull();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeTruthy();
  });
});

describe('BecomeHostPage — an application in review or decided', () => {
  it('says a submitted application is under review and locks Next', async () => {
    mount(page(hostRecord({ step_completed: 3, status: 'SUBMITTED' })));
    expect(await screen.findByText('SUBMITTED')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows the reviewer’s notes on a rejected application', async () => {
    mount(page(hostRecord({ status: 'REJECTED', reviewer_notes: 'Photo is blurry' })));
    expect(await screen.findByText('Rejected: Photo is blurry')).toBeTruthy();
  });

  it('points a rejected application with no notes at the notes', async () => {
    mount(page(hostRecord({ status: 'REJECTED', reviewer_notes: null })));
    expect(await screen.findByText('Rejected: See notes.')).toBeTruthy();
  });

  it('withdraws the application and re-reads it', async () => {
    const sent: SentOperation[] = [];
    mount(page(hostRecord({ status: 'SUBMITTED', step_completed: 3 })), {}, sent);
    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw' }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'Withdraw' })).at(-1) as HTMLElement);
    await waitFor(() => expect(calls(sent, 'WithdrawHostApplication')).toHaveLength(1));
    await waitFor(() => expect(calls(sent, 'PartnerMyHost').length).toBeGreaterThanOrEqual(2));
  });

  it('shows the server message when the withdrawal fails', async () => {
    mount(page(hostRecord({ status: 'SUBMITTED', step_completed: 3 })), {
      WithdrawHostApplication: new Error('Already decided'),
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw' }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'Withdraw' })).at(-1) as HTMLElement);
    expect(await screen.findByText('Already decided')).toBeTruthy();
  });

  it('gives an approved host the hosting area, not the application', async () => {
    mount(page(hostRecord({ status: 'APPROVED' }), account({ roles: ['USER', 'HOST'] })));
    expect(await screen.findByRole('heading', { name: 'Your hosting' })).toBeTruthy();
    expect(screen.getByText('HOST')).toBeTruthy();
    expect(screen.getByText('Your host profile is approved. Create and manage your pods from the Host section.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'Your Pods' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/host/pods'));
  });

  it('treats the HOST role alone, with no application, as already hosting', async () => {
    mount(page(null, account({ roles: ['HOST'] })));
    expect(await screen.findByRole('heading', { name: 'Your hosting' })).toBeTruthy();
    expect(screen.queryByText('HOST')).toBeNull();
  });
});
