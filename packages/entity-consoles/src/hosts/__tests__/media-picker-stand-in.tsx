// Test harness for the hosts console suites, not shipped code.
//
// The real media dialog browses ImageKit and Pexels over the network. What the
// editor owns is only the bridge to it — which folder it opens on, and what
// happens to the URL it hands back — so the stand-in exposes exactly that.

export const PICKED_URL = 'https://ik.imagekit.io/duncit/hosts/ananya-passport.jpg';

export interface MediaPickerStandInProps {
  open: boolean;
  folder: string;
  title: string;
  onClose: () => void;
  onPicked: (url: string) => void;
}

export default function MediaPickerStandIn(props: Readonly<MediaPickerStandInProps>) {
  if (!props.open) return null;
  return (
    <div role="dialog" aria-label={props.title} data-folder={props.folder}>
      <button type="button" onClick={() => props.onPicked(PICKED_URL)}>
        picker-pick
      </button>
      <button type="button" onClick={props.onClose}>
        picker-close
      </button>
    </div>
  );
}
