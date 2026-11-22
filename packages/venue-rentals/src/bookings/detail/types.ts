/**
 * Where the detail's outbound links go. The package knows no console's URLs:
 * the page that mounts the board passes what it has, and a link it does not
 * pass is simply not drawn.
 */
export interface RentalDetailLinks {
  /**
   * mWeb's origin, for "Open pod". An empty string links relative to the
   * current site (mWeb itself); undefined draws no link.
   */
  mwebUrl?: string;
  /** A person's profile page in a staff console. Shown to Finance only. */
  profileUrl?: (userId: string) => string;
}
