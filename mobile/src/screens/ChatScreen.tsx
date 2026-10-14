import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  StatusBar,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { api, type ChatMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { io } from 'socket.io-client';

const SOCKET_BASE_URL = 'http://10.0.2.2:3000'; //Emulator
//const SOCKET_BASE_URL = 'http://192.168.0.113:3000'; //Device

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen({ route }: Props) {
  const { conversationId, otherUser } = route.params;
  const { user, token } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadMessages = useCallback(async () => {
    if (!token) {
      setError('Please log in again to view messages.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const result = await api.getMessages(conversationId, token);
      setMessages(result.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load messages.');
    } finally {
      setLoading(false);
    }
  }, [conversationId, token]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = io(SOCKET_BASE_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Connected to chat server:', socket.id);
      socket.emit('join_conversation', conversationId);
    });

    socket.on('conversation_joined', data => {
      console.log('Joined conversation:', data.conversationId);
    });

    socket.on('new_message', (incomingMessage: ChatMessage) => {
      setMessages(currentMessages => {
        const alreadyExists = currentMessages.some(
          message => String(message.id) === String(incomingMessage.id),
        );

        if (alreadyExists) {
          return currentMessages;
        }

        return [...currentMessages, incomingMessage];
      });
    });

    socket.on('chat_error', (data: { message: string }) => {
      console.warn('Chat error:', data.message);
      setError(data.message);
    });

    socket.on('connect_error', error => {
      console.warn('Socket connection failed:', error.message);
      setError('Real-time connection failed. Check the server.');
    });

    return () => {
      socket.disconnect();
    };
  }, [conversationId, token]);

  const handleSend = async () => {
    const text = draft.trim();

    if (!text || sending) {
      return;
    }

    if (!token) {
      Alert.alert('Session expired', 'Please log in again.');
      return;
    }

    try {
      setSending(true);

      const result = await api.sendMessage(conversationId, text, token);

      setMessages(current => {
        if (
          current.some(message => String(message.id) === String(result.data.id))
        ) {
          return current;
        }

        return [...current, result.data];
      });

      setDraft('');
      setError('');
    } catch (err) {
      Alert.alert(
        'Message not sent',
        err instanceof Error ? err.message : 'Please try again.',
      );
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = String(item.senderUserId) === String(user?.id);

    return (
      <View
        style={[
          styles.messageRow,
          isMine ? styles.myMessageRow : styles.theirMessageRow,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMine ? styles.myBubble : styles.theirBubble,
          ]}
        >
          {!isMine && <Text style={styles.senderName}>{item.senderName}</Text>}

          <Text style={styles.messageText}>{item.body}</Text>

          <Text
            style={[
              styles.timeText,
              isMine ? styles.myTimeText : styles.theirTimeText,
            ]}
          >
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" />
              <Text style={styles.statusText}>Loading messages...</Text>
            </View>
          ) : (
            <>
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                  <Pressable onPress={loadMessages}>
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                </View>
              ) : null}

              <FlatList
                style={styles.list}
                data={messages}
                keyExtractor={item => String(item.id)}
                renderItem={renderMessage}
                contentContainerStyle={styles.messagesContent}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    No messages yet. Say hello to {otherUser.displayName}!
                  </Text>
                }
              />

              <View style={styles.composer}>
                <TextInput
                  style={styles.input}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Type a message..."
                  multiline
                  maxLength={5000}
                  editable={!sending}
                />

                <Pressable
                  style={[
                    styles.sendButton,
                    (!draft.trim() || sending) && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSend}
                  disabled={!draft.trim() || sending}
                >
                  {sending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.sendButtonText}>Send</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    marginTop: 10,
    color: '#555555',
  },
  list: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 5,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  myBubble: {
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  senderName: {
    color: '#2563EB',
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#111827',
  },
  timeText: {
    fontSize: 10,
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  myTimeText: {
    color: '#DBEAFE',
  },
  theirTimeText: {
    color: '#6B7280',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 30,
    paddingHorizontal: 20,
  },
  errorBox: {
    padding: 12,
    backgroundColor: '#FEE2E2',
  },
  errorText: {
    color: '#991B1B',
  },
  retryText: {
    color: '#1D4ED8',
    fontWeight: '600',
    marginTop: 8,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  sendButton: {
    minWidth: 64,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
