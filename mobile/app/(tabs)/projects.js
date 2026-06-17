import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';
import api from '../../src/lib/api';
import useAuthStore from '../../src/store/auth';
import { COLORS, RADIUS } from '../../src/lib/theme';

const STATUS_COLORS = {
  OPEN:        { color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  IN_PROGRESS: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  COMPLETED:   { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
  CANCELLED:   { color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
};

function ProjectCard({ project, currentUserId, onApply }) {
  const router = useRouter();
  const isOwn = project.poster?.id === currentUserId;
  const status = STATUS_COLORS[project.status] || STATUS_COLORS.OPEN;

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/project/${project.id}`)}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.projectTitle} numberOfLines={2}>{project.title}</Text>
          <View style={styles.posterRow}>
            <View style={styles.posterAvatar}>
              <Text style={styles.posterAvatarText}>{project.poster?.name?.[0]}</Text>
            </View>
            <Text style={styles.posterName}>{project.poster?.name}</Text>
            {project.poster?.isVerified && <Text style={styles.verified}>✓</Text>}
          </View>
        </View>
        <View style={styles.budgetBadge}>
          <Text style={styles.budgetAmount}>{project.budget?.toLocaleString()}</Text>
          <Text style={styles.budgetCurrency}>{project.currency}</Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>{project.description}</Text>

      {project.skills?.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.skillsRow}>
          {project.skills.slice(0, 4).map(s => (
            <View key={s.skillName} style={styles.skillTag}>
              <Text style={styles.skillText}>{s.skillName}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {project.status.replace('_', ' ')}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={11} color={COLORS.textFaint} />
            <Text style={styles.metaText}>{project._count?.applications || 0}</Text>
          </View>
          {project.deadline && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={11} color={COLORS.textFaint} />
              <Text style={styles.metaText}>{formatDistanceToNow(new Date(project.deadline), { addSuffix: true })}</Text>
            </View>
          )}
        </View>
        {!isOwn && project.status === 'OPEN' && (
          <TouchableOpacity style={styles.applyBtn} onPress={() => onApply(project)}>
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        )}
        {isOwn && (
          <Text style={styles.ownLabel}>Your project</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ProjectsScreen() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('browse');
  const [applyTarget, setApplyTarget] = useState(null);
  const [pitch, setPitch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ title: '', description: '', budget: '', currency: 'PKR', skills: '' });
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 16;

  useEffect(() => { fetchProjects(); }, [tab]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      if (tab === 'browse') {
        const { data } = await api.get('/projects');
        setProjects(data.projects);
      } else if (tab === 'posted') {
        const { data } = await api.get('/projects/my/posted');
        setProjects(data);
      } else {
        const { data } = await api.get('/projects/my/applied');
        setProjects(data.map(a => ({ ...a.project, myStatus: a.status })));
      }
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  const handleApply = async () => {
    if (!pitch.trim()) return Alert.alert('Error', 'Write a pitch!');
    setSubmitting(true);
    try {
      await api.post(`/projects/${applyTarget.id}/apply`, { pitch });
      Alert.alert('Success', 'Application sent! ✅');
      setApplyTarget(null);
      setPitch('');
      fetchProjects();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to apply');
    } finally { setSubmitting(false); }
  };

  const handlePostProject = async () => {
    if (!newForm.title || !newForm.description || !newForm.budget)
      return Alert.alert('Error', 'Fill all required fields');
    setSubmitting(true);
    try {
      const skills = newForm.skills.split(',').map(s => s.trim()).filter(Boolean);
      await api.post('/projects', { ...newForm, budget: parseFloat(newForm.budget), skills });
      Alert.alert('Success', 'Project posted! 🚀');
      setShowNew(false);
      setNewForm({ title: '', description: '', budget: '', currency: 'PKR', skills: '' });
      fetchProjects();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to post');
    } finally { setSubmitting(false); }
  };

  const TABS = [
    { key: 'browse', label: 'Browse' },
    { key: 'posted', label: 'My Posts' },
    { key: 'applied', label: 'Applied' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Projects</Text>
          <Text style={styles.subtitle}>Find gigs or post your own</Text>
        </View>
        <TouchableOpacity style={styles.postBtn} onPress={() => setShowNew(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.postBtnText}>Post</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={COLORS.brand} size="large" /></View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <ProjectCard project={item} currentUserId={user?.id} onApply={setApplyTarget} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProjects(); }} tintColor={COLORS.brand} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💼</Text>
              <Text style={styles.emptyText}>No projects found</Text>
            </View>
          }
        />
      )}

      {/* Apply Modal */}
      <Modal visible={!!applyTarget} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { paddingBottom: bottomPadding + 8 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Apply to project</Text>
            <Text style={styles.modalSubtitle} numberOfLines={1}>{applyTarget?.title}</Text>
            <TextInput
              style={styles.pitchInput}
              placeholder="Tell them why you're perfect. Short and punchy!"
              placeholderTextColor={COLORS.textDim}
              value={pitch}
              onChangeText={setPitch}
              multiline
              maxLength={500}
              autoFocus
            />
            <Text style={styles.charCount}>{pitch.length}/500</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setApplyTarget(null); setPitch(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleApply} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Post Project Modal */}
      <Modal visible={showNew} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={[styles.modal, { paddingBottom: bottomPadding + 8 }]}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Post a Project</Text>
              {[
                { label: 'Title *', key: 'title', placeholder: 'Need a logo designer' },
                { label: 'Description *', key: 'description', placeholder: 'Describe what you need...', multiline: true },
                { label: 'Budget *', key: 'budget', placeholder: '5000', keyboardType: 'numeric' },
                { label: 'Skills needed', key: 'skills', placeholder: 'React, Figma (comma separated)' },
              ].map(field => (
                <View key={field.key} style={styles.formField}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    style={[styles.fieldInput, field.multiline && styles.multilineInput]}
                    placeholder={field.placeholder}
                    placeholderTextColor={COLORS.textDim}
                    value={newForm[field.key]}
                    onChangeText={v => setNewForm(p => ({ ...p, [field.key]: v }))}
                    multiline={field.multiline}
                    keyboardType={field.keyboardType}
                  />
                </View>
              ))}
              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNew(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handlePostProject} disabled={submitting}>
                  {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Post</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.white },
  subtitle: { color: COLORS.textDim, fontSize: 13, marginTop: 2 },
  postBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.brand, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 9 },
  postBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 4, borderWidth: 1, borderColor: COLORS.border },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.sm },
  tabBtnActive: { backgroundColor: 'rgba(99,102,241,0.2)' },
  tabText: { color: COLORS.textDim, fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: COLORS.brandLight },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
  cardHeaderLeft: { flex: 1 },
  projectTitle: { color: COLORS.white, fontWeight: '700', fontSize: 15, marginBottom: 6, lineHeight: 20 },
  posterRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  posterAvatar: { width: 16, height: 16, borderRadius: 5, backgroundColor: COLORS.brandDim, alignItems: 'center', justifyContent: 'center' },
  posterAvatarText: { color: COLORS.brandLight, fontSize: 9, fontWeight: '700' },
  posterName: { color: COLORS.textDim, fontSize: 12 },
  verified: { color: COLORS.brandLight, fontSize: 10 },
  budgetBadge: { backgroundColor: 'rgba(52,211,153,0.1)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)', borderRadius: RADIUS.md, padding: 8, alignItems: 'center', minWidth: 70 },
  budgetAmount: { color: '#34d399', fontWeight: '800', fontSize: 16 },
  budgetCurrency: { color: '#34d399', fontSize: 10, opacity: 0.7 },
  description: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  skillsRow: { marginBottom: 10 },
  skillTag: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, marginRight: 6 },
  skillText: { color: COLORS.textMuted, fontSize: 11 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '600' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { color: COLORS.textFaint, fontSize: 11 },
  applyBtn: { backgroundColor: COLORS.brand, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 7 },
  applyBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  ownLabel: { color: COLORS.textFaint, fontSize: 11 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalScroll: { justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { color: COLORS.white, fontWeight: '700', fontSize: 17, marginBottom: 4 },
  modalSubtitle: { color: COLORS.textDim, fontSize: 13, marginBottom: 14 },
  pitchInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 14, color: COLORS.white, fontSize: 14, minHeight: 100, textAlignVertical: 'top', marginBottom: 6 },
  charCount: { color: COLORS.textFaint, fontSize: 11, textAlign: 'right', marginBottom: 14 },
  formField: { marginBottom: 14 },
  fieldLabel: { color: COLORS.textMuted, fontSize: 13, marginBottom: 6 },
  fieldInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 13, color: COLORS.white, fontSize: 14 },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.05)' },
  cancelBtnText: { color: COLORS.textMuted, fontWeight: '600' },
  submitBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: COLORS.brand },
  submitBtnText: { color: '#fff', fontWeight: '600' },
});
