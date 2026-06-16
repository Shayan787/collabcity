import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../src/lib/theme';
import useAuthStore from '../../src/store/auth';
import { useEffect, useState } from 'react';
import api from '../../src/lib/api';
import { useSocket } from '../../src/hooks/useSocket';

function TabIcon({ name, focused, badge }) {
  return (
    <View style={styles.iconContainer}>
      <Ionicons name={name} size={22} color={focused ? COLORS.brand : COLORS.textFaint} />
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { user } = useAuthStore();
  const socket = useSocket();
  const [unread, setUnread] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!user) return;
    api.get('/notifications').then(({ data }) => {
      setUnread(data.filter(n => !n.read).length);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => setUnread(p => p + 1);
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socket]);

  const bottomPadding = insets.bottom > 0 ? insets.bottom : 16;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#18181f',
          borderTopColor: '#2a2a35',
          borderTopWidth: 1,
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: COLORS.brand,
        tabBarInactiveTintColor: COLORS.textFaint,
      }}
    >
      <Tabs.Screen name="discover" options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'compass' : 'compass-outline'} focused={focused} /> }} />
      <Tabs.Screen name="match" options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'flash' : 'flash-outline'} focused={focused} /> }} />
      <Tabs.Screen name="chat" options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'chatbubble' : 'chatbubble-outline'} focused={focused} /> }} />
      <Tabs.Screen name="projects" options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'briefcase' : 'briefcase-outline'} focused={focused} /> }} />
      <Tabs.Screen name="leaderboard" options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'trophy' : 'trophy-outline'} focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} /> }} />
      <Tabs.Screen name="notifications" options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'notifications' : 'notifications-outline'} focused={focused} badge={unread} /> }} />
      <Tabs.Screen name="settings" options={{ tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: COLORS.brand, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});