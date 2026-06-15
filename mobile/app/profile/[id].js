import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Alert, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import api from '../../src/lib/api';
import useAuthStore from '../../src/store/auth';
import { COLORS, RADIUS } from '../../src/lib/theme';

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams();
  const { user: me } = useAuthStore();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/users/${id}`)
      .then(({ data }) => { setProfile(data); setLoading(false); })
      .catch(() => { Alert.alert('Error', 'User not found'); router.back(); });
  }, [id]);

  const handleMessage = async () => {
    try {
      const { data } = await api.post('/rooms/direct', { userId: id });
      router.push(`/chat/${data.id}`);
    } catch { Alert.alert('Error', 'Could not start chat'); }
  };

  const handleRate = async () => {
    if (!rating) return Alert.alert('Error', 'Select a star rating');
    setSubmitting(true);
    try {
      await api.post(`/users/${id}/rate`, { score: rating, comment });
      Alert.alert('Success', 'Rating submitted!');
      setShowRatingForm(false);
      setRating(0);
      setComment('');
      const { data } = await api.get(`/users/${id}`);
      setProfile(data);
    } catch { Alert.alert('Error', 'Failed to submit rating'); }
    finally { setSubmitting(false); }
  };

  const isOwnProfile = me?.id === id;
  const avgRating = profile?.ratingsReceived?.length
    ? (profile.ratingsReceived.reduce((a, b) => a + b.score, 0) / profile.ratingsReceived.length).toFixed(1)
    : null;

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator color={COLORS.brand} size="large" />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        {!isOwnProfile && (
          <TouchableOpacity style={styles.msgBtn} onPress={handleMessage}>
            <Ionicons name="chatbubble" size={14} color="#fff" />
            <Text style={styles.msgBtnText}>Message</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar + info */}
        <View style={styles.card}>
          <View style={styles.profileTop}>
            <View style={styles.avatarContainer}>
              {profile?.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{profile?.name?.[0]?.toUpperCase()}</Text>
                </View>
              )}
              <View style={[styles.onlineDot, { backgroundColor: profile?.isOnline ? COLORS.emerald : '#4b5563' }]} />
            </View>
            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{profile?.name}</Text>
                {profile?.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓ Verified</Text>
                  </View>
                )}
              </View>
              <Text style={styles.username}>@{profile?.username}</Text>
              {avgRating && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color={COLORS.amber} />
                  <Text style={styles.ratingText}>{avgRating}</Text>
                  <Text style={styles.ratingCount}>({profile.ratingsReceived.length} ratings)</Text>
                </View>
              )}
            </View>
          </View>

          {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          <View style={styles.metaRow}>
            {(profile?.city || profile?.area) && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={13} color={COLORS.textDim} />
                <Text style={styles.metaText}>{[profile.area, profile.city].filter(Boolean).join(', ')}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={13} color={COLORS.textDim} />
              <Text style={styles.metaText}>
                {profile?.isOnline ? 'Online now' : `Active ${formatDistanceToNow(new Date(profile?.lastSeen || Date.now()), { addSuffix: true })}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Vibe Tags */}
        {profile?.vibeTags?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Vibe</Text>
            <View style={styles.tagsWrap}>
              {profile.vibeTags.map(vt => (
                <View key={vt.vibeTag.id} style={styles.tag}>
                  <Text style={styles.tagText}>{vt.vibeTag.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Skills */}
        {profile?.skills?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.tagsWrap}>
              {profile.skills.map(s => (
                <View key={s.skill.id} style={styles.skillTag}>
                  <Text style={styles.skillText}>{s.skill.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Ratings */}
        <View style={styles.card}>
          <View style={styles.ratingsHeader}>
            <Text style={styles.sectionTitle}>Ratings</Text>
            {!isOwnProfile && (
              <TouchableOpacity onPress={() => setShowRatingForm(p => !p)}>
                <Text style={styles.rateLink}>{showRatingForm ? 'Cancel' : '+ Rate'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {showRatingForm && (
            <View style={styles.ratingForm}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(s => (
                  <TouchableOpacity key={s} onPress={() => setRating(s)}>
                    <Ionicons name={s <= rating ? 'star' : 'star-outline'} size={30} color={COLORS.amber} />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.commentInput}
                placeholder="Optional comment..."
                placeholderTextColor={COLORS.textDim}
                value={comment}
                onChangeText={setComment}
                multiline
              />
              <TouchableOpacity style={styles.submitRatingBtn} onPress={handleRate} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitRatingText}>Submit Rating</Text>}
              </TouchableOpacity>
            </View>
          )}

          {profile?.ratingsReceived?.length === 0 ? (
            <Text style={styles.noRatings}>No ratings yet.</Text>
          ) : (
            profile.ratingsReceived.slice(0, 5).map((r, i) => (
              <View key={i} style={styles.ratingItem}>
                <View style={styles.ratingAvatar}>
                  <Text style={styles.ratingAvatarText}>{r.giver?.name?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={styles.ratingContent}>
                  <View style={styles.ratingTopRow}>
                    <Text style={styles.ratingGiver}>{r.giver?.name}</Text>
                    <View style={styles.starsSmall}>
                      {Array.from({ length: r.score }).map((_, i) => (
                        <Ionicons key={i} name="star" size={11} color={COLORS.amber} />
                      ))}
                    </View>
                  </View>
                  {r.comment && <Text style={styles.ratingComment}>{r.comment}</Text>}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, color: COLORS.white, fontWeight: '700', fontSize: 17 },
  msgBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.brand, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8 },
  msgBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  scroll: { padding: 16, paddingBottom: 80 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 12 },
  profileTop: { flexDirection: 'row', gap: 14, marginBottom: 12, alignItems: 'flex-start' },
  avatarContainer: { position: 'relative' },
  avatar: { width: 64, height: 64, borderRadius: 18 },
  avatarFallback: { width: 64, height: 64, borderRadius: 18, backgroundColor: COLORS.brandDim, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.brandLight, fontSize: 26, fontWeight: '700' },
  onlineDot: { position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: COLORS.card },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { color: COLORS.white, fontWeight: '700', fontSize: 18 },
  verifiedBadge: { backgroundColor: COLORS.brandDim, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  verifiedText: { color: COLORS.brandLight, fontSize: 11, fontWeight: '600' },
  username: { color: COLORS.textDim, fontSize: 13, marginTop: 3 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  ratingText: { color: COLORS.amber, fontWeight: '700', fontSize: 13 },
  ratingCount: { color: COLORS.textFaint, fontSize: 11 },
  bio: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: COLORS.textDim, fontSize: 12 },
  sectionTitle: { color: COLORS.white, fontWeight: '600', fontSize: 14, marginBottom: 10 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: COLORS.brandDim, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { color: COLORS.brandLight, fontSize: 12, fontWeight: '500' },
  skillTag: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 5 },
  skillText: { color: COLORS.textMuted, fontSize: 11 },
  ratingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  rateLink: { color: COLORS.brandLight, fontSize: 13, fontWeight: '500' },
  ratingForm: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.md, padding: 14, marginBottom: 14 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  commentInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, color: COLORS.white, fontSize: 13, minHeight: 60, textAlignVertical: 'top', marginBottom: 12 },
  submitRatingBtn: { backgroundColor: COLORS.brand, borderRadius: RADIUS.md, padding: 12, alignItems: 'center' },
  submitRatingText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  noRatings: { color: COLORS.textFaint, fontSize: 13 },
  ratingItem: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  ratingAvatar: { width: 30, height: 30, borderRadius: 10, backgroundColor: COLORS.brandDim, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ratingAvatarText: { color: COLORS.brandLight, fontSize: 13, fontWeight: '700' },
  ratingContent: { flex: 1 },
  ratingTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  ratingGiver: { color: COLORS.white, fontWeight: '500', fontSize: 13 },
  starsSmall: { flexDirection: 'row', gap: 2 },
  ratingComment: { color: COLORS.textMuted, fontSize: 12, lineHeight: 16 },
});
