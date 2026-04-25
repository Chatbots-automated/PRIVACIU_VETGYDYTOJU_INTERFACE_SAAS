import { useEffect, useState } from 'react';
import { Users, UserPlus, Trash2, Edit2, Shield, Eye, Stethoscope, Wrench, Mail, Calendar, Check, X, Snowflake, Play, Activity, Tractor, Warehouse, Settings, Lock, Unlock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth, UserRole, User } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { requireClientId } from '../lib/clientHelpers';
import { formatDateLT } from '../lib/formatters';

export function UserManagement() {
  const { isAdmin, user: currentUser } = useAuth();
  const { selectedFarm } = useFarm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('viewer');
  const [editWorkLocation, setEditWorkLocation] = useState<string>('warehouse');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('viewer');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserWorkLocation, setNewUserWorkLocation] = useState<string>('warehouse');
  const [newUserRequiresLogin, setNewUserRequiresLogin] = useState(true);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Module permissions state
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permissionsUserId, setPermissionsUserId] = useState<string | null>(null);
  const [modulePermissions, setModulePermissions] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  // Auto-set work_location when role changes
  useEffect(() => {
    if (newUserRole === 'farm_worker') {
      setNewUserWorkLocation('farm');
    } else if (newUserRole === 'warehouse_worker') {
      setNewUserWorkLocation('warehouse');
    }
  }, [newUserRole]);

  useEffect(() => {
    if (editRole === 'farm_worker') {
      setEditWorkLocation('farm');
    } else if (editRole === 'warehouse_worker') {
      setEditWorkLocation('warehouse');
    }
  }, [editRole]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const clientId = requireClientId(currentUser);
      
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setUsers(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string) => {
    try {
      const updateData: any = { role: editRole };
      
      // Add work_location for worker roles
      if (editRole === 'farm_worker' || editRole === 'warehouse_worker') {
        updateData.work_location = editWorkLocation;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      setSuccess('Role updated successfully');
      setEditingUser(null);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (!selectedFarm) {
        throw new Error('Pasirinkite ūkį');
      }

      // Create user with auth
      const { data: newUserId, error: createError } = await supabase.rpc('create_user', {
        p_email: newUserEmail,
        p_password: newUserPassword,
        p_role: newUserRole,
        p_farm_id: selectedFarm.id,
        p_full_name: newUserFullName
      });

      if (createError) throw createError;

      setSuccess('User added successfully');
      setShowAddUser(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('viewer');
      setNewUserFullName('');
      setNewUserWorkLocation('warehouse');
      setNewUserRequiresLogin(true);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add user');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      setSuccess('User deleted successfully');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleFreezeUser = async (userId: string, currentUser: User) => {
    try {
      const { data: adminUser } = await supabase.auth.getUser();
      if (!adminUser) throw new Error('No admin user found');

      const { error } = await supabase.rpc('freeze_user', {
        p_user_id: userId,
        p_admin_id: currentUser.id
      });

      if (error) throw error;

      setSuccess('User frozen successfully');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to freeze user');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUnfreezeUser = async (userId: string, currentUser: User) => {
    try {
      const { data: adminUser } = await supabase.auth.getUser();
      if (!adminUser) throw new Error('No admin user found');

      const { error } = await supabase.rpc('unfreeze_user', {
        p_user_id: userId,
        p_admin_id: currentUser.id
      });

      if (error) throw error;

      setSuccess('User unfrozen successfully');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to unfreeze user');
      setTimeout(() => setError(''), 3000);
    }
  };

  const openPermissionsModal = async (userId: string) => {
    setPermissionsUserId(userId);
    await loadModulePermissions(userId);
    setShowPermissionsModal(true);
  };

  const loadModulePermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_module_permissions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      // Define all available modules
      const allModules = [
        { name: 'darbuotojai', label: 'Darbuotojai' },
        { name: 'technika', label: 'Technika' },
        { name: 'veterinarija', label: 'Veterinarija' },
        { name: 'warehouse', label: 'Sandėlis' },
        { name: 'stock', label: 'Atsargos' },
        { name: 'biocides', label: 'Biocidai' },
        { name: 'waste', label: 'Atliekos' },
        { name: 'animals', label: 'Gyvūnai' },
        { name: 'treatments', label: 'Gydymai' },
        { name: 'reports', label: 'Ataskaitos' },
        { name: 'settings', label: 'Nustatymai' },
      ];

      // Merge with existing permissions
      const permissions = allModules.map(module => {
        const existing = data?.find(p => p.module_name === module.name);
        return {
          module_name: module.name,
          module_label: module.label,
          can_view: existing?.can_view || false,
          can_edit: existing?.can_edit || false,
          can_delete: existing?.can_delete || false,
          can_create: existing?.can_create || false,
          id: existing?.id || null,
        };
      });

      setModulePermissions(permissions);
    } catch (err: any) {
      setError(err.message || 'Failed to load permissions');
      setTimeout(() => setError(''), 3000);
    }
  };

  const updateModulePermission = (moduleName: string, field: string, value: boolean) => {
    setModulePermissions(prev =>
      prev.map(p =>
        p.module_name === moduleName ? { ...p, [field]: value } : p
      )
    );
  };

  const saveModulePermissions = async () => {
    if (!permissionsUserId) return;

    try {
      // Delete existing permissions
      await supabase
        .from('user_module_permissions')
        .delete()
        .eq('user_id', permissionsUserId);

      // Insert only permissions that have at least one permission enabled
      const clientId = requireClientId(currentUser);
      
      const permissionsToInsert = modulePermissions
        .filter(p => p.can_view || p.can_edit || p.can_delete || p.can_create)
        .map(p => ({
          client_id: clientId,
          user_id: permissionsUserId,
          module_name: p.module_name,
          can_view: p.can_view,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
          can_create: p.can_create,
        }));

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from('user_module_permissions')
          .insert(permissionsToInsert);

        if (error) throw error;
      }

      setSuccess('Permissions saved successfully');
      setShowPermissionsModal(false);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save permissions');
      setTimeout(() => setError(''), 3000);
    }
  };

  const fetchAuditLogs = async (userId?: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_audit_logs', {
        p_user_id: userId || null,
        p_limit: 100,
        p_offset: 0
      });

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch audit logs');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'vet':
        return <Stethoscope className="w-4 h-4" />;
      case 'tech':
        return <Wrench className="w-4 h-4" />;
      case 'viewer':
        return <Eye className="w-4 h-4" />;
      case 'farm_worker':
        return <Tractor className="w-4 h-4" />;
      case 'warehouse_worker':
        return <Warehouse className="w-4 h-4" />;
      case 'custom':
        return <Settings className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'vet':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'tech':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'viewer':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'farm_worker':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warehouse_worker':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'custom':
        return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Administratorius';
      case 'vet':
        return 'Veterinaras';
      case 'tech':
        return 'Technikas';
      case 'viewer':
        return 'Stebėtojas';
      case 'farm_worker':
        return 'Fermos darbuotojas';
      case 'warehouse_worker':
        return 'Technikos kiemo darbuotojas';
      case 'custom':
        return 'Pasirinktinė prieiga';
    }
  };

  const getActionLabel = (action: string) => {
    const actionMap: { [key: string]: string } = {
      'user_login': 'Prisijungė prie sistemos',
      'user_logout': 'Atsijungė nuo sistemos',
      'navigate_to_page': 'Peržiūrėjo puslapį',
      'create_treatment': 'Sukūrė gydymą',
      'update_treatment': 'Atnaujino gydymą',
      'delete_treatment': 'Ištrynė gydymą',
      'create_usage_items': 'Panaudojo medikamentus',
      'create_animal': 'Pridėjo gyvūną',
      'update_animal': 'Atnaujino gyvūno duomenis',
      'delete_animal': 'Ištrynė gyvūną',
      'view_animal_edit': 'Žiūrėjo gyvūno redagavimą',
      'create_visit': 'Sukūrė vizitą',
      'update_visit': 'Atnaujino vizitą',
      'delete_visit': 'Ištrynė vizitą',
      'create_product': 'Pridėjo produktą',
      'update_product': 'Atnaujino produktą',
      'delete_product': 'Ištrynė produktą',
      'receive_stock': 'Priėmė atsargas',
      'create_biocide_usage': 'Panaudojo biocidą',
      'create_owner_med_admin': 'Užregistravo savininko vaistus',
      'create_supplier': 'Pridėjo tiekėją',
      'update_supplier': 'Atnaujino tiekėją',
      'delete_supplier': 'Ištrynė tiekėją',
      'freeze_user': 'Užšaldė vartotoją',
      'unfreeze_user': 'Atšildė vartotoją',
    };
    return actionMap[action] || action;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = formatDateLT(dateString);
    const timeStr = date.toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${dateStr} ${timeStr}`;
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need admin permissions to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vartotojų Valdymas</h1>
            <p className="text-gray-600 mt-1">Valdyti sistemos vartotojus ir jų roles</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddUser(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          <span>Pridėti Vartotoją</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <X className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Pridėti Naują Vartotoją</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilnas vardas
                </label>
                <input
                  type="text"
                  value={newUserFullName}
                  onChange={(e) => setNewUserFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  El. paštas
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slaptažodis
                </label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rolė
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="viewer">Stebėtojas (View Only)</option>
                  <option value="tech">Technikas (Limited Access)</option>
                  <option value="vet">Veterinaras (Full Access)</option>
                  <option value="admin">Administratorius (All Access)</option>
                  <option value="custom">Pasirinktinė prieiga (Custom Permissions)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Pridėti
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUser(false);
                    setNewUserEmail('');
                    setNewUserPassword('');
                    setNewUserRole('viewer');
                    setNewUserFullName('');
                    setNewUserRequiresLogin(true);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Atšaukti
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Vartotojas
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Rolė
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Statusas
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Sukurta
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Veiksmai
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${user.is_frozen ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name || user.email}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingUser === user.id ? (
                        <div className="space-y-2">
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as UserRole)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="viewer">Stebėtojas</option>
                            <option value="tech">Technikas</option>
                            <option value="vet">Veterinaras</option>
                            <option value="admin">Administratorius</option>
                            <option value="custom">Pasirinktinė prieiga</option>
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border ${getRoleColor(user.role)}`}>
                            {getRoleIcon(user.role)}
                            {getRoleLabel(user.role)}
                          </span>
                          {(user.role === 'farm_worker' || user.role === 'warehouse_worker') && user.work_location && (
                            <div className="text-xs text-gray-500 ml-1">
                              📍 {user.work_location === 'farm' ? 'Ferma' : 'Technikos kiemas'}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.is_frozen ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border bg-red-100 text-red-800 border-red-200">
                          <Snowflake className="w-4 h-4" />
                          Užšaldyta
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border bg-green-100 text-green-800 border-green-200">
                          <Play className="w-4 h-4" />
                          Aktyvi
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {formatDateLT(user.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {editingUser === user.id ? (
                          <>
                            <button
                              onClick={() => handleUpdateRole(user.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Save"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Cancel"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingUser(user.id);
                                setEditRole(user.role);
                                setEditWorkLocation(user.work_location || 'warehouse');
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Role"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            {user.role === 'custom' && (
                              <button
                                onClick={() => openPermissionsModal(user.id)}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Manage Module Permissions"
                              >
                                <Lock className="w-5 h-5" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedUserId(user.id);
                                setShowAuditLogs(true);
                                fetchAuditLogs(user.id);
                              }}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="View Audit Logs"
                            >
                              <Activity className="w-5 h-5" />
                            </button>
                            {user.is_frozen ? (
                              <button
                                onClick={() => currentUser && handleUnfreezeUser(user.id, currentUser)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Unfreeze User"
                              >
                                <Play className="w-5 h-5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => currentUser && handleFreezeUser(user.id, currentUser)}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                title="Freeze User"
                              >
                                <Snowflake className="w-5 h-5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Rolių Aprašymas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-red-600" />
              <h4 className="font-semibold text-gray-900">Administratorius</h4>
            </div>
            <p className="text-sm text-gray-600">Pilna prieiga prie visų funkcijų ir vartotojų valdymo</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="w-4 h-4 text-blue-600" />
              <h4 className="font-semibold text-gray-900">Veterinaras</h4>
            </div>
            <p className="text-sm text-gray-600">Pilna prieiga prie veterinarijos sistemų ir gydymo įrašų</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-amber-600" />
              <h4 className="font-semibold text-gray-900">Technikas</h4>
            </div>
            <p className="text-sm text-gray-600">Atsargų priėmimas, biocidai, atliekos; negali trinti įrašų</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-gray-600" />
              <h4 className="font-semibold text-gray-900">Stebėtojas</h4>
            </div>
            <p className="text-sm text-gray-600">Tik peržiūros prieiga, negali keisti duomenų</p>
          </div>
        </div>
      </div>

      {showAuditLogs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-900">Vartotojo Veiksmų Istorija</h2>
              </div>
              <button
                onClick={() => {
                  setShowAuditLogs(false);
                  setSelectedUserId(null);
                  setAuditLogs([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {auditLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Veiksmų istorija nerasata</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="bg-white rounded-lg p-4 border-l-4 border-purple-500 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded-lg">
                              {getActionLabel(log.action)}
                            </span>
                            <span className="text-sm text-gray-600 font-medium">
                              {log.user_name || log.user_email}
                            </span>
                          </div>
                          {log.new_data && typeof log.new_data === 'object' && (
                            <div className="mt-2 text-sm text-gray-700 space-y-1">
                              {log.new_data.page && log.new_data.label && (
                                <p>
                                  <span className="font-medium">Puslapis:</span> {log.new_data.label}
                                </p>
                              )}
                              {log.new_data.animal_tag && (
                                <p>
                                  <span className="font-medium">Gyvūno auskaras:</span> {log.new_data.animal_tag}
                                </p>
                              )}
                              {log.new_data.disease_name && (
                                <p>
                                  <span className="font-medium">Liga:</span> {log.new_data.disease_name}
                                </p>
                              )}
                              {log.new_data.tag_no && (
                                <p>
                                  <span className="font-medium">Auskaras:</span> {log.new_data.tag_no}
                                </p>
                              )}
                              {log.new_data.species && (
                                <p>
                                  <span className="font-medium">Rūšis:</span> {log.new_data.species}
                                </p>
                              )}
                              {log.new_data.holder_name && (
                                <p>
                                  <span className="font-medium">Savininkas:</span> {log.new_data.holder_name}
                                </p>
                              )}
                              {log.new_data.vet_name && (
                                <p>
                                  <span className="font-medium">Veterinaras:</span> {log.new_data.vet_name}
                                </p>
                              )}
                              {log.new_data.reg_date && (
                                <p>
                                  <span className="font-medium">Registracijos data:</span> {formatDateLT(log.new_data.reg_date)}
                                </p>
                              )}
                              {log.new_data.clinical_diagnosis && (
                                <p>
                                  <span className="font-medium">Diagnozė:</span> {log.new_data.clinical_diagnosis}
                                </p>
                              )}
                              {log.new_data.outcome && (
                                <p>
                                  <span className="font-medium">Rezultatas:</span> {log.new_data.outcome}
                                </p>
                              )}
                              {log.new_data.count !== undefined && (
                                <p>
                                  <span className="font-medium">Panaudotų vaistų kiekis:</span> {log.new_data.count}
                                </p>
                              )}
                              {log.new_data.visit_type && (
                                <p>
                                  <span className="font-medium">Vizito tipas:</span> {log.new_data.visit_type}
                                </p>
                              )}
                              {log.new_data.status && (
                                <p>
                                  <span className="font-medium">Statusas:</span> {log.new_data.status}
                                </p>
                              )}
                              {log.new_data.name && (
                                <p>
                                  <span className="font-medium">Pavadinimas:</span> {log.new_data.name}
                                </p>
                              )}
                              {log.new_data.category && (
                                <p>
                                  <span className="font-medium">Kategorija:</span> {log.new_data.category}
                                </p>
                              )}
                              {log.new_data.received_qty && (
                                <p>
                                  <span className="font-medium">Priimtas kiekis:</span> {log.new_data.received_qty}
                                </p>
                              )}
                              {log.new_data.lot && (
                                <p>
                                  <span className="font-medium">Partija:</span> {log.new_data.lot}
                                </p>
                              )}
                              {log.new_data.doc_number && (
                                <p>
                                  <span className="font-medium">Dokumento nr.:</span> {log.new_data.doc_number}
                                </p>
                              )}
                              {log.new_data.qty && (
                                <p>
                                  <span className="font-medium">Kiekis:</span> {log.new_data.qty}
                                </p>
                              )}
                              {log.new_data.used_by_name && (
                                <p>
                                  <span className="font-medium">Panaudojo:</span> {log.new_data.used_by_name}
                                </p>
                              )}
                              {log.new_data.animal_ident && (
                                <p>
                                  <span className="font-medium">Gyvūno identifikacija:</span> {log.new_data.animal_ident}
                                </p>
                              )}
                              {log.new_data.first_admin_date && (
                                <p>
                                  <span className="font-medium">Pirmasis davimo laikas:</span> {formatDateLT(log.new_data.first_admin_date)}
                                </p>
                              )}
                            </div>
                          )}
                          {log.old_data && log.action.includes('update') && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                Rodyti detalius duomenis
                              </summary>
                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <div className="text-xs">
                                  <p className="font-medium text-gray-700 mb-1">Seni duomenys:</p>
                                  <pre className="bg-gray-50 p-2 rounded border border-gray-200 overflow-x-auto text-xs">
                                    {JSON.stringify(log.old_data, null, 2)}
                                  </pre>
                                </div>
                                <div className="text-xs">
                                  <p className="font-medium text-gray-700 mb-1">Nauji duomenys:</p>
                                  <pre className="bg-gray-50 p-2 rounded border border-gray-200 overflow-x-auto text-xs">
                                    {JSON.stringify(log.new_data, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </details>
                          )}
                        </div>
                        <div className="text-right text-sm flex flex-col items-end gap-1">
                          <span className="text-gray-900 font-medium">{formatDateTime(log.created_at)}</span>
                          {log.table_name && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {log.table_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Module Permissions Modal */}
      {showPermissionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-3">
                <Lock className="w-6 h-6 text-gray-700" />
                <h2 className="text-2xl font-bold text-gray-900">Modulių Prieigos Valdymas</h2>
              </div>
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-700" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-gray-600 mb-6">
                Pasirinkite, kuriuos modulius vartotojas gali pasiekti ir kokias operacijas atlikti.
              </p>

              <div className="space-y-4">
                {modulePermissions.map((module) => (
                  <div
                    key={module.module_name}
                    className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 text-lg">{module.module_label}</h3>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {module.module_name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={module.can_view}
                          onChange={(e) => updateModulePermission(module.module_name, 'can_view', e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          Žiūrėti
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={module.can_create}
                          onChange={(e) => updateModulePermission(module.module_name, 'can_create', e.target.checked)}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-green-600 transition-colors flex items-center gap-1">
                          <UserPlus className="w-4 h-4" />
                          Kurti
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={module.can_edit}
                          onChange={(e) => updateModulePermission(module.module_name, 'can_edit', e.target.checked)}
                          className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-amber-600 transition-colors flex items-center gap-1">
                          <Edit2 className="w-4 h-4" />
                          Redaguoti
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={module.can_delete}
                          onChange={(e) => updateModulePermission(module.module_name, 'can_delete', e.target.checked)}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-red-600 transition-colors flex items-center gap-1">
                          <Trash2 className="w-4 h-4" />
                          Trinti
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowPermissionsModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Atšaukti
              </button>
              <button
                onClick={saveModulePermissions}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Išsaugoti Prieigos Teises
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
