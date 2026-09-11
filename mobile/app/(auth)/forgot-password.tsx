import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '@/lib/api';

export default function ForgotPasswordScreen() {
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();
  const [phone, setPhone] = useState(prefill && /^\d/.test(prefill) ? prefill : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSend = async () => {
    const cleaned = phone.trim().replace(/\s/g, '');
    if (!cleaned) { setError('Enter your phone number'); return; }
    if (!/^\+?[0-9]{10,15}$/.test(cleaned)) { setError('Enter a valid phone number'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { phone: cleaned });
      router.push({ pathname: '/(auth)/reset-password', params: { phone: cleaned } });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send OTP');
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

        <Text className="text-white text-3xl font-bold mb-1">Forgot password?</Text>
        <Text className="text-muted text-sm mb-10">
          Enter your phone number and we'll send you an OTP to reset your password.
        </Text>

        <Text className="text-white text-sm font-medium mb-2">Phone number</Text>
        <TextInput
          className="bg-dark-card border border-dark-border rounded-xl px-4 py-4 text-white text-base mb-2"
          placeholder="+91 98765 43210"
          placeholderTextColor="#6B7280"
          keyboardType="phone-pad"
          autoComplete="tel"
          value={phone}
          onChangeText={setPhone}
          returnKeyType="done"
          onSubmitEditing={handleSend}
        />

        {error ? <Text className="text-red-400 text-sm mt-1 mb-3">{error}</Text> : null}

        <TouchableOpacity
          className={`rounded-xl py-4 items-center mt-4 ${loading ? 'bg-primary/60' : 'bg-primary'}`}
          onPress={handleSend}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text className="text-white font-semibold text-base">
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
