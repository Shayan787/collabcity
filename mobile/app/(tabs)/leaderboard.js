import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import { COLORS, RADIUS } from '../../src/lib/theme';

const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Peshawar'];

const RANK_CONFIG = {
  1: { emoji: '🥇', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)' },
  2: { emoji: '🥈', color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.3)' },
  3: { emoji: '🥉', color: '#b45309', bg: 'rgba(180,83,9,0.1)', border: 'rgba(180,83,9,0.3)' },
};

function LeaderboardCard({ user, onPress }) {
  const rank = RANK_CONFIG[user.rank];
  const borderColor = rank ? rank.border : COLORS.border;
  const bgColor = rank ? rank.bg : 'transparent';

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor, backgroundColor: bgColor }]}
      onPress={onPress}
    >
      {/* Rank */}
      <View style={styles.rankContainer}>
        {rank ? (
          <Text style={styles.rankEmoji}>{rank.emoji}</Text>
        ) : (
          <Text style={[styles.rankNumber, { color: COLORS.textFaint }]}>#{user.rank}</Text>
        )}
      </View>

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {user.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{user.name?.[0]?.toUpperCase()}</Text>
          </View>
        )}
        {user.isOnline && <View style={styles.onlineDot} />}
        {user.isBoosted && (
          <View style={styles.boostBadge}>
            <Text style={styles.boostEmoji}>🚀</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
          {user.isVerified && <Text style={styles.verified}>✓</Text>}
        </View>
        <Text style={styles.username}>@{user.username}</Text>
        {user.vibeTags?.length > 0 && (
          <Text style={styles.vibe} numberOfLines={1}>
            {user.vibeTags.slice(0, 2).map(vt => vt.vibeTag?.name).join(' · ')}
          </Text>
        )}
      </View>

      {/* Score */}
      <View style={styles.scoreContainer}>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={11} color={COLORS.amber} />
          <Text style={styles.rating}>{user.avgRating}</Text>
        </View>
        <Text style={styles.ratingCount}>{user.ratingCount} ratings</Text>
        <Text style={[styles.score, { color: rank ? rank.color : COLORS.brand }]}>{user.score} pts</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function LeaderboardScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [city, setCity] = useState('Karachi');
  const router = useRouter();

  const fetchLeaderboard = async () => {
    try {
      const { data } = await api.get(`/leaderboard?city=${city}`);
      setUsers(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { setLoading(true); fetchLeaderboard(); }, [city]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Ionicons name="trophy" size={22} color={COLORS.amber} />
          <Text style={styles.title}>Leaderboard</Text>
        </View>

        {/* City filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityFilter}>
          {CITIES.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.cityChip, city === c && styles.cityChipActive]}
              onPress={() => setCity(c)}
            >
              <Text style={[styles.cityText, city === c && styles.cityTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={COLORS.brand} size="large" /></View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <LeaderboardCard
              user={item}
              onPress={() => router.push(`/profile/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchLeaderboard(); }}
              tintColor={COLORS.brand}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏆</Text>
              <Text style={styles.emptyText}>No rankings yet</Text>
              <Text style={styles.emptySubtext}>Be the first to get rated in {city}!</Text>
            </View>
          }
          ListFooterComponent={
            users.length > 0 ? (
              <Text style={styles.formula}>Score = avg rating × 20 + rating count × 5 + projects × 3</Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.white },
  cityFilter: { marginHorizontal: -4 },
  cityChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, marginHorizontal: 4 },
  cityChipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  cityText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500' },
  cityTextActive: { color: '#fff' },
  list: { padding: 16, gap: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, padding: 12 },
  rankContainer: { width: 32, alignItems: 'center' },
  rankEmoji: { fontSize: 22 },
  rankNumber: { fontSize: 14, fontWeight: '700' },
  avatarContainer: { position: 'relative' },
  avatar: { width: 44, height: 44, borderRadius: 12 },
  avatarFallback: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.brandDim, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.brandLight, fontSize: 18, fontWeight: '700' },
  onlineDot: { position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: 6, backgroundColor: COLORS.emerald, borderWidth: 2, borderColor: COLORS.surface },
  boostBadge: { position: 'absolute', top: -4, right: -4 },
  boostEmoji: { fontSize: 12 },
  userInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { color: COLORS.white, fontWeight: '600', fontSize: 14, flexShrink: 1 },
  verified: { color: COLORS.brandLight, fontSize: 11 },
  username: { color: COLORS.textDim, fontSize: 11, marginTop: 1 },
  vibe: { color: COLORS.textFaint, fontSize: 11, marginTop: 2 },
  scoreContainer: { alignItems: 'flex-end' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { color: COLORS.amber, fontWeight: '700', fontSize: 13 },
  ratingCount: { color: COLORS.textFaint, fontSize: 10, marginTop: 1 },
  score: { fontSize: 13, fontWeight: '800', marginTop: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: COLORS.textFaint, fontSize: 13, marginTop: 4 },
  formula: { color: COLORS.textFaint, fontSize: 11, textAlign: 'center', marginTop: 16, paddingBottom: 16 },
});
