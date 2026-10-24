Pod::Spec.new do |s|
  s.name           = 'TrackHitLiveActivity'
  s.version        = '1.0.0'
  s.summary        = 'TrackHit workout Live Activity bridge'
  s.description    = 'Starts, updates and ends the TrackHit workout Live Activity via ActivityKit.'
  s.author         = ''
  s.homepage       = 'https://github.com/EMAYAN08/workout-tracker'
  s.platform       = :ios, '16.4'
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'ActivityKit', 'WidgetKit'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,swift}"
end
