import 'react-native-gesture-handler';
import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { WorkoutProvider } from './src/context/WorkoutContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppContent from './src/AppContent';
import WelcomeSplash from './src/components/WelcomeSplash';

SplashScreen.preventAutoHideAsync().catch(() => {});

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const id = 'trackit-hide-scrollbars';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.textContent =
      '*::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}' +
      '*{scrollbar-width:none!important;-ms-overflow-style:none!important}';
    document.head.appendChild(s);
  }
}

function Root() {
  const { isDark } = useTheme();
  const [welcome, setWelcome] = useState(true);
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppContent />
      {welcome ? <WelcomeSplash onDone={() => setWelcome(false)} /> : null}
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'VioletSans-Regular': require('./assets/fonts/VioletSans-Regular.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color="#4A7C9B" size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <WorkoutProvider>
            <Root />
          </WorkoutProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: '#070707',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
