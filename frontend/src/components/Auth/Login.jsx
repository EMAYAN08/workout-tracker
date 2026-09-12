import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefreshCw, Sun, Moon } from 'lucide-react-native';
import { API_URL, LOGO } from '../../config';
import { fonts, radius } from '../../theme';
import { Input, Button } from '../ui/primitives';
import { useTheme } from '../../context/ThemeContext';

export default function Login({ onLogin }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = makeStyles(colors);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onLogin(data.username);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <Pressable onPress={toggleTheme} style={styles.iconBtn}>
          {isDark ? <Sun size={16} color={colors.text} /> : <Moon size={16} color={colors.text} />}
        </Pressable>
        <Pressable
          onPress={() => {
            setUsername('');
            setPassword('');
            setError('');
          }}
          style={styles.iconBtn}
        >
          <RefreshCw size={16} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <Image source={LOGO} style={styles.logo} />
        </View>
        <Text style={styles.kicker}>TrackIt</Text>
        <Text style={styles.title}>Sign in.</Text>
        <Text style={styles.subtitle}>Enter your account, or create one to start logging.</Text>

        <View style={styles.card}>
          <Text style={styles.fieldLbl}>Username</Text>
          <Input
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            editable={!loading}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
          />
          <Text style={[styles.fieldLbl, { marginTop: 14 }]}>Password</Text>
          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button onPress={handleSubmit} disabled={loading} loading={loading} style={{ marginTop: 18 }}>
            {loading ? 'Processing...' : 'Enter'}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
      maxWidth: 420,
      width: '100%',
      alignSelf: 'center',
    },
    topBar: {
      position: 'absolute',
      right: 16,
      zIndex: 50,
      flexDirection: 'row',
      gap: 8,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoWrap: {
      width: 56,
      height: 56,
      borderRadius: radius.md,
      overflow: 'hidden',
      marginBottom: 28,
      borderWidth: 1,
      borderColor: colors.border,
    },
    logo: { width: '100%', height: '100%' },
    kicker: {
      color: colors.accent,
      fontFamily: fonts.semibold,
      fontSize: 12,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    title: {
      color: colors.text,
      fontFamily: fonts.extrabold,
      fontSize: 40,
      letterSpacing: -1.4,
      marginBottom: 8,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: fonts.regular,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 28,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    fieldLbl: {
      color: colors.textMuted,
      fontFamily: fonts.semibold,
      fontSize: 11,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    errorBox: {
      marginTop: 12,
      backgroundColor: colors.dangerSoft,
      borderWidth: 1,
      borderColor: colors.danger + '33',
      borderRadius: radius.sm,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    errorText: {
      color: colors.danger,
      fontFamily: fonts.medium,
      fontSize: 13,
      textAlign: 'center',
    },
  });
}
