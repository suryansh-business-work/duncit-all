import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PreviewVariablesPane, { type PaneTab } from '@/pages/email-templates/PreviewVariablesPane';
import VariableChips from '@/pages/email-templates/VariableChips';
import type { EmailTemplate } from '@/api/emailTemplates.gql';
import { emailTemplate } from '../compose/fixtures';

const writeText = vi.fn(() => Promise.resolve());

interface HarnessProps {
  initial: EmailTemplate;
  initialTab?: PaneTab;
  previewErrors?: string[];
  detected?: string[];
  onImportDetected?: () => void;
}

/** Holds the draft and tab the way the editor page does, so edits round-trip. */
function Harness({ initial, initialTab = 'code', previewErrors = [], detected = [], onImportDetected = vi.fn() }: Readonly<HarnessProps>) {
  const [draft, setDraft] = useState(initial);
  const [tab, setTab] = useState<PaneTab>(initialTab);
  const add = (slug: string) => setDraft((d) => ({ ...d, variables: [...d.variables, { key: slug, description: null }] }));
  const remove = (slug: string) => setDraft((d) => ({ ...d, variables: d.variables.filter((v) => v.key !== slug) }));
  return (
    <>
      <PreviewVariablesPane
        draft={draft}
        setDraft={setDraft}
        tab={tab}
        setTab={setTab}
        previewHtml="<p>Hello Grand Hall</p>"
        previewErrors={previewErrors}
        detected={detected}
        onImportDetected={onImportDetected}
        onAddVariable={add}
        onRemoveVariable={remove}
      />
      <output data-testid="declared">{draft.variables.map((v) => `${v.key}=${v.sample ?? ''}:${v.description ?? ''}`).join('|')}</output>
    </>
  );
}

const venueDraft = emailTemplate({
  name: 'Venue welcome',
  target: 'VENUE',
  variables: [{ key: 'venue_name', description: 'Venue display name', sample: 'Grand Hall' }],
});

const declared = () => screen.getByTestId('declared').textContent;

beforeEach(() => {
  Object.defineProperty(globalThis.navigator, 'clipboard', { configurable: true, value: { writeText } });
});

afterEach(() => {
  writeText.mockReset();
  writeText.mockImplementation(() => Promise.resolve());
  vi.useRealTimers();
});

