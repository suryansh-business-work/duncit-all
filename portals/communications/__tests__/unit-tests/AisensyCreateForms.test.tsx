import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CreateTemplateForm } from '../../src/pages/whatsapp-page/wa-aisensy/create-template-form';
import { CreateCampaignForm } from '../../src/pages/whatsapp-page/wa-aisensy/create-campaign-form';
import {
  createTemplateSchema,
  emptyValues,
  toCreateInput,
} from '../../src/pages/whatsapp-page/wa-aisensy/create-template-form';
import DraftPreview from '../../src/pages/whatsapp-page/wa-aisensy/create-template-form/DraftPreview';
import type { AisensyTemplate } from '../../src/pages/whatsapp-page/queries';
import { renderWithProviders } from '../testkit';

const type = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const choose = async (label: RegExp | string, option: RegExp | string) => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
};

describe('toCreateInput and the template schema', () => {
  const t = (key: string) => key;

  it('omits blank header and footer lines instead of sending empties', () => {
    const input = toCreateInput({ ...emptyValues(), name: 'a', body: 'b', sample: 'c', language: 'en' });
    expect(input.header_text).toBeUndefined();
    expect(input.footer_text).toBeUndefined();
    expect(toCreateInput({ ...emptyValues(), header_text: 'Hi', footer_text: 'Bye' })).toMatchObject({
      header_text: 'Hi',
      footer_text: 'Bye',
    });
  });

  it('rejects a name with capitals, a sample that still has placeholders, and over-long lines', () => {
    const schema = createTemplateSchema(t);
    const bad = schema.safeParse({
      ...emptyValues(),
      name: 'Order Placed',
      language: 'en',
      body: 'Hi {{1}}',
      sample: 'Hi {{1}}',
      header_text: 'x'.repeat(61),
    });
    expect(bad.success).toBe(false);
    const paths = bad.success ? [] : bad.error.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(['name', 'sample', 'header_text']));
    expect(
      schema.safeParse({ ...emptyValues(), name: 'order_placed', language: 'en', body: 'Hi {{1}}', sample: 'Hi Asha' })
        .success
    ).toBe(true);
  });
});

