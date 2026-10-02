import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Check, ChevronDown, ChevronLeft, Search } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { fonts, radius, HIT } from '../../theme';
import { haptic } from '../../haptics';
import { titleCase, muscleTagColors } from '../../utils/format';

export const hideScroll = {
  showsVerticalScrollIndicator: false,
  showsHorizontalScrollIndicator: false,
};

export function ScreenHeader({ title, subtitle, right, onBack, style }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          paddingHorizontal: 16,
          paddingTop: 6,
          paddingBottom: subtitle ? 12 : 10,
          backgroundColor: colors.background,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
        },
        style,
      ]}
    >
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityLabel="Back"
          hitSlop={8}
          style={{ width: HIT, height: HIT, alignItems: 'center', justifyContent: 'center', marginLeft: -8 }}
        >
          <ChevronLeft size={26} color={colors.text} strokeWidth={2.2} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.bold,
            fontSize: String(title || '').length > 16 ? 22 : 28,
            letterSpacing: -0.6,
            lineHeight: String(title || '').length > 16 ? 26 : 32,
          }}
          numberOfLines={2}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: colors.textMuted,
              fontFamily: fonts.regular,
              fontSize: 13,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function CountUp({ value, style, fractionDigits = 0, play = true }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!play) {
      setShown(0);
      return undefined;
    }
    const target = Number(value) || 0;
    const startAt = Date.now();
    const dur = 720;
    let raf;
    const tick = () => {
      const t = Math.min(1, (Date.now() - startAt) / dur);
      const eased = 1 - (1 - t) ** 3;
      setShown(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, play]);
  const text =
    fractionDigits > 0
      ? shown.toLocaleString(undefined, { maximumFractionDigits: fractionDigits, minimumFractionDigits: 0 })
      : Math.floor(shown).toLocaleString();
  return <Text style={style}>{text}</Text>;
}

export function Panel({ children, style, onPress }) {
  const { colors } = useTheme();
  const panelStyle = [
    {
      backgroundColor: colors.surface,
      borderRadius: radius.sm,
      borderWidth: 1,
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
        style={({ pressed }) => [panelStyle, pressed && { opacity: 0.92 }]}
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
    solid: { bg: colors.text, border: colors.text, fg: colors.background },
    ghost: { bg: 'transparent', border: colors.borderStrong, fg: colors.text },
    outline: { bg: 'transparent', border: colors.borderStrong, fg: colors.text },
    danger: { bg: 'transparent', border: colors.danger, fg: colors.danger },
    soft: { bg: colors.surface2, border: colors.border, fg: colors.text },
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
          borderRadius: radius.sm,
          paddingVertical: 12,
          paddingHorizontal: 16,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          minHeight: HIT,
          backgroundColor: v.bg,
          borderWidth: 1,
          borderColor: v.border,
        },
        pressed && { opacity: 0.82 },
        (disabled || loading) && { opacity: 0.4 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : typeof children === 'string' ? (
        <Text style={[{ fontFamily: fonts.semibold, fontSize: 16, color: v.fg, letterSpacing: -0.2 }, textStyle]}>
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
          borderRadius: radius.sm,
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
  return <ActivityIndicator size={size} color={color || colors.text} />;
}

export function Badge({ children, color, style }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.xs,
          backgroundColor: colors.surface2,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: 11,
          fontFamily: fonts.semibold,
          letterSpacing: 0.4,
          color: color || colors.textMuted,
          textTransform: 'uppercase',
        }}
      >
        {children}
      </Text>
    </View>
  );
}

