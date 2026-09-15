import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptic } from '../../haptics';
import { indexFromTranslation } from '../../utils/reorder';

const ListCtx = createContext(null);
const ItemCtx = createContext(null);

export function DragSortList({ children, onReorder, onDraggingChange }) {
  const heights = useRef([]);
  const dragRef = useRef(-1);
  const hoverRef = useRef(-1);
  const countRef = useRef(0);
  const onReorderRef = useRef(onReorder);
  const onDragRef = useRef(onDraggingChange);
  onReorderRef.current = onReorder;
  onDragRef.current = onDraggingChange;
  countRef.current = React.Children.count(children);
  const [dragIndex, setDragIndex] = useState(-1);
  const [hoverIndex, setHoverIndex] = useState(-1);

  const start = useCallback((index) => {
    dragRef.current = index;
    hoverRef.current = index;
    setDragIndex(index);
    setHoverIndex(index);
    haptic('medium');
    onDragRef.current?.(true);
  }, []);

  const update = useCallback((ty) => {
    const from = dragRef.current;
    if (from < 0) return;
    const to = indexFromTranslation(from, ty, heights.current.slice(0, countRef.current));
    if (to !== hoverRef.current) {
      hoverRef.current = to;
      setHoverIndex(to);
      haptic('selection');
    }
  }, []);

  const end = useCallback(() => {
    const from = dragRef.current;
    const to = hoverRef.current;
    if (from < 0) return;
    dragRef.current = -1;
    hoverRef.current = -1;
    setDragIndex(-1);
    setHoverIndex(-1);
    onDragRef.current?.(false);
    if (to >= 0 && from !== to) onReorderRef.current?.(from, to);
  }, []);

  const registerHeight = useCallback((index, height) => {
    if (height > 0) heights.current[index] = height;
  }, []);

  const shiftFor = useCallback(
    (index) => {
      if (dragIndex < 0 || index === dragIndex) return 0;
      const h = heights.current[dragIndex] || 0;
      if (dragIndex < hoverIndex && index > dragIndex && index <= hoverIndex) return -h;
      if (dragIndex > hoverIndex && index >= hoverIndex && index < dragIndex) return h;
      return 0;
    },
    [dragIndex, hoverIndex]
  );

  const value = useMemo(
    () => ({ dragIndex, hoverIndex, shiftFor, registerHeight, start, update, end }),
    [dragIndex, hoverIndex, shiftFor, registerHeight, start, update, end]
  );

  return <ListCtx.Provider value={value}>{children}</ListCtx.Provider>;
}

export function DragSortItem({ index, children, style }) {
  const list = useContext(ListCtx);
  const ty = useSharedValue(0);
  const shiftSv = useSharedValue(0);
  const activeSv = useSharedValue(0);
  const shift = list?.shiftFor(index) || 0;
  const isActive = list?.dragIndex === index;

  useEffect(() => {
    shiftSv.value = withSpring(shift, { damping: 18, stiffness: 240 });
  }, [shift, shiftSv]);

  useEffect(() => {
    activeSv.value = isActive ? 1 : 0;
    if (!isActive) ty.value = 0;
  }, [isActive, activeSv, ty]);

  const animStyle = useAnimatedStyle(() => ({
    zIndex: activeSv.value ? 30 : 0,
    elevation: activeSv.value ? 10 : 0,
    shadowColor: '#000',
    shadowOpacity: activeSv.value ? 0.28 : 0,
    shadowRadius: activeSv.value ? 16 : 0,
    shadowOffset: { width: 0, height: 8 },
    transform: [
      { translateY: activeSv.value ? ty.value : shiftSv.value },
      { scale: activeSv.value ? 1.03 : 1 },
    ],
  }));

  const itemValue = useMemo(
    () => ({
      index,
      ty,
      activeSv,
      start: list.start,
      update: list.update,
      end: list.end,
    }),
    [index, ty, activeSv, list.start, list.update, list.end]
  );

  return (
    <ItemCtx.Provider value={itemValue}>
      <Animated.View
        collapsable={false}
        style={[style, animStyle]}
        onLayout={(e) => list.registerHeight(index, e.nativeEvent.layout.height)}
      >
        {children}
      </Animated.View>
    </ItemCtx.Provider>
  );
}

export function DragHandle({ children, style }) {
  const item = useContext(ItemCtx);
  const index = item?.index ?? 0;
  const ty = item?.ty;
  const activeSv = item?.activeSv;
  const start = item?.start;
  const update = item?.update;
  const end = item?.end;

  const gesture = useMemo(() => {
    if (!ty || !start) return Gesture.Pan();
    return Gesture.Pan()
      .activateAfterLongPress(220)
      .maxPointers(1)
      .onStart(() => {
        ty.value = 0;
        activeSv.value = 1;
        runOnJS(start)(index);
      })
      .onUpdate((e) => {
        ty.value = e.translationY;
        runOnJS(update)(e.translationY);
      })
      .onEnd(() => {
        ty.value = 0;
        activeSv.value = 0;
        runOnJS(end)();
      })
      .onFinalize(() => {
        activeSv.value = 0;
        runOnJS(end)();
      });
  }, [index, ty, activeSv, start, update, end]);

  if (!item) return <View style={style}>{children}</View>;
  return (
    <GestureDetector gesture={gesture}>
      <View collapsable={false} style={style}>
        {children}
      </View>
    </GestureDetector>
  );
}
