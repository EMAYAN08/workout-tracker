import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Delete, ArrowRight } from 'lucide-react-native';
import { fonts } from '../../theme';

export default function CustomNumpad({ activeInput, onClose, onUpdate, value }) {
  const insets = useSafeAreaInsets();
  if (!activeInput) return null;

  const handleKeyPress = (key) => {
    let currentVal = String(value || '');
    if (key === 'delete') {
      onUpdate(currentVal.slice(0, -1));
    } else if (key === '.') {
      if (!currentVal.includes('.')) {
        onUpdate(currentVal + (currentVal.length === 0 ? '0.' : '.'));
      }
    } else if (key === '+' || key === '-') {
      let num = parseFloat(currentVal) || 0;
      const step = activeInput.field === 'weight' ? 2.5 : 1;
      if (key === '+') num += step;
      if (key === '-') num = Math.max(0, num - step);
      onUpdate(String(Math.round(num * 100) / 100));
    } else if (currentVal === '0' && key !== '.') {
      onUpdate(key);
    } else {
      onUpdate(currentVal + key);
    }
  };

  const Key = ({ label, onPress, style, children, flex }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        flex && { flex },
        style,
        pressed && { transform: [{ scale: 0.95 }], opacity: 0.85 },
      ]}
    >
      {children || <Text style={styles.keyText}>{label}</Text>}
    </Pressable>
  );

  const tabs = [
    { id: 'weight', label: 'Weight' },
    { id: 'reps', label: 'Reps' },
  ];

  return (
    <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.handleWrap}>
        <View style={styles.handle} />
      </View>
      <View style={styles.tabs}>
        {tabs.map((tab) => {
          const active = activeInput.field === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => activeInput.onChangeField(tab.id)}
              style={styles.tab}
            >
              <Text style={[styles.tabLabel, !active && { color: '#6b7280' }]}>{tab.label}</Text>
              {active ? (
                <View style={styles.checkOn}>
                  <Text style={styles.checkOnText}>✓</Text>
                </View>
              ) : (
                <View style={styles.checkOff} />
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.grid}>
        <View style={styles.row}>
          <Key label="1" onPress={() => handleKeyPress('1')} />
          <Key label="2" onPress={() => handleKeyPress('2')} />
          <Key label="3" onPress={() => handleKeyPress('3')} />
          <Key onPress={onClose}>
            <ChevronDown size={24} color="#fff" />
          </Key>
        </View>
        <View style={styles.row}>
          <Key label="4" onPress={() => handleKeyPress('4')} />
          <Key label="5" onPress={() => handleKeyPress('5')} />
          <Key label="6" onPress={() => handleKeyPress('6')} />
          <View style={styles.split}>
            <Key label="-" onPress={() => handleKeyPress('-')} flex={1} style={styles.splitKey} />
            <Key label="+" onPress={() => handleKeyPress('+')} flex={1} style={styles.splitKey} />
          </View>
        </View>
        <View style={styles.rowBottom}>
          <View style={{ flex: 3 }}>
            <View style={styles.row}>
              <Key label="7" onPress={() => handleKeyPress('7')} />
              <Key label="8" onPress={() => handleKeyPress('8')} />
              <Key label="9" onPress={() => handleKeyPress('9')} />
            </View>
            <View style={styles.row}>
              <Key label="." onPress={() => handleKeyPress('.')} />
              <Key label="0" onPress={() => handleKeyPress('0')} />
              <Key onPress={() => handleKeyPress('delete')}>
                <Delete size={24} color="#fff" />
              </Key>
            </View>
          </View>
          <Pressable
            onPress={() => activeInput.onNext()}
            style={({ pressed }) => [
              styles.nextKey,
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
          >
            <ArrowRight size={24} color="#000" strokeWidth={3} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingTop: 8,
  },
  handleWrap: { alignItems: 'center', paddingBottom: 8 },
  handle: { width: 48, height: 6, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.2)' },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: 8,
  },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 6 },
  tabLabel: { color: '#fff', fontFamily: fonts.bold, fontSize: 16 },
  checkOn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOnText: { color: '#000', fontSize: 11, fontFamily: fonts.bold },
  checkOff: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6b7280',
  },
  grid: { padding: 12, gap: 6 },
  row: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  rowBottom: { flexDirection: 'row', gap: 6 },
  key: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { color: '#fff', fontSize: 20, fontFamily: fonts.regular },
  split: {
    flex: 1,
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2c2c2e',
  },
  splitKey: { borderRadius: 0, height: 48 },
  nextKey: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
