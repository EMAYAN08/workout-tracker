import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Info } from 'lucide-react-native';
import { colors, fonts } from '../../theme';

const colorMap = {
  primary: colors.primary,
  emerald: '#10B981',
  amber: '#f59e0b',
};

export default function InfoPopover({ title, description, size = 16, color = 'primary' }) {
  const [open, setOpen] = useState(false);
  const accent = colorMap[color] || colors.primary;

  return (
    <View>
      <Pressable onPress={() => setOpen(true)} hitSlop={8}>
        <Info size={size} color={open ? accent : colors.textMuted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.card}>
            <Text style={[styles.title, { color: accent }]}>{title}</Text>
            <Text style={styles.body}>{description}</Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 16,
    width: '100%',
    maxWidth: 320,
  },
  title: { fontFamily: fonts.black, fontSize: 14, marginBottom: 6 },
  body: { color: colors.textMuted, fontFamily: fonts.medium, fontSize: 13, lineHeight: 20 },
});
