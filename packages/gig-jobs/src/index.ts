/**
 * `@duncit/gig-jobs` — Gig Jobs as ONE MUI set for mWeb and the Partners
 * console: the board, a gig's page (interest + contact sharing), the post
 * form, My posts and the freelancer profile (Earn with Duncit's freelancer step).
 *
 * Mount the screens inside a `GigSurfaceProvider`, which says where links go on
 * that surface. The contract (documents, labels, form <-> input) is
 * @duncit/utils' `gig-jobs`, so the native app's Tamagui twins read the same.
 */
export { GigSurfaceProvider, useGigSurface, type GigSurfaceConfig } from './GigSurfaceProvider';
export { default as GigBoard } from './board/GigBoard';
export { default as MyGigJobs } from './board/MyGigJobs';
export { default as GigJobDetail } from './detail/GigJobDetail';
export { default as GigJobEditor } from './form/GigJobEditor';
export { default as FreelancerProfileEditor } from './freelancer/FreelancerProfileEditor';
export { default as ContactSharingNotice } from './ContactSharingNotice';
