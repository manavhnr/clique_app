import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const passwordRef = useRef<TextInput>(null);
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!identifier.trim()) { setError('Enter your phone number or username'); return; }
    if (!password) { setError('Enter your password'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
      });
      await login(data.data.token, data.data.refreshToken, data.data.user);
      router.replace('/(main)');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 px-6">
        <TouchableOpacity onPress={() => router.back()} className="mt-16 mb-10 self-start">
          <Text className="text-muted text-sm">← Back</Text>
        </TouchableOpacity>

        <Text className="text-white text-3xl font-bold mb-1">Welcome back</Text>
        <Text className="text-muted text-sm mb-10">Sign in to your Clique account</Text>

        {/* Identifier */}
        <Text className="text-white text-sm font-medium mb-2">Phone number or username</Text>
        <TextInput
          className="bg-dark-card border border-dark-border rounded-xl px-4 py-4 text-white text-base mb-4"
          placeholder="Enter username or phone"
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="default"
          value={identifier}
          onChangeText={setIdentifier}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        {/* Password */}
        <Text className="text-white text-sm font-medium mb-2">Password</Text>
        <View className="flex-row items-center bg-dark-card border border-dark-border rounded-xl px-4 mb-2">
          <TextInput
            ref={passwordRef}
            className="flex-1 text-white text-base py-4"
            placeholder="Password"
            placeholderTextColor="#6B7280"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity onPress={() => setShowPassword((p) => !p)} className="pl-3">
            <Text className="text-muted text-sm">{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text className="text-red-400 text-sm mt-1 mb-3">{error}</Text> : null}

        <TouchableOpacity
          className={`rounded-xl py-4 items-center mt-4 ${loading ? 'bg-primary/60' : 'bg-primary'}`}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text className="text-white font-semibold text-base">
            {loading ? 'Signing in...' : 'Log In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/signup')}
          className="mt-6 items-center"
        >
          <Text className="text-muted text-sm">
            No account?{' '}
            <Text className="text-primary font-medium">Get Started</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
