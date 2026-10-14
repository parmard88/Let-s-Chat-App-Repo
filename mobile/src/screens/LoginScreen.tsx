import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  // KeyboardAvoidingView,
  // Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }

    setBusy(true);

    try {
      await login(email, password);
    } catch (error) {
      console.log('LOGIN ERROR:', error);

      Alert.alert(
        'Login failed',
        error instanceof Error ? error.message : JSON.stringify(error),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    // <KeyboardAvoidingView
    //   style={styles.screen}
    //   behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    // >
    // </KeyboardAvoidingView>

    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.logo}>
        <Text style={styles.logoText}>LC</Text>
      </View>

      <Text style={styles.title}>Welcome back!</Text>
      <Text style={styles.subtitle}>Sign in to continue to Let's Chat.</Text>

      <Text style={styles.label}>Email address</Text>
      <TextInput
        style={styles.input}
        placeholder="you@example.com"
        placeholderTextColor="#9995A8"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy}
        maxLength={254}
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your password"
        placeholderTextColor="#9995A8"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        editable={!busy}
      />

      <TouchableOpacity
        style={[styles.button, busy && styles.disabled]}
        onPress={handleLogin}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Log In</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>New to Let's Chat? </Text>
        <Text
          style={styles.link}
          onPress={() => navigation.navigate('Register')}
        >
          Create account
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F7FF',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#6558E8',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 22,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  title: {
    color: '#24213D',
    fontSize: 29,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: '#77738C',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  label: {
    color: '#39354E',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E1F0',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    color: '#24213D',
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#6558E8',
    borderRadius: 12,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  disabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 26,
  },
  footerText: {
    color: '#77738C',
    fontSize: 14,
  },
  link: {
    color: '#6558E8',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
