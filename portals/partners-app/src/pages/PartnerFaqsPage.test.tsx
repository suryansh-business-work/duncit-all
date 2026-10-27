import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import PartnerFaqsPage from './PartnerFaqsPage';
import { renderWithProviders } from '../__tests__/render';
import { scriptedLink, STAY_PENDING, type ScriptedAnswer, type SentOperation } from '../__tests__/groupC-link';

afterEach(cleanup);

const faq = (id: string, topic: string, question: string, answer: string) => ({
  __typename: 'PartnerFaq',
  id,
  partner_topic: topic,
  question,
  answer,
});

const faqs = (rows: unknown[]) => ({ publicPartnerFaqs: rows });

const mount = (answer: ScriptedAnswer, sent: SentOperation[] = []) =>
  renderWithProviders(<PartnerFaqsPage />, { link: scriptedLink({ PartnerFaqs: answer }, sent) });

const rows = [
  faq('f1', 'VENUE', 'How do I list my venue?', 'Register it from Venue Options.'),
  faq('f2', 'HOST', 'How do I get paid?', 'Payouts land in your wallet.'),
  faq('f3', 'OTHER', 'Who do I call?', 'Raise a support request.'),
];

describe('PartnerFaqsPage', () => {
  it('lists the questions with their topic, and an unknown topic as Partner', async () => {
    mount(faqs(rows));
    expect(await screen.findByText('How do I list my venue?')).toBeTruthy();
    expect(within(screen.getByText('How do I list my venue?').closest('.MuiAccordionSummary-root') as HTMLElement).getByText('Venue')).toBeTruthy();
    expect(within(screen.getByText('Who do I call?').closest('.MuiAccordionSummary-root') as HTMLElement).getByText('Partner')).toBeTruthy();
  });

  it('asks the server for one topic when its chip is picked, and for all topics on All', async () => {
    const sent: SentOperation[] = [];
    mount(faqs(rows), sent);
    await screen.findByText('How do I list my venue?');
    expect(sent.find((op) => op.name === 'PartnerFaqs')?.variables).toEqual({ topic: null });
    fireEvent.click(screen.getAllByTestId('partner-faqs-topic').find((chip) => chip.textContent === 'Host') as HTMLElement);
    await waitFor(() => expect(sent.some((op) => op.name === 'PartnerFaqs' && op.variables.topic === 'HOST')).toBe(true));
    expect(screen.getAllByTestId('partner-faqs-topic').find((chip) => chip.textContent === 'Host')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('narrows the list to the questions and answers that match what is typed', async () => {
    mount(faqs(rows));
    await screen.findByText('How do I list my venue?');
    fireEvent.change(screen.getByLabelText('Search FAQs'), { target: { value: '  wallet ' } });
    expect(screen.getByText('How do I get paid?')).toBeTruthy();
    expect(screen.queryByText('How do I list my venue?')).toBeNull();
  });

  it('says nothing matched when the search finds nothing', async () => {
    mount(faqs(rows));
    await screen.findByText('How do I list my venue?');
    fireEvent.change(screen.getByLabelText('Search FAQs'), { target: { value: 'zzz' } });
    expect(await screen.findByText('No FAQs found for this filter.')).toBeTruthy();
  });

  it('says nothing was found when the server has no FAQs, and shows the server message on failure', async () => {
    mount(faqs([]));
    expect(await screen.findByText('No FAQs found for this filter.')).toBeTruthy();
    cleanup();
    mount(new Error('FAQs are down'));
    expect(await screen.findByText('FAQs are down')).toBeTruthy();
  });

  it('shows a spinner while the first answer is on its way', () => {
    mount(STAY_PENDING);
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('treats an answer with no list as no FAQs', async () => {
    mount({ publicPartnerFaqs: null });
    expect(await screen.findByText('No FAQs found for this filter.')).toBeTruthy();
  });
});
