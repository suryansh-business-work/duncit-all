const withIosSceneLifecycle = require('../withIosSceneLifecycle');

const { applySceneAppDelegate, applySceneManifest, SCENE_DELEGATE_CLASS } = withIosSceneLifecycle;

// AppDelegate.swift as Expo SDK 57's prebuild template generates it, with the
// line the Truecaller plugin injects into the universal-link override.
const TEMPLATE_APP_DELEGATE = `internal import Expo
import React
import ReactAppDependencyProvider

@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    if ReactNativeTruecaller.handle(userActivity, restorationHandler: restorationHandler) {
      return true
    }
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}
`;

describe('applySceneAppDelegate', () => {
  it('makes the app delegate the factory provider and leaves the window to the scene delegate', () => {
    const patched = applySceneAppDelegate(TEMPLATE_APP_DELEGATE);

    expect(patched).toContain(
      'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
    );
    expect(patched).not.toContain('UIWindow(frame: UIScreen.main.bounds)');
    expect(patched).not.toContain('factory.startReactNative(');
    expect(patched).not.toContain('#if os(iOS) || os(tvOS)');
  });

  it('keeps the factory, the window property and the universal-link hooks', () => {
    const patched = applySceneAppDelegate(TEMPLATE_APP_DELEGATE);

    expect(patched).toContain('reactNativeFactory = factory');
    expect(patched).toContain('var window: UIWindow?');
    expect(patched).toContain(
      'ReactNativeTruecaller.handle(userActivity, restorationHandler: restorationHandler)',
    );
    expect(patched).toContain(
      'return super.application(application, didFinishLaunchingWithOptions: launchOptions)',
    );
  });

  it('is idempotent when prebuild runs the mod again', () => {
    const once = applySceneAppDelegate(TEMPLATE_APP_DELEGATE);

    expect(applySceneAppDelegate(once)).toBe(once);
  });

  it('fails the prebuild when the window block is missing from the template', () => {
    const changedTemplate = TEMPLATE_APP_DELEGATE.replace(
      'window = UIWindow(frame: UIScreen.main.bounds)',
      '',
    );

    expect(() => applySceneAppDelegate(changedTemplate)).toThrow(
      /no longer matches the Expo template/,
    );
  });

  it('fails the prebuild for a module name the scene delegate would not start', () => {
    const renamed = TEMPLATE_APP_DELEGATE.replace(
      'withModuleName: "main"',
      'withModuleName: "other"',
    );

    expect(() => applySceneAppDelegate(renamed)).toThrow(/no longer matches the Expo template/);
  });
});

describe('applySceneManifest', () => {
  it('declares a single window scene handled by the Expo scene delegate', () => {
    const plist = applySceneManifest({ ITSAppUsesNonExemptEncryption: false });

    expect(plist.ITSAppUsesNonExemptEncryption).toBe(false);
    expect(plist.UIApplicationSceneManifest).toEqual({
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: SCENE_DELEGATE_CLASS,
          },
        ],
      },
    });
  });
});

describe('withIosSceneLifecycle', () => {
  it('registers both the Info.plist and the AppDelegate mods', () => {
    const config = withIosSceneLifecycle({ name: 'Duncit', slug: 'duncit' });

    expect(typeof config.mods.ios.infoPlist).toBe('function');
    expect(typeof config.mods.ios.appDelegate).toBe('function');
  });
});
