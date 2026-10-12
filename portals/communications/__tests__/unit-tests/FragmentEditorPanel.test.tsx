import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../testkit';

vi.mock('@monaco-editor/react', () => ({
  default: (p: { value: string; onChange: (v?: string) => void }) => (
    <textarea
      aria-label="code"
      value={p.value}
      onChange={(e) => p.onChange(e.target.value || undefined)}
    />
  ),
}));
vi.mock('../../src/components/EmailPreviewFrame', () => ({
  default: (p: { html: string; errors: string[]; loading: boolean }) => (
    <div>
      preview:{p.html}:{p.errors.join('|')}:{String(p.loading)}
    </div>
  ),
}));
vi.mock('../../src/pages/email-fragments-page/FragmentUsageStrip', () => ({
  default: (p: { fragmentKey: string; templates: unknown[] }) => (
    <div>
      usage:{p.fragmentKey}:{p.templates.length}
    </div>
  ),
}));

import FragmentEditorPanel from '../../src/pages/email-fragments-page/FragmentEditorPanel';
import FragmentCodePane from '../../src/pages/email-fragments-page/FragmentCodePane';
import type { Fragment } from '../../src/pages/email-fragments-page/queries';

const draft = (over: Partial<Fragment> = {}): Fragment => ({
  fragment_id: 'f1',
  key: 'transactional',
  name: 'Transactional',
  is_system: true,
  description: 'Receipts and confirmations',
  header_mjml: '<mj-section/>',
  footer_mjml: '<mj-footer/>',
  is_active: true,
  ...over,
});

const mount = (fragment: Fragment, over: Record<string, unknown> = {}) => {
  const h = { setDraft: vi.fn(), onSave: vi.fn(), onReset: vi.fn(), onDelete: vi.fn() };
  renderWithProviders(
    <FragmentEditorPanel
      draft={fragment}
      previewHtml="<p>hi</p>"
      previewErrors={['bad tag']}
      previewLoading
      templates={[]}
      dirty
      busy={false}
      {...h}
      {...over}
    />
  );
  return h;
};

describe('FragmentEditorPanel', () => {
  it('shows the fragment, what it wraps and the live preview state', () => {
    mount(draft());
    expect(screen.getByDisplayValue('Transactional')).toBeInTheDocument();
    expect(screen.getByText('transactional', { selector: '.MuiChip-label' })).toBeInTheDocument();
    expect(screen.getByText('Receipts and confirmations')).toBeInTheDocument();
    expect(screen.getByText('usage:transactional:0')).toBeInTheDocument();
    expect(screen.getByText('preview:<p>hi</p>:bad tag:true')).toBeInTheDocument();
  });

  it('writes name, active switch, header and footer edits back to the draft', () => {
    const h = mount(draft());
    fireEvent.change(screen.getByDisplayValue('Transactional'), { target: { value: 'Receipts' } });
    expect(h.setDraft).toHaveBeenLastCalledWith(expect.objectContaining({ name: 'Receipts' }));

    fireEvent.click(screen.getByRole('switch'));
    expect(h.setDraft).toHaveBeenLastCalledWith(expect.objectContaining({ is_active: false }));

    const [header, footer] = screen.getAllByLabelText('code');
    fireEvent.change(header, { target: { value: '<mj-header/>' } });
    expect(h.setDraft).toHaveBeenLastCalledWith(expect.objectContaining({ header_mjml: '<mj-header/>' }));
    fireEvent.change(footer, { target: { value: '<mj-end/>' } });
    expect(h.setDraft).toHaveBeenLastCalledWith(expect.objectContaining({ footer_mjml: '<mj-end/>' }));
  });

  it('offers reset, not delete, for a fragment that ships with Duncit', () => {
    const h = mount(draft());
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset to shipped' }));
    expect(h.onReset).toHaveBeenCalled();
  });

  it('offers delete, not reset, for a fragment somebody added', () => {
    const h = mount(draft({ is_system: false, description: '' }));
    expect(screen.queryByRole('button', { name: 'Reset to shipped' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(h.onDelete).toHaveBeenCalled();
    expect(screen.queryByText('Receipts and confirmations')).not.toBeInTheDocument();
  });

  it('disables Save when there is nothing to save', () => {
    mount(draft(), { dirty: false });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('saves a dirty draft', () => {
    const h = mount(draft());
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(h.onSave).toHaveBeenCalled();
  });

  it('locks every action while busy', () => {
    mount(draft(), { busy: true });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset to shipped' })).toBeDisabled();
  });
});

describe('FragmentCodePane', () => {
  it('formats the MJML in place', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <FragmentCodePane title="Header" hint="above" value="<mjml><mj-body></mj-body></mjml>" onChange={onChange} />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const formatted = onChange.mock.calls[0][0] as string;
    expect(formatted).toContain('<mj-body>');
    expect(formatted).not.toBe('');
  });

  it('turns an emptied editor into an empty string', () => {
    const onChange = vi.fn();
    renderWithProviders(<FragmentCodePane title="Footer" hint="below" value="x" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('code'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith('');
  });
});
