import React from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { colors, fonts, radius } from '../../theme';

export function Panel({ children, style, onPress }) {
  const content = (
    <View style={[styles.panel, style]}>{children}</View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.9 }}>
        {content}
      </Pressable>
    );
  }
  return content;
}

export function AppText({ children, style, numberOfLines, onPress, ...rest }) {
  const Comp = onPress ? Pressable : View;
  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        <Text style={[styles.text, style]} numberOfLines={numberOfLines} {...rest}>
          {children}
        </Text>
      </Pressable>
    );
  }
  return (
    <Text style={[styles.text, style]} numberOfLines={numberOfLines} {...rest}>
      {children}
    </Text>
  );
}

export function Button({
  children,
  onPress,
  style,
  textStyle,
  disabled,
  loading,
  variant = 'primary',
}) {
  const variantStyle =
    variant === 'danger'
      ? styles.btnDanger
      : variant === 'ghost'
        ? styles.btnGhost
        : variant === 'solid'
          ? styles.btnSolid
          : styles.btnPrimary;
  const variantText =
    variant === 'solid'
      ? styles.btnSolidText
      : variant === 'danger'
        ? styles.btnDangerText
        : styles.btnPrimaryText;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        variantStyle,
        pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'solid' ? '#fff' : colors.primary} />
      ) : typeof children === 'string' ? (
        <Text style={[styles.btnText, variantText, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

export function Input({ style, ...props }) {
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      style={[styles.input, style]}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
    />
  );
}

export function Spinner({ size = 24, color = colors.primary }) {
  return <ActivityIndicator size={size} color={color} />;
}

export function Badge({ children, color = colors.primary, style }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '26' }, style]}>
      <Text style={[styles.badgeText, { color }]}>{children}</Text>
    </View>
  );
}

export function IconBtn({ onPress, children, style, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.iconBtn,
        pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
        disabled && { opacity: 0.3 },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function Select({ value, options, onChange, style }) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.select, style]}
      >
        <Text style={styles.selectText} numberOfLines={1}>
          {selected?.label || 'Select'}
        </Text>
        <Text style={styles.selectChevron}>▾</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <ScrollView>
              {options.map((opt) => (
                <Pressable
                  key={String(opt.value)}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  style={[
                    styles.modalItem,
                    opt.value === value && styles.modalItemActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      opt.value === value && { color: colors.primary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    color: colors.text,
    fontFamily: fonts.regular,
  },
  btn: {
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnPrimary: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  btnDanger: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnSolid: {
    backgroundColor: colors.primary,
  },
  btnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  btnPrimaryText: { color: colors.primary },
  btnDangerText: { color: '#f87171' },
  btnSolidText: { color: '#fff' },
  input: {
    backgroundColor: 'rgba(23,23,23,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fonts.black,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  iconBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  select: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectText: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 14,
    flex: 1,
    marginRight: 8,
    textTransform: 'capitalize',
  },
  selectChevron: {
    color: colors.textMuted,
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 8,
  },
  modalItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalItemActive: {
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  modalItemText: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 15,
    textTransform: 'capitalize',
  },
});
