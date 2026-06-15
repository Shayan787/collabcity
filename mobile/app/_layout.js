import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import useAuthStore from '../src/store/auth';

function AuthGate() {
  const { user, isLoading, init } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      router.replace('/(tabs)/discover');
    }
  }, [user, isLoading, segments]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor="#0f0f13" />
      <AuthGate />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0f0f13' } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="profile/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="project/[id]" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
