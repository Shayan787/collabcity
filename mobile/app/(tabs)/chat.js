import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, Modal, Image, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';
import api from '../../src/lib/api';
import useAuthStore from '../../src/store/auth';
import { useSocket } from '../../src/hooks/useSocket';
import { COLORS, RADIUS } from '../../src/lib/theme';

export default function ChatScreen() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const { user } = useAuthStore();
  const socket = useSocket();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const fetchRooms = async () => {
    try {
      const { data } = await api.get('/rooms');
      // Sort by latest message
      const sorted = data.sort((a, b) => {
        const aTime = a.messages?.[0]?.createdAt || a.createdAt;
        const bTime = b.messages?.[0]?.createdAt || b.createdAt;
        return new Date(bTime) - new Date(aTime);
      });
      setRooms(sorted);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  // Fetch on mount
  useEffect(() => { fetchRooms(); }, []);

  // Refetch when tab comes into focus
  useFocusEffect(useCallback(() => { fetchRooms(); }, []));

  // Real-time: update chat list when new message comes in
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      setRooms(prev => {
        const updated = prev.map(room => {
          if (room.id === msg.roomId) {
            return {
              ...room,
              messages: [msg],
              _hasNew: true,
            };
          }
          return room;
        });
        // Re-sort: room with new message goes to top
        return updated.sort((a, b) => {
          const aTime = a.messages?.[0]?.createdAt || a.createdAt;
          const bTime = b.messages?.[0]?.createdAt || b.createdAt;
          return new Date(bTime) - new Date(aTime);
        });
      });

      // Increment unread count for this room
      setUnreadCounts(prev => ({
        ...prev,
        [msg.roomId]: (prev[msg.roomId] || 0) + 1,
      }));
    };

    socket.on('message:new', handleNewMessage);
    return () => socket.off('message:new', handleNewMessage);
  }, [socket]);

  const openRoom = (roomId) => {
    // Clear unread count when opening
    setUnreadCounts(prev => ({ ...prev, [roomId]: 0 }));
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, _hasNew: false } : r));
    router.push(`/chat/${roomId}`);
  };

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
    const isMe = msg.senderId === user?.id || msg.sender?.id === user?.id;
    if (msg.fileType) return `${isMe ? 'You' : msg.sender?.name}: 📎 ${msg.fileType === 'image' ? 'Image' : 'File'}`;
    return `${isMe ? 'You' : msg.sender?.name}: ${msg.content}`;
  };

  const getLastTime = (room) => {
    const time = room.messages?.[0]?.createdAt || room.createdAt;
    if (!time) return '';
    try {
      return formatDistanceToNow(new Date(time), { addSuffix: false });
    } catch { return ''; }
  };

  const getOtherUser = (room) => {
    if (room.type === 'COLLAB') return null;
    return room.members?.find(m => m.user.id !== user?.id)?.user;
  };

  const bottomPadding = insets.bottom > 0 ? insets.bottom : 16;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchRooms(); }}
              tintColor={COLORS.brand}
            />
          }
          renderItem={({ item: room }) => {
            const otherUser = getOtherUser(room);
            const unread = unreadCounts[room.id] || 0;
            const hasNew = room._hasNew || unread > 0;

            return (
              <TouchableOpacity
                style={[styles.roomItem, hasNew && styles.roomItemUnread]}
                onPress={() => openRoom(room.id)}
              >
                {/* Avatar */}
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

                {/* Room info */}
                <View style={styles.roomInfo}>
                  <View style={styles.roomTopRow}>
                    <Text style={[styles.roomName, hasNew && styles.roomNameBold]} numberOfLines={1}>
                      {getRoomName(room)}
                    </Text>
                    <Text style={[styles.timeText, hasNew && styles.timeTextUnread]}>
                      {getLastTime(room)}
                    </Text>
                  </View>
                  <View style={styles.roomBottomRow}>
                    <Text style={[styles.lastMessage, hasNew && styles.lastMessageBold]} numberOfLines={1}>
                      {getLastMessage(room)}
                    </Text>
                    {unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={[styles.list, rooms.length === 0 && styles.emptyList]}
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
          <View style={[styles.modal, { paddingBottom: bottomPadding + 8 }]}>
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
  header: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.white },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.brand, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { paddingHorizontal: 16 },
  emptyList: { flex: 1 },
  roomItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(42,42,53,0.4)' },
  roomItemUnread: { backgroundColor: 'rgba(99,102,241,0.04)', marginHorizontal: -16, paddingHorizontal: 16, borderRadius: 0 },
  avatarContainer: { position: 'relative', flexShrink: 0 },
  avatar: { width: 52, height: 52, borderRadius: 16 },
  avatarFallback: { width: 52, height: 52, borderRadius: 16, backgroundColor: COLORS.brandDim, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.brandLight, fontSize: 20, fontWeight: '700' },
  collabAvatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(168,85,247,0.15)', alignItems: 'center', justifyContent: 'center' },
  onlineDot: { position: 'absolute', bottom: -1, right: -1, width: 13, height: 13, borderRadius: 7, backgroundColor: COLORS.emerald, borderWidth: 2, borderColor: COLORS.surface },
  roomInfo: { flex: 1, minWidth: 0 },
  roomTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  roomName: { color: COLORS.textMuted, fontWeight: '500', fontSize: 15, flex: 1, marginRight: 8 },
  roomNameBold: { color: COLORS.white, fontWeight: '700' },
  timeText: { color: COLORS.textFaint, fontSize: 12, flexShrink: 0 },
  timeTextUnread: { color: COLORS.brand },
  roomBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMessage: { color: COLORS.textFaint, fontSize: 13, flex: 1, marginRight: 8 },
  lastMessageBold: { color: COLORS.textMuted, fontWeight: '500' },
  unreadBadge: { backgroundColor: COLORS.brand, borderRadius: 12, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, flexShrink: 0 },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: COLORS.textFaint, fontSize: 13, marginTop: 4, textAlign: 'center' },
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
