import React, { useEffect, useState } from 'react';
import RoutinesList from './RoutinesList';
import RoutineBuilder from './RoutineBuilder';

export default function RoutinesMain({ scrollRef, popRef }) {
  const [view, setView] = useState('list');
  const [editingRoutine, setEditingRoutine] = useState(null);

  useEffect(() => {
    if (!popRef) return undefined;
    popRef.current = () => {
      setEditingRoutine(null);
      setView('list');
    };
    return () => {
      popRef.current = null;
    };
  }, [popRef]);

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
  return <RoutinesList onCreateNew={handleCreateNew} onEdit={handleEdit} scrollRef={scrollRef} />;
}