describe('CreateTemplateForm', () => {
  const mount = (over = {}) => {
    const h = { onClose: vi.fn(), onSubmit: vi.fn().mockResolvedValue(true) };
    renderWithProviders(<CreateTemplateForm open busy={false} {...h} {...over} />);
    return h;
  };

  it('keeps submit disabled until the template is valid', async () => {
    mount();
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeDisabled();
    type('Template name *', 'Bad Name');
    await waitFor(() =>
      expect(screen.getByText('Use lowercase letters, numbers and underscores only')).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeDisabled();
  });

  it('submits the typed template and closes once AiSensy accepted it', async () => {
    const h = mount();
    type('Template name *', 'order_placed');
    type('Language *', 'en');
    type('Message body *', 'Hi {{1}}, order {{2}} placed');
    type('Sample message *', 'Hi Asha, order ORD-1 placed');
    await choose(/Meta category/, 'MARKETING');
    const submit = screen.getByRole('button', { name: 'Submit for review' });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    await waitFor(() =>
      expect(h.onSubmit).toHaveBeenCalledWith({
        name: 'order_placed',
        category: 'MARKETING',
        language: 'en',
        type: 'TEXT',
        body: 'Hi {{1}}, order {{2}} placed',
        sample: 'Hi Asha, order ORD-1 placed',
        header_text: undefined,
        footer_text: undefined,
      })
    );
    await waitFor(() => expect(h.onClose).toHaveBeenCalled());
  });

  it('keeps the draft open when AiSensy refused', async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    const h = { ...mount({ onSubmit }), onSubmit };
    type('Template name *', 'order_placed');
    type('Language *', 'en');
    type('Message body *', 'Hi {{1}}, order {{2}} placed');
    type('Sample message *', 'Hi Asha, order ORD-1 placed');
    const submit = screen.getByRole('button', { name: 'Submit for review' });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    await waitFor(() => expect(h.onSubmit).toHaveBeenCalled());
    expect(h.onClose).not.toHaveBeenCalled();
  });

  it('disables cancel while a submission is in flight, and cancels otherwise', () => {
    const h = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(h.onClose).toHaveBeenCalled();
  });

  it('locks the dialog while busy', () => {
    mount({ busy: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});

describe('DraftPreview', () => {
  const draft = (over = {}) => ({ ...emptyValues(), name: 'tpl', body: 'Hi {{1}}', ...over });

  it('draws the body as the recipient sees it', () => {
    renderWithProviders(<DraftPreview values={draft({ header_text: 'Welcome', footer_text: 'Duncit' })} />);
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(screen.getByText('Duncit')).toBeInTheDocument();
  });

  it('treats a media type with no header line as a media header', () => {
    const { container } = renderWithProviders(<DraftPreview values={draft({ type: 'FILE' })} />);
    expect(container.textContent).toMatch(/document|file/i);
  });

  it('treats a typed header line as text even against a media type', () => {
    renderWithProviders(<DraftPreview values={draft({ type: 'IMAGE', header_text: 'Header line' })} />);
    expect(screen.getByText('Header line')).toBeInTheDocument();
  });
});

describe('CreateCampaignForm', () => {
  const tpl = (name: string, params = 1) => ({ id: name, name, language: 'en', param_count: params }) as unknown as AisensyTemplate;
  const mount = (over = {}) => {
    const h = { onClose: vi.fn(), onSubmit: vi.fn().mockResolvedValue(true) };
    renderWithProviders(
      <CreateCampaignForm
        open
        busy={false}
        orphans={[tpl('orphan_tpl', 2)]}
        bound={[tpl('bound_tpl', 1)]}
        {...h}
        {...over}
      />
    );
    return h;
  };

  it('offers unbound templates first with their parameter count, then bound ones', async () => {
    mount();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: /Approved template/ }));
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent).slice(-2)).toEqual([
      'orphan_tpl · 2 parameters',
      'bound_tpl · 1 parameter',
    ]);
  });

  it('warns about templates with no campaign only when there are some', () => {
    mount({ orphans: [] });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('binds the chosen template to a valid campaign name', async () => {
    const h = mount();
    await choose(/Approved template/, 'orphan_tpl · 2 parameters');
    type(/Campaign name/, 'welcome_to_duncit');
    const submit = screen.getByRole('button', { name: 'Create campaign' });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    await waitFor(() =>
      expect(h.onSubmit).toHaveBeenCalledWith({
        template_name: 'orphan_tpl',
        campaign_name: 'welcome_to_duncit',
      })
    );
    await waitFor(() => expect(h.onClose).toHaveBeenCalled());
  });

  it('closes on Escape when idle, but not while a submission is in flight', async () => {
    const idle = mount();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(idle.onClose).toHaveBeenCalled());
  });

  it('ignores Escape and locks the actions while busy, and says it is submitting', () => {
    const busy = mount({ busy: true });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(busy.onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Create campaign' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();
  });

  it('keeps the dialog open when the campaign was refused', async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    const h = { ...mount({ onSubmit }), onSubmit };
    await choose(/Approved template/, 'orphan_tpl · 2 parameters');
    type(/Campaign name/, 'welcome_to_duncit');
    const submit = screen.getByRole('button', { name: 'Create campaign' });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    await waitFor(() => expect(h.onSubmit).toHaveBeenCalled());
    expect(h.onClose).not.toHaveBeenCalled();
  });

  it('refuses a campaign name that AiSensy would not accept', async () => {
    mount();
    await choose(/Approved template/, 'bound_tpl · 1 parameter');
    type(/Campaign name/, 'Not Valid!');
    await waitFor(() =>
      expect(within(document.body).getByText('Use lowercase letters, numbers and underscores only')).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: 'Create campaign' })).toBeDisabled();
  });
});
