import { WebView } from 'react-native-webview';

interface StatusVideoProps {
  uri: string;
  /** Fired when the clip finishes so the viewer can advance to the next slide. */
  onEnded: () => void;
}

const html = (uri: string) => `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>html,body{margin:0;height:100%;background:#000}video{width:100%;height:100%;object-fit:cover}</style>
</head><body>
<video src="${uri}" autoplay muted playsinline></video>
<script>
  var v = document.querySelector('video');
  v.addEventListener('ended', function () {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage('ended');
  });
</script>
</body></html>`;

/** Plays a story video inside a WebView (the app ships no native video module)
 * and reports completion so the viewer auto-advances like an image slide. */
export function StatusVideo({ uri, onEnded }: Readonly<StatusVideoProps>) {
  return (
    <WebView
      testID="status-video"
      originWhitelist={['*']}
      source={{ html: html(uri) }}
      style={{ flex: 1, backgroundColor: '#000000' }}
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback
      onMessage={(event) => {
        if (event.nativeEvent.data === 'ended') onEnded();
      }}
    />
  );
}
