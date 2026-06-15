import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../src/lib/api';
import useAuthStore from '../../src/store/auth';
import { COLORS, RADIUS } from '../../src/lib/theme';

const VIBE_TAGS = ['Developer','Designer','Video Editor','Content Creator','Musician','Photographer','Marketer','Entrepreneur','Gamer','Writer'];
const SKILL_SUGGESTIONS = ['React','Next.js','Node.js','Python','Figma','Photoshop','Premiere Pro','After Effects','Flutter','TypeScript','Tailwind','Video Editing','Copywriting'];

export default function ProfileScreen() {
  const { user, updateUser, logout } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', city: '', area: '' });
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const router = useRouter();

  useEffect(() => {
    api.get('/auth/me').then(({ data }) => {
      setProfile(data);
      setForm({ name: data.name, bio: data.bio || '', city: data.city || '', area: data.area || '' });
      setSelectedTags(data.vibeTags?.map(vt => vt.vibeTag.name) || []);
      setSelectedSkills(data.skills?.map(s => s.skill.name) || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleTag = (tag) => setSelectedTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]);
  const toggleSkill = (s) => setSelectedSkills(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/users/profile', { ...form, vibeTags: selectedTags, skills: selectedSkills });
      const { data } = await api.get('/auth/me');
      setProfile(data);
      await updateUser({ name: data.name, bio: data.bio, city: data.city, area: data.area });
      setEditing(false);
      Alert.alert('Success', 'Profile updated ✅');
    } catch { Alert.alert('Error', 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', 'Allow photo access to update profile picture');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled) return;
    setUploadingPhoto(true);
    try {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('avatar', { uri: asset.uri, type: 'image/jpeg', name: 'avatar.jpg' });
      const { data } = await api.post('/upload/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await updateUser({ avatar: data.url });
      setProfile(p => ({ ...p, avatar: data.url }));
      Alert.alert('Success', 'Profile photo updated! 📸');
    } catch { Alert.alert('Error', 'Upload failed'); }
    finally { setUploadingPhoto(false); }
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  const avgRating = profile?.ratingsReceived?.length
    ? (profile.ratingsReceived.reduce((a, b) => a + b.score, 0) / profile.ratingsReceived.length).toFixed(1)
    : null;

  if (loading) return <View style={styles.centered}><ActivityIndicator color={COLORS.brand} size="large" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Profile</Text>
        {!editing ? (
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
            <Ionicons name="pencil" size={14} color={COLORS.textMuted} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelEditBtn} onPress={() => setEditing(false)}>
              <Ionicons name="close" size={16} color={COLORS.textDim} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Avatar + info */}
      <View style={styles.card}>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickPhoto} disabled={uploadingPhoto}>
            <View style={styles.avatarContainer}>
              {profile?.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{profile?.name?.[0]?.toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.cameraOverlay}>
                {uploadingPhoto ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={16} color="#fff" />}
              </View>
            </View>
          </TouchableOpacity>
          <View style={styles.userInfo}>
            {editing ? (
              <TextInput style={styles.nameInput} value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} placeholderTextColor={COLORS.textDim} />
            ) : (
              <View style={styles.nameRow}>
                <Text style={styles.name}>{profile?.name}</Text>
                {profile?.isVerified && <Text style={styles.verified}>✓</Text>}
              </View>
            )}
            <Text style={styles.username}>@{profile?.username}</Text>
            {avgRating && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color={COLORS.amber} />
                <Text style={styles.ratingText}>{avgRating}</Text>
                <Text style={styles.ratingCount}>({profile.ratingsReceived.length})</Text>
              </View>
            )}
          </View>
        </View>

        {editing ? (
          <TextInput style={styles.bioInput} value={form.bio} onChangeText={v => setForm(p => ({ ...p, bio: v }))} placeholder="Write a short bio..." placeholderTextColor={COLORS.textDim} multiline maxLength={200} />
        ) : (
          profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>
        )}

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={COLORS.textDim} />
          {editing ? (
            <View style={styles.locationInputs}>
              <TextInput style={styles.locationInput} value={form.city} onChangeText={v => setForm(p => ({ ...p, city: v }))} placeholder="City" placeholderTextColor={COLORS.textDim} />
              <TextInput style={styles.locationInput} value={form.area} onChangeText={v => setForm(p => ({ ...p, area: v }))} placeholder="Area" placeholderTextColor={COLORS.textDim} />
            </View>
          ) : (
            <Text style={styles.location}>{[profile?.area, profile?.city].filter(Boolean).join(', ') || 'Location not set'}</Text>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Ratings', value: profile?.ratingsReceived?.length || 0 },
          { label: 'Avg Score', value: avgRating ? `${avgRating}/5` : '—' },
          { label: 'Joined', value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : '—' },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Vibe Tags */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Vibe Tags</Text>
        <View style={styles.tagsWrap}>
          {(editing ? VIBE_TAGS : profile?.vibeTags?.map(vt => vt.vibeTag.name) || []).map(tag => (
            <TouchableOpacity key={tag} style={[styles.tag, (editing ? selectedTags.includes(tag) : true) && styles.tagActive]} onPress={editing ? () => toggleTag(tag) : null} disabled={!editing}>
              <Text style={[styles.tagText, (editing ? selectedTags.includes(tag) : true) && styles.tagTextActive]}>{tag}</Text>
            </TouchableOpacity>
          ))}
          {!editing && profile?.vibeTags?.length === 0 && <Text style={styles.emptyTags}>No vibe tags yet</Text>}
        </View>
      </View>

      {/* Skills */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Skills</Text>
        <View style={styles.tagsWrap}>
          {(editing ? SKILL_SUGGESTIONS : profile?.skills?.map(s => s.skill.name) || []).map(skill => (
            <TouchableOpacity key={skill} style={[styles.skillTag, editing && selectedSkills.includes(skill) && styles.skillTagActive]} onPress={editing ? () => toggleSkill(skill) : null} disabled={!editing}>
              <Text style={[styles.skillText, editing && selectedSkills.includes(skill) && styles.skillTextActive]}>{skill}</Text>
            </TouchableOpacity>
          ))}
          {!editing && profile?.skills?.length === 0 && <Text style={styles.emptyTags}>No skills added yet</Text>}
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={COLORS.red} />
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  scroll: { padding: 16, paddingTop: 56, paddingBottom: 100 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.white },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  editBtnText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500' },
  editActions: { flexDirection: 'row', gap: 8 },
  cancelEditBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.05)' },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 9, backgroundColor: COLORS.brand, borderRadius: RADIUS.md, minWidth: 60, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 12 },
  avatarSection: { flexDirection: 'row', gap: 14, marginBottom: 12, alignItems: 'flex-start' },
  avatarContainer: { position: 'relative' },
  avatar: { width: 64, height: 64, borderRadius: 18 },
  avatarFallback: { width: 64, height: 64, borderRadius: 18, backgroundColor: COLORS.brandDim, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.brandLight, fontSize: 26, fontWeight: '700' },
  cameraOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.brand, borderRadius: 10, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  userInfo: { flex: 1, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  verified: { color: COLORS.brandLight, fontSize: 12 },
  nameInput: { color: COLORS.white, fontSize: 16, fontWeight: '600', borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 4, marginBottom: 4 },
  username: { color: COLORS.textDim, fontSize: 13, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { color: COLORS.amber, fontWeight: '600', fontSize: 13 },
  ratingCount: { color: COLORS.textFaint, fontSize: 11 },
  bio: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  bioInput: { color: COLORS.white, fontSize: 13, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 10, marginBottom: 10, minHeight: 60, textAlignVertical: 'top' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  location: { color: COLORS.textDim, fontSize: 13 },
  locationInputs: { flex: 1, flexDirection: 'row', gap: 8 },
  locationInput: { flex: 1, color: COLORS.white, fontSize: 13, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 8 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: 12, alignItems: 'center' },
  statValue: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  statLabel: { color: COLORS.textFaint, fontSize: 11, marginTop: 2 },
  sectionTitle: { color: COLORS.white, fontWeight: '600', fontSize: 14, marginBottom: 10 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border },
  tagActive: { backgroundColor: 'rgba(99,102,241,0.2)', borderColor: 'rgba(99,102,241,0.5)' },
  tagText: { color: COLORS.textMuted, fontSize: 12 },
  tagTextActive: { color: COLORS.brandLight },
  skillTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border },
  skillTagActive: { backgroundColor: 'rgba(99,102,241,0.2)', borderColor: 'rgba(99,102,241,0.5)' },
  skillText: { color: COLORS.textMuted, fontSize: 11 },
  skillTextActive: { color: COLORS.brandLight },
  emptyTags: { color: COLORS.textFaint, fontSize: 12 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)', backgroundColor: 'rgba(248,113,113,0.05)', marginTop: 4 },
  logoutText: { color: COLORS.red, fontWeight: '600', fontSize: 15 },
});
