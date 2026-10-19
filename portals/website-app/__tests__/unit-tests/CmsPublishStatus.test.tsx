import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import PublishStatus from '../../src/pages/cms/components/PublishStatus';
import { renderWithProviders } from '../testkit';
import { en } from '../en';

const LIVE = en('websiteApp.cms.pages.published');
const DRAFT = en('websiteApp.cms.pages.draft');
const CHANGES = en('websiteApp.cms.pages.changes');

describe('PublishStatus', () => {
  it('marks a live page that has moved on in its draft', () => {
    renderWithProviders(<PublishStatus published changes />);
    expect(screen.getByText(LIVE)).toBeInTheDocument();
    expect(screen.getByText(CHANGES)).toBeInTheDocument();
    expect(screen.queryByText(DRAFT)).not.toBeInTheDocument();
  });

  it('shows a live page with nothing pending as just live', () => {
    renderWithProviders(<PublishStatus published changes={false} />);
    expect(screen.getByText(LIVE)).toBeInTheDocument();
    expect(screen.queryByText(CHANGES)).not.toBeInTheDocument();
  });

  it('never flags pending changes on a page that is not live yet', () => {
    renderWithProviders(<PublishStatus published={false} changes />);
    expect(screen.getByText(DRAFT)).toBeInTheDocument();
    expect(screen.queryByText(LIVE)).not.toBeInTheDocument();
    expect(screen.queryByText(CHANGES)).not.toBeInTheDocument();
  });
});
