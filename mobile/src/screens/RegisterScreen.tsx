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

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleRegister() {
    if (!displayName.trim() || !email.trim() || !password) {
      Alert.alert('Missing details', 'Complete all required fields.');
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        'Password too short',
        'Choose a password with at least 8 characters.',
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Check both password fields.');
      return;
    }

    setBusy(true);

    try {
      await register(displayName, email, password);
    } catch (error) {
      Alert.alert(
        'Registration failed',
        error instanceof Error ? error.message : 'Please try again.',
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
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Join Let's Chat and stay connected.</Text>

      <Text style={styles.label}>Full name</Text>
      <TextInput
        style={styles.input}
        placeholder="Your name"
        placeholderTextColor="#9995A8"
        value={displayName}
        onChangeText={setDisplayName}
        autoCapitalize="words"
        editable={!busy}
        maxLength={100}
      />

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
        placeholder="At least 8 characters"
        placeholderTextColor="#9995A8"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        editable={!busy}
      />

      <Text style={styles.label}>Confirm password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter password again"
        placeholderTextColor="#9995A8"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
        editable={!busy}
      />

      <TouchableOpacity
        style={[styles.button, busy && styles.disabled]}
        onPress={handleRegister}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Create Account</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already registered? </Text>
        <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
          Log in
        </Text>
      </View>
    </ScrollView>
    // </KeyboardAvoidingView>
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
    paddingVertical: 28,
  },
  title: {
    color: '#24213D',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: '#77738C',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 28,
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
    paddingVertical: 13,
    color: '#24213D',
    fontSize: 16,
    marginBottom: 17,
  },
  button: {
    backgroundColor: '#6558E8',
    borderRadius: 12,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
    marginTop: 24,
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
