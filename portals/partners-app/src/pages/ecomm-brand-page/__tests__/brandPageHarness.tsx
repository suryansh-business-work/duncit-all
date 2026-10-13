import '../../../../__tests__/helpers/agGridEnv';
import '../../../__tests__/groupC-wide-grid';
import { fireEvent, screen } from '@testing-library/react';
import EcommBrandPage from '../EcommBrandPage';
import { renderWithProviders } from '../../../__tests__/render';
import { scriptedLink, type ScriptedAnswer, type SentOperation } from '../../../__tests__/groupC-link';
import { brandRow, brandsPage, connected } from './brandRows';

export const TABLE = 'MyEcommBrandsTable';
export const REQUESTS = 'PartnerMyCatalogDeletionRequests';

export const draft = brandRow();
export const live = brandRow({
  id: 'b2',
  brand_name: 'Blue Kettle',
  tagline: '',
  status: 'APPROVED',
  live: true,
  completion: { __typename: 'BrandCompletion', percent: 100 },
  integrations: connected(true, true),
});
export const paused = brandRow({ id: 'b3', brand_name: 'Cedar Cats', status: 'APPROVED', is_active: false, integrations: connected(true, false) });
export const submitted = brandRow({ id: 'b4', brand_name: 'Delta Dogs', status: 'SUBMITTED', shipping_mode: 'DUNCIT_COURIER' });

export const mount = (answers: Record<string, ScriptedAnswer> = {}, sent: SentOperation[] = []) =>
  renderWithProviders(<EcommBrandPage />, {
    route: '/ecomm-brand',
    link: scriptedLink(
      {
        [TABLE]: brandsPage([draft, live, paused, submitted]),
        [REQUESTS]: { myCatalogDeletionRequests: [] },
        ...answers,
      },
      sent,
    ),
  });

export const rowOf = async (name: string) =>
  (await screen.findByText(name)).closest('[role="row"]') as HTMLElement;

/** Opens the kebab menu of the brand row with this name. */
export const openMenu = async (name: string) => {
  await rowOf(name);
  fireEvent.click(await screen.findByRole('button', { name: `Options for ${name}` }));
  return screen.findByRole('menu');
};

export const where = () => screen.getByTestId('location').textContent;
