import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { api, User } from '../services/api';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

export default function HomeScreen() {
  const { user, token, logout } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleOpenChat = async (otherUser: User) => {
    if (!token) {
      Alert.alert('Session expired', 'Please log in again.');
      return;
    }

    try {
      const result = await api.openDirectConversation(otherUser.id, token);

      navigation.navigate('Chat', {
        conversationId: result.conversationId,
        otherUser,
      });
    } catch (err) {
      Alert.alert(
        'Could not open chat',
        err instanceof Error ? err.message : 'Please try again.',
      );
    }
  };

  const loadUsers = useCallback(async () => {
    if (!token) {
      setError('Your session is missing. Please log in again.');
      setLoadingUsers(false);
      return;
    }

    setError('');

    try {
      const response = await api.getUsers(token);
      setUsers(response.users);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load users. Please try again.',
      );
    } finally {
      setLoadingUsers(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const refreshUsers = () => {
    setRefreshing(true);
    loadUsers();
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(item.displayName || 'U').charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor: item.isOnline ? '#22A06B' : '#A6A3B5',
              },
            ]}
          />
          <Text style={styles.statusText}>
            {item.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => handleOpenChat(item)}
      >
        <Text style={styles.chatButtonText}>Chat</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Let's Chat</Text>
            <Text style={styles.subtitle}>Find people and connect.</Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.displayName || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.profileCard}>
          <Text style={styles.eyebrow}>SIGNED IN AS</Text>
          <Text style={styles.name}>{user?.displayName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Find People</Text>
          <Text style={styles.count}>{users.length} users</Text>
        </View>

        {loadingUsers ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#6558E8" />
            <Text style={styles.helperText}>Loading people...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setLoadingUsers(true);
                loadUsers();
              }}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={item => String(item.id)}
            renderItem={renderUser}
            contentContainerStyle={
              users.length === 0 ? styles.emptyList : styles.list
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refreshUsers}
                tintColor="#6558E8"
              />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyTitle}>No other users yet</Text>
                <Text style={styles.helperText}>
                  Create another account to see someone here.
                </Text>
              </View>
            }
          />
        )}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            logout().catch(() => {
              Alert.alert('Error', 'Unable to log out. Please try again.');
            });
          }}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FF',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brand: {
    color: '#24213D',
    fontSize: 27,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#77738C',
    fontSize: 14,
    marginTop: 4,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#6558E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: 'bold',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E1F0',
    marginBottom: 24,
  },
  eyebrow: {
    color: '#77738C',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  name: {
    color: '#24213D',
    fontSize: 21,
    fontWeight: 'bold',
    marginTop: 8,
  },
  email: {
    color: '#77738C',
    fontSize: 13,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#24213D',
    fontSize: 20,
    fontWeight: 'bold',
  },
  count: {
    color: '#77738C',
    fontSize: 13,
  },
  list: {
    paddingBottom: 12,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 20,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E1F0',
    borderRadius: 15,
    padding: 13,
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    color: '#24213D',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#77738C',
    fontSize: 12,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    color: '#77738C',
    fontSize: 11,
  },
  chatButton: {
    backgroundColor: '#6558E8',
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 15,
    marginLeft: 8,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  helperText: {
    color: '#77738C',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 10,
    lineHeight: 21,
  },
  emptyTitle: {
    color: '#24213D',
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  errorText: {
    color: '#C0394B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  retryButton: {
    backgroundColor: '#6558E8',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 22,
    marginTop: 15,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#6558E8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  logoutText: {
    color: '#6558E8',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
