import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { ConfirmProvider, notifyError, notifySuccess } from '@duncit/dialogs';
import FaqsPage from '../../src/pages/faqs/FaqsPage';
import PartnerFaqsPage from '../../src/pages/faqs/PartnerFaqsPage';
import { renderWithProviders } from '../testkit';
import {
  createFaqMock,
  deleteFaqMock,
  faqsTableMock,
  makeFaq,
  superCategoriesForFaqMock,
  updateFaqMock,
} from '../mocks';

vi.mock(import('@duncit/dialogs'), async (importOriginal) => ({
  ...(await importOriginal()),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

/**
 * The App FAQs and Partner FAQs desks: one server entity, one table and one
 * form, with the audience pinned per page and a different category field
 * (super category for the app, topic for partners).
 */
const renderApp = (mocks: MockedResponse[] = []) =>
  renderWithProviders(
    <ConfirmProvider>
      <FaqsPage />
    </ConfirmProvider>,
    { mocks: [superCategoriesForFaqMock(), ...mocks] },
  );

const renderPartner = (mocks: MockedResponse[] = []) =>
  renderWithProviders(
    <ConfirmProvider>
      <PartnerFaqsPage />
    </ConfirmProvider>,
    { mocks },
  );

const dialogOf = () => screen.findByRole('dialog');
const field = (dialog: HTMLElement, name: RegExp) => within(dialog).getByRole('textbox', { name });
const pick = async (dialog: HTMLElement, name: RegExp, option: string) => {
  fireEvent.mouseDown(within(dialog).getByRole('combobox', { name }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
};
const filtersOf = (seen: Array<Record<string, unknown>>) =>
  (seen.at(-1)?.query as { filters: Array<{ field: string; op: string; value: unknown }> }).filters;

const fillFaq = (dialog: HTMLElement, question: string, answer: string) => {
  fireEvent.change(field(dialog, /^Question/), { target: { value: question } });
  fireEvent.change(field(dialog, /^Answer/), { target: { value: answer } });
};

beforeEach(() => {
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(notifyError).mockClear();
});

describe('FaqsPage — the App FAQs', () => {
  it('lists the questions, pins the APP audience and names the category or General', async () => {
    const seen: Array<Record<string, unknown>> = [];
    renderApp([
      faqsTableMock(
        [
          makeFaq(),
          makeFaq({
            id: 'faq-2',
            question: 'Is parking free?',
            answer: 'Yes at every venue.',
            super_category_id: null,
            super_category: null,
            is_active: false,
          }),
        ],
        seen,
      ),
    ]);

    expect(await screen.findByText('App FAQs')).toBeInTheDocument();
    expect(await screen.findByText('How do I join a pod?')).toBeInTheDocument();
    expect(screen.getByText('Is parking free?')).toBeInTheDocument();
    expect(screen.getByText('Open the pod and tap Join.')).toBeInTheDocument();
    expect(screen.getAllByText('Dining').length).toBeGreaterThan(0);
    expect(screen.getAllByText('General').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Hidden').length).toBeGreaterThan(0);
    expect(filtersOf(seen)).toContainEqual({ field: 'audience', op: 'eq', value: 'APP', values: null });
  });

  it('says so when there are no FAQs yet', async () => {
    renderApp([faqsTableMock([])]);
    expect(
      await screen.findByText('No FAQs yet. Use “New FAQ” to create the first one.'),
    ).toBeInTheDocument();
  });

  it('creates an FAQ under the app audience with trimmed text and the chosen category', async () => {
    renderApp([
      faqsTableMock([]),
      createFaqMock((variables) => {
        const input = variables.input as Record<string, unknown>;
        return (
          input.audience === 'APP' &&
          input.super_category_id === 'sc-2' &&
          input.question === 'Can I bring a guest?' &&
          input.answer === 'Yes, one guest per member.' &&
          input.sort_order === 4 &&
          input.is_active === true
        );
      }),
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'New FAQ' }));
    const dialog = await dialogOf();
    expect(within(dialog).getByText('New FAQ', { selector: 'h2' })).toBeInTheDocument();

    await pick(dialog, /Super Category/, 'Sports');
    fillFaq(dialog, '  Can I bring a guest?  ', ' Yes, one guest per member. ');
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: /Sort order/ }), {
      target: { value: '4' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('FAQ created'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('saves a general FAQ with no category when the category is left empty', async () => {
    renderApp([
      faqsTableMock([]),
      createFaqMock((variables) => {
        const input = variables.input as Record<string, unknown>;
        return input.super_category_id === null && input.sort_order === 0;
      }),
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'New FAQ' }));
    const dialog = await dialogOf();
    fillFaq(dialog, 'Where is support?', 'Under Help in the app.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('FAQ created'));
  });

  it('refuses a question or answer that is too short', async () => {
    renderApp([faqsTableMock([])]);
    fireEvent.click(await screen.findByRole('button', { name: 'New FAQ' }));
    const dialog = await dialogOf();
    fillFaq(dialog, 'Why', 'No');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('Question must be at least 5 characters')).toBeInTheDocument();
    expect(within(dialog).getByText('Answer must be at least 5 characters')).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('opens an existing FAQ seeded, and updates it by id', async () => {
    renderApp([
      faqsTableMock([makeFaq()]),
      updateFaqMock((variables) => {
        const input = variables.input as Record<string, unknown>;
        return (
          variables.faq_doc_id === 'faq-1' &&
          input.question === 'How do I join a pod today?' &&
          input.super_category_id === 'sc-1' &&
          input.is_active === false
        );
      }),
    ]);
    await screen.findByText('How do I join a pod?');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await dialogOf();
    expect(within(dialog).getByText('Edit FAQ', { selector: 'h2' })).toBeInTheDocument();
    expect(field(dialog, /^Question/)).toHaveValue('How do I join a pod?');
    expect(field(dialog, /^Answer/)).toHaveValue('Open the pod and tap Join.');

    fireEvent.change(field(dialog, /^Question/), { target: { value: 'How do I join a pod today?' } });
    fireEvent.click(within(dialog).getByRole('switch'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('FAQ updated'));
  });

  it("shows the server's reason in the dialog and keeps it open when the save is refused", async () => {
    renderApp([faqsTableMock([]), createFaqMock(() => true, 'That question already exists')]);
    fireEvent.click(await screen.findByRole('button', { name: 'New FAQ' }));
    const dialog = await dialogOf();
    fillFaq(dialog, 'Where is support?', 'Under Help in the app.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('That question already exists')).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('falls back to its own words when the refusal carries none', async () => {
    renderApp([
      faqsTableMock([]),
      { request: createFaqMock().request, error: new Error('') },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'New FAQ' }));
    const dialog = await dialogOf();
    fillFaq(dialog, 'Where is support?', 'Under Help in the app.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText('Unable to save this FAQ')).toBeInTheDocument();
  });

  it('keeps a general FAQ general when it is edited', async () => {
    const general = makeFaq({
      id: 'faq-g',
      question: 'Is parking free?',
      answer: 'Yes at every venue.',
      super_category_id: null,
      super_category: null,
    });
    renderApp([
      faqsTableMock([general]),
      updateFaqMock(
        (variables) =>
          variables.faq_doc_id === 'faq-g' &&
          (variables.input as Record<string, unknown>).super_category_id === null,
      ),
    ]);
    await screen.findByText('Is parking free?');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await dialogOf();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('FAQ updated'));
  });

  it('opens a sparse legacy row with safe defaults instead of blanks that cannot be saved', async () => {
    const sparse = makeFaq({
      id: 'faq-s',
      question: 'Legacy question here',
      answer: '',
      sort_order: null as unknown as number,
      is_active: false,
    });
    renderApp([faqsTableMock([sparse])]);
    await screen.findByText('Legacy question here');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await dialogOf();

    expect(field(dialog, /^Answer/)).toHaveValue('');
    expect(within(dialog).getByRole('spinbutton', { name: /Sort order/ })).toHaveValue(0);
    expect(within(dialog).getByRole('switch')).not.toBeChecked();
  });

  it('opens a row that lost its question with an empty field to fill in', async () => {
    renderApp([faqsTableMock([makeFaq({ id: 'faq-q', question: '', answer: 'Orphaned answer text' })])]);
    await screen.findByText('Orphaned answer text');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await dialogOf();

    expect(field(dialog, /^Question/)).toHaveValue('');
    expect(field(dialog, /^Answer/)).toHaveValue('Orphaned answer text');
  });

  it('closes the dialog on Cancel', async () => {
    renderApp([faqsTableMock([])]);
    fireEvent.click(await screen.findByRole('button', { name: 'New FAQ' }));
    const dialog = await dialogOf();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('asks before deleting, then deletes and says so', async () => {
    renderApp([faqsTableMock([makeFaq()]), deleteFaqMock('faq-1')]);
    await screen.findByText('How do I join a pod?');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await dialogOf();
    expect(within(dialog).getByText('Delete this FAQ?')).toBeInTheDocument();
    expect(within(dialog).getByText('This action cannot be undone.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Deleted'));
  });

  it('does nothing when the deletion is declined', async () => {
    renderApp([faqsTableMock([makeFaq()])]);
    await screen.findByText('How do I join a pod?');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await dialogOf();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(notifyError).not.toHaveBeenCalled();
  });

  it("tells the agent the server's reason when a delete fails", async () => {
    renderApp([faqsTableMock([makeFaq()]), deleteFaqMock('faq-1', 'FAQ is locked')]);
    await screen.findByText('How do I join a pod?');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await dialogOf();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('FAQ is locked'));
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});

describe('PartnerFaqsPage — the Partner FAQs', () => {
  const venueFaq = makeFaq({
    id: 'pfaq-1',
    audience: 'PARTNERS',
    partner_topic: 'VENUE',
    super_category_id: null,
    super_category: null,
    question: 'How do payouts work?',
    answer: 'Paid after Finance approves the pod.',
  });

  it('pins the PARTNERS audience and names each row by its topic', async () => {
    const seen: Array<Record<string, unknown>> = [];
    renderPartner([
      faqsTableMock(
        [venueFaq, makeFaq({ ...venueFaq, id: 'pfaq-2', partner_topic: 'HOST', question: 'Can I co-host?' })],
        seen,
      ),
    ]);

    expect(await screen.findByText('Partner FAQs')).toBeInTheDocument();
    expect(await screen.findByText('How do payouts work?')).toBeInTheDocument();
    expect(screen.getAllByText('Venue').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Host').length).toBeGreaterThan(0);
    expect(filtersOf(seen)).toContainEqual({
      field: 'audience',
      op: 'eq',
      value: 'PARTNERS',
      values: null,
    });
  });

  it('shows a topic this console does not know by its stored value', async () => {
    renderPartner([faqsTableMock([makeFaq({ ...venueFaq, partner_topic: 'LEGACY' as never })])]);
    await screen.findByText('How do payouts work?');
    expect(screen.getAllByText('LEGACY').length).toBeGreaterThan(0);
  });

  it('edits a row that has no topic on the default Venue topic', async () => {
    renderPartner([faqsTableMock([makeFaq({ ...venueFaq, partner_topic: null })])]);
    await screen.findByText('How do payouts work?');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await dialogOf();

    expect(within(dialog).getByRole('combobox', { name: /Topic/ })).toHaveTextContent('Venue');
  });

  it('shows a row with no topic as a dash', async () => {
    renderPartner([faqsTableMock([makeFaq({ ...venueFaq, partner_topic: null })])]);
    await screen.findByText('How do payouts work?');
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('says so when there are no partner FAQs yet', async () => {
    renderPartner([faqsTableMock([])]);
    expect(
      await screen.findByText('No partner FAQs yet. Use “New FAQ” to create the first one.'),
    ).toBeInTheDocument();
  });

  it('creates a partner FAQ on the default Venue topic', async () => {
    renderPartner([
      faqsTableMock([]),
      createFaqMock((variables) => {
        const input = variables.input as Record<string, unknown>;
        return (
          input.audience === 'PARTNERS' &&
          input.partner_topic === 'VENUE' &&
          input.question === 'When do I get paid?' &&
          !('super_category_id' in input)
        );
      }),
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'New FAQ' }));
    const dialog = await dialogOf();
    expect(within(dialog).getByText('New Partner FAQ')).toBeInTheDocument();
    fillFaq(dialog, 'When do I get paid?', 'After Finance approves.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Partner FAQ created'));
  });

  it('moves a FAQ to another topic when edited', async () => {
    renderPartner([
      faqsTableMock([venueFaq]),
      updateFaqMock(
        (variables) =>
          variables.faq_doc_id === 'pfaq-1' &&
          (variables.input as Record<string, unknown>).partner_topic === 'PRODUCTS',
      ),
    ]);
    await screen.findByText('How do payouts work?');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await dialogOf();
    expect(within(dialog).getByText('Edit Partner FAQ')).toBeInTheDocument();
    await pick(dialog, /Topic/, 'Products');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Partner FAQ updated'));
  });

  it('deletes a partner FAQ after confirming, in the partner wording', async () => {
    renderPartner([faqsTableMock([venueFaq]), deleteFaqMock('pfaq-1')]);
    await screen.findByText('How do payouts work?');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await dialogOf();
    expect(within(dialog).getByText('Delete this partner FAQ?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Partner FAQ deleted'));
  });
});
