import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../lib/theme';
import useAuthStore from '../store/auth';

let socketInstance = null;

export const getSocket = () => socketInstance;

export const useSocket = () => {
  const { token } = useAuthStore();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
      });
    }
    socketRef.current = socketInstance;
    return () => {};
  }, [token]);

  return socketRef.current || socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
