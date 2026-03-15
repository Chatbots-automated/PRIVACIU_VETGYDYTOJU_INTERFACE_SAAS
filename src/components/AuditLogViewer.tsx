import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Download, Filter, Search, Calendar, User, RefreshCw } from 'lucide-react';
import { formatDateLT } from '../lib/formatters';
import { translateAction, getActionCategory } from '../lib/actionTranslations';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_data: any;
  new_data: any;
  ip_address: string | null;
  created_at: string;
  user_email: string;
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [lastDays, setLastDays] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const [users, setUsers] = useState<Array<{id: string, email: string}>>([]);
  const [actions, setActions] = useState<string[]>([]);

  const actionCategories = [
    { value: '', label: 'Visos kategorijos' },
    { value: 'treatment', label: 'Gydymas' },
    { value: 'animal', label: 'Gyvūnai' },
    { value: 'inventory', label: 'Atsargos' },
    { value: 'product', label: 'Produktai' },
    { value: 'user', label: 'Vartotojai' },
    { value: 'auth', label: 'Prisijungimas' },
  ];

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, selectedAction, selectedUser, selectedCategory, startDate, endDate, lastDays]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data: logsData, error } = await supabase
        .from('user_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      const { data: usersData } = await supabase.auth.admin.listUsers();

      const enrichedLogs = logsData?.map((log: any) => {
        const user = usersData?.users.find(u => u.id === log.user_id);
        return {
          ...log,
          user_email: user?.email || 'Unknown'
        };
      }) || [];

      setLogs(enrichedLogs);

      const uniqueUsers = Array.from(new Set(enrichedLogs.map((l: AuditLog) => l.user_email)))
        .map(email => {
          const log = enrichedLogs.find((l: AuditLog) => l.user_email === email);
          return { id: log.user_id, email };
        });
      setUsers(uniqueUsers);

      const uniqueActions = Array.from(new Set(enrichedLogs.map((l: AuditLog) => l.action)));
      setActions(uniqueActions);

    } catch (error: any) {
      console.error('Error loading logs:', error);
      alert('Klaida kraunant žurnalą: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryForAction = (action: string): string => {
    if (action.includes('treatment')) return 'treatment';
    if (action.includes('animal')) return 'animal';
    if (action.includes('product') || action.includes('batch')) return 'product';
    if (action.includes('inventory') || action.includes('stock') || action.includes('usage')) return 'inventory';
    if (action.includes('user') || action.includes('freeze') || action.includes('unfreeze')) return 'user';
    if (action.includes('login') || action.includes('logout') || action.includes('auth')) return 'auth';
    return '';
  };

  const filterLogs = () => {
    let filtered = [...logs];

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.table_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(log.new_data).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(log => getCategoryForAction(log.action) === selectedCategory);
    }

    if (selectedAction) {
      filtered = filtered.filter(log => log.action === selectedAction);
    }

    if (selectedUser) {
      filtered = filtered.filter(log => log.user_id === selectedUser);
    }

    if (lastDays) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(lastDays));
      filtered = filtered.filter(log => new Date(log.created_at) >= daysAgo);
    } else {
      if (startDate) {
        filtered = filtered.filter(log => new Date(log.created_at) >= new Date(startDate));
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(log => new Date(log.created_at) <= end);
      }
    }

    setFilteredLogs(filtered);
  };

  const exportToCSV = () => {
    const headers = ['Laikas', 'Vartotojas', 'Veiksmas', 'Lentelė', 'Įrašo ID', 'IP Adresas'];
    const rows = filteredLogs.map(log => [
      formatDateLT(log.created_at),
      log.user_email,
      log.action,
      log.table_name || '',
      log.record_id || '',
      log.ip_address || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedAction('');
    setSelectedUser('');
    setSelectedCategory('');
    setStartDate('');
    setEndDate('');
    setLastDays('');
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('create')) return 'bg-green-100 text-green-800';
    if (action.includes('update')) return 'bg-blue-100 text-blue-800';
    if (action.includes('delete')) return 'bg-red-100 text-red-800';
    if (action.includes('login')) return 'bg-blue-100 text-blue-800';
    if (action.includes('logout')) return 'bg-gray-100 text-gray-800';
    if (action.includes('freeze') || action.includes('unfreeze')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-red-600" />
              Audito žurnalas
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Rodoma {filteredLogs.length} iš {logs.length} įrašų
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadLogs}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atnaujinti
            </button>
            <button
              onClick={exportToCSV}
              disabled={filteredLogs.length === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Eksportuoti CSV
            </button>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Ieškoti..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedAction('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              {actionCategories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              disabled={selectedCategory !== ''}
            >
              <option value="">Visi veiksmai</option>
              {actions.map(action => (
                <option key={action} value={action}>{translateAction(action)}</option>
              ))}
            </select>

            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">Visi vartotojai</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.email}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={lastDays}
              onChange={(e) => {
                setLastDays(e.target.value);
                if (e.target.value) {
                  setStartDate('');
                  setEndDate('');
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">Pasirinkti laikotarpį...</option>
              <option value="1">Paskutinė diena</option>
              <option value="7">Paskutinė savaitė</option>
              <option value="30">Paskutinis mėnuo</option>
              <option value="90">Paskutiniai 3 mėnesiai</option>
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setLastDays('');
              }}
              disabled={lastDays !== ''}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Nuo datos"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setLastDays('');
              }}
              disabled={lastDays !== ''}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Iki datos"
            />
          </div>
        </div>

        {(searchTerm || selectedAction || selectedUser || selectedCategory || startDate || endDate || lastDays) && (
          <div className="mb-4">
            <button
              onClick={clearFilters}
              className="text-sm text-red-600 hover:text-red-700 flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Išvalyti filtrus
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Laikas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vartotojas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veiksmas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lentelė</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalės</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <>
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateLT(log.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{log.user_email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionBadgeColor(log.action)}`}>
                        {translateAction(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.table_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ip_address || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        {expandedLog === log.id ? 'Slėpti' : 'Rodyti'}
                      </button>
                    </td>
                  </tr>
                  {expandedLog === log.id && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 bg-gray-50">
                        <div className="space-y-3">
                          {log.record_id && (
                            <div>
                              <span className="font-medium text-gray-700">Įrašo ID:</span>
                              <span className="ml-2 text-sm text-gray-600 font-mono">{log.record_id}</span>
                            </div>
                          )}
                          {log.new_data && Object.keys(log.new_data).length > 0 && (
                            <div>
                              <span className="font-medium text-gray-700">Duomenys:</span>
                              <pre className="mt-2 p-3 bg-white rounded border border-gray-200 text-xs overflow-x-auto">
                                {JSON.stringify(log.new_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
