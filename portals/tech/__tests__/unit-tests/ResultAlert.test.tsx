import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResultAlert from '../../src/pages/environment/test-panels/ResultAlert';

describe('ResultAlert', () => {
  it('renders nothing without a result', () => {
    const { container } = render(<ResultAlert result={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a success banner with just the message when there are no details', () => {
    render(<ResultAlert result={{ ok: true, message: 'Connected' }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Connected');
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-colorSuccess');
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('treats null details like none', () => {
    render(<ResultAlert result={{ ok: false, message: 'Refused', details: null }} />);
    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-colorError');
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('lists every finding under the message on failure', () => {
    render(<ResultAlert result={{ ok: false, message: 'Checks failed', details: ['DNS failed', 'TLS expired'] }} />);
    expect(screen.getByText('Checks failed')).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items.map((i) => i.textContent)).toEqual(['DNS failed', 'TLS expired']);
  });
});