export function IconBtn({ onPress, children, style, disabled }) {
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
          borderRadius: radius.sm,
        },
        pressed && { opacity: 0.55 },
        disabled && { opacity: 0.3 },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function Select({ value, options = [], onChange, style, searchable = true }) {
  const { colors, isDark } = useTheme();
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [anchor, setAnchor] = useState({ x: 16, y: 80, w: 240, h: 44, winH: 800, winW: 390 });
  const selected = options.find((o) => o.value === value);
  const ignoreUntil = useRef(0);

  const closeMenu = () => {
    setOpen(false);
    setQuery('');
    ignoreUntil.current = Date.now() + 80;
  };

  const openMenu = () => {
    if (Date.now() < ignoreUntil.current) return;
    if (open) {
      closeMenu();
      return;
    }
    haptic('selection');
    const win = Dimensions.get('window');
    const apply = (x, y, w, h) => {
      setAnchor({
        x: Number.isFinite(x) ? x : 16,
        y: Number.isFinite(y) ? y : 80,
        w: w || 240,
        h: h || HIT,
        winH: win.height,
        winW: win.width,
      });
      setQuery('');
      setOpen(true);
    };
    const node = triggerRef.current;
    if (node?.getBoundingClientRect) {
      const r = node.getBoundingClientRect();
      apply(r.left, r.top, r.width, r.height);
      return;
    }
    if (node?.measureInWindow) {
      node.measureInWindow((x, y, w, h) => apply(x, y, w, h));
      return;
    }
    apply(16, 80, 240, HIT);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => String(o.label || '').toLowerCase().includes(q));
  }, [options, query]);

  const menuW = Math.min(anchor.winW - 24, Math.max(anchor.w, 220));
  const spaceBelow = anchor.winH - (anchor.y + anchor.h) - 16;
  const spaceAbove = anchor.y - 16;
  const placeBelow = spaceBelow >= 148 || spaceBelow >= spaceAbove;
  const maxH = Math.min(280, Math.max(132, placeBelow ? spaceBelow : spaceAbove));
  const left = Math.max(12, Math.min(anchor.x, anchor.winW - menuW - 12));
  const top = placeBelow ? anchor.y + anchor.h + 6 : Math.max(8, anchor.y - maxH - 6);

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
      <Pressable
        collapsable={false}
        onPress={openMenu}
        accessibilityLabel={`Select ${selected?.label || 'option'}`}
        style={({ pressed }) => [
          {
            backgroundColor: colors.surface2,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 12,
            minHeight: HIT,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: pressed ? 0.82 : 1,
          },
          style,
        ]}
      >
        <Text
          style={{
            color: selected ? colors.text : colors.textMuted,
            fontFamily: fonts.medium,
            fontSize: 15,
            flex: 1,
            marginRight: 8,
          }}
          numberOfLines={1}
        >
          {selected?.label || 'Select'}
        </Text>
        <ChevronDown
          size={16}
          color={colors.textMuted}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      </View>
      <Modal visible={open} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable
          accessibilityLabel="Dismiss menu"
          onPress={closeMenu}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              position: 'absolute',
              top,
              left,
              width: menuW,
              maxHeight: maxH,
              borderRadius: radius.lg,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(20,20,20,0.12)',
              shadowColor: '#000',
              shadowOpacity: isDark ? 0.45 : 0.12,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 16,
            }}
          >
            <BlurView
              intensity={isDark ? 42 : 56}
              tint={isDark ? 'dark' : 'light'}
              style={{
                backgroundColor: isDark ? 'rgba(18,18,18,0.62)' : 'rgba(255,255,255,0.58)',
                maxHeight: maxH,
              }}
            >
              {searchable ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    margin: 8,
                    paddingHorizontal: 10,
                    minHeight: 40,
                    borderRadius: radius.sm,
                    backgroundColor: isDark ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.55)',
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(20,20,20,0.08)',
                  }}
                >
                  <Search size={14} color={colors.textMuted} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search"
                    placeholderTextColor={colors.textSubtle}
                    autoCorrect={false}
                    autoCapitalize="none"
                    style={{
                      flex: 1,
                      color: colors.text,
                      fontFamily: fonts.medium,
                      fontSize: 14,
                      paddingVertical: 8,
                    }}
                  />
                </View>
              ) : null}
              <ScrollView
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}
                style={{ maxHeight: searchable ? maxH - 56 : maxH }}
              >
                {filtered.length === 0 ? (
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontFamily: fonts.medium,
                      fontSize: 13,
                      padding: 16,
                      textAlign: 'center',
                    }}
                  >
                    No matches
                  </Text>
                ) : (
                  filtered.map((opt) => {
                    const on = opt.value === value;
                    return (
                      <Pressable
                        key={String(opt.value)}
                        onPress={() => {
                          haptic('selection');
                          onChange(opt.value);
                          closeMenu();
                        }}
                        style={({ pressed }) => ({
                          minHeight: 40,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: on
                            ? isDark
                              ? 'rgba(74,124,155,0.28)'
                              : 'rgba(47,92,122,0.12)'
                            : pressed
                              ? isDark
                                ? 'rgba(255,255,255,0.06)'
                                : 'rgba(0,0,0,0.04)'
                              : 'transparent',
                        })}
                      >
                        <Text
                          style={{
                            color: colors.text,
                            fontFamily: on ? fonts.semibold : fonts.regular,
                            fontSize: 14,
                            flex: 1,
                            marginRight: 8,
                          }}
                          numberOfLines={1}
                        >
                          {opt.label}
                        </Text>
                        {on ? <Check size={14} color={colors.accent} strokeWidth={2.6} /> : null}
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function MuscleTag({ group, style }) {
  const { isDark } = useTheme();
  const tone = muscleTagColors(group, isDark);
  if (!group) return null;
  return (
    <View
      style={[
        {
          backgroundColor: tone.bg,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: radius.xs,
          flexShrink: 0,
        },
        style,
      ]}
    >
      <Text style={{ color: tone.fg, fontSize: 11, fontFamily: fonts.semibold }}>{titleCase(group)}</Text>
    </View>
  );
}

