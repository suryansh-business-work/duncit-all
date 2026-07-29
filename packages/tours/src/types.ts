/** Guided-tour definitions, shared by mWeb (React Joyride) and native. */

export type TourId = 'home' | 'club' | 'pod-details' | 'create-pod' | 'profile' | 'booking';

export interface TourStep {
  /**
   * Stable anchor id. Each surface tags the matching element with it — mWeb as
   * `data-tour="<anchor>"`, native by registering the same string with the
   * tour-guide provider — so the copy below is written once and both overlays
   * find the same element.
   */
  anchor: string;
  title: string;
  body: string;
}

export interface TourDefinition {
  id: TourId;
  /** Row label in the Tour Guide centre. */
  title: string;
  caption: string;
  /** mWeb route the tour runs on. */
  path: string;
  /** Native stack screen the tour runs on. */
  nativeRoute: string;
  steps: readonly TourStep[];
}
