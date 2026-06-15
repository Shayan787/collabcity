import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import api from '../../src/lib/api';
import useAuthStore from '../../src/store/auth';
import { COLORS, RADIUS } from '../../src/lib/theme';

export default function ChatScreen() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [roomName, setRoomName] = useState('');
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    api.get('/rooms').then(({ data }) => { setRooms(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const createRoom = async () => {
    if (!roomName.trim()) return;
    try {
      const { data } = await api.post('/rooms/collab', { name: roomName });
      setRooms(p => [data, ...p]);
      setRoomName('');
      setShowNew(false);
      router.push(`/chat/${data.id}`);
    } catch {}
  };

  const getRoomName = (room) => {
    if (room.type === 'COLLAB') return room.name;
    const other = room.members?.find(m => m.user.id !== user?.id);
    return other?.user?.name || 'Unknown';
  };

  const getLastMessage = (room) => {
    const msg = room.messages?.[0];
    if (!msg) return 'No messages yet';
    const isMe = msg.sender?.name === user?.name;
    return `${isMe ? 'You' : msg.sender?.name}: ${msg.content || (msg.fileType ? '📎 File' : '')}`;
  };

  const getOtherUser = (room) => {
    if (room.type === 'COLLAB') return null;
    return room.members?.find(m => m.user.id !== user?.id)?.user;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowNew(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newBtnText}>Room</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={COLORS.brand} size="large" /></View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={item => item.id}
          renderItem={({ item: room }) => {
            const otherUser = getOtherUser(room);
            return (
              <TouchableOpacity style={styles.roomItem} onPress={() => router.push(`/chat/${room.id}`)}>
                <View style={styles.avatarContainer}>
                  {room.type === 'COLLAB' ? (
                    <View style={styles.collabAvatar}>
                      <Ionicons name="people" size={18} color={COLORS.purple} />
                    </View>
                  ) : otherUser?.avatar ? (
                    <Image source={{ uri: otherUser.avatar }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarText}>{getRoomName(room)[0]?.toUpperCase()}</Text>
                    </View>
                  )}
                  {otherUser?.isOnline && <View style={styles.onlineDot} />}
                </View>
                <View style={styles.roomInfo}>
                  <View style={styles.roomTop}>
                    <Text style={styles.roomName} numberOfLines={1}>{getRoomName(room)}</Text>
                    {room.type === 'COLLAB' && (
                      <View style={styles.memberBadge}>
                        <Text style={styles.memberBadgeText}>{room.members?.length} members</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.lastMessage} numberOfLines={1}>{getLastMessage(room)}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>No chats yet</Text>
              <Text style={styles.emptySubtext}>Go to Discover and message someone!</Text>
            </View>
          }
        />
      )}

      {/* New room modal */}
      <Modal visible={showNew} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Create Collab Room</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Room name..."
              placeholderTextColor={COLORS.textDim}
              value={roomName}
              onChangeText={setRoomName}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNew(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={createRoom}>
                <Text style={styles.createBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.white },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.brand, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { paddingHorizontal: 16, gap: 2 },
  roomItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(42,42,53,0.5)' },
  avatarContainer: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 14 },
  avatarFallback: { width: 48, height: 48, borderRadius: 14, backgroundColor: COLORS.brandDim, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.brandLight, fontSize: 18, fontWeight: '700' },
  collabAvatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(168,85,247,0.15)', alignItems: 'center', justifyContent: 'center' },
  onlineDot: { position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.emerald, borderWidth: 2, borderColor: COLORS.surface },
  roomInfo: { flex: 1 },
  roomTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  roomName: { color: COLORS.white, fontWeight: '600', fontSize: 15, flex: 1 },
  memberBadge: { backgroundColor: 'rgba(168,85,247,0.15)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  memberBadgeText: { color: COLORS.purple, fontSize: 10 },
  lastMessage: { color: COLORS.textDim, fontSize: 13 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 36, marginBottom: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  emptySubtext: { color: COLORS.textFaint, fontSize: 13, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: COLORS.border },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { color: COLORS.white, fontWeight: '700', fontSize: 17, marginBottom: 14 },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 14, color: COLORS.white, fontSize: 15, marginBottom: 14 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.05)' },
  cancelBtnText: { color: COLORS.textMuted, fontWeight: '600' },
  createBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: COLORS.brand },
  createBtnText: { color: '#fff', fontWeight: '600' },
});
