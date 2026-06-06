'use client';
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '@/store/auth';

let socketInstance = null;

export const getSocket = () => socketInstance;

export const useSocket = () => {
  const { token } = useAuthStore();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    if (!socketInstance) {
      socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
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
