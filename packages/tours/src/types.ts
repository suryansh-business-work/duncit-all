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
  /**
   * Where starting this tour sends the user. MUST be a screen that opens with
   * no params: navigating to a screen that needs them (PodDetails wants a
   * pod) crashes on `route.params.podId` of undefined. For a tour that
   * describes a detail screen, this is the list that leads there — the tour
   * stays armed and fires when its anchors appear.
   */
  path: string;
  /** Native stack screen for the same landing. Same param-free rule. */
  nativeRoute: string;
  /**
   * Role required to see this tour at all. A consumer who cannot create a pod
   * has no use for the Create Pod walkthrough, and offering it only leads to a
   * screen they are not allowed on.
   */
  requiredRole?: string;
  steps: readonly TourStep[];
}
