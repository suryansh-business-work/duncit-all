import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TemplateList from './TemplateList';
import type { Tpl } from './queries';

const tpl = (over: Partial<Tpl>): Tpl => ({
  template_id: 't1',
  slug: 'welcome',
  name: 'Welcome',
  subject: 'Hi',
  mjml: '<mjml></mjml>',
  variables: [],
  is_active: true,
  ...over,
});

describe('TemplateList', () => {
  it('renders each template, marks inactive ones with an "off" chip, and fires onSelect', () => {
    const onSelect = vi.fn();
    const list = [
      tpl({ template_id: 't1', name: 'Welcome', slug: 'welcome', is_active: true }),
      tpl({ template_id: 't2', name: 'Receipt', slug: 'payment-receipt', is_active: false }),
    ];
    render(<TemplateList list={list} selected="t1" onSelect={onSelect} />);

    expect(screen.getByText('Welcome')).toBeInTheDocument();
    expect(screen.getByText('payment-receipt')).toBeInTheDocument();
    expect(screen.getByText('off')).toBeInTheDocument(); // only the inactive row

    fireEvent.click(screen.getByText('Receipt'));
    expect(onSelect).toHaveBeenCalledWith('t2');
  });
});
