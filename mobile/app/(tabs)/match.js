import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Image, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import { COLORS, RADIUS } from '../../src/lib/theme';

const SUGGESTIONS = [
  'Build a mobile app together',
  'Create YouTube content',
  'Start a clothing brand',
  'Make music and beats',
  'Design a brand identity',
  'Launch a startup',
];

function MatchCard({ match, index, onMessage }) {
  const { user, score, reason } = match;
  const scoreColor = score >= 80 ? COLORS.emerald : score >= 60 ? COLORS.brandLight : COLORS.amber;

  return (
    <View style={[styles.matchCard, { borderTopColor: scoreColor }]}>
      <View style={styles.matchTop}>
        <View style={styles.avatarContainer}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{user.name?.[0]?.toUpperCase()}</Text>
            </View>
          )}
          {user.isOnline && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.matchInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.matchName}>{user.name}</Text>
            {user.isVerified && <Text style={styles.verified}>✓</Text>}
          </View>
          <Text style={styles.matchUsername}>@{user.username}</Text>
          {user.city && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={11} color={COLORS.textFaint} />
              <Text style={styles.locationText}>{user.city}</Text>
            </View>
          )}
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: `${scoreColor}18`, borderColor: `${scoreColor}40` }]}>
          <Text style={[styles.scoreText, { color: scoreColor }]}>{score}%</Text>
        </View>
      </View>

      {/* AI reason */}
      <View style={styles.reasonBox}>
        <Ionicons name="flash" size={12} color={COLORS.brandLight} />
        <Text style={styles.reasonText}>{reason}</Text>
      </View>

      {/* Tags */}
      {user.vibeTags?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsRow}>
          {user.vibeTags.slice(0, 3).map((vt, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{vt.vibeTag?.name || vt.name}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.msgBtn} onPress={() => onMessage(user)}>
        <Ionicons name="chatbubble" size={14} color="#fff" />
        <Text style={styles.msgBtnText}>Message</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function MatchScreen() {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const router = useRouter();

  const handleMatch = async () => {
    if (!goal.trim()) return Alert.alert('Enter a goal', 'Tell us what you want to do!');
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post('/match', { goal });
      setResult(data);
      if (data.matches.length === 0) Alert.alert('No matches', 'No strong matches found yet — invite more friends!');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Smart match failed');
    } finally { setLoading(false); }
  };

  const handleMessage = async (user) => {
    try {
      const { data } = await api.post('/rooms/direct', { userId: user.id });
      router.push(`/chat/${data.id}`);
    } catch { Alert.alert('Error', 'Could not start chat'); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="flash" size={20} color={COLORS.brandLight} />
        </View>
        <View>
          <Text style={styles.title}>Smart Match</Text>
          <Text style={styles.subtitle}>AI finds your best collaborators</Text>
        </View>
      </View>

      {/* Goal input */}
      <View style={styles.card}>
        <Text style={styles.label}>What do you want to do?</Text>
        <TextInput
          style={styles.goalInput}
          placeholder="e.g. Build a food delivery app, start a YouTube channel..."
          placeholderTextColor={COLORS.textDim}
          value={goal}
          onChangeText={setGoal}
          multiline
          maxLength={200}
        />

        {/* Suggestions */}
        <View style={styles.suggestions}>
          {SUGGESTIONS.map(s => (
            <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => setGoal(s)}>
              <Text style={styles.suggestionText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.matchBtn} onPress={handleMatch} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="flash" size={16} color="#fff" />
              <Text style={styles.matchBtnText}>Find My Match</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={COLORS.brand} size="large" />
          <Text style={styles.loadingText}>AI is analyzing profiles...</Text>
        </View>
      )}

      {/* Results */}
      {result && !loading && (
        <View>
          {result.reasoning && (
            <View style={styles.reasoningBox}>
              <Ionicons name="flash" size={14} color={COLORS.brandLight} />
              <Text style={styles.reasoningText}>{result.reasoning}</Text>
            </View>
          )}
          {result.matches.length > 0 && (
            <>
              <Text style={styles.matchCount}>{result.matches.length} best matches for you</Text>
              {result.matches.map((match, i) => (
                <MatchCard key={match.id || i} match={match} index={i} onMessage={handleMessage} />
              ))}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  scroll: { padding: 16, paddingTop: 56, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  headerIcon: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.brandDim, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.white },
  subtitle: { color: COLORS.textDim, fontSize: 13, marginTop: 2 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 16 },
  label: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500', marginBottom: 10 },
  goalInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 14, color: COLORS.white, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 14 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  suggestionChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border },
  suggestionText: { color: COLORS.textMuted, fontSize: 12 },
  matchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.brand, borderRadius: RADIUS.md, padding: 14 },
  matchBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  loadingCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: 32, alignItems: 'center', gap: 16, marginBottom: 16 },
  loadingText: { color: COLORS.textMuted, fontSize: 14 },
  reasoningBox: { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(99,102,241,0.08)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)', borderRadius: RADIUS.lg, padding: 14, marginBottom: 12 },
  reasoningText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, flex: 1 },
  matchCount: { color: COLORS.textFaint, fontSize: 12, fontWeight: '500', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  matchCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, borderTopWidth: 2, padding: 14, marginBottom: 10 },
  matchTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 44, height: 44, borderRadius: 12 },
  avatarFallback: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.brandDim, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.brandLight, fontSize: 18, fontWeight: '700' },
  onlineDot: { position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, borderRadius: 6, backgroundColor: COLORS.emerald, borderWidth: 2, borderColor: COLORS.card },
  matchInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  matchName: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  verified: { color: COLORS.brandLight, fontSize: 11 },
  matchUsername: { color: COLORS.textDim, fontSize: 12, marginTop: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  locationText: { color: COLORS.textFaint, fontSize: 11 },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.md, borderWidth: 1 },
  scoreText: { fontWeight: '700', fontSize: 14 },
  reasonBox: { flexDirection: 'row', gap: 6, backgroundColor: 'rgba(99,102,241,0.06)', borderRadius: RADIUS.md, padding: 10, marginBottom: 10 },
  reasonText: { color: COLORS.brandLight, fontSize: 12, lineHeight: 16, flex: 1 },
  tagsRow: { marginBottom: 12 },
  tag: { backgroundColor: COLORS.brandDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' },
  tagText: { color: COLORS.brandLight, fontSize: 11, fontWeight: '500' },
  msgBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.brand, borderRadius: RADIUS.md, padding: 10 },
  msgBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
