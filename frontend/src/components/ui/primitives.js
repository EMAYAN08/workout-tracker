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
import { BlurView } from 'expo-blur';
import { ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { fonts, radius } from '../../theme';

export function Panel({ children, style, onPress }) {
  const { colors } = useTheme();
  const panelStyle = [
    {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    style,
  ];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [panelStyle, pressed && { opacity: 0.92 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={panelStyle}>{children}</View>;
}

export function AppText({ children, style, numberOfLines, onPress, ...rest }) {
  const { colors } = useTheme();
  const text = (
    <Text style={[{ color: colors.text, fontFamily: fonts.regular }, style]} numberOfLines={numberOfLines} {...rest}>
      {children}
    </Text>
  );
  if (onPress) return <Pressable onPress={onPress}>{text}</Pressable>;
  return text;
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
  const { colors } = useTheme();
  const variants = {
    primary: { bg: colors.accent, border: colors.accent, fg: colors.accentFg },
    solid: { bg: colors.accent, border: colors.accent, fg: colors.accentFg },
    ghost: { bg: 'transparent', border: 'transparent', fg: colors.textMuted },
    outline: { bg: 'transparent', border: colors.borderStrong, fg: colors.text },
    danger: { bg: colors.dangerSoft, border: colors.danger + '33', fg: colors.danger },
    soft: { bg: colors.accentSoft, border: colors.accentBorder, fg: colors.accent },
  };
  const v = variants[variant] || variants.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          borderRadius: radius.md,
          paddingVertical: 14,
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          minHeight: 48,
          backgroundColor: v.bg,
          borderWidth: 1,
          borderColor: v.border,
        },
        pressed && { transform: [{ scale: 0.96 }], opacity: 0.9 },
        (disabled || loading) && { opacity: 0.45 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : typeof children === 'string' ? (
        <Text style={[{ fontFamily: fonts.semibold, fontSize: 15, color: v.fg, letterSpacing: -0.2 }, textStyle]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

export function Input({ style, ...props }) {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.textSubtle}
      style={[
        {
          backgroundColor: colors.surface2,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: 14,
          minHeight: 48,
          color: colors.text,
          fontFamily: fonts.medium,
          fontSize: 16,
        },
        style,
      ]}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
    />
  );
}

export function Spinner({ size = 24, color }) {
  const { colors } = useTheme();
  return <ActivityIndicator size={size} color={color || colors.accent} />;
}

export function Badge({ children, color, style }) {
  const { colors } = useTheme();
  const c = color || colors.accent;
  return (
    <View
      style={[
        {
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: radius.xs,
          backgroundColor: colors.accentSoft,
          borderWidth: 1,
          borderColor: colors.accentBorder,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: 10,
          fontFamily: fonts.semibold,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          color: c,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

export function IconBtn({ onPress, children, style, disabled }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
        pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] },
        disabled && { opacity: 0.3 },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function Select({ value, options, onChange, style }) {
  const { colors, isDark } = useTheme();
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          {
            backgroundColor: colors.surface,
            borderRadius: radius.md,
            paddingHorizontal: 12,
            paddingVertical: 12,
            minHeight: 48,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: colors.border,
          },
          style,
        ]}
      >
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.medium,
            fontSize: 14,
            flex: 1,
            marginRight: 8,
            textTransform: 'capitalize',
          }}
          numberOfLines={1}
        >
          {selected?.label || 'Select'}
        </Text>
        <ChevronDown size={16} color={colors.textMuted} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
          onPress={() => setOpen(false)}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              maxHeight: '50%',
              borderWidth: 1,
              borderColor: colors.borderStrong,
              paddingVertical: 8,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.borderStrong,
                alignSelf: 'center',
                marginBottom: 8,
                marginTop: 4,
              }}
            />
            <ScrollView>
              {options.map((opt) => (
                <Pressable
                  key={String(opt.value)}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                    backgroundColor: opt.value === value ? colors.accentSoft : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: opt.value === value ? colors.accent : colors.text,
                      fontFamily: fonts.medium,
                      fontSize: 15,
                      textTransform: 'capitalize',
                    }}
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

export function Glass({ children, style, intensity = 40 }) {
  const { isDark } = useTheme();
  return (
    <BlurView intensity={intensity} tint={isDark ? 'dark' : 'light'} style={style}>
      {children}
    </BlurView>
  );
}
