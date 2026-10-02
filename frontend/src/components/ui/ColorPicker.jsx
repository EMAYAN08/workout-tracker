import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  StyleSheet,
  Dimensions,
  PanResponder,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { fonts, radius, HIT, hsvToHex, hexToHsv, normalizeHex } from '../../theme';
import { haptic } from '../../haptics';

const HUE_COLORS = ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000'];

export default function ColorPicker({ value, onChange, accessibilityLabel = 'Color picker' }) {
  const { colors, isDark } = useTheme();
  const hex = normalizeHex(value) || '#4A7C9B';
  const triggerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 16, y: 80, w: 240, h: HIT, winH: 800, winW: 390 });
  const hsv = hexToHsv(hex);
  const [h, setH] = useState(hsv.h);
  const [s, setS] = useState(hsv.s);
  const [v, setV] = useState(hsv.v);
  const [hexDraft, setHexDraft] = useState(hex);
  const ignoreUntil = useRef(0);
  const lastHaptic = useRef(0);

  useEffect(() => {
    if (open) return;
    const next = hexToHsv(hex);
    setH(next.h);
    setS(next.s);
    setV(next.v);
    setHexDraft(hex);
  }, [hex, open]);

  const live = hsvToHex(h, s, v);

  const emit = (nh, ns, nv, tap) => {
    const next = hsvToHex(nh, ns, nv);
    setHexDraft(next);
    onChange?.(next);
    const now = Date.now();
    if (tap || now - lastHaptic.current > 90) {
      lastHaptic.current = now;
      haptic('selection');
    }
  };

  const closeMenu = () => {
    setOpen(false);
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
    const apply = (x, y, w, ht) => {
      setAnchor({
        x: Number.isFinite(x) ? x : 16,
        y: Number.isFinite(y) ? y : 80,
        w: w || 240,
        h: ht || HIT,
        winH: win.height,
        winW: win.width,
      });
      const cur = hexToHsv(hex);
      setH(cur.h);
      setS(cur.s);
      setV(cur.v);
      setHexDraft(hex);
      setOpen(true);
    };
    const node = triggerRef.current;
    if (node?.getBoundingClientRect) {
      const r = node.getBoundingClientRect();
      apply(r.left, r.top, r.width, r.height);
      return;
    }
    if (node?.measureInWindow) {
      node.measureInWindow((x, y, w, ht) => apply(x, y, w, ht));
      return;
    }
    apply(16, 80, 240, HIT);
  };

  const commitHex = (raw) => {
    const n = normalizeHex(raw);
    if (!n) return;
    const next = hexToHsv(n);
    setH(next.h);
    setS(next.s);
    setV(next.v);
    setHexDraft(n);
    onChange?.(n);
    haptic('selection');
  };

  const menuW = Math.min(anchor.winW - 24, Math.max(anchor.w, 260));
  const spaceBelow = anchor.winH - (anchor.y + anchor.h) - 16;
  const spaceAbove = anchor.y - 16;
  const placeBelow = spaceBelow >= 220 || spaceBelow >= spaceAbove;
  const maxH = Math.min(340, Math.max(220, placeBelow ? spaceBelow : spaceAbove));
  const left = Math.max(12, Math.min(anchor.x, anchor.winW - menuW - 12));
  const top = placeBelow ? anchor.y + anchor.h + 6 : Math.max(8, anchor.y - maxH - 6);

  const glassBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(20,20,20,0.12)';
  const glassFill = isDark ? 'rgba(18,18,18,0.62)' : 'rgba(255,255,255,0.58)';
  const insetFill = isDark ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.55)';
  const insetBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(20,20,20,0.08)';
  const hueHex = hsvToHex(h, 1, 1);

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          collapsable={false}
          onPress={openMenu}
          accessibilityLabel={accessibilityLabel}
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
              gap: 10,
              opacity: pressed ? 0.82 : 1,
            },
          ]}
        >
          <View style={[styles.chip, { backgroundColor: hex, borderColor: colors.borderStrong }]} />
          <Text style={{ color: colors.text, fontFamily: fonts.medium, fontSize: 15, flex: 1 }} numberOfLines={1}>
            {hex}
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
          accessibilityLabel="Dismiss color picker"
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
              borderColor: glassBorder,
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
              style={{ backgroundColor: glassFill, padding: 12, gap: 12 }}
            >
              <SvPad
                hue={h}
                sat={s}
                val={v}
                hueHex={hueHex}
                border={insetBorder}
                onChange={(ns, nv, tap) => {
                  setS(ns);
                  setV(nv);
                  emit(h, ns, nv, tap);
                }}
              />
              <HueBar
                hue={h}
                border={insetBorder}
                onChange={(nh, tap) => {
                  setH(nh);
                  emit(nh, s, v, tap);
                }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.preview, { backgroundColor: live, borderColor: colors.borderStrong }]} />
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    minHeight: 40,
                    borderRadius: radius.sm,
                    backgroundColor: insetFill,
                    borderWidth: 1,
                    borderColor: insetBorder,
                    paddingHorizontal: 10,
                  }}
                >
                  <Text style={{ color: colors.textSubtle, fontFamily: fonts.medium, fontSize: 14, marginRight: 4 }}>
                    #
                  </Text>
                  <TextInput
                    value={String(hexDraft || '').replace(/^#/, '')}
                    onChangeText={(t) => {
                      const raw = t.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                      setHexDraft(`#${raw.toUpperCase()}`);
                      if (raw.length === 6) commitHex(`#${raw}`);
                    }}
                    onSubmitEditing={() => commitHex(hexDraft)}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder="HEX"
                    placeholderTextColor={colors.textSubtle}
                    style={{
                      flex: 1,
                      color: colors.text,
                      fontFamily: fonts.medium,
                      fontSize: 15,
                      paddingVertical: 8,
                    }}
                  />
                </View>
              </View>
            </BlurView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function HueBar({ hue, onChange, border }) {
  const wRef = useRef(1);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const setFromX = (x, tap) => {
    const w = wRef.current || 1;
    const nh = Math.max(0, Math.min(359.99, (x / w) * 360));
    onChangeRef.current(nh, tap);
  };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX, true),
        onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX, false),
      }),
    []
  );
  const left = `${(hue / 360) * 100}%`;
  return (
    <View
      {...pan.panHandlers}
      onLayout={(e) => {
        wRef.current = e.nativeEvent.layout.width;
      }}
      style={{ height: 22, borderRadius: radius.sm, overflow: 'hidden', borderWidth: 1, borderColor: border }}
    >
      <LinearGradient colors={HUE_COLORS} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left,
          marginLeft: -7,
          top: 2,
          width: 14,
          height: 18,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: '#fff',
          backgroundColor: 'transparent',
        }}
      />
    </View>
  );
}

function SvPad({ hue, sat, val, hueHex, onChange, border }) {
  const box = useRef({ w: 1, h: 1 });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const setFrom = (x, y, tap) => {
    const ns = Math.max(0, Math.min(1, x / box.current.w));
    const nv = Math.max(0, Math.min(1, 1 - y / box.current.h));
    onChangeRef.current(ns, nv, tap);
  };
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => setFrom(e.nativeEvent.locationX, e.nativeEvent.locationY, true),
        onPanResponderMove: (e) => setFrom(e.nativeEvent.locationX, e.nativeEvent.locationY, false),
      }),
    []
  );
  return (
    <View
      {...pan.panHandlers}
      onLayout={(e) => {
        box.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
      }}
      style={{ height: 132, borderRadius: radius.sm, overflow: 'hidden', borderWidth: 1, borderColor: border }}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: hueHex }]} />
      <LinearGradient
        colors={['#FFFFFF', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', '#000000']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: `${sat * 100}%`,
          top: `${(1 - val) * 100}%`,
          marginLeft: -8,
          marginTop: -8,
          width: 16,
          height: 16,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: '#fff',
          backgroundColor: 'transparent',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  preview: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
});
