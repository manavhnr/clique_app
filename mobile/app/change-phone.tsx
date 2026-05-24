import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function ChangePhoneScreen() {
  const router = useRouter();
  const { updateUser } = useAuth();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const otpInputs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) { setError('Enter a valid phone number'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/users/change-phone/request', { newPhone: cleaned });
      setStep('otp');
      setResendTimer(30);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (val: string, idx: number) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpInputs.current[idx + 1]?.focus();
  };

  const handleOtpKeyPress = (key: string, idx: number) => {
    if (key === 'Backspace' && !otp[idx] && idx > 0) {
      otpInputs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Enter the 6-digit OTP'); return; }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/users/change-phone/verify', {
        newPhone: phone.replace(/\D/g, ''),
        otp: code,
      });
      await updateUser(data.data.user);
      router.back();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError('');
    try {
      await api.post('/users/change-phone/request', { newPhone: phone.replace(/\D/g, '') });
      setResendTimer(30);
      setOtp(['', '', '', '', '', '']);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to resend OTP');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0A0A0F' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 }}>
        <TouchableOpacity onPress={() => (step === 'otp' ? setStep('phone') : router.back())} style={{ marginRight: 14 }}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#ffffff' }}>Change Phone Number</Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24 }}>

        {step === 'phone' ? (
          <>
            <Text style={{ color: '#6B7280', fontSize: 14, marginBottom: 28, lineHeight: 20 }}>
              Enter your new phone number. We'll send a 6-digit OTP to verify it.
            </Text>

            <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>New Phone Number</Text>
            <TextInput
              style={{
                backgroundColor: '#111827',
                borderWidth: 1,
                borderColor: '#1F2937',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                color: '#ffffff',
                fontSize: 16,
                marginBottom: 8,
              }}
              placeholder="Enter new phone number"
              placeholderTextColor="#6B7280"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoFocus
            />

            {error ? <Text style={{ color: '#f87171', fontSize: 13, marginBottom: 8 }}>{error}</Text> : null}

            <TouchableOpacity
              onPress={handleSendOtp}
              disabled={loading}
              style={{
                backgroundColor: loading ? 'rgba(37,99,235,0.6)' : '#2563EB',
                borderRadius: 14,
                paddingVertical: 15,
                alignItems: 'center',
                marginTop: 8,
              }}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Send OTP</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={{ color: '#6B7280', fontSize: 14, marginBottom: 28, lineHeight: 20 }}>
              Enter the 6-digit code sent to {phone}.
            </Text>

            {/* OTP boxes */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(r) => { if (r) otpInputs.current[i] = r; }}
                  style={{
                    width: 48,
                    height: 56,
                    backgroundColor: '#111827',
                    borderWidth: 1,
                    borderColor: digit ? '#2563EB' : '#1F2937',
                    borderRadius: 12,
                    color: '#ffffff',
                    fontSize: 22,
                    textAlign: 'center',
                  }}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={digit}
                  onChangeText={(v) => handleOtpChange(v, i)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                />
              ))}
            </View>

            {error ? <Text style={{ color: '#f87171', fontSize: 13, marginBottom: 8 }}>{error}</Text> : null}

            <TouchableOpacity
              onPress={handleVerify}
              disabled={loading}
              style={{
                backgroundColor: loading ? 'rgba(37,99,235,0.6)' : '#2563EB',
                borderRadius: 14,
                paddingVertical: 15,
                alignItems: 'center',
                marginTop: 8,
              }}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Verify & Update</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleResend} style={{ marginTop: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: resendTimer > 0 ? '#6B7280' : '#2563EB' }}>
                {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
