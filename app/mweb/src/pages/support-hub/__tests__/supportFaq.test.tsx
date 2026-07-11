import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FrequentlyAsked from '../FrequentlyAsked';
import SupportTopics from '../SupportTopics';
import type { FaqGroup, FaqItem } from '../faqQueries';

const faqs: FaqItem[] = [
  { id: 'f1', question: 'How do I cancel an order?', answer: 'Go to Pod History.' },
  { id: 'f2', question: 'Where is my refund?', answer: 'Refunds take 5 days.' },
];

const groups: FaqGroup[] = [
  { super_category: { id: 's1', name: 'Payments', slug: 'payments', icon: '💳' }, faqs },
  { super_category: null, faqs: [faqs[0]] },
];

describe('FrequentlyAsked', () => {
  it('renders question cards and opens the tapped FAQ', () => {
    const onOpen = vi.fn();
    render(<FrequentlyAsked faqs={faqs} onOpen={onOpen} />);
    expect(screen.getByText('How do I cancel an order?')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Where is my refund?'));
    expect(onOpen).toHaveBeenCalledWith(faqs[1]);
  });

  it('renders nothing without FAQs', () => {
    const { container } = render(<FrequentlyAsked faqs={[]} onOpen={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('SupportTopics', () => {
  it('lists categories with article counts (singular/plural + General fallback)', () => {
    render(
      <MemoryRouter>
        <SupportTopics groups={groups} />
      </MemoryRouter>
    );
    expect(screen.getByText('Payments')).toBeInTheDocument();
    expect(screen.getByText('2 articles')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('1 article')).toBeInTheDocument();
  });

  it('renders nothing without groups', () => {
    const { container } = render(
      <MemoryRouter>
        <SupportTopics groups={[]} />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
