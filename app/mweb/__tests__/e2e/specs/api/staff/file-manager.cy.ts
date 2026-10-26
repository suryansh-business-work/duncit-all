/// <reference types="cypress" />
import type { E2eStaffRole } from '@duncit/utils';
import { revokeRunRoles, signInRunMember } from '../../../support/access-steps';
import { asRole, call, expectCallsRefused, expectRead } from '../../../support/api-staff';

/**
 * Portal shell › File Manager — anyone signed in browses and uploads; renaming,
 * re-tagging, deleting and purging what is already there is SUPER_ADMIN and
 * TECH_MANAGER only (platform/upload/upload.resolver.ts MEDIA_WRITE_ROLES,
 * checked before ImageKit is called). Scenario map: Staff › File Manager
 * "Read-only file access".
 */

const ROLES: readonly E2eStaffRole[] = ['CITY_ADMIN'];
const NO_FILE = 'e2e-no-such-file';

const BROWSE = call('mediaFiles', `query E2eMediaFiles { mediaFiles(limit: 1) { fileId } }`);
const MEDIA_WRITES = [
  call('deleteMediaFiles', `mutation E2eDeleteMediaFiles($id: ID!) { deleteMediaFiles(fileIds: [$id]) }`, { id: NO_FILE }),
  call(
    'renameMediaFile',
    `mutation E2eRenameMediaFile($id: ID!) { renameMediaFile(fileId: $id, newFileName: "e2e.png") { __typename } }`,
    { id: NO_FILE },
  ),
  call(
    'updateMediaFile',
    `mutation E2eUpdateMediaFile($id: ID!) { updateMediaFile(fileId: $id, tags: ["e2e"]) { __typename } }`,
    { id: NO_FILE },
  ),
  call('purgeMediaCache', `mutation E2ePurgeMediaCache { purgeMediaCache(url: "https://example.com/e2e.png") }`),
];

describe('API · The file manager is read-only without a media write role', { testIsolation: false }, () => {
  before(() => {
    signInRunMember();
  });

  after(() => {
    revokeRunRoles(ROLES);
  });

  it('FM-01 CITY_ADMIN browses the files but is refused delete, rename, re-tag and cache purge', () => {
    asRole('CITY_ADMIN', (token) => {
      expectRead<unknown[]>(token, BROWSE).then((files) => {
        expect(files, 'files a staff member may browse').to.be.an('array');
      });
      expectCallsRefused(token, MEDIA_WRITES);
    });
  });
});
