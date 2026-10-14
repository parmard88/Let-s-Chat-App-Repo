import type { User } from '../services/api';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Home: undefined;
  Chat: {
    conversationId: number | string;
    otherUser: User;
  };
};