describe('PreviewVariablesPane — preview', () => {
  it('shows render warnings and opens a full-screen preview', async () => {
    render(<Harness initial={venueDraft} initialTab="preview" previewErrors={['a', 'b', 'c', 'd']} />);

    expect(screen.getByText('a · b · c')).toBeInTheDocument();
    expect(screen.getByTitle('preview')).toHaveAttribute('srcdoc', '<p>Hello Grand Hall</p>');

    fireEvent.click(screen.getByRole('button', { name: 'Full screen preview' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Full screen preview' }));
    expect(dialog.getByText('Preview · Venue welcome')).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Close full screen' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(screen.getByRole('tab', { name: 'Variables' }));
    expect(screen.getByText('Detected in template')).toBeInTheDocument();
  });
});

describe('PreviewVariablesPane — variables', () => {
  it('toggles available venue variables in and out of the template', () => {
    render(<Harness initial={venueDraft} />);

    expect(screen.getByText('Available for Venue')).toBeInTheDocument();
    const chips = screen.getAllByTestId('crm-template-variable-chip');
    const city = chips.find((c) => c.textContent?.endsWith('· city')) as HTMLElement;
    expect(city).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(city);
    expect(declared()).toContain('city=');
    fireEvent.click(screen.getAllByTestId('crm-template-variable-chip').find((c) => c.textContent?.endsWith('· city')) as HTMLElement);
    expect(declared()).not.toContain('city=');
  });

  it('flags detected placeholders that are not venue variables and syncs them', () => {
    const onImportDetected = vi.fn();
    render(<Harness initial={venueDraft} detected={['venue_name', 'coupon_code']} onImportDetected={onImportDetected} />);

    expect(screen.getByText(/1 placeholder \(coupon_code\) is not an available Venue variable/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sync all' }));
    expect(onImportDetected).toHaveBeenCalled();
  });

  it('pluralises the warning and explains static templates', () => {
    render(<Harness initial={emailTemplate({ target: 'STATIC', variables: [] })} detected={['a', 'b']} />);

    expect(screen.getByText(/2 placeholders \(a, b\) are not expected in a static template/)).toBeInTheDocument();
    expect(screen.getByText('Static template — no lead variables. Detected placeholders show red.')).toBeInTheDocument();
    expect(screen.getByText('Add from the chips above.')).toBeInTheDocument();
  });

  it('offers host variables for a host template and nothing for an ecomm one', () => {
    const { unmount } = render(<Harness initial={emailTemplate({ target: 'HOST' })} detected={['host_name', 'x']} />);
    expect(screen.getByText('Available for Host')).toBeInTheDocument();
    expect(screen.getByText(/not an available Host variable/)).toBeInTheDocument();
    unmount();

    render(<Harness initial={emailTemplate({ target: 'ECOMM' })} />);
    expect(screen.getByText('Available for Host')).toBeInTheDocument();
    expect(screen.getByText('No {{ var }} placeholders found.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sync all' })).toBeDisabled();
  });

  it('edits default values, slugs and descriptions, copies and removes a variable', () => {
    render(
      <Harness
        initial={emailTemplate({
          target: 'VENUE',
          variables: [
            { key: 'venue_name', description: null, sample: null },
            { key: 'city', description: 'City', sample: 'Pune' },
          ],
        })}
      />,
    );

    fireEvent.change(screen.getByLabelText('venue_name'), { target: { value: 'Grand Hall' } });
    expect(declared()).toBe('venue_name=Grand Hall:|city=Pune:City');

    const [firstSlug] = screen.getAllByLabelText('Slug');
    fireEvent.change(firstSlug, { target: { value: 'hall_name' } });
    const [firstDescription] = screen.getAllByLabelText('Description');
    fireEvent.change(firstDescription, { target: { value: 'Hall' } });
    expect(declared()).toBe('hall_name=Grand Hall:Hall|city=Pune:City');

    fireEvent.click(screen.getByRole('button', { name: 'Copy {{ city }}' }));
    expect(writeText).toHaveBeenCalledWith('{{ city }}');

    fireEvent.click(screen.getByRole('button', { name: 'Remove hall_name' }));
    expect(declared()).toBe('city=Pune:City');
  });
});

describe('VariableChips', () => {
  const renderChips = (props: Partial<Parameters<typeof VariableChips>[0]> = {}) => {
    const onToggle = vi.fn();
    render(
      <VariableChips
        title="Available for Venue"
        items={[{ slug: 'venue_name', label: 'Venue name' }, { slug: 'city' }]}
        declared={new Set(['venue_name'])}
        onToggle={onToggle}
        {...props}
      />,
    );
    return onToggle;
  };

  it('marks declared chips and toggles on click', () => {
    const onToggle = renderChips();
    const [venue, city] = screen.getAllByTestId('crm-template-variable-chip');

    expect(venue).toHaveTextContent('Venue name · venue_name');
    expect(venue).toHaveAttribute('aria-pressed', 'true');
    expect(city).toHaveTextContent('city');
    fireEvent.click(city);
    expect(onToggle).toHaveBeenCalledWith('city');
  });

  it('says None when empty and has no title row when untitled', () => {
    renderChips({ items: [], title: '' });
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('copies a placeholder, confirms it, then resets the confirmation', async () => {
    renderChips({ knownSlugs: new Set(['venue_name']) });

    fireEvent.click(screen.getByLabelText('Copy {{ city }}'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('{{ city }}'));
    expect(await screen.findByLabelText('Copied!')).toBeInTheDocument();

    // Copying another chip before the reset keeps the newer confirmation.
    fireEvent.click(screen.getByLabelText('Copy {{ venue_name }}'));
    await waitFor(() => expect(screen.getByLabelText('Copied!')).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByLabelText('Copied!')).toBeNull(), { timeout: 3000 });
  });

  it('stays quiet when the clipboard is unavailable', async () => {
    writeText.mockImplementation(() => Promise.reject(new Error('denied')));
    renderChips();

    await act(async () => {
      fireEvent.click(screen.getByLabelText('Copy {{ city }}'));
    });

    expect(screen.queryByLabelText('Copied!')).toBeNull();
  });
});
