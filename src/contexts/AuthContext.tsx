import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'client_admin' | 'admin' | 'vet' | 'tech' | 'viewer' | 'secretary' | 'farm_worker' | 'warehouse_worker' | 'custom';

export interface ModulePermission {
  module_name: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_create: boolean;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  client_id: string; // NEW: Organization/client ID
  default_farm_id: string | null; // NEW: User's default farm
  can_access_all_farms: boolean; // NEW: Can access all farms in client
  is_frozen: boolean;
  frozen_at: string | null;
  frozen_by: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  work_location?: string;
  module_permissions?: ModulePermission[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (action: string) => boolean;
  hasModulePermission: (moduleName: string, permissionType?: 'view' | 'edit' | 'delete' | 'create') => boolean;
  logAction: (action: string, tableName?: string, recordId?: string, oldData?: any, newData?: any) => Promise<void>;
  clientId: string | null; // NEW: Current user's client ID
  isClientAdmin: boolean; // NEW: Is client admin role
  isAdmin: boolean;
  isVet: boolean;
  isTech: boolean;
  isViewer: boolean;
  isSecretary: boolean; // NEW: Secretary role
  isFarmWorker: boolean;
  isWarehouseWorker: boolean;
  isWorker: boolean;
  isCustomRole: boolean;
  isFrozen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'vetstock_user_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const userData = JSON.parse(savedSession);
        setUser(userData);
      } catch (err) {
        console.error('Error parsing saved session:', err);
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase
        .rpc('verify_password', {
          p_email: email,
          p_password: password
        });

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Invalid email or password');
      }

      const userData = data[0];

      await supabase.rpc('update_last_login', {
        p_user_id: userData.user_id
      });

      const { data: fullUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userData.user_id)
        .single();

      if (fetchError) throw fetchError;

      // Load module permissions for custom role users
      if (fullUser.role === 'custom') {
        const { data: permissions, error: permError } = await supabase
          .from('user_module_permissions')
          .select('*')
          .eq('user_id', fullUser.id);

        if (!permError && permissions) {
          fullUser.module_permissions = permissions;
        }
      }

      setUser(fullUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(fullUser));

      await supabase.rpc('log_user_action', {
        p_user_id: fullUser.id,
        p_action: 'user_login',
        p_table_name: null,
        p_record_id: null,
        p_old_data: null,
        p_new_data: { email: fullUser.email, role: fullUser.role, full_name: fullUser.full_name },
      });
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    if (user) {
      await supabase.rpc('log_user_action', {
        p_user_id: user.id,
        p_action: 'user_logout',
        p_table_name: null,
        p_record_id: null,
        p_old_data: null,
        p_new_data: null,
      });
    }
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const logAction = async (
    action: string,
    tableName?: string,
    recordId?: string,
    oldData?: any,
    newData?: any
  ) => {
    if (!user) {
      console.warn('Cannot log action: no user logged in');
      return;
    }

    try {
      console.log('Logging action:', { action, tableName, recordId, newData });
      const { data, error } = await supabase.rpc('log_user_action', {
        p_user_id: user.id,
        p_action: action,
        p_table_name: tableName || null,
        p_record_id: recordId || null,
        p_old_data: oldData || null,
        p_new_data: newData || null,
      });

      if (error) {
        // Log the error but don't throw - audit logging is non-critical
        // The main operation (treatment, etc.) has already succeeded
        console.warn('Failed to log action (non-critical):', error.message);
        return;
      }

      console.log('Action logged successfully:', data);
    } catch (error: any) {
      // Silently fail - audit logging should not break the user experience
      console.warn('Failed to log action (non-critical):', error?.message || error);
    }
  };

  const hasPermission = (action: string): boolean => {
    if (!user) return false;
    if (user.is_frozen) return false;

    const role = user.role;

    switch (action) {
      case 'manage_users':
      case 'settings':
      case 'audit_logs':
        return role === 'admin';

      case 'treatment':
      case 'delete':
        return role === 'admin' || role === 'vet';

      case 'receive_stock':
      case 'biocides':
      case 'waste':
      case 'products':
      case 'animals':
      case 'suppliers':
        return role === 'admin' || role === 'vet' || role === 'tech';

      case 'worker_time_tracking':
        return role === 'farm_worker' || role === 'warehouse_worker';

      case 'worker_task_reporting':
        return role === 'farm_worker' || role === 'warehouse_worker';

      case 'worker_view_technika':
        return role === 'farm_worker' || role === 'warehouse_worker';

      case 'approve_worker_reports':
        return role === 'admin';

      case 'view':
        return true;

      default:
        return false;
    }
  };

  const hasModulePermission = (moduleName: string, permissionType: 'view' | 'edit' | 'delete' | 'create' = 'view'): boolean => {
    if (!user) return false;
    if (user.is_frozen) return false;

    const role = user.role;

    // Client admin and admin always have all permissions
    if (role === 'client_admin' || role === 'admin') return true;

    // For custom role, check module_permissions
    if (role === 'custom') {
      if (!user.module_permissions) return false;
      
      const permission = user.module_permissions.find(p => p.module_name === moduleName);
      if (!permission) return false;

      switch (permissionType) {
        case 'view':
          return permission.can_view;
        case 'edit':
          return permission.can_edit;
        case 'delete':
          return permission.can_delete;
        case 'create':
          return permission.can_create;
        default:
          return false;
      }
    }

    // For other roles, use default role-based permissions
    // Vet has full access to veterinary modules
    if (role === 'vet' && ['veterinarija', 'animals', 'treatments'].includes(moduleName)) {
      return true;
    }

    // Tech has access to warehouse/technical modules (but cannot delete)
    if (role === 'tech' && ['technika', 'warehouse', 'stock', 'biocides', 'waste'].includes(moduleName)) {
      return permissionType !== 'delete';
    }

    // Viewer has view-only access to all modules
    if (role === 'viewer' && permissionType === 'view') {
      return true;
    }

    // Farm worker has access to farm-related modules
    if (role === 'farm_worker' && ['darbuotojai_farm', 'worker_portal_farm'].includes(moduleName)) {
      return true;
    }

    // Warehouse worker has access to warehouse-related modules
    if (role === 'warehouse_worker' && ['darbuotojai_warehouse', 'worker_portal_warehouse'].includes(moduleName)) {
      return true;
    }

    // Default: no permission
    return false;
  };

  const clientId = user?.client_id || null;
  const isClientAdmin = user?.role === 'client_admin';
  const isAdmin = user?.role === 'admin' || user?.role === 'client_admin';
  const isVet = user?.role === 'vet';
  const isTech = user?.role === 'tech';
  const isViewer = user?.role === 'viewer';
  const isSecretary = user?.role === 'secretary';
  const isFarmWorker = user?.role === 'farm_worker';
  const isWarehouseWorker = user?.role === 'warehouse_worker';
  const isWorker = isFarmWorker || isWarehouseWorker;
  const isCustomRole = user?.role === 'custom';
  const isFrozen = user?.is_frozen || false;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signOut,
      hasPermission,
      hasModulePermission,
      logAction,
      clientId,
      isClientAdmin,
      isAdmin,
      isVet,
      isTech,
      isViewer,
      isSecretary,
      isFarmWorker,
      isWarehouseWorker,
      isWorker,
      isCustomRole,
      isFrozen
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
