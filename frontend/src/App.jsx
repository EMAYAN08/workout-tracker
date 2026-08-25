import React from 'react';
import { WorkoutProvider } from './context/WorkoutContext';
import AppContent from './AppContent';

function App() {
  return (
    <WorkoutProvider>
      <AppContent />
    </WorkoutProvider>
  );
}

export default App;
