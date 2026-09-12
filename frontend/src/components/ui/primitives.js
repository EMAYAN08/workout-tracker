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
import { ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { fonts, radius, HIT } from '../../theme';
import { haptic } from '../../haptics';

export function Panel({ children, style, onPress }) {
  const { colors } = useTheme();
  const panelStyle = [
    {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    style,
  ];
  if (onPress) {
    return (
      <Pressable
        onPress={() => {
          haptic('light');
          onPress();
        }}
        style={({ pressed }) => [panelStyle, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
      >
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
    ghost: { bg: 'transparent', border: 'transparent', fg: colors.accent },
    outline: { bg: 'transparent', border: colors.borderStrong, fg: colors.text },
    danger: { bg: colors.dangerSoft, border: colors.danger + '33', fg: colors.danger },
    soft: { bg: colors.accentSoft, border: colors.accentBorder, fg: colors.accent },
  };
  const v = variants[variant] || variants.primary;

  return (
    <Pressable
      onPress={() => {
        if (disabled || loading) return;
        haptic(variant === 'danger' ? 'warning' : 'light');
        onPress?.();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          borderRadius: radius.md,
          paddingVertical: 12,
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          minHeight: HIT,
          backgroundColor: v.bg,
          borderWidth: variant === 'ghost' ? 0 : 1,
          borderColor: v.border,
        },
        pressed && { transform: [{ scale: 0.96 }], opacity: 0.88 },
        (disabled || loading) && { opacity: 0.4 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : typeof children === 'string' ? (
        <Text style={[{ fontFamily: fonts.semibold, fontSize: 17, color: v.fg, letterSpacing: -0.4 }, textStyle]}>
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
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: 12,
          minHeight: HIT,
          color: colors.text,
          fontFamily: fonts.regular,
          fontSize: 17,
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
          paddingVertical: 3,
          borderRadius: radius.xs,
          backgroundColor: colors.accentSoft,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: 11,
          fontFamily: fonts.semibold,
          letterSpacing: 0.2,
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
      onPress={() => {
        if (disabled) return;
        haptic('light');
        onPress?.();
      }}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [
        {
          width: HIT,
          height: HIT,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.md,
        },
        pressed && { opacity: 0.55, transform: [{ scale: 0.96 }] },
        disabled && { opacity: 0.3 },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function Select({ value, options, onChange, style }) {
  const { colors } = useTheme();
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        onPress={() => {
          haptic('selection');
          setOpen(true);
        }}
        style={[
          {
            backgroundColor: colors.surface2,
            borderRadius: radius.md,
            paddingHorizontal: 12,
            paddingVertical: 10,
            minHeight: HIT,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
          style,
        ]}
      >
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.medium,
            fontSize: 16,
            flex: 1,
            marginRight: 8,
            textTransform: 'capitalize',
          }}
          numberOfLines={1}
        >
          {selected?.label || 'Select'}
        </Text>
        <ChevronDown size={18} color={colors.textMuted} />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
          onPress={() => setOpen(false)}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              maxHeight: '52%',
              paddingBottom: 20,
              paddingTop: 8,
            }}
          >
            <View
              style={{
                width: 36,
                height: 5,
                borderRadius: 3,
                backgroundColor: colors.borderStrong,
                alignSelf: 'center',
                marginBottom: 8,
              }}
            />
            <ScrollView>
              {options.map((opt) => (
                <Pressable
                  key={String(opt.value)}
                  onPress={() => {
                    haptic('selection');
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  style={{
                    minHeight: HIT,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: opt.value === value ? colors.accentSoft : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      color: opt.value === value ? colors.accent : colors.text,
                      fontFamily: opt.value === value ? fonts.semibold : fonts.regular,
                      fontSize: 17,
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
