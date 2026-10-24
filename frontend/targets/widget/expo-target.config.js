/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'TrackHitWidget',
  displayName: 'TrackHit',
  bundleIdentifier: '.widget',
  deploymentTarget: '16.4',
  icon: '../../assets/icon.png',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
  colors: {
    $accent: '#FF9F0A',
    $widgetBackground: { light: '#FFFFFF', dark: '#111111' },
  },
};
