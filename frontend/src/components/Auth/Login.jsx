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
import { RefreshCw } from 'lucide-react-native';
import { API_URL, LOGO } from '../../config';
import { colors, fonts, radius } from '../../theme';
import { Input, Button } from '../ui/primitives';

export default function Login({ onLogin }) {
  const insets = useSafeAreaInsets();
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
      <View style={[styles.refreshWrap, { top: insets.top + 12 }]}>
        <Pressable
          onPress={() => {
            setUsername('');
            setPassword('');
            setError('');
          }}
          style={styles.refreshBtn}
        >
          <RefreshCw size={20} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.blobLeft} />
      <View style={styles.blobRight} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoWrap}>
          <Image source={LOGO} style={styles.logo} />
        </View>
        <Text style={styles.title}>TrackIt</Text>
        <Text style={styles.subtitle}>Sign in or create an account</Text>

        <Input
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          editable={!loading}
          autoComplete="username"
        />
        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          editable={!loading}
          secureTextEntry
          autoComplete="password"
          style={{ marginTop: 12 }}
        />

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Button
          onPress={handleSubmit}
          disabled={loading}
          loading={loading}
          style={{ marginTop: 24, paddingVertical: 16 }}
        >
          {loading ? 'Processing...' : 'Enter'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  refreshWrap: {
    position: 'absolute',
    right: 20,
    zIndex: 50,
  },
  refreshBtn: {
    padding: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.4)',
  },
  blobLeft: {
    position: 'absolute',
    top: '20%',
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(59,130,246,0.18)',
  },
  blobRight: {
    position: 'absolute',
    bottom: '18%',
    right: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(96,165,250,0.16)',
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.3)',
  },
  logo: { width: '100%', height: '100%' },
  title: {
    color: colors.text,
    fontFamily: fonts.black,
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
  },
  errorBox: {
    marginTop: 12,
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  errorText: {
    color: '#f87171',
    fontFamily: fonts.medium,
    fontSize: 13,
    textAlign: 'center',
  },
});
