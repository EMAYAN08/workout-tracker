import React from 'react';
import { WorkoutProvider } from './context/WorkoutContext';
import AppContent from './AppContent';
import FontPreviewer from './components/FontPreviewer';

function App() {
  return (
    <WorkoutProvider>
      <AppContent />
      <FontPreviewer />
    </WorkoutProvider>
  );
}

export default App;
