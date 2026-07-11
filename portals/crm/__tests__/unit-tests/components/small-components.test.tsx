import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form';
import { StatusChip, PriorityChip } from '@/components/StatusChips';
import ExternalLink from '@/components/ExternalLink';
import LeadStatTile from '@/components/LeadStatTile';
import MapEmbed from '@/components/MapEmbed';
import LeadTabs from '@/components/LeadTabs';
import ServicesGrid from '@/components/ServicesGrid';
import ConfirmDialog from '@/components/ConfirmDialog';
import FormAccordion from '@/components/FormAccordion';
import { LeadDetailCard, LeadDetailRow } from '@/components/LeadDetailCard';

describe('StatusChip', () => {
  it('renders the value as the label', () => {
    render(<StatusChip value="New" />);
    expect(screen.getByText('New')).toBeTruthy();
  });
  it('falls back to default color for unknown statuses', () => {
    const { container } = render(<StatusChip value="Whatever" />);
    expect(container.querySelector('.MuiChip-colorDefault')).toBeTruthy();
  });
});

describe('PriorityChip', () => {
  it('renders the priority label', () => {
    render(<PriorityChip value="High" />);
    expect(screen.getByText('High')).toBeTruthy();
  });
  it('falls back to default for unknown priorities', () => {
    const { container } = render(<PriorityChip value="Unknown" />);
    expect(container.querySelector('.MuiChip-colorDefault')).toBeTruthy();
  });
});

describe('ExternalLink', () => {
  it('renders the href as text when no children given and adds noreferrer noopener', () => {
    render(<ExternalLink href="https://example.com" />);
    const a = screen.getByRole('link') as HTMLAnchorElement;
    expect(a.href).toContain('https://example.com');
    expect(a.target).toBe('_blank');
    expect(a.rel).toContain('noreferrer');
    expect(a.rel).toContain('noopener');
  });
  it('uses children as the display text when supplied', () => {
    render(<ExternalLink href="https://example.com">Open Site</ExternalLink>);
    expect(screen.getByText('Open Site')).toBeTruthy();
  });
  it('omits the icon when withIcon=false', () => {
    const { container } = render(<ExternalLink href="https://example.com" withIcon={false}>Plain</ExternalLink>);
    expect(container.querySelector('svg')).toBeNull();
  });
});

describe('LeadStatTile', () => {
  it('renders label, value and hint', () => {
    render(<LeadStatTile label="Capacity" value="500" hint="seated" />);
    expect(screen.getByText('Capacity')).toBeTruthy();
    expect(screen.getByText('500')).toBeTruthy();
    expect(screen.getByText('seated')).toBeTruthy();
  });
  it('renders an icon slot when provided', () => {
    const { container } = render(<LeadStatTile label="L" value="V" icon={<span data-testid="icon" />} />);
    expect(container.querySelector('[data-testid="icon"]')).toBeTruthy();
  });
  it('honours accent variants', () => {
    const { container } = render(<LeadStatTile label="L" value="V" icon={<span />} accent="success" />);
    expect(container).toBeTruthy();
  });
});

describe('MapEmbed', () => {
  it('renders an empty-state message for blank addresses', () => {
    render(<MapEmbed address="   " />);
    expect(screen.getByText(/Add an address/i)).toBeTruthy();
  });
  it('renders an iframe with the encoded address', () => {
    const { container } = render(<MapEmbed address="Mumbai" />);
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe!.getAttribute('src')).toContain('Mumbai');
  });
  it('prefers mapLink for the deeplink when supplied', () => {
    render(<MapEmbed address="Mumbai" mapLink="https://maps.example/x" />);
    const link = screen.getByText(/Open in Google Maps/i).closest('a') as HTMLAnchorElement;
    expect(link.href).toContain('maps.example/x');
  });
});

describe('LeadTabs', () => {
  it('renders the first tab by default and switches on click', () => {
    render(
      <LeadTabs
        tabs={[
          { value: 'a', label: 'Alpha', render: () => <div data-testid="panel-a">A panel</div> },
          { value: 'b', label: 'Beta', render: () => <div data-testid="panel-b">B panel</div> },
        ]}
      />
    );
    expect(screen.getByTestId('panel-a')).toBeTruthy();
    fireEvent.click(screen.getByText('Beta'));
    expect(screen.getByTestId('panel-b')).toBeTruthy();
  });
  it('honours defaultValue', () => {
    render(
      <LeadTabs
        defaultValue="b"
        tabs={[
          { value: 'a', label: 'Alpha', render: () => <div data-testid="panel-a" /> },
          { value: 'b', label: 'Beta', render: () => <div data-testid="panel-b" /> },
        ]}
      />
    );
    expect(screen.getByTestId('panel-b')).toBeTruthy();
  });
});

