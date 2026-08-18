import React, { useState } from 'react';
import RoutinesList from './RoutinesList';
import RoutineBuilder from './RoutineBuilder';

export default function RoutinesMain() {
  const [view, setView] = useState('list'); // 'list' | 'builder'
  const [editingRoutine, setEditingRoutine] = useState(null);

  const handleCreateNew = () => {
    setEditingRoutine(null);
    setView('builder');
  };

  const handleEdit = (routine) => {
    setEditingRoutine(routine);
    setView('builder');
  };

  const handleCancel = () => {
    setEditingRoutine(null);
    setView('list');
  };

  const handleSaveSuccess = () => {
    setEditingRoutine(null);
    setView('list');
  };

  if (view === 'builder') {
    return (
      <RoutineBuilder 
        initialRoutine={editingRoutine}
        onCancel={handleCancel}
        onSaveSuccess={handleSaveSuccess}
      />
    );
  }

  return (
    <RoutinesList 
      onCreateNew={handleCreateNew}
      onEdit={handleEdit}
    />
  );
}
