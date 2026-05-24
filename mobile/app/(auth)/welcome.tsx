import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <View className="absolute top-0 left-0 right-0 h-1 bg-primary opacity-80" />

      <View className="flex-1 items-center justify-center px-8">
        <View className="items-center">
          <Text className="text-black dark:text-white font-bold tracking-widest" style={{ fontSize: 56 }}>
            CLIQUE
          </Text>
          <Text className="text-muted text-base mt-2 text-center tracking-wide">
            Your social nightlife.
          </Text>
        </View>
      </View>

      <View className="px-6 pb-14 gap-3">
        <TouchableOpacity
          onPress={() => router.push('/(auth)/signup')}
          className="bg-primary rounded-2xl py-4 items-center"
          activeOpacity={0.85}
        >
          <Text className="text-white text-base font-semibold">Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          className="border border-dark-border dark:border-dark-border rounded-2xl py-4 items-center"
          activeOpacity={0.85}
        >
          <Text className="text-black dark:text-white text-base font-semibold">Log In</Text>
        </TouchableOpacity>

        <Text className="text-muted text-xs text-center mt-1">
          By continuing you agree to our{' '}
          <Text className="text-primary">Terms</Text>
          {' '}&{' '}
          <Text className="text-primary">Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}