describe('ServicesGrid', () => {
  it('renders the empty state when no services', () => {
    render(<ServicesGrid services={[]} />);
    expect(screen.getByText(/No services tagged/i)).toBeTruthy();
  });
  it('renders standard and "Other" services with descriptions and the Custom chip', () => {
    render(
      <ServicesGrid
        services={[
          { service: 'Catering', description: 'Veg + non-veg' },
          { service: 'Other', custom_name: 'Mehndi artist', description: '' },
        ]}
      />
    );
    expect(screen.getByText('Catering')).toBeTruthy();
    expect(screen.getByText('Veg + non-veg')).toBeTruthy();
    expect(screen.getByText('Mehndi artist')).toBeTruthy();
    expect(screen.getByText('Custom')).toBeTruthy();
    expect(screen.getByText('No description.')).toBeTruthy();
  });
  it('falls back to "Other" label when custom_name is empty', () => {
    render(<ServicesGrid services={[{ service: 'Other', custom_name: '   ' }]} />);
    expect(screen.getByText('Other')).toBeTruthy();
  });
});

describe('ConfirmDialog', () => {
  it('does not render content when closed', () => {
    render(<ConfirmDialog open={false} title="Delete" message="Sure?" onConfirm={() => undefined} onClose={() => undefined} />);
    expect(screen.queryByText('Delete')).toBeNull();
  });
  it('calls onConfirm when the danger button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog open title="Delete" message="Sure?" onConfirm={onConfirm} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<ConfirmDialog open title="Delete" message="Sure?" onConfirm={() => undefined} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('shows the loading state on the confirm button', () => {
    render(<ConfirmDialog open title="Delete" message="Sure?" loading onConfirm={() => undefined} onClose={() => undefined} />);
    expect(screen.getByRole('button', { name: /Working/i })).toBeTruthy();
  });
});

function AccordionHarness({
  fieldPaths,
  defaultExpanded,
  withError,
}: Readonly<{ fieldPaths?: string[]; defaultExpanded?: boolean; withError?: boolean }>) {
  const methods = useForm({
    defaultValues: { a: '' },
    resolver: withError
      ? async () => ({ values: {}, errors: { a: { type: 'required', message: 'Required' } } })
      : undefined,
  });
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(() => undefined)}>
        <FormAccordion title="Basics" fieldPaths={fieldPaths} defaultExpanded={defaultExpanded}>
          <div data-testid="inner">child</div>
        </FormAccordion>
        <button type="submit">submit</button>
      </form>
    </FormProvider>
  );
}

describe('FormAccordion', () => {
  it('renders the title and children', () => {
    render(<AccordionHarness defaultExpanded />);
    expect(screen.getByText('Basics')).toBeTruthy();
    expect(screen.getByTestId('inner')).toBeTruthy();
  });
  it('flags an error chip when fieldPaths have errors after submit', async () => {
    render(<AccordionHarness fieldPaths={['a']} withError />);
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));
    expect(await screen.findByText(/1 error/i)).toBeTruthy();
  });
});

describe('LeadDetailCard / LeadDetailRow', () => {
  it('renders title, subtitle and children', () => {
    render(
      <LeadDetailCard title="Contact" subtitle="Primary">
        <div data-testid="body">x</div>
      </LeadDetailCard>
    );
    expect(screen.getByText('Contact')).toBeTruthy();
    expect(screen.getByText('Primary')).toBeTruthy();
    expect(screen.getByTestId('body')).toBeTruthy();
  });
  it('renders em-dash when value is blank or null', () => {
    render(<LeadDetailRow label="Name" value="" />);
    expect(screen.getByText('—')).toBeTruthy();
  });
  it('renders string values inside a Typography', () => {
    render(<LeadDetailRow label="Name" value="Alice" />);
    expect(screen.getByText('Alice')).toBeTruthy();
  });
  it('renders ReactNode values as-is', () => {
    render(<LeadDetailRow label="Name" value={<span data-testid="custom">x</span>} />);
    expect(screen.getByTestId('custom')).toBeTruthy();
  });
});
