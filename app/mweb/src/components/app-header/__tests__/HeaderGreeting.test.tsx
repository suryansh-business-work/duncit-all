import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HeaderGreeting from '../HeaderGreeting';
import HeaderLocationRow from '../HeaderLocationRow';

describe('HeaderGreeting', () => {
  it('renders the provided tagline (trimmed)', () => {
    render(<HeaderGreeting tagline="  Hello There  " />);
    expect(screen.getByText('Hello There')).toBeInTheDocument();
  });

  it('falls back to the default tagline when tagline is empty/whitespace', () => {
    render(<HeaderGreeting tagline="   " />);
    expect(screen.getByText('It All Starts Here!')).toBeInTheDocument();
  });

  it('falls back to the default tagline when tagline is null', () => {
    render(<HeaderGreeting tagline={null} />);
    expect(screen.getByText('It All Starts Here!')).toBeInTheDocument();
  });

  it('does not render the location button when onOpenLocation is omitted', () => {
    render(<HeaderGreeting tagline="Hi" />);
    expect(screen.queryByRole('button', { name: 'Change city or zone' })).not.toBeInTheDocument();
  });
});

// The location pill moved out of the greeting into row one of the header;
// its cases follow it.
describe('HeaderLocationRow', () => {
  it('renders city + zone text when both provided', () => {
    render(
      <HeaderLocationRow
        loading={false}
        hasData={true}
        selectedLocationName="Mumbai"
        selectedZoneName="Bandra"
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByText('Mumbai · Bandra')).toBeInTheDocument();
  });

  it('renders only the city when no zone is provided', () => {
    render(
      <HeaderLocationRow loading={false} hasData={true} selectedLocationName="Delhi" onOpen={vi.fn()} />,
    );
    expect(screen.getByText('Delhi')).toBeInTheDocument();
  });

  it('renders the Select city placeholder when no location name is provided', () => {
    render(<HeaderLocationRow loading={false} hasData={true} onOpen={vi.fn()} />);
    expect(screen.getByText('Select city')).toBeInTheDocument();
  });

  it('uses the Select city placeholder before a zone when location is missing', () => {
    render(
      <HeaderLocationRow loading={false} hasData={true} selectedZoneName="Bandra" onOpen={vi.fn()} />,
    );
    expect(screen.getByText('Select city · Bandra')).toBeInTheDocument();
  });

  it('shows a skeleton (no city text) while loading with no data', () => {
    render(
      <HeaderLocationRow loading={true} hasData={false} selectedLocationName="Delhi" onOpen={vi.fn()} />,
    );
    expect(screen.queryByText('Delhi')).not.toBeInTheDocument();
  });

  it('shows the city text while loading if data already exists', () => {
    render(
      <HeaderLocationRow loading={true} hasData={true} selectedLocationName="Delhi" onOpen={vi.fn()} />,
    );
    expect(screen.getByText('Delhi')).toBeInTheDocument();
  });

  it('calls onOpen on click', () => {
    const onOpen = vi.fn();
    render(
      <HeaderLocationRow loading={false} hasData={true} selectedLocationName="Delhi" onOpen={onOpen} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Change city or zone' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('calls onOpen on Enter and Space keys', () => {
    const onOpen = vi.fn();
    render(
      <HeaderLocationRow loading={false} hasData={true} selectedLocationName="Delhi" onOpen={onOpen} />,
    );
    const btn = screen.getByRole('button', { name: 'Change city or zone' });
    fireEvent.keyDown(btn, { key: 'Enter' });
    fireEvent.keyDown(btn, { key: ' ' });
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it('ignores other keys', () => {
    const onOpen = vi.fn();
    render(
      <HeaderLocationRow loading={false} hasData={true} selectedLocationName="Delhi" onOpen={onOpen} />,
    );
    fireEvent.keyDown(screen.getByRole('button', { name: 'Change city or zone' }), { key: 'Tab' });
    expect(onOpen).not.toHaveBeenCalled();
  });
});
