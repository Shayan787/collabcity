import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Alert,
  Modal, Dimensions, StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';
import api from '../../src/lib/api';
import useAuthStore from '../../src/store/auth';
import { useSocket } from '../../src/hooks/useSocket';
import { COLORS, RADIUS } from '../../src/lib/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function ImageViewer({ url, fileName, onClose }) {
  const handleDownload = async () => {
    try {
      const ext = fileName?.split('.').pop() || 'jpg';
      const localUri = FileSystem.cacheDirectory + (fileName || `image.${ext}`);
      const { uri } = await FileSystem.downloadAsync(url, localUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: `image/${ext}`, dialogTitle: 'Save image' });
      } else {
        Alert.alert('Downloaded', 'Image saved to cache');
      }
    } catch {
      Alert.alert('Error', 'Failed to download image');
    }
  };

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.viewerOverlay}>
        <StatusBar backgroundColor="#000" barStyle="light-content" />
        <View style={styles.viewerHeader}>
          <Text style={styles.viewerFileName} numberOfLines={1}>{fileName || 'Image'}</Text>
          <View style={styles.viewerActions}>
            <TouchableOpacity style={styles.viewerDownloadBtn} onPress={handleDownload}>
              <Ionicons name="download-outline" size={18} color="#fff" />
              <Text style={styles.viewerDownloadText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.viewerCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.viewerImageContainer} activeOpacity={1} onPress={onClose}>
          <Image source={{ uri: url }} style={styles.viewerImage} resizeMode="contain" />
        </TouchableOpacity>
        <Text style={styles.viewerHint}>Tap outside to close</Text>
      </View>
    </Modal>
  );
}

