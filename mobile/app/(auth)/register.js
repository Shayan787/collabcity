import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';
import useAuthStore from '../../src/store/auth';
import { COLORS, RADIUS } from '../../src/lib/theme';

const VIBE_TAGS = [
  { name: 'Developer', emoji: '💻' },
  { name: 'Designer', emoji: '🎨' },
  { name: 'Video Editor', emoji: '🎬' },
  { name: 'Content Creator', emoji: '📱' },
  { name: 'Musician', emoji: '🎵' },
  { name: 'Photographer', emoji: '📸' },
  { name: 'Marketer', emoji: '📣' },
  { name: 'Entrepreneur', emoji: '🚀' },
  { name: 'Gamer', emoji: '🎮' },
  { name: 'Writer', emoji: '✍️' },
];

export default function RegisterScreen() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', city: 'Karachi', area: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  const toggleTag = (tag) => setSelectedTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]);

  const handleStep1 = () => {
    if (!form.name || !form.username || !form.email || !form.password)
      return Alert.alert('Error', 'Please fill all fields');
    if (form.password.length < 8)
      return Alert.alert('Error', 'Password must be at least 8 characters');
    setStep(2);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      await login(data.user, data.token);
      if (selectedTags.length > 0) {
        await api.put('/users/profile', { vibeTags: selectedTags }).catch(() => {});
      }
      router.replace('/(tabs)/discover');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.logoContainer}>
          <Text style={styles.logo}>collab<Text style={styles.logoAccent}>city</Text></Text>
          <Text style={styles.subtitle}>{step === 1 ? 'Create your account' : "What's your vibe?"}</Text>
          <View style={styles.steps}>
            {[1, 2].map(s => (
              <View key={s} style={[styles.stepDot, { backgroundColor: s <= step ? COLORS.brand : COLORS.border }]} />
            ))}
          </View>
        </View>

        {step === 1 && (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput style={styles.input} placeholder="Ali Khan" placeholderTextColor={COLORS.textDim}
                  value={form.name} onChangeText={v => setForm(p => ({ ...p, name: v }))} />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Username</Text>
                <TextInput style={styles.input} placeholder="alikhan" placeholderTextColor={COLORS.textDim}
                  value={form.username} onChangeText={v => setForm(p => ({ ...p, username: v.toLowerCase().replace(/\s/g, '') }))}
                  autoCapitalize="none" />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={COLORS.textDim}
                value={form.email} onChangeText={v => setForm(p => ({ ...p, email: v }))}
                keyboardType="email-address" autoCapitalize="none" />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput style={[styles.input, styles.passwordInput]} placeholder="min 8 characters"
                  placeholderTextColor={COLORS.textDim} value={form.password}
                  onChangeText={v => setForm(p => ({ ...p, password: v }))} secureTextEntry={!showPassword} />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(p => !p)}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={COLORS.textDim} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>City</Text>
                <TextInput style={styles.input} placeholder="Karachi" placeholderTextColor={COLORS.textDim}
                  value={form.city} onChangeText={v => setForm(p => ({ ...p, city: v }))} />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Area</Text>
                <TextInput style={styles.input} placeholder="DHA, Gulshan..." placeholderTextColor={COLORS.textDim}
                  value={form.area} onChangeText={v => setForm(p => ({ ...p, area: v }))} />
              </View>
            </View>
            <TouchableOpacity style={styles.btn} onPress={handleStep1}>
              <Text style={styles.btnText}>Next →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.hint}>Pick tags that describe you (optional)</Text>
            <View style={styles.tagsContainer}>
              {VIBE_TAGS.map(t => (
                <TouchableOpacity
                  key={t.name}
                  style={[styles.tag, selectedTags.includes(t.name) && styles.tagActive]}
                  onPress={() => toggleTag(t.name)}
                >
                  <Text style={[styles.tagText, selectedTags.includes(t.name) && styles.tagTextActive]}>
                    {t.emoji} {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Join CollabCity 🚀</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep(1)}>
              <Text style={styles.ghostBtnText}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 28 },
  logo: { fontSize: 28, fontWeight: '800', color: COLORS.white },
  logoAccent: { color: COLORS.brandLight },
  subtitle: { color: COLORS.textDim, fontSize: 14, marginTop: 6 },
  steps: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stepDot: { width: 40, height: 4, borderRadius: 2 },
  card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: 20, gap: 14 },
  row: { flexDirection: 'row', gap: 12 },
  inputGroup: { gap: 6 },
  label: { color: COLORS.textMuted, fontSize: 13 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 13, color: COLORS.white, fontSize: 14 },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  btn: { backgroundColor: COLORS.brand, borderRadius: RADIUS.md, padding: 15, alignItems: 'center' },
  btnText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  ghostBtn: { alignItems: 'center', padding: 12 },
  ghostBtnText: { color: COLORS.textDim, fontSize: 14 },
  hint: { color: COLORS.textMuted, fontSize: 13 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border },
  tagActive: { backgroundColor: 'rgba(99,102,241,0.2)', borderColor: 'rgba(99,102,241,0.5)' },
  tagText: { color: COLORS.textMuted, fontSize: 13 },
  tagTextActive: { color: COLORS.brandLight },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: COLORS.textDim, fontSize: 14 },
  footerLink: { color: COLORS.brandLight, fontSize: 14, fontWeight: '600' },
});
