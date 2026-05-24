import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const inputs = useRef<TextInput[]>([]);
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleChange = (val: string, idx: number) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (key: string, idx: number) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Enter the 6-digit OTP'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otp: code });
      await login(data.data.token, data.data.refreshToken, data.data.user);
      if (data.data.needsSetup) {
        router.replace('/(auth)/setup');
      } else {
        router.replace('/(main)');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    try {
      await api.post('/auth/send-otp', { phone });
      setResendTimer(30);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to resend OTP');
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-1 px-6 justify-center">
        <TouchableOpacity onPress={() => router.back()} className="mb-8">
          <Text className="text-muted text-sm">← Back</Text>
        </TouchableOpacity>

        <Text className="text-white text-2xl font-semibold mb-1">Verify OTP</Text>
        <Text className="text-muted text-sm mb-8">Sent to +91 {phone}</Text>

        <View className="flex-row justify-between mb-4">
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => { if (r) inputs.current[i] = r; }}
              className="w-12 h-14 bg-dark-card border border-dark-border rounded-xl text-white text-xl text-center"
              maxLength={1}
              keyboardType="number-pad"
              value={digit}
              onChangeText={(v) => handleChange(v, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
            />
          ))}
        </View>

        {error ? <Text className="text-red-400 text-sm mb-3">{error}</Text> : null}

        <TouchableOpacity
          className={`rounded-xl py-4 items-center mt-2 ${loading ? 'bg-primary/60' : 'bg-primary'}`}
          onPress={handleVerify}
          disabled={loading}
        >
          <Text className="text-white font-semibold text-base">
            {loading ? 'Verifying...' : 'Verify OTP'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} className="mt-6 items-center">
          <Text className={resendTimer > 0 ? 'text-muted text-sm' : 'text-primary text-sm'}>
            {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
