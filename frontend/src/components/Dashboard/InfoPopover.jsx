import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Info } from 'lucide-react-native';
import { fonts, radius, HIT } from '../../theme';
import { useTheme } from '../../context/ThemeContext';

export default function InfoPopover({ title, description, size = 16 }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        style={{ width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center' }}
      >
        <Info size={size} color={open ? colors.accent : colors.textMuted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{description}</Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      padding: 16,
      width: '100%',
      maxWidth: 320,
    },
    title: { fontFamily: fonts.semibold, fontSize: 14, marginBottom: 6, color: colors.text, letterSpacing: -0.2 },
    body: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  });
}
