import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { User } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const initializedRef = useRef(false);

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const profile = await authService.getProfile();
      setUser(profile);
    } catch (error) {
      console.error('Không thể tải lại thông tin cá nhân:', error);
      logout();
    }
  };

  // Lắng nghe sự kiện buộc đăng xuất khi phiên hết hạn hoặc bị khóa tài khoản
  useEffect(() => {
    const handleForceLogout = (event: Event) => {
      const customEvent = event as CustomEvent<{ reason?: string }>;
      logout();
      if (customEvent.detail?.reason) {
        toast.error(customEvent.detail.reason);
      }
    };
    window.addEventListener('gox:force-logout', handleForceLogout);
    return () => window.removeEventListener('gox:force-logout', handleForceLogout);
  }, []);

  // Chỉ gọi getProfile một lần khi khởi tạo ứng dụng nếu đã lưu token từ trước
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initAuth = async () => {
      const savedToken = localStorage.getItem('auth_token');
      if (savedToken) {
        try {
          const profile = await authService.getProfile();
          setUser(profile);
        } catch (error) {
          console.error('Phiên đăng nhập hết hạn:', error);
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        updateUser,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
};