function FileMessage({ msg }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const isExpired = !msg.fileUrl && msg.fileType;

  if (isExpired) {
    return (
      <View style={styles.expiredFile}>
        <Ionicons name="time-outline" size={14} color={COLORS.red} />
        <View>
          <Text style={styles.expiredTitle}>File expired</Text>
          <Text style={styles.expiredSub}>{msg.fileName || 'File'} · Ask sender to resend</Text>
        </View>
      </View>
    );
  }

  const isImage = msg.fileType === 'image';
  const expiresAt = msg.fileExpiresAt ? new Date(msg.fileExpiresAt) : null;
  const hoursLeft = expiresAt ? (expiresAt - new Date()) / (1000 * 60 * 60) : null;
  const expiringSoon = hoursLeft !== null && hoursLeft < 24 && hoursLeft > 0;
  const daysLeft = hoursLeft !== null && hoursLeft >= 24 ? Math.ceil(hoursLeft / 24) : null;

  const getMimeType = (ext) => {
    const types = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt: 'text/plain',
      zip: 'application/zip',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
    };
    return types[ext?.toLowerCase()] || 'application/octet-stream';
  };

  const getUTI = (ext) => {
    const utis = {
      pdf: 'com.adobe.pdf',
      doc: 'com.microsoft.word.doc',
      docx: 'org.openxmlformats.wordprocessingml.document',
      txt: 'public.plain-text',
      zip: 'public.zip-archive',
    };
    return utis[ext?.toLowerCase()] || 'public.data';
  };

  const handleFileDownload = async () => {
    try {
      const name = msg.fileName || 'download';
      const ext = name.split('.').pop();
      const localUri = FileSystem.cacheDirectory + name;
      Alert.alert('Downloading...', `Saving ${name}`);
      const { uri } = await FileSystem.downloadAsync(msg.fileUrl, localUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: getMimeType(ext),
          dialogTitle: `Save ${name}`,
          UTI: getUTI(ext),
        });
      } else {
        Alert.alert('Downloaded', `${name} saved successfully`);
      }
    } catch {
      Alert.alert('Error', 'Failed to download file');
    }
  };

  if (isImage) {
    return (
      <View>
        <TouchableOpacity onPress={() => setViewerOpen(true)}>
          <Image source={{ uri: msg.fileUrl }} style={styles.imageMsg} resizeMode="cover" />
          <View style={styles.imageOverlay}>
            <Ionicons name="expand-outline" size={18} color="rgba(255,255,255,0.8)" />
          </View>
        </TouchableOpacity>
        {msg.content ? <Text style={styles.caption}>{msg.content}</Text> : null}
        {expiringSoon && (
          <View style={styles.expiryWarn}>
            <Ionicons name="time-outline" size={10} color="#fbbf24" />
            <Text style={styles.expiryWarnText}>Expires in {Math.ceil(hoursLeft)}h</Text>
          </View>
        )}
        {daysLeft && (
          <Text style={styles.expiryNormal}>Expires in {daysLeft} day{daysLeft > 1 ? 's' : ''}</Text>
        )}
        {viewerOpen && (
          <ImageViewer
            url={msg.fileUrl}
            fileName={msg.fileName}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </View>
    );
  }

  return (
    <View>
      <TouchableOpacity style={styles.fileCard} onPress={handleFileDownload}>
        <View style={styles.fileIcon}>
          <Ionicons name="document-text" size={18} color={COLORS.brandLight} />
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>{msg.fileName || 'File'}</Text>
          <Text style={styles.fileExt}>{msg.fileName?.split('.').pop()?.toUpperCase() || 'FILE'}</Text>
        </View>
        <Ionicons name="download-outline" size={18} color={COLORS.brandLight} />
      </TouchableOpacity>
      {expiringSoon && (
        <View style={styles.expiryWarn}>
          <Ionicons name="time-outline" size={10} color="#fbbf24" />
          <Text style={styles.expiryWarnText}>Expires in {Math.ceil(hoursLeft)}h</Text>
        </View>
      )}
      {daysLeft && (
        <Text style={styles.expiryNormal}>Expires in {daysLeft} day{daysLeft > 1 ? 's' : ''}</Text>
      )}
    </View>
  );
}

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const socket = useSocket();
  const router = useRouter();
  const flatListRef = useRef(null);
  const insets = useSafeAreaInsets();

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const typingTimeout = useRef(null);

  useEffect(() => {
    Promise.all([api.get('/rooms'), api.get(`/rooms/${id}/messages`)])
      .then(([roomsRes, msgsRes]) => {
        const r = roomsRes.data.find(r => r.id === id);
        setRoom(r);
        setMessages(msgsRes.data);
        setLoading(false);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('room:join', id);

    const handleMsg = (msg) => {
      if (msg.roomId === id) {
        setMessages(p => [...p, msg]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };
    const handleTypingStart = ({ userId: uid }) => {
      if (uid !== user?.id) setTyping(p => [...new Set([...p, uid])]);
    };
    const handleTypingStop = ({ userId: uid }) => setTyping(p => p.filter(u => u !== uid));

    socket.on('message:new', handleMsg);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.off('message:new', handleMsg);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
    };
  }, [socket, id, user]);

  const sendMessage = () => {
    if (!input.trim() || !socket) return;
    socket.emit('message:send', { roomId: id, content: input.trim() });
    setInput('');
    socket.emit('typing:stop', { roomId: id });
  };

  const handleInputChange = (text) => {
    setInput(text);
    if (!socket) return;
    socket.emit('typing:start', { roomId: id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit('typing:stop', { roomId: id }), 1500);
  };

  const pickAndSendFile = async (type) => {
    try {
      if (type === 'image') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return Alert.alert('Permission needed', 'Allow photo access to send images');
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
        if (result.canceled) return;
        const asset = result.assets[0];
        setUploading(true);
        const formData = new FormData();
        formData.append('file', { uri: asset.uri, type: 'image/jpeg', name: 'photo.jpg' });
        const { data } = await api.post('/upload/chat-file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        socket.emit('message:send', {
          roomId: id, content: '',
          fileUrl: data.url, fileType: data.type,
          fileName: data.name, cloudinaryId: data.cloudinaryId,
          fileExpiresAt: data.expiresAt,
        });
      } else {
        const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
        if (result.canceled) return;
        const asset = result.assets[0];
        setUploading(true);
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          type: asset.mimeType || 'application/octet-stream',
          name: asset.name,
        });
        const { data } = await api.post('/upload/chat-file', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        socket.emit('message:send', {
          roomId: id, content: '',
          fileUrl: data.url, fileType: data.type,
          fileName: data.name, cloudinaryId: data.cloudinaryId,
          fileExpiresAt: data.expiresAt,
        });
      }
    } catch {
      Alert.alert('Error', 'Failed to send file');
    } finally {
      setUploading(false);
    }
  };

  const showAttachMenu = () => {
    Alert.alert('Send a file', 'Choose what to send', [
      { text: 'Photo', onPress: () => pickAndSendFile('image') },
      { text: 'Document', onPress: () => pickAndSendFile('file') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const getRoomTitle = () => {
    if (!room) return '...';
    if (room.type === 'COLLAB') return room.name;
    return room.members?.find(m => m.user.id !== user?.id)?.user?.name || 'Chat';
  };

  const otherUser = room?.type !== 'COLLAB'
    ? room?.members?.find(m => m.user.id !== user?.id)?.user
    : null;

  const renderMessage = ({ item: msg, index }) => {
    const isMe = msg.sender?.id === user?.id;
    const prevMsg = messages[index - 1];
    const showName = index === 0 || prevMsg?.sender?.id !== msg.sender?.id;

    return (
      <View style={[styles.msgWrapper, {
        alignItems: isMe ? 'flex-end' : 'flex-start',
        marginTop: showName ? 12 : 2,
      }]}>
        {showName && (
          <Text style={[styles.senderName, {
            color: isMe ? COLORS.brandLight : COLORS.textMuted,
            textAlign: isMe ? 'right' : 'left',
          }]}>
            {isMe ? 'You' : msg.sender?.name}
          </Text>
        )}
        <View style={[
          styles.bubble,
          isMe ? styles.myBubble : styles.theirBubble,
          msg.fileType ? styles.fileBubble : null,
        ]}>
          {msg.fileType
            ? <FileMessage msg={msg} />
            : <Text style={styles.msgText}>{msg.content}</Text>
          }
        </View>
        <Text style={[styles.msgTime, { textAlign: isMe ? 'right' : 'left' }]}>
          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
        </Text>
      </View>
    );
  };

  const bottomPadding = insets.bottom > 0 ? insets.bottom : 12;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {otherUser?.avatar ? (
            <Image source={{ uri: otherUser.avatar }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Text style={styles.headerAvatarText}>{getRoomTitle()[0]?.toUpperCase()}</Text>
            </View>
          )}
          <View>
            <Text style={styles.headerName}>{getRoomTitle()}</Text>
            <Text style={styles.headerStatus}>
              {otherUser?.isOnline
                ? '🟢 Online'
                : room?.type === 'COLLAB'
                  ? `${room.members?.length || 0} members`
                  : 'Offline'
              }
            </Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.brand} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyChat}>Say hi! 👋</Text>
            </View>
          }
          ListFooterComponent={typing.length > 0 ? (
            <View style={styles.typingContainer}>
              <View style={styles.typingBubble}>
                {[0, 1, 2].map(i => <View key={i} style={styles.typingDot} />)}
              </View>
            </View>
          ) : null}
        />
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: bottomPadding }]}>
        <TouchableOpacity style={styles.attachBtn} onPress={showAttachMenu} disabled={uploading}>
          {uploading
            ? <ActivityIndicator size="small" color={COLORS.textDim} />
            : <Ionicons name="attach" size={22} color={COLORS.textDim} />
          }
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.textDim}
          value={input}
          onChangeText={handleInputChange}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, input.trim() ? styles.sendBtnActive : null]}
          onPress={sendMessage}
          disabled={!input.trim()}
        >
          <Ionicons name="send" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.card, gap: 12 },
  backBtn: { padding: 4 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerAvatar: { width: 36, height: 36, borderRadius: 12 },
  headerAvatarFallback: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.brandDim, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { color: COLORS.brandLight, fontWeight: '700' },
  headerName: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
  headerStatus: { color: COLORS.textDim, fontSize: 12 },
  messagesList: { padding: 16, flexGrow: 1 },
  msgWrapper: { marginBottom: 2 },
  senderName: { fontSize: 11, fontWeight: '500', marginBottom: 3, paddingHorizontal: 4 },
  bubble: { maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  myBubble: { backgroundColor: COLORS.brand, borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#1e1e2a', borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 4 },
  fileBubble: { padding: 8 },
  msgText: { color: COLORS.white, fontSize: 14, lineHeight: 20 },
  msgTime: { fontSize: 10, color: COLORS.textFaint, marginTop: 3, paddingHorizontal: 4 },
  imageMsg: { width: 200, height: 180, borderRadius: 12 },
  imageOverlay: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: 4 },
  caption: { color: COLORS.white, fontSize: 13, marginTop: 4 },
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 10, minWidth: 180 },
  fileIcon: { width: 34, height: 34, borderRadius: 8, backgroundColor: COLORS.brandDim, alignItems: 'center', justifyContent: 'center' },
  fileInfo: { flex: 1 },
  fileName: { color: COLORS.white, fontSize: 13, fontWeight: '500' },
  fileExt: { color: COLORS.textDim, fontSize: 11 },
  expiredFile: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 10, padding: 10 },
  expiredTitle: { color: COLORS.red, fontSize: 12, fontWeight: '500' },
  expiredSub: { color: COLORS.textMuted, fontSize: 11 },
  expiryWarn: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  expiryWarnText: { color: '#fbbf24', fontSize: 10, fontWeight: '500' },
  expiryNormal: { color: '#4b5563', fontSize: 10, marginTop: 4 },
  typingContainer: { alignItems: 'flex-start', paddingLeft: 4, marginTop: 8 },
  typingBubble: { flexDirection: 'row', gap: 4, backgroundColor: '#1e1e2a', borderRadius: 18, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textDim },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.card, gap: 8 },
  attachBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border },
  input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, color: COLORS.white, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: RADIUS.full, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  sendBtnActive: { backgroundColor: COLORS.brand },
  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.97)', justifyContent: 'center', alignItems: 'center' },
  viewerHeader: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 48, backgroundColor: 'rgba(0,0,0,0.5)' },
  viewerFileName: { color: '#fff', fontSize: 14, fontWeight: '500', flex: 1, marginRight: 12 },
  viewerActions: { flexDirection: 'row', gap: 8 },
  viewerDownloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.brand, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  viewerDownloadText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  viewerCloseBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 8 },
  viewerImageContainer: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: SCREEN_WIDTH - 32, height: SCREEN_HEIGHT * 0.75 },
  viewerHint: { position: 'absolute', bottom: 40, color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyChat: { color: COLORS.textDim, fontSize: 14 },
});