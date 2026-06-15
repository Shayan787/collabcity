import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import api from '../../src/lib/api';
import useAuthStore from '../../src/store/auth';
import { COLORS, RADIUS } from '../../src/lib/theme';

const MILESTONE_STATUS = {
  PENDING:     { label: 'Pending',     color: COLORS.textDim,    bg: 'rgba(107,114,128,0.1)' },
  IN_PROGRESS: { label: 'In Progress', color: COLORS.amber,      bg: 'rgba(251,191,36,0.1)' },
  SUBMITTED:   { label: 'Submitted',   color: '#60a5fa',         bg: 'rgba(96,165,250,0.1)' },
  APPROVED:    { label: 'Approved',    color: COLORS.brandLight, bg: COLORS.brandDim },
  RELEASED:    { label: 'Paid ✓',      color: COLORS.emerald,    bg: 'rgba(52,211,153,0.1)' },
};

const PROJECT_STATUS = {
  OPEN:        { color: COLORS.emerald, bg: 'rgba(52,211,153,0.1)' },
  IN_PROGRESS: { color: COLORS.amber,   bg: 'rgba(251,191,36,0.1)' },
  COMPLETED:   { color: COLORS.textDim, bg: 'rgba(107,114,128,0.1)' },
  CANCELLED:   { color: COLORS.red,     bg: 'rgba(248,113,113,0.1)' },
};

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const router = useRouter();

  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [pitch, setPitch] = useState('');
  const [applying, setApplying] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ title: '', amount: '', description: '' });
  const [addingMilestone, setAddingMilestone] = useState(false);

  const fetchProject = async () => {
    try {
      const [projRes, msRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/milestones/project/${id}`),
      ]);
      setProject(projRes.data);
      setMilestones(msRes.data);
    } catch { Alert.alert('Error', 'Project not found'); router.back(); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProject(); }, [id]);

  const isPoster = project?.posterId === user?.id;
  const myApplication = project?.applications?.find(a => a.applicantId === user?.id);
  const hasApplied = !!myApplication;
  const status = project ? PROJECT_STATUS[project.status] : null;

  const handleApply = async () => {
    if (!pitch.trim()) return Alert.alert('Error', 'Write a pitch!');
    setApplying(true);
    try {
      await api.post(`/projects/${id}/apply`, { pitch });
      Alert.alert('Success', 'Application sent! ✅');
      setShowApply(false);
      setPitch('');
      fetchProject();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to apply');
    } finally { setApplying(false); }
  };

  const handleApplicationAction = async (appId, appStatus) => {
    try {
      await api.put(`/projects/${id}/applications/${appId}`, { status: appStatus });
      Alert.alert('Success', appStatus === 'ACCEPTED' ? 'Applicant accepted! 🎉' : 'Application rejected');
      fetchProject();
    } catch { Alert.alert('Error', 'Failed to update'); }
  };

  const handleMilestoneAction = async (milestoneId, newStatus) => {
    try {
      await api.put(`/milestones/${milestoneId}/status`, { status: newStatus });
      if (newStatus === 'RELEASED') Alert.alert('Payment Released! 💸', 'The milestone payment has been released.');
      else if (newStatus === 'SUBMITTED') Alert.alert('Submitted!', 'Milestone submitted for review.');
      const { data } = await api.get(`/milestones/project/${id}`);
      setMilestones(data);
    } catch { Alert.alert('Error', 'Failed to update milestone'); }
  };

  const handleAddMilestone = async () => {
    if (!milestoneForm.title || !milestoneForm.amount) return Alert.alert('Error', 'Title and amount required');
    setAddingMilestone(true);
    try {
      await api.post(`/milestones/project/${id}`, {
        title: milestoneForm.title,
        description: milestoneForm.description,
        amount: parseFloat(milestoneForm.amount),
        order: milestones.length,
      });
      Alert.alert('Success', 'Milestone added!');
      setShowMilestoneForm(false);
      setMilestoneForm({ title: '', amount: '', description: '' });
      const { data } = await api.get(`/milestones/project/${id}`);
      setMilestones(data);
    } catch { Alert.alert('Error', 'Failed to add milestone'); }
    finally { setAddingMilestone(false); }
  };

  const handleComplete = async () => {
    try {
      await api.put(`/projects/${id}/complete`);
      Alert.alert('Success', 'Project marked as completed! 🎉');
      fetchProject();
    } catch { Alert.alert('Error', 'Failed'); }
  };

  const getMilestoneAction = (ms) => {
    if (isPoster) {
      if (ms.status === 'SUBMITTED') return { label: 'Approve', next: 'APPROVED' };
      if (ms.status === 'APPROVED') return { label: 'Release Payment 💸', next: 'RELEASED' };
    } else {
      if (ms.status === 'PENDING') return { label: 'Start', next: 'IN_PROGRESS' };
      if (ms.status === 'IN_PROGRESS') return { label: 'Submit for Review', next: 'SUBMITTED' };
    }
    return null;
  };

  const totalMilestones = milestones.reduce((s, m) => s + m.amount, 0);
  const releasedMilestones = milestones.filter(m => m.status === 'RELEASED').reduce((s, m) => s + m.amount, 0);

  if (loading) return <View style={styles.centered}><ActivityIndicator color={COLORS.brand} size="large" /></View>;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{project?.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Project info */}
        <View style={styles.card}>
          <View style={styles.projectHeader}>
            <View style={styles.projectHeaderLeft}>
              <View style={[styles.statusBadge, { backgroundColor: status?.bg }]}>
                <Text style={[styles.statusText, { color: status?.color }]}>
                  {project?.status?.replace('_', ' ')}
                </Text>
              </View>
              <Text style={styles.projectTitle}>{project?.title}</Text>
              <View style={styles.posterRow}>
                <View style={styles.posterAvatar}>
                  <Text style={styles.posterAvatarText}>{project?.poster?.name?.[0]}</Text>
                </View>
                <Text style={styles.posterName}>{project?.poster?.name}</Text>
                {project?.poster?.isVerified && <Text style={styles.verified}>✓</Text>}
              </View>
            </View>
            <View style={styles.budgetContainer}>
              <Text style={styles.budgetAmount}>{project?.budget?.toLocaleString()}</Text>
              <Text style={styles.budgetCurrency}>{project?.currency}</Text>
            </View>
          </View>

          <Text style={styles.description}>{project?.description}</Text>

          {project?.skills?.length > 0 && (
            <View style={styles.skillsRow}>
              {project.skills.map(s => (
                <View key={s.skillName} style={styles.skillTag}>
                  <Text style={styles.skillText}>{s.skillName}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={13} color={COLORS.textFaint} />
              <Text style={styles.metaText}>{project?._count?.applications || 0} applicants</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={13} color={COLORS.textFaint} />
              <Text style={styles.metaText}>
                Posted {formatDistanceToNow(new Date(project?.createdAt), { addSuffix: true })}
              </Text>
            </View>
          </View>
        </View>

        {/* Apply section */}
        {!isPoster && project?.status === 'OPEN' && (
          <View style={styles.card}>
            {hasApplied ? (
              <View style={styles.appliedRow}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.emerald} />
                <Text style={styles.appliedText}>
                  Applied · Status: <Text style={{ fontWeight: '700' }}>{myApplication.status}</Text>
                </Text>
              </View>
            ) : showApply ? (
              <View>
                <Text style={styles.applyLabel}>Your pitch</Text>
                <TextInput
                  style={styles.pitchInput}
                  placeholder="Tell them why you're perfect. Keep it short!"
                  placeholderTextColor={COLORS.textDim}
                  value={pitch}
                  onChangeText={setPitch}
                  multiline
                  maxLength={500}
                  autoFocus
                />
                <Text style={styles.charCount}>{pitch.length}/500</Text>
                <View style={styles.applyBtns}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowApply(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.submitBtn} onPress={handleApply} disabled={applying}>
                    {applying ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Submit</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.applyRow}>
                <Text style={styles.applyHint}>Interested? Send a quick pitch.</Text>
                <TouchableOpacity style={styles.applyBtn} onPress={() => setShowApply(true)}>
                  <Text style={styles.applyBtnText}>Apply Now →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Milestones */}
        <View style={styles.card}>
          <View style={styles.milestonesHeader}>
            <View>
              <Text style={styles.sectionTitle}>Milestones</Text>
              {milestones.length > 0 && (
                <Text style={styles.milestoneSummary}>
                  {releasedMilestones.toLocaleString()} / {totalMilestones.toLocaleString()} {project?.currency} released
                </Text>
              )}
            </View>
            {isPoster && (
              <TouchableOpacity style={styles.addMilestoneBtn} onPress={() => setShowMilestoneForm(p => !p)}>
                <Ionicons name="add" size={16} color={COLORS.brandLight} />
                <Text style={styles.addMilestoneBtnText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Progress bar */}
          {milestones.length > 0 && totalMilestones > 0 && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(releasedMilestones / totalMilestones) * 100}%` }]} />
            </View>
          )}

          {/* Add milestone form */}
          {showMilestoneForm && (
            <View style={styles.milestoneForm}>
              <TextInput style={styles.formInput} placeholder="Milestone title *" placeholderTextColor={COLORS.textDim}
                value={milestoneForm.title} onChangeText={v => setMilestoneForm(p => ({ ...p, title: v }))} />
              <TextInput style={styles.formInput} placeholder="Description (optional)" placeholderTextColor={COLORS.textDim}
                value={milestoneForm.description} onChangeText={v => setMilestoneForm(p => ({ ...p, description: v }))} />
              <TextInput style={styles.formInput} placeholder={`Amount (${project?.currency}) *`} placeholderTextColor={COLORS.textDim}
                value={milestoneForm.amount} onChangeText={v => setMilestoneForm(p => ({ ...p, amount: v }))} keyboardType="numeric" />
              <View style={styles.formBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMilestoneForm(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitBtn} onPress={handleAddMilestone} disabled={addingMilestone}>
                  {addingMilestone ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Add</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {milestones.length === 0 ? (
            <Text style={styles.noMilestones}>
              {isPoster ? 'No milestones yet. Add one to track progress.' : 'No milestones defined yet.'}
            </Text>
          ) : (
            milestones.map((ms, i) => {
              const msStatus = MILESTONE_STATUS[ms.status] || MILESTONE_STATUS.PENDING;
              const action = getMilestoneAction(ms);
              return (
                <View key={ms.id} style={styles.milestoneItem}>
                  <View style={styles.milestoneLeft}>
                    <Text style={styles.milestoneNumber}>#{i + 1}</Text>
                    <View style={styles.milestoneInfo}>
                      <Text style={styles.milestoneTitle}>{ms.title}</Text>
                      {ms.description && <Text style={styles.milestoneDesc}>{ms.description}</Text>}
                      <View style={styles.milestoneFooter}>
                        <View style={[styles.msStatusBadge, { backgroundColor: msStatus.bg }]}>
                          <Text style={[styles.msStatusText, { color: msStatus.color }]}>{msStatus.label}</Text>
                        </View>
                        <Text style={styles.milestoneAmount}>{ms.amount.toLocaleString()} {project?.currency}</Text>
                      </View>
                    </View>
                  </View>
                  {action && (
                    <TouchableOpacity
                      style={styles.msActionBtn}
                      onPress={() => handleMilestoneAction(ms.id, action.next)}
                    >
                      <Text style={styles.msActionText}>{action.label}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Applications (poster only) */}
        {isPoster && project?.applications?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Applications ({project.applications.length})</Text>
            {project.applications.map(app => (
              <View key={app.id} style={styles.appItem}>
                <View style={styles.appAvatar}>
                  <Text style={styles.appAvatarText}>{app.applicant?.name?.[0]}</Text>
                </View>
                <View style={styles.appContent}>
                  <View style={styles.appTopRow}>
                    <Text style={styles.appName}>{app.applicant?.name}</Text>
                    <View style={[styles.appStatusBadge, {
                      backgroundColor: app.status === 'ACCEPTED' ? 'rgba(52,211,153,0.1)' :
                                       app.status === 'REJECTED' ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.05)',
                    }]}>
                      <Text style={[styles.appStatusText, {
                        color: app.status === 'ACCEPTED' ? COLORS.emerald :
                               app.status === 'REJECTED' ? COLORS.red : COLORS.textDim,
                      }]}>{app.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.appPitch} numberOfLines={2}>{app.pitch}</Text>
                  {app.status === 'PENDING' && (
                    <View style={styles.appActions}>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => handleApplicationAction(app.id, 'REJECTED')}>
                        <Ionicons name="close" size={14} color={COLORS.red} />
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.acceptBtn} onPress={() => handleApplicationAction(app.id, 'ACCEPTED')}>
                        <Ionicons name="checkmark" size={14} color={COLORS.emerald} />
                        <Text style={styles.acceptBtnText}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Complete project button */}
        {isPoster && project?.status === 'IN_PROGRESS' && (
          <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={styles.completeBtnText}>Mark as Completed</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, color: COLORS.white, fontWeight: '700', fontSize: 16 },
  scroll: { padding: 16, paddingBottom: 80 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 12 },
  projectHeader: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  projectHeaderLeft: { flex: 1 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  projectTitle: { color: COLORS.white, fontWeight: '700', fontSize: 17, lineHeight: 22, marginBottom: 6 },
  posterRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  posterAvatar: { width: 18, height: 18, borderRadius: 5, backgroundColor: COLORS.brandDim, alignItems: 'center', justifyContent: 'center' },
  posterAvatarText: { color: COLORS.brandLight, fontSize: 9, fontWeight: '700' },
  posterName: { color: COLORS.textDim, fontSize: 12 },
  verified: { color: COLORS.brandLight, fontSize: 10 },
  budgetContainer: { backgroundColor: 'rgba(52,211,153,0.1)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)', borderRadius: RADIUS.md, padding: 10, alignItems: 'center', minWidth: 80 },
  budgetAmount: { color: COLORS.emerald, fontWeight: '800', fontSize: 18 },
  budgetCurrency: { color: COLORS.emerald, fontSize: 11, opacity: 0.7 },
  description: { color: COLORS.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  skillTag: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  skillText: { color: COLORS.textMuted, fontSize: 11 },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: COLORS.textFaint, fontSize: 12 },
  appliedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  appliedText: { color: COLORS.textMuted, fontSize: 14 },
  applyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  applyHint: { color: COLORS.textMuted, fontSize: 13 },
  applyBtn: { backgroundColor: COLORS.brand, borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 10 },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  applyLabel: { color: COLORS.white, fontWeight: '600', fontSize: 14, marginBottom: 10 },
  pitchInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, color: COLORS.white, fontSize: 13, minHeight: 90, textAlignVertical: 'top', marginBottom: 6 },
  charCount: { color: COLORS.textFaint, fontSize: 11, textAlign: 'right', marginBottom: 12 },
  applyBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.05)' },
  cancelBtnText: { color: COLORS.textMuted, fontWeight: '600' },
  submitBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: COLORS.brand },
  submitBtnText: { color: '#fff', fontWeight: '600' },
  milestonesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  sectionTitle: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  milestoneSummary: { color: COLORS.textFaint, fontSize: 11, marginTop: 3 },
  addMilestoneBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.md, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)', backgroundColor: COLORS.brandDim },
  addMilestoneBtnText: { color: COLORS.brandLight, fontSize: 13, fontWeight: '500' },
  progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, marginBottom: 14, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.brand, borderRadius: 2 },
  milestoneForm: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: RADIUS.md, padding: 12, marginBottom: 12, gap: 8 },
  formInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 11, color: COLORS.white, fontSize: 13 },
  formBtns: { flexDirection: 'row', gap: 8, marginTop: 4 },
  noMilestones: { color: COLORS.textFaint, fontSize: 13 },
  milestoneItem: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  milestoneLeft: { flexDirection: 'row', gap: 8, flex: 1 },
  milestoneNumber: { color: COLORS.textFaint, fontSize: 12, fontWeight: '500', marginTop: 2 },
  milestoneInfo: { flex: 1 },
  milestoneTitle: { color: COLORS.white, fontWeight: '600', fontSize: 13, marginBottom: 2 },
  milestoneDesc: { color: COLORS.textDim, fontSize: 12, marginBottom: 6 },
  milestoneFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  msStatusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  msStatusText: { fontSize: 10, fontWeight: '600' },
  milestoneAmount: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  msActionBtn: { backgroundColor: COLORS.brandDim, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)', borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 7, alignSelf: 'flex-start' },
  msActionText: { color: COLORS.brandLight, fontSize: 11, fontWeight: '600' },
  appItem: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  appAvatar: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.brandDim, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  appAvatarText: { color: COLORS.brandLight, fontSize: 14, fontWeight: '700' },
  appContent: { flex: 1 },
  appTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  appName: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
  appStatusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  appStatusText: { fontSize: 10, fontWeight: '600' },
  appPitch: { color: COLORS.textMuted, fontSize: 12, lineHeight: 16, marginBottom: 8 },
  appActions: { flexDirection: 'row', gap: 8 },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.md, backgroundColor: 'rgba(248,113,113,0.1)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)' },
  rejectBtnText: { color: COLORS.red, fontSize: 12, fontWeight: '600' },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.md, backgroundColor: 'rgba(52,211,153,0.1)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)' },
  acceptBtnText: { color: COLORS.emerald, fontSize: 12, fontWeight: '600' },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.brand, borderRadius: RADIUS.lg, padding: 16, marginTop: 4 },
  completeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
