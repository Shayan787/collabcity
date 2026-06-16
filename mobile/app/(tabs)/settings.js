import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import useAuthStore from '../../src/store/auth';
import { COLORS, RADIUS } from '../../src/lib/theme';

export default function SettingsScreen() {
  const { user, updateUser } = useAuthStore();
  const [status, setStatus] = useState(null);
  const [payments, setPayments] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showModal, setShowModal] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('NayaPay');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/payments/status').then(({ data }) => setStatus(data)).catch(() => {});
    api.get('/payments/my').then(({ data }) => setPayments(data)).catch(() => {});
  }, []);

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
      Alert.alert('Success', 'Profile photo updated! 📸');
    } catch { Alert.alert('Error', 'Upload failed'); }
    finally { setUploadingPhoto(false); }
  };

  const handlePaymentRequest = async () => {
    if (!phoneNumber.trim()) return Alert.alert('Error', 'Enter your phone number');
    if (!transactionId.trim()) return Alert.alert('Error', 'Enter your Transaction ID');
    setSubmitting(true);
    try {
      const { data } = await api.post('/payments/request', { type: showModal, phoneNumber, paymentMethod, transactionId });
      Alert.alert('Submitted!', data.message);
      setShowModal(null);
      setPhoneNumber('');
      setTransactionId('');
      const s = await api.get('/payments/status');
      setStatus(s.data);
      const p = await api.get('/payments/my');
      setPayments(p.data);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Request failed');
    } finally { setSubmitting(false); }
  };

  const PERKS = [
    {
      type: 'VERIFICATION',
      title: 'Verified Badge',
      price: '499 PKR/month',
      desc: 'Get a ✓ badge on your profile and stand out.',
      icon: 'checkmark-circle',
      color: COLORS.brandLight,
      isActive: status?.isVerified,
      isPending: status?.pendingVerify,
      activeLabel: '✓ Active',
    },
    {
      type: 'BOOST',
      title: 'Profile Boost',
      price: '500 PKR/week',
      desc: 'Appear at the top of the discovery feed for 7 days.',
      icon: 'flash',
      color: COLORS.amber,
      isActive: status?.isBoosted,
      isPending: status?.pendingBoost,
      activeLabel: `🚀 ${status?.boostDaysLeft}d left`,
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Settings</Text>

      {/* Profile Photo */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Profile Photo</Text>
        <View style={styles.photoRow}>
          <TouchableOpacity onPress={handlePickPhoto} disabled={uploadingPhoto} style={styles.photoContainer}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.photo} />
            ) : (
              <View style={styles.photoFallback}>
                <Text style={styles.photoFallbackText}>{user?.name?.[0]?.toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.cameraOverlay}>
              {uploadingPhoto ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={16} color="#fff" />}
            </View>
          </TouchableOpacity>
          <View style={styles.photoInfo}>
            <Text style={styles.photoLabel}>Upload a photo</Text>
            <Text style={styles.photoHint}>JPG, PNG or WebP · Max 5MB</Text>
            <TouchableOpacity style={styles.chooseBtn} onPress={handlePickPhoto} disabled={uploadingPhoto}>
              <Text style={styles.chooseBtnText}>{uploadingPhoto ? 'Uploading...' : 'Choose photo'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Perks */}
      <Text style={styles.sectionHeader}>Perks</Text>
      {PERKS.map(perk => (
        <View key={perk.type} style={[styles.perkCard, perk.isActive && styles.perkCardActive]}>
          <View style={styles.perkHeader}>
            <View style={[styles.perkIcon, { backgroundColor: `${perk.color}18` }]}>
              <Ionicons name={perk.icon} size={20} color={perk.color} />
            </View>
            <View style={styles.perkInfo}>
              <View style={styles.perkTitleRow}>
                <Text style={styles.perkTitle}>{perk.title}</Text>
                <Text style={styles.perkPrice}>{perk.price}</Text>
              </View>
              <Text style={styles.perkDesc}>{perk.desc}</Text>
            </View>
          </View>
          {perk.isActive ? (
            <View style={styles.activeLabel}>
              <Text style={styles.activeLabelText}>{perk.activeLabel}</Text>
            </View>
          ) : perk.isPending ? (
            <View style={styles.pendingLabel}>
              <Ionicons name="time-outline" size={13} color={COLORS.amber} />
              <Text style={styles.pendingLabelText}>Pending admin approval</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.requestBtn} onPress={() => setShowModal(perk.type)}>
              <Text style={styles.requestBtnText}>Request →</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {/* How it works */}
      <View style={[styles.card, styles.howCard]}>
        <Text style={styles.howTitle}>💡 How payments work</Text>
        {[
          'Tap "Request" and enter your details',
          'Send the payment to our number manually',
          'Admin verifies and activates within 24 hours',
          "You get a notification when it's active",
        ].map((step, i) => (
          <View key={i} style={styles.howStep}>
            <View style={styles.howNumber}>
              <Text style={styles.howNumberText}>{i + 1}</Text>
            </View>
            <Text style={styles.howStepText}>{step}</Text>
          </View>
        ))}
      </View>

      {/* Payment History */}
      {payments.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          {payments.map(p => (
            <View key={p.id} style={styles.paymentItem}>
              <View style={styles.paymentLeft}>
                <Text style={styles.paymentType}>
                  {p.type === 'VERIFICATION' ? '✓ Verified Badge' : '🚀 Profile Boost'}
                </Text>
                <Text style={styles.paymentMeta}>
                  {p.paymentMethod} · {new Date(p.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
              <View style={styles.paymentRight}>
                <Text style={styles.paymentAmount}>{p.amount} {p.currency}</Text>
                <Text style={[styles.paymentStatus, {
                  color: p.status === 'COMPLETED' ? COLORS.emerald :
                         p.status === 'PENDING' ? COLORS.amber : COLORS.red,
                }]}>
                  {p.status === 'COMPLETED' ? 'Approved' : p.status === 'PENDING' ? 'Pending' : 'Rejected'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Payment Request Modal */}
      <Modal visible={!!showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {showModal === 'VERIFICATION' ? 'Get Verified Badge' : 'Boost Profile'}
            </Text>
            <Text style={styles.modalPrice}>
              {showModal === 'VERIFICATION' ? '499 PKR / month' : '500 PKR / week'}
            </Text>

            {/* Payment instructions */}
            <View style={styles.instructionBox}>
              <Text style={styles.instructionTitle}>Send payment first:</Text>
              <View style={styles.instructionRow}>
                <Text style={styles.instructionLabel}>NayaPay / SadaPay</Text>
                <Text style={styles.instructionValue}>03108574686</Text>
              </View>
              <View style={styles.instructionRow}>
                <Text style={styles.instructionLabel}>Amount</Text>
                <Text style={styles.instructionValue}>
                  {showModal === 'VERIFICATION' ? '499 PKR' : '500 PKR'}
                </Text>
              </View>
              <Text style={styles.instructionNote}>
                After sending, fill in your details below and submit.
              </Text>
            </View>

            {/* Method selection */}
            <View style={styles.methodRow}>
              {['NayaPay', 'SadaPay'].map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodBtn, paymentMethod === m && styles.methodBtnActive]}
                  onPress={() => setPaymentMethod(m)}
                >
                  <Text style={[styles.methodText, paymentMethod === m && styles.methodTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="03XX-XXXXXXX (your number)"
              placeholderTextColor={COLORS.textDim}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Transaction ID from payment"
              placeholderTextColor={COLORS.textDim}
              value={transactionId}
              onChangeText={setTransactionId}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowModal(null); setPhoneNumber(''); setTransactionId(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handlePaymentRequest} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitBtnText}>Submit Request</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  scroll: { padding: 16, paddingTop: 56, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.white, marginBottom: 20 },
  sectionTitle: { color: COLORS.white, fontWeight: '600', fontSize: 15, marginBottom: 14 },
  sectionHeader: { color: COLORS.textFaint, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 12 },
  photoRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  photoContainer: { position: 'relative' },
  photo: { width: 72, height: 72, borderRadius: 20 },
  photoFallback: { width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.brandDim, alignItems: 'center', justifyContent: 'center' },
  photoFallbackText: { color: COLORS.brandLight, fontSize: 28, fontWeight: '700' },
  cameraOverlay: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.brand, borderRadius: 10, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  photoInfo: { flex: 1 },
  photoLabel: { color: COLORS.white, fontWeight: '500', fontSize: 14, marginBottom: 3 },
  photoHint: { color: COLORS.textFaint, fontSize: 12, marginBottom: 10 },
  chooseBtn: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  chooseBtnText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500' },
  perkCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 10 },
  perkCardActive: { borderColor: 'rgba(99,102,241,0.3)', backgroundColor: 'rgba(99,102,241,0.04)' },
  perkHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  perkIcon: { width: 42, height: 42, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  perkInfo: { flex: 1 },
  perkTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  perkTitle: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
  perkPrice: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  perkDesc: { color: COLORS.textMuted, fontSize: 12, lineHeight: 17 },
  activeLabel: { backgroundColor: 'rgba(52,211,153,0.1)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.2)', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  activeLabelText: { color: COLORS.emerald, fontWeight: '600', fontSize: 13 },
  pendingLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.2)', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  pendingLabelText: { color: COLORS.amber, fontSize: 12, fontWeight: '500' },
  requestBtn: { backgroundColor: COLORS.brand, borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start' },
  requestBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  howCard: { backgroundColor: 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.15)' },
  howTitle: { color: COLORS.white, fontWeight: '600', fontSize: 14, marginBottom: 12 },
  howStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  howNumber: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.brandDim, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  howNumberText: { color: COLORS.brandLight, fontSize: 10, fontWeight: '700' },
  howStepText: { color: COLORS.textMuted, fontSize: 13, flex: 1, lineHeight: 18 },
  paymentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  paymentLeft: {},
  paymentType: { color: COLORS.white, fontSize: 14, fontWeight: '500' },
  paymentMeta: { color: COLORS.textFaint, fontSize: 11, marginTop: 2 },
  paymentRight: { alignItems: 'flex-end' },
  paymentAmount: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  paymentStatus: { fontSize: 11, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.border, paddingBottom: 36 },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { color: COLORS.white, fontWeight: '700', fontSize: 17, marginBottom: 2 },
  modalPrice: { color: COLORS.textDim, fontSize: 13, marginBottom: 16 },
  instructionBox: { backgroundColor: 'rgba(99,102,241,0.06)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', borderRadius: RADIUS.md, padding: 14, marginBottom: 14 },
  instructionTitle: { color: COLORS.brandLight, fontWeight: '600', fontSize: 13, marginBottom: 8 },
  instructionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  instructionLabel: { color: COLORS.textMuted, fontSize: 13 },
  instructionValue: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
  instructionNote: { color: COLORS.textFaint, fontSize: 11, marginTop: 8 },
  methodRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  methodBtn: { flex: 1, padding: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  methodBtnActive: { backgroundColor: 'rgba(99,102,241,0.2)', borderColor: 'rgba(99,102,241,0.5)' },
  methodText: { color: COLORS.textMuted, fontWeight: '500', fontSize: 14 },
  methodTextActive: { color: COLORS.brandLight },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 14, color: COLORS.white, fontSize: 14, marginBottom: 10 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.05)' },
  cancelBtnText: { color: COLORS.textMuted, fontWeight: '600' },
  submitBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: COLORS.brand },
  submitBtnText: { color: '#fff', fontWeight: '700' },
});
