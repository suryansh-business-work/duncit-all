import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmailPreviewFrame from '../../src/components/EmailPreviewFrame';

describe('EmailPreviewFrame', () => {
  it('renders the html in a titled frame', () => {
    render(
      <EmailPreviewFrame title="Preview" html="<p>hi</p>" errors={[]} loading={false} />
    );
    expect(screen.getByTitle('Preview')).toBeInTheDocument();
    expect(screen.queryByText('Rendering preview…')).toBeNull();
  });

  /**
   * The whole point of the line: MJML compiles on the server, so the frame
   * below it is showing the PREVIOUS render. Without the line that reads as a
   * preview that ignored the edit.
   */
  it('says it is still rendering, and keeps the last render on screen', () => {
    render(
      <EmailPreviewFrame title="Preview" html="<p>old</p>" errors={[]} loading />
    );
    expect(screen.getByText('Rendering preview…')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    // Not blanked — an operator comparing old with new needs to see the old.
    expect(screen.getByTitle('Preview')).toHaveAttribute('srcdoc', '<p>old</p>');
  });

  it('shows the first three render errors and no more', () => {
    render(
      <EmailPreviewFrame
        title="Preview"
        html=""
        errors={['one', 'two', 'three', 'four']}
        loading={false}
      />
    );
    expect(screen.getByText('one · two · three')).toBeInTheDocument();
    expect(screen.queryByText(/four/)).toBeNull();
  });
});
