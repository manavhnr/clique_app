import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

type PrefIcon = keyof typeof Ionicons.glyphMap;

const PREFERENCES: { id: string; label: string; icon: PrefIcon }[] = [
  { id: 'house_parties',  label: 'House Parties',   icon: 'home-outline' },
  { id: 'edm',            label: 'EDM',             icon: 'headset-outline' },
  { id: 'hiphop',         label: 'Hip-Hop',         icon: 'mic-outline' },
  { id: 'live_music',     label: 'Live Music',      icon: 'musical-notes-outline' },
  { id: 'cocktail_bars',  label: 'Cocktail Bars',   icon: 'wine-outline' },
  { id: 'dance_clubs',    label: 'Dance Clubs',     icon: 'disc-outline' },
  { id: 'casual',         label: 'Casual Hangouts', icon: 'happy-outline' },
  { id: 'rock_indie',     label: 'Rock / Indie',    icon: 'musical-note-outline' },
  { id: 'festivals',      label: 'Festivals',       icon: 'star-outline' },
  { id: 'late_night',     label: 'Late Night',      icon: 'moon-outline' },
  { id: 'outdoor',        label: 'Outdoor Events',  icon: 'leaf-outline' },
  { id: 'themed',         label: 'Themed Parties',  icon: 'color-palette-outline' },
];

export default function SetupScreen() {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2
  const [preferences, setPreferences] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { updateUser } = useAuth();

  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const togglePref = (id: string) => {
    setPreferences((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleStep1Continue = () => {
    if (!name.trim()) { setError('Full name is required'); return; }
    if (!username.trim() || username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (!/^[a-z0-9_]+$/i.test(username.trim())) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setError('');
    setStep(2);
  };

  const handleFinish = async () => {
    if (preferences.length < 3) {
      setError('Choose at least 3 preferences');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.put('/users/profile', {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        password,
        vibeTags: preferences,
      });
      await updateUser(data.data.user);
      router.replace('/(main)');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Setup failed');
      setLoading(false);
    }
  };

  // ─── Step 1 ────────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <KeyboardAvoidingView
        className="flex-1 bg-dark"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingTop: 64, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress */}
          <View className="flex-row gap-2 mb-10">
            <View className="flex-1 h-1 rounded-full bg-primary" />
            <View className="flex-1 h-1 rounded-full bg-dark-border" />
          </View>

          <Text className="text-white text-2xl font-bold mb-1">Create your profile</Text>
          <Text className="text-muted text-sm mb-8">This is how you'll appear on Clique</Text>

          {/* Full Name */}
          <Text className="text-white text-sm font-medium mb-2">Full Name</Text>
          <TextInput
            className="bg-dark-card border border-dark-border rounded-xl px-4 py-4 text-white text-base mb-5"
            placeholder="Your full name"
            placeholderTextColor="#6B7280"
            value={name}
            onChangeText={setName}
            returnKeyType="next"
            onSubmitEditing={() => usernameRef.current?.focus()}
          />

          {/* Username */}
          <Text className="text-white text-sm font-medium mb-2">Username</Text>
          <View className="flex-row items-center bg-dark-card border border-dark-border rounded-xl px-4 mb-5">
            <Text className="text-muted text-base">@</Text>
            <TextInput
              ref={usernameRef}
              className="flex-1 text-white text-base py-4 ml-1"
              placeholder="yourhandle"
              placeholderTextColor="#6B7280"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          {/* Password */}
          <Text className="text-white text-sm font-medium mb-2">Password</Text>
          <View className="flex-row items-center bg-dark-card border border-dark-border rounded-xl px-4 mb-5">
            <TextInput
              ref={passwordRef}
              className="flex-1 text-white text-base py-4"
              placeholder="Min. 8 characters"
              placeholderTextColor="#6B7280"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <TouchableOpacity onPress={() => setShowPassword((p) => !p)} className="pl-3">
              <Text className="text-muted text-sm">{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <Text className="text-white text-sm font-medium mb-2">Confirm Password</Text>
          <TextInput
            ref={confirmRef}
            className="bg-dark-card border border-dark-border rounded-xl px-4 py-4 text-white text-base mb-8"
            placeholder="Re-enter password"
            placeholderTextColor="#6B7280"
            secureTextEntry={!showPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            returnKeyType="done"
            onSubmitEditing={handleStep1Continue}
          />

          {error ? <Text className="text-red-400 text-sm mb-4">{error}</Text> : null}

          <TouchableOpacity
            className="bg-primary rounded-xl py-4 items-center"
            onPress={handleStep1Continue}
            activeOpacity={0.85}
          >
            <Text className="text-white font-semibold text-base">Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── Step 2 ────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-dark">
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingTop: 64, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress */}
        <View className="flex-row gap-2 mb-10">
          <View className="flex-1 h-1 rounded-full bg-primary" />
          <View className="flex-1 h-1 rounded-full bg-primary" />
        </View>

        <TouchableOpacity onPress={() => { setError(''); setStep(1); }} className="mb-6 self-start">
          <Text className="text-muted text-sm">← Back</Text>
        </TouchableOpacity>

        <Text className="text-white text-2xl font-bold mb-1">What's your vibe?</Text>
        <Text className="text-muted text-sm mb-8">
          Pick at least 3 — we'll personalise your feed
        </Text>

        <View className="flex-row flex-wrap gap-3 mb-6">
          {PREFERENCES.map((pref) => {
            const selected = preferences.includes(pref.id);
            return (
              <TouchableOpacity
                key={pref.id}
                onPress={() => togglePref(pref.id)}
                activeOpacity={0.8}
                className={`flex-row items-center gap-2 px-4 py-3 rounded-2xl border ${
                  selected ? 'bg-primary border-primary' : 'bg-dark-card border-dark-border'
                }`}
              >
                <Ionicons name={pref.icon} size={18} color={selected ? '#fff' : '#6B7280'} />
                <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-muted'}`}>
                  {pref.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="flex-row items-center gap-2 mb-6">
          <Text className={`text-sm ${preferences.length >= 3 ? 'text-primary' : 'text-muted'}`}>
            {preferences.length >= 3
              ? `${preferences.length} selected`
              : `${preferences.length} selected — ${3 - preferences.length} more to go`}
          </Text>
          {preferences.length >= 3 && (
            <Ionicons name="checkmark-circle" size={16} color="#7C3AED" />
          )}
        </View>

        {error ? <Text className="text-red-400 text-sm mb-4">{error}</Text> : null}

        <TouchableOpacity
          onPress={handleFinish}
          disabled={loading || preferences.length < 3}
          activeOpacity={0.85}
          className={`rounded-xl py-4 items-center ${
            preferences.length >= 3 && !loading ? 'bg-primary' : 'bg-primary/40'
          }`}
        >
          <Text className="text-white font-semibold text-base">
            {loading ? 'Setting up...' : 'Enter Clique'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
