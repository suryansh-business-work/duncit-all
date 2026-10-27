import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { gql } from '@apollo/client';
import type { SendPodPartnerRequestInput } from '@duncit/gql-types';
import { useRequestPod } from '../useRequestPod';
import type { NearbyCardData } from '../NearbyResultCard';
import { renderWithProviders } from '../../../../__tests__/render';
import { scriptedLink, type SentOperation } from '../../../../__tests__/groupC-link';

afterEach(cleanup);

const SEARCH = gql`
  query SearchStub {
    nothing
  }
`;

const toInput = (item: NearbyCardData, note: string | null): SendPodPartnerRequestInput =>
  ({ direction: 'VENUE_TO_HOST', venue_id: 'v1', host_user_id: item.id, note }) as SendPodPartnerRequestInput;

function Probe() {
  const request = useRequestPod({ search: SEARCH, toInput });
  return (
    <button type="button" onClick={() => request.submit({ note: 'Hello' })}>
      submit with nothing chosen
    </button>
  );
}

describe('useRequestPod', () => {
  it('sends nothing when asked to submit before anyone was chosen', async () => {
    const sent: SentOperation[] = [];
    renderWithProviders(<Probe />, { link: scriptedLink({}, sent) });
    fireEvent.click(screen.getByRole('button', { name: 'submit with nothing chosen' }));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(sent.some((op) => op.name === 'PartnersSendPodRequest')).toBe(false);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
