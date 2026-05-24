import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import api from '@/lib/api';

export default function SignupScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSendOtp = async () => {
    const cleaned = phone.trim().replace(/\s/g, '');
    if (cleaned.length < 10) {
      setError('Enter a valid 10-digit phone number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone: cleaned });
      router.push({ pathname: '/(auth)/otp', params: { phone: cleaned } });
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

        <Text className="text-white text-3xl font-bold mb-1">Create account</Text>
        <Text className="text-muted text-sm mb-10">
          Enter your phone number — we'll send a one-time code.
        </Text>

        <View className="flex-row items-center bg-dark-card border border-dark-border rounded-xl px-4 mb-3">
          <Text className="text-muted text-base mr-2">+91</Text>
          <TextInput
            className="flex-1 text-white text-base py-4"
            placeholder="Phone number"
            placeholderTextColor="#6B7280"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
            autoFocus
          />
        </View>

        {error ? <Text className="text-red-400 text-sm mb-3">{error}</Text> : null}

        <TouchableOpacity
          className={`rounded-xl py-4 items-center mt-2 ${loading ? 'bg-primary/60' : 'bg-primary'}`}
          onPress={handleSendOtp}
          disabled={loading}
        >
          <Text className="text-white font-semibold text-base">
            {loading ? 'Sending...' : 'Send OTP'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
