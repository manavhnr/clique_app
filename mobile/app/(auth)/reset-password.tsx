import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function ResetPasswordScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const inputs = useRef<TextInput[]>([]);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const router = useRouter();
  const { login } = useAuth();

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleOtpChange = (val: string, idx: number) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
    if (val && idx === 5) newPasswordRef.current?.focus();
  };

  const handleOtpKeyPress = (key: string, idx: number) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handleReset = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Enter the 6-digit OTP'); return; }
    if (!newPassword) { setError('Enter a new password'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        phone,
        otp: code,
        newPassword,
      });
      await login(data.data.token, data.data.refreshToken, data.data.user);
      router.replace('/(main)');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    try {
      await api.post('/auth/forgot-password', { phone });
      setResendTimer(30);
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to resend OTP');
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()} className="mt-16 mb-10 self-start">
          <Text className="text-muted text-sm">← Back</Text>
        </TouchableOpacity>

        <Text className="text-white text-3xl font-bold mb-1">Reset password</Text>
        <Text className="text-muted text-sm mb-8">
          Enter the OTP sent to {phone} and choose a new password.
        </Text>

        {/* OTP boxes */}
        <Text className="text-white text-sm font-medium mb-3">OTP</Text>
        <View className="flex-row justify-between mb-6">
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(r) => { if (r) inputs.current[i] = r; }}
              className="w-12 h-14 bg-dark-card border border-dark-border rounded-xl text-white text-xl text-center"
              maxLength={1}
              keyboardType="number-pad"
              value={digit}
              onChangeText={(v) => handleOtpChange(v, i)}
              onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
            />
          ))}
        </View>

        <TouchableOpacity onPress={handleResend} className="mb-8 self-start">
          <Text className={resendTimer > 0 ? 'text-muted text-sm' : 'text-primary text-sm'}>
            {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
          </Text>
        </TouchableOpacity>

        {/* New password */}
        <Text className="text-white text-sm font-medium mb-2">New password</Text>
        <View className="flex-row items-center bg-dark-card border border-dark-border rounded-xl px-4 mb-4">
          <TextInput
            ref={newPasswordRef}
            className="flex-1 text-white text-base py-4"
            placeholder="At least 6 characters"
            placeholderTextColor="#6B7280"
            secureTextEntry={!showPassword}
            value={newPassword}
            onChangeText={setNewPassword}
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
          />
          <TouchableOpacity onPress={() => setShowPassword((p) => !p)} className="pl-3">
            <Text className="text-muted text-sm">{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        {/* Confirm password */}
        <Text className="text-white text-sm font-medium mb-2">Confirm password</Text>
        <TextInput
          ref={confirmPasswordRef}
          className="bg-dark-card border border-dark-border rounded-xl px-4 py-4 text-white text-base mb-2"
          placeholder="Re-enter new password"
          placeholderTextColor="#6B7280"
          secureTextEntry={!showPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          returnKeyType="done"
          onSubmitEditing={handleReset}
        />

        {error ? <Text className="text-red-400 text-sm mt-1 mb-3">{error}</Text> : null}

        <TouchableOpacity
          className={`rounded-xl py-4 items-center mt-4 ${loading ? 'bg-primary/60' : 'bg-primary'}`}
          onPress={handleReset}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text className="text-white font-semibold text-base">
            {loading ? 'Resetting...' : 'Reset Password'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
