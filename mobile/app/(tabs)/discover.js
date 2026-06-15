import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import useAuthStore from '../../src/store/auth';
import { COLORS, RADIUS } from '../../src/lib/theme';

const FILTERS = [
  { key: 'all', label: 'All', emoji: '✨' },
  { key: 'Developer', label: 'Developer', emoji: '💻' },
  { key: 'Designer', label: 'Designer', emoji: '🎨' },
  { key: 'Video Editor', label: 'Video Editor', emoji: '🎬' },
  { key: 'Content Creator', label: 'Creator', emoji: '📱' },
  { key: 'Musician', label: 'Musician', emoji: '🎵' },
  { key: 'Photographer', label: 'Photographer', emoji: '📸' },
  { key: 'Marketer', label: 'Marketer', emoji: '📣' },
  { key: 'Entrepreneur', label: 'Entrepreneur', emoji: '🚀' },
];

function UserCard({ user, onMessage }) {
  const router = useRouter();
  const avgRating = user.ratingsReceived?.length
    ? (user.ratingsReceived.reduce((a, b) => a + b.score, 0) / user.ratingsReceived.length).toFixed(1)
    : null;

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/profile/${user.id}`)}>
      <View style={styles.cardTop}>
        <View style={styles.avatarContainer}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{user.name?.[0]?.toUpperCase()}</Text>
            </View>
          )}
          <View style={[styles.onlineDot, { backgroundColor: user.isOnline ? COLORS.emerald : '#4b5563' }]} />
        </View>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
            {user.isVerified && <Text style={styles.verified}>✓</Text>}
            {avgRating && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={11} color={COLORS.amber} />
                <Text style={styles.rating}>{avgRating}</Text>
              </View>
            )}
          </View>
          <Text style={styles.username}>@{user.username}</Text>
        </View>
        <TouchableOpacity style={styles.chatBtn} onPress={() => onMessage(user)}>
          <Ionicons name="chatbubble" size={14} color="#fff" />
          <Text style={styles.chatBtnText}>Chat</Text>
        </TouchableOpacity>
      </View>

      {user.bio ? <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text> : null}

      <View style={styles.cardBottom}>
        <View style={styles.tags}>
          {user.vibeTags?.slice(0, 2).map(vt => (
            <View key={vt.vibeTag.id} style={styles.tag}>
              <Text style={styles.tagText}>{vt.vibeTag.name}</Text>
            </View>
          ))}
        </View>
        {(user.city || user.area) && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={11} color={COLORS.textFaint} />
            <Text style={styles.location}>{user.area || user.city}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function DiscoverScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const router = useRouter();
  const { user } = useAuthStore();

  const fetchUsers = useCallback(async () => {
    try {
      const params = filter !== 'all' ? { vibeTag: filter } : {};
      const { data } = await api.get('/users', { params });
      setUsers(data.users);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [filter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleMessage = async (targetUser) => {
    try {
      const { data } = await api.post('/rooms/direct', { userId: targetUser.id });
      router.push(`/chat/${data.id}`);
    } catch {}
  };

  const filtered = users.filter(u =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.bio?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color={COLORS.textDim} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people..."
            placeholderTextColor={COLORS.textDim}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textDim} />
            </TouchableOpacity>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.emoji} {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.brand} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <UserCard user={item} onMessage={handleMessage} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(); }} tintColor={COLORS.brand} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No people found</Text>
              <Text style={styles.emptySubtext}>Try a different filter</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.white, marginBottom: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, gap: 8 },
  searchIcon: {},
  searchInput: { flex: 1, color: COLORS.white, fontSize: 14 },
  filters: { marginHorizontal: -4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, marginHorizontal: 4 },
  filterChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  filterText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 46, height: 46, borderRadius: 14 },
  avatarFallback: { width: 46, height: 46, borderRadius: 14, backgroundColor: COLORS.brandDim, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.brandLight, fontSize: 18, fontWeight: '700' },
  onlineDot: { position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: COLORS.card },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { color: COLORS.white, fontWeight: '600', fontSize: 14, flex: 1 },
  verified: { color: COLORS.brandLight, fontSize: 11 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rating: { color: COLORS.amber, fontSize: 11, fontWeight: '600' },
  username: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.brand, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 7 },
  chatBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  bio: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tags: { flexDirection: 'row', gap: 6 },
  tag: { backgroundColor: 'rgba(99,102,241,0.1)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { color: COLORS.brandLight, fontSize: 11, fontWeight: '500' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  location: { color: COLORS.textFaint, fontSize: 11 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  emptySubtext: { color: COLORS.textFaint, fontSize: 13, marginTop: 4 },
});
