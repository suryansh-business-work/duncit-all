/// <reference types="cypress" />
import type { Translator } from '@duncit/i18n';
import { emulateReducedMotion, interceptQuery, visitSite, websiteCopy, type NavSite, type SiteKey } from '../../../../support/ui-websites';

/**
 * The home-page Reel Slider every Astro site renders (@duncit/brand
 * ReelSlider.astro + reel-slider-dom.ts): reels read at visit time from
 * publicWebsiteReels(site), the section hidden when there are none, every reel
 * muted, at most one with sound, nothing playing off screen, and still posters
 * for a visitor who asked for less motion. Playback itself is not asserted on
 * (an ImageKit stream is outside this run); the slider's own state is.
 */

interface Reel {
  id: string;
  title: string;
  video_url: string;
}

const REELS = `query E2eWebsiteReels($site: WebsiteNavSite!) { publicWebsiteReels(site: $site) { id title video_url } }`;
const ROOT = 'section[data-reel-slider]';

const sites: { site: SiteKey; key: NavSite }[] = [
  { site: 'main', key: 'MAIN' },
  { site: 'ads', key: 'ADS' },
  { site: 'earnwith', key: 'EARNWITH' },
  { site: 'partners', key: 'PARTNERS' },
];

const fill = (text: string, vars: Record<string, string | number>): string =>
  text.replaceAll(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));

describe('UI Websites · Reel slider', () => {
  let t: Translator['t'];

  before(() => {
    websiteCopy().then((copy) => {
      t = copy;
    });
  });

  for (const { site, key } of sites) {
    it(`REEL-01 ${site} shows its reels as muted slides with dots, or keeps the section hidden when it has none`, () => {
      cy.gql<{ publicWebsiteReels: Reel[] }>(REELS, { site: key }, { token: null }).then(({ publicWebsiteReels: reels }) => {
        interceptQuery('publicWebsiteReels', 'reels');
        visitSite(site);
        cy.wait('@reels').its('request.body.variables.site').should('eq', key);
        if (!reels.length) {
          cy.get(ROOT).should('have.attr', 'hidden');
          return;
        }
        cy.get(ROOT).should('not.have.attr', 'hidden');
        cy.get(`${ROOT} .reel-card`).should('have.length', reels.length);
        cy.get(`${ROOT} .reel-card[data-state="active"]`).should('have.length', 1).and('have.attr', 'aria-label', fill(t('website.brand.reels.slide'), { current: 1, total: reels.length }));
        cy.get(`${ROOT} video.reel-video`).each(($video) => {
          expect(($video[0] as HTMLVideoElement).muted, 'muted').to.eq(true);
        });
        cy.get(`${ROOT} [data-reel-dots] button`).should('have.length', reels.length);
      });
    });
  }

  describe('on duncit.com', () => {
    let reels: Reel[];

    before(() => {
      cy.gql<{ publicWebsiteReels: Reel[] }>(REELS, { site: 'MAIN' }, { token: null }).then((data) => {
        reels = data.publicWebsiteReels;
        if (reels.length < 2) throw new Error('Staging prerequisite: duncit.com needs at least two reels (Website portal > Reel Slider).');
      });
    });

    afterEach(() => {
      emulateReducedMotion(false);
    });

    it('REEL-02 turning sound on for one reel leaves every other muted, and the sound follows to the next reel', () => {
      // The slider drops sound when play() is refused (reel-slider-dom.ts play); the
      // stream is not under test, so play() is answered as the browser would on success.
      visitSite('main', '/', {
        onBeforeLoad(win) {
          win.HTMLMediaElement.prototype.play = () => Promise.resolve();
        },
      });
      cy.get(ROOT).scrollIntoView();
      cy.get(`${ROOT} .reel-card[data-state="active"] .reel-sound`).should('have.attr', 'aria-pressed', 'false').click();
      cy.get(`${ROOT} .reel-card[data-state="active"] .reel-sound`).should('have.attr', 'aria-pressed', 'true').and('have.attr', 'aria-label', t('website.brand.reels.mute'));
      cy.get(`${ROOT} .reel-sound[aria-pressed="true"]`).should('have.length', 1);
      cy.get(`${ROOT} video.reel-video`).then(($videos) => {
        const loud = [...$videos].filter((video) => !(video as HTMLVideoElement).muted);
        expect(loud, 'one reel with sound').to.have.length(1);
      });
      cy.get(`${ROOT} [data-reel-next]`).should('have.attr', 'aria-label', t('website.brand.reels.next')).click();
      cy.get(`${ROOT} [data-reel-live]`).should('readText', fill(t('website.brand.reels.slide'), { current: 2, total: reels.length }));
      cy.get(`${ROOT} .reel-card`).eq(1).should('have.attr', 'data-state', 'active').find('.reel-sound').should('have.attr', 'aria-pressed', 'true');
      cy.get(`${ROOT} .reel-sound[aria-pressed="true"]`).should('have.length', 1);
    });

    it('REEL-03 nothing plays while the slider is off screen', () => {
      visitSite('main');
      cy.scrollTo('top');
      cy.get(`${ROOT} .reel-card`).should('have.length', reels.length);
      cy.get(`${ROOT} video.reel-video`).each(($video) => {
        expect(($video[0] as HTMLVideoElement).paused, 'paused off screen').to.eq(true);
      });
    });

    it('REEL-04 with reduced motion every reel is a still poster until the visitor presses play', () => {
      emulateReducedMotion(true);
      visitSite('main');
      cy.get(ROOT).scrollIntoView();
      cy.get(`${ROOT} .reel-card[data-state="active"] .reel-play`).should('have.attr', 'aria-label', t('website.brand.reels.play'));
      cy.get(`${ROOT} video.reel-video`).each(($video) => {
        const video = $video[0] as HTMLVideoElement;
        expect(video.paused, 'still').to.eq(true);
        expect(video.getAttribute('poster'), 'poster').to.match(/\/ik-thumbnail\.jpg$/);
      });
    });
  });
});
