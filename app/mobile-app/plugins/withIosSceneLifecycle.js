const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

// Apps built with the iOS 27 SDK (Xcode 27) are killed at launch by UIKit
// (_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption) unless they
// adopt the UIScene life cycle. Expo SDK 57 ships the scene delegate
// (ExpoAppSceneDelegate, exported to Objective-C as EXExpoAppSceneDelegate),
// but its prebuild template still starts React Native from the app delegate.
//
// This mod switches the generated project over:
//  - Info.plist declares one window scene handled by EXExpoAppSceneDelegate.
//  - AppDelegate keeps creating the React Native factory, conforms to
//    ExpoReactNativeFactoryProvider so the scene delegate can reach it, and no
//    longer creates its own window: the scene delegate creates the window and
//    starts React Native into it. URL, universal-link and life-cycle events are
//    re-fed to the AppDelegate overrides by Expo's SceneEventForwarder, so the
//    linking overrides and the Truecaller hook keep working.

const SCENE_DELEGATE_CLASS = 'EXExpoAppSceneDelegate';
const PROVIDER_PROTOCOL = 'ExpoReactNativeFactoryProvider';

const SCENE_MANIFEST = {
  UIApplicationSupportsMultipleScenes: false,
  UISceneConfigurations: {
    UIWindowSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: 'Default Configuration',
        UISceneDelegateClassName: SCENE_DELEGATE_CLASS,
      },
    ],
  },
};

const CLASS_DECLARATION = /class AppDelegate: ExpoAppDelegate \{/;
// The provider's default module name is "main", so only that template shape is accepted.
const WINDOW_START =
  /\n#if os\(iOS\) \|\| os\(tvOS\)\n[ \t]*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n[ \t]*factory\.startReactNative\(\s*withModuleName: "main",[^)]*\)\n#endif\n/;

const WINDOW_START_REPLACEMENT =
  '\n    // EXExpoAppSceneDelegate (plugins/withIosSceneLifecycle) creates the window\n' +
  '    // and starts React Native into it.\n';

function applySceneManifest(infoPlist) {
  return { ...infoPlist, UIApplicationSceneManifest: SCENE_MANIFEST };
}

function applySceneAppDelegate(contents) {
  if (contents.includes(`ExpoAppDelegate, ${PROVIDER_PROTOCOL}`)) return contents;
  if (!CLASS_DECLARATION.test(contents) || !WINDOW_START.test(contents)) {
    // Failing the prebuild beats shipping an IPA that crashes on launch.
    throw new Error(
      'withIosSceneLifecycle: AppDelegate.swift no longer matches the Expo template ' +
        '(class declaration or window/startReactNative block not found). ' +
        'Update the plugin for the new template.',
    );
  }
  return contents
    .replace(CLASS_DECLARATION, `class AppDelegate: ExpoAppDelegate, ${PROVIDER_PROTOCOL} {`)
    .replace(WINDOW_START, WINDOW_START_REPLACEMENT);
}

function withIosSceneLifecycle(config) {
  const withManifest = withInfoPlist(config, (cfg) => {
    cfg.modResults = applySceneManifest(cfg.modResults);
    return cfg;
  });
  return withAppDelegate(withManifest, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('withIosSceneLifecycle: expected a Swift AppDelegate.');
    }
    cfg.modResults.contents = applySceneAppDelegate(cfg.modResults.contents);
    return cfg;
  });
}

module.exports = withIosSceneLifecycle;
module.exports.applySceneManifest = applySceneManifest;
module.exports.applySceneAppDelegate = applySceneAppDelegate;
module.exports.SCENE_DELEGATE_CLASS = SCENE_DELEGATE_CLASS;
