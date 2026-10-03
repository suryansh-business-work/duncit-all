const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

// server.duncit.com's Let's Encrypt chain ends at ISRG Root X1, which Android
// only ships from 7.1.1 (API 25). minSdk is 24, so on Android 7.0 every HTTPS
// call failed its handshake and login showed "Network error". This bundles the
// root as an extra trust anchor beside the system store — Let's Encrypt's own
// recommendation — and changes nothing on devices that already trust it.
//
// A network security config overrides the manifest's usesCleartextTraffic, so
// the debug source set gets its own copy that still allows cleartext (Metro);
// release stays HTTPS-only, as it already was under targetSdk 36's default.
const CERT = 'isrg_root_x1';
const CERT_SOURCE = path.join(__dirname, 'certs', `${CERT}.pem`);

const securityConfig = (allowCleartext) => `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config${allowCleartext ? ' cleartextTrafficPermitted="true"' : ''}>
    <trust-anchors>
      <certificates src="system" />
      <certificates src="@raw/${CERT}" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;

function writeFile(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

module.exports = function withLetsEncryptRoot(config) {
  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      const src = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src');
      fs.mkdirSync(path.join(src, 'main', 'res', 'raw'), { recursive: true });
      fs.copyFileSync(CERT_SOURCE, path.join(src, 'main', 'res', 'raw', `${CERT}.pem`));
      writeFile(path.join(src, 'main', 'res', 'xml', 'network_security_config.xml'), securityConfig(false));
      writeFile(path.join(src, 'debug', 'res', 'xml', 'network_security_config.xml'), securityConfig(true));
      return cfg;
    },
  ]);
  return withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application?.[0];
    if (!application) throw new Error('withLetsEncryptRoot: AndroidManifest has no <application>');
    application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });
};
