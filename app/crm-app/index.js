import { registerRootComponent } from 'expo';

import App from './App';
import { defineBackgroundSync } from './src/services/background-sync';

// The background call sync must be defined at module scope, before the app
// renders, so Android can run it when the app is closed.
defineBackgroundSync();

registerRootComponent(App);
