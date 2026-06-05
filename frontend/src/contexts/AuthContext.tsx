import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { authApi, TelegramWidgetUser } from '../lib/auth';
import { useToast } from '../components/ui/use-toast';

interface UserPermissions {
  is_super_admin: boolean;
  can_manage_payments: boolean;
  can_manage_disbursements: boolean;
  can_view_reports: boolean;
  can_manage_wallet: boolean;
  can_manage_transactions: boolean;
  can_manage_bot: boolean;
  can_approve_topups: boolean;
}

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  permissions?: UserPermissions;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (userId?: string, password?: string) => Promise<void>;
  loginWithTelegram: (user: TelegramWidgetUser, cfTurnstileToken?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  permissions: UserPermissions | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userData = await authApi.getCurrentUser();
      setUser(userData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast({
        title: 'Authentication Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const login = useCallback(async (userId?: string, password?: string) => {
    try {
      setError(null);

      if (!userId || !password) {
        window.location.href = '/login';
        return;
      }

      await authApi.login(userId, password);
      await checkAuthStatus();
      toast({
        title: 'Success',
        description: 'Login successful',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [checkAuthStatus, toast]);

  const loginWithTelegram = useCallback(async (telegramUser: TelegramWidgetUser, cfTurnstileToken?: string | null) => {
    try {
      setError(null);
      await authApi.loginWithTelegram(telegramUser, cfTurnstileToken);
      await checkAuthStatus();
      toast({
        title: 'Success',
        description: 'Telegram login successful',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Telegram login failed';
      setError(errorMessage);
      toast({
        title: 'Telegram Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [checkAuthStatus, toast]);

  const logout = useCallback(async () => {
    try {
      setError(null);
      await authApi.logout();
      setUser(null);
      toast({
        title: 'Success',
        description: 'Logged out successfully',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
      toast({
        title: 'Logout Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [toast]);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    loginWithTelegram,
    logout,
    refetch: checkAuthStatus,
    isAdmin: user?.role === 'admin',
    isSuperAdmin: user?.permissions?.is_super_admin ?? false,
    permissions: user?.permissions ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};