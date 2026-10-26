import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ToolsFilters from '../../../src/pages/tools/ToolsFilters';
import { CONNECTORS, categoryCount } from '../../mocks/fixtures';

const CATEGORIES = [categoryCount({ category: 'pods', label: 'Pods', tools: 1200 }), categoryCount({ category: 'finance', label: 'Finance', tools: 1 })];

const renderFilters = (over: Partial<Parameters<typeof ToolsFilters>[0]> = {}) => {
  const props = {
    connectors: CONNECTORS,
    connector: 'gateway',
    onConnector: vi.fn(),
    total: 1201,
    categories: CATEGORIES,
    category: '',
    onCategory: vi.fn(),
    ...over,
  };
  render(<ToolsFilters {...props} />);
  return props;
};

describe('ToolsFilters', () => {
  it('says how many tools the connector has, and how many in each category', () => {
    renderFilters();
    expect(screen.getByTestId('mcp-tools-total')).toHaveTextContent('1,201 tools');
    expect(screen.getByRole('button', { name: 'Pods (1,200)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finance (1)' })).toBeInTheDocument();
  });

  it('says "tool" for exactly one', () => {
    renderFilters({ total: 1 });
    expect(screen.getByTestId('mcp-tools-total')).toHaveTextContent(/^1 tool$/);
  });

  it('narrows to a category when its chip is pressed', () => {
    const first = renderFilters();
    fireEvent.click(screen.getByRole('button', { name: 'Finance (1)' }));
    expect(first.onCategory).toHaveBeenCalledWith('finance');
  });

  it('marks the chosen category as pressed and lets it be cleared', () => {
    const props = renderFilters({ category: 'finance' });
    expect(screen.getByRole('button', { name: 'Finance (1)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All categories' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Finance (1)' }));
    expect(props.onCategory).toHaveBeenLastCalledWith('');
    fireEvent.click(screen.getByRole('button', { name: 'All categories' }));
    expect(props.onCategory).toHaveBeenLastCalledWith('');
  });

  it('switches connector, and will not offer one the account cannot open', () => {
    const props = renderFilters();
    fireEvent.mouseDown(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: 'Finance console' })).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByRole('option', { name: 'Pods console' }));
    expect(props.onConnector).toHaveBeenCalledWith('pods');
  });
});
