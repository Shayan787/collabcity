import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import api from '../../src/lib/api';
import { COLORS, RADIUS } from '../../src/lib/theme';

const NOTIF_CONFIG = {
  NEW_MESSAGE:          { icon: 'chatbubble',        color: COLORS.brandLight,  bg: COLORS.brandDim },
  NEW_APPLICATION:      { icon: 'briefcase',         color: COLORS.emerald,     bg: 'rgba(52,211,153,0.1)' },
  APPLICATION_ACCEPTED: { icon: 'checkmark-circle',  color: COLORS.emerald,     bg: 'rgba(52,211,153,0.1)' },
  APPLICATION_REJECTED: { icon: 'close-circle',      color: COLORS.red,         bg: 'rgba(248,113,113,0.1)' },
  MILESTONE_RELEASED:   { icon: 'cash',              color: COLORS.emerald,     bg: 'rgba(52,211,153,0.1)' },
  MILESTONE_SUBMITTED:  { icon: 'cloud-upload',      color: COLORS.amber,       bg: 'rgba(251,191,36,0.1)' },
  PAYMENT_APPROVED:     { icon: 'checkmark-circle',  color: COLORS.emerald,     bg: 'rgba(52,211,153,0.1)' },
  PAYMENT_REJECTED:     { icon: 'close-circle',      color: COLORS.red,         bg: 'rgba(248,113,113,0.1)' },
  PAYMENT_REQUESTED:    { icon: 'time',              color: COLORS.amber,       bg: 'rgba(251,191,36,0.1)' },
  DEFAULT:              { icon: 'notifications',     color: COLORS.textMuted,   bg: 'rgba(255,255,255,0.05)' },
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(p => p.map(n => ({ ...n, read: true })));
    } catch {}
  };

  const handlePress = (notif) => {
    if (notif.data?.roomId) router.push(`/chat/${notif.data.roomId}`);
    else if (notif.data?.projectId) router.push(`/project/${notif.data.projectId}`);
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const config = (type) => NOTIF_CONFIG[type] || NOTIF_CONFIG.DEFAULT;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && <Text style={styles.unreadCount}>{unreadCount} unread</Text>}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <Ionicons name="checkmark-done" size={15} color={COLORS.textMuted} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={COLORS.brand} size="large" /></View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={({ item: notif }) => {
            const c = config(notif.type);
            return (
              <TouchableOpacity
                style={[styles.notifItem, !notif.read && styles.notifUnread]}
                onPress={() => handlePress(notif)}
              >
                <View style={[styles.iconContainer, { backgroundColor: c.bg }]}>
                  <Ionicons name={c.icon} size={18} color={c.color} />
                </View>
                <View style={styles.notifContent}>
                  <Text style={[styles.notifMessage, !notif.read && styles.notifMessageUnread]}>
                    {notif.message}
                  </Text>
                  <Text style={styles.notifTime}>
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                  </Text>
                </View>
                {!notif.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
              tintColor={COLORS.brand}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyText}>All caught up!</Text>
              <Text style={styles.emptySubtext}>No notifications yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.white },
  unreadCount: { color: COLORS.textDim, fontSize: 13, marginTop: 2 },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, marginTop: 4 },
  markAllText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
  list: { padding: 16, gap: 2 },
  notifItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: RADIUS.lg },
  notifUnread: { backgroundColor: 'rgba(99,102,241,0.05)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)' },
  iconContainer: { width: 40, height: 40, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  notifContent: { flex: 1 },
  notifMessage: { color: COLORS.textMuted, fontSize: 14, lineHeight: 19 },
  notifMessageUnread: { color: COLORS.white },
  notifTime: { color: COLORS.textFaint, fontSize: 12, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.brand, marginTop: 6, flexShrink: 0 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: COLORS.textFaint, fontSize: 13, marginTop: 4 },
});
