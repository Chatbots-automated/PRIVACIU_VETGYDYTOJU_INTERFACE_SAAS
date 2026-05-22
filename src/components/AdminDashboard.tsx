import { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  TrendingUp, 
  DollarSign, 
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  X,
  Check,
  AlertTriangle,
  Calendar,
  Activity,
  BarChart3,
  CreditCard,
  Mail,
  Phone,
  MapPin,
  FileText,
  ArrowLeft,
  Grid3x3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Client {
  id: string;
  name: string;
  company_code: string | null;
  vat_code: string | null;
  contact_email: string;
  contact_phone: string | null;
  subscription_plan: string;
  subscription_status: 'active' | 'inactive' | 'suspended' | 'cancelled';
  max_farms: number;
  max_users: number;
  is_active: boolean;
  created_at: string;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  address: string | null;
  city: string | null;
  billing_email: string | null;
  vat_registered: boolean;
  next_billing_date: string | null;
  registration_code: string | null;
}

interface ClientStats {
  client_id: string;
  farms_count: number;
  users_count: number;
  animals_count: number;
  treatments_count: number;
}

interface PlatformStats {
  total_clients: number;
  active_clients: number;
  total_farms: number;
  total_users: number;
  total_animals: number;
  monthly_revenue: number;
}

export function AdminDashboard() {
  const { user, isClientAdmin } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientStats, setClientStats] = useState<Map<string, ClientStats>>(new Map());
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [clientPayments, setClientPayments] = useState<any[]>([]);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    days: 30,
    amount: 30,
    notes: '',
  });

  // Form state for add/edit client
  const [formData, setFormData] = useState<{
    name: string;
    company_code: string;
    vat_code: string;
    contact_email: string;
    contact_phone: string;
    address: string;
    city: string;
    subscription_days: number;
    subscription_amount: number;
    vat_registered: boolean;
    vat_rate: number;
  }>({
    name: '',
    company_code: '',
    vat_code: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    subscription_days: 30,
    subscription_amount: 30,
    vat_registered: false,
    vat_rate: 21.00,
  });

  const [registrationCode, setRegistrationCode] = useState<string | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);

  // Generate registration code
  const generateRegistrationCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  useEffect(() => {
    if (!isClientAdmin) return;
    loadData();
  }, [isClientAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadClients(),
        loadPlatformStats(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setClients(data || []);

    // Load stats for each client
    if (data) {
      await loadClientStats(data.map(c => c.id));
    }
  };

  const loadClientStats = async (clientIds: string[]) => {
    const statsMap = new Map<string, ClientStats>();

    for (const clientId of clientIds) {
      // Count farms
      const { count: farmsCount } = await supabase
        .from('farms')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('is_active', true);

      // Count users
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('is_frozen', false);

      // Count animals
      const { count: animalsCount } = await supabase
        .from('animals')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('active', true);

      // Count treatments (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { count: treatmentsCount } = await supabase
        .from('treatments')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .gte('reg_date', thirtyDaysAgo.toISOString().split('T')[0]);

      statsMap.set(clientId, {
        client_id: clientId,
        farms_count: farmsCount || 0,
        users_count: usersCount || 0,
        animals_count: animalsCount || 0,
        treatments_count: treatmentsCount || 0,
      });
    }

    setClientStats(statsMap);
  };

  const loadPlatformStats = async () => {
    const { count: totalClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    const { count: activeClients } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('subscription_status', 'active');

    const { count: totalFarms } = await supabase
      .from('farms')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_frozen', false);

    const { count: totalAnimals } = await supabase
      .from('animals')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);

    setPlatformStats({
      total_clients: totalClients || 0,
      active_clients: activeClients || 0,
      total_farms: totalFarms || 0,
      total_users: totalUsers || 0,
      total_animals: totalAnimals || 0,
      monthly_revenue: 0, // We'll calculate this from billing_invoices if needed
    });
  };

  const handleAddClient = async () => {
    try {
      const regCode = generateRegistrationCode();
      const subscriptionEndDate = new Date(Date.now() + formData.subscription_days * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      // Create client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert({
          name: formData.name,
          company_code: formData.company_code || null,
          vat_code: formData.vat_code || null,
          vat_rate: formData.vat_rate,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone || null,
          address: formData.address || null,
          city: formData.city || null,
          subscription_plan: `custom_${formData.subscription_days}d`,
          subscription_status: 'active',
          max_farms: 999999, // unlimited
          max_users: 999999, // unlimited
          is_active: true,
          vat_registered: formData.vat_registered,
          subscription_start_date: new Date().toISOString().split('T')[0],
          subscription_end_date: subscriptionEndDate,
          registration_code: regCode,
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Create payment record
      const { error: paymentError } = await supabase
        .from('client_payments')
        .insert({
          client_id: clientData.id,
          amount: formData.subscription_amount,
          days_purchased: formData.subscription_days,
          payment_date: new Date().toISOString(),
          notes: 'Initial subscription payment',
          created_by: user?.id || null,
        });

      if (paymentError) throw paymentError;

      setRegistrationCode(regCode);
      setShowRegistrationModal(true);
      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error creating client:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This will delete ALL associated data (farms, users, animals, etc.)')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      alert('Client deleted successfully!');
      loadData();
    } catch (error: any) {
      console.error('Error deleting client:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleToggleActive = async (client: Client) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ is_active: !client.is_active })
        .eq('id', client.id);

      if (error) throw error;

      alert(`Client ${!client.is_active ? 'activated' : 'deactivated'} successfully!`);
      loadData();
    } catch (error: any) {
      console.error('Error updating client:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const loadClientPayments = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('client_payments')
        .select('*')
        .eq('client_id', clientId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setClientPayments(data || []);
    } catch (error: any) {
      console.error('Error loading payments:', error);
    }
  };

  const handleAddPayment = async () => {
    if (!selectedClient) return;

    try {
      // Calculate new end date
      const currentEnd = selectedClient.subscription_end_date 
        ? new Date(selectedClient.subscription_end_date) 
        : new Date();
      const newEnd = new Date(currentEnd.getTime() + paymentFormData.days * 24 * 60 * 60 * 1000);

      // Create payment record
      const { error: paymentError } = await supabase
        .from('client_payments')
        .insert({
          client_id: selectedClient.id,
          amount: paymentFormData.amount,
          days_purchased: paymentFormData.days,
          payment_date: new Date().toISOString(),
          notes: paymentFormData.notes || null,
          created_by: user?.id || null,
        });

      if (paymentError) throw paymentError;

      // Update client subscription end date
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          subscription_end_date: newEnd.toISOString().split('T')[0],
          subscription_status: 'active',
        })
        .eq('id', selectedClient.id);

      if (updateError) throw updateError;

      alert('Payment added successfully!');
      setShowAddPaymentForm(false);
      setPaymentFormData({ days: 30, amount: 30, notes: '' });
      
      // Reload data
      await loadData();
      await loadClientPayments(selectedClient.id);
      
      // Update selected client
      const { data: updated } = await supabase
        .from('clients')
        .select('*')
        .eq('id', selectedClient.id)
        .single();
      if (updated) setSelectedClient(updated);
    } catch (error: any) {
      console.error('Error adding payment:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      company_code: '',
      vat_code: '',
      contact_email: '',
      contact_phone: '',
      address: '',
      city: '',
      subscription_days: 30,
      subscription_amount: 30,
      vat_registered: false,
      vat_rate: 21.00,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const getRegistrationUrl = (code: string) => {
    return `${window.location.origin}/register?code=${code}`;
  };

  const calculateDaysRemaining = (endDate: string | null): number => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getDaysRemainingColor = (days: number): string => {
    if (days <= 0) return 'text-red-600 bg-red-50';
    if (days <= 7) return 'text-amber-600 bg-amber-50';
    if (days <= 30) return 'text-blue-600 bg-blue-50';
    return 'text-green-600 bg-green-50';
  };

  const filteredClients = clients.filter(client => {
    const query = searchQuery.toLowerCase();
    return (
      client.name.toLowerCase().includes(query) ||
      client.contact_email.toLowerCase().includes(query) ||
      client.company_code?.toLowerCase().includes(query) ||
      client.subscription_plan.toLowerCase().includes(query)
    );
  });

  const getSubscriptionBadgeColor = (plan: string) => {
    switch (plan) {
      case 'trial': return 'bg-gray-100 text-gray-700';
      case 'starter': return 'bg-blue-100 text-blue-700';
      case 'professional': return 'bg-purple-100 text-purple-700';
      case 'enterprise': return 'bg-amber-100 text-amber-700';
      case 'komanda': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'inactive': return 'bg-gray-100 text-gray-700';
      case 'suspended': return 'bg-red-100 text-red-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (!isClientAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg border border-red-200">
          <div className="flex items-center gap-4 mb-4">
            <AlertTriangle className="w-12 h-12 text-red-500" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
              <p className="text-gray-600 mt-1">You don't have permission to access this page.</p>
            </div>
          </div>
          <p className="text-sm text-gray-500">Only client administrators can access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Back to Modules"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="hidden sm:inline">Back to Modules</span>
                </button>
                <div className="h-8 w-px bg-gray-300"></div>
                <div className="flex items-center gap-2">
                  <Grid3x3 className="w-6 h-6 text-blue-600" />
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-600 text-sm">Platform-wide client management and analytics</p>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Client</span>
            </button>
          </div>
        </div>

        {/* Platform Stats Cards */}
        {platformStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Clients</p>
              <p className="text-3xl font-bold text-gray-900">{platformStats.total_clients}</p>
              <p className="text-xs text-gray-500 mt-2">{platformStats.active_clients} active</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <Building2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Farms</p>
              <p className="text-3xl font-bold text-gray-900">{platformStats.total_farms}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Total Users</p>
              <p className="text-3xl font-bold text-gray-900">{platformStats.total_users}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-50 rounded-lg">
                  <Activity className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Active Animals</p>
              <p className="text-3xl font-bold text-gray-900">{platformStats.total_animals}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Monthly Revenue</p>
              <p className="text-3xl font-bold text-gray-900">€{platformStats.monthly_revenue}</p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients by name, email, company code, or plan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Subscription</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Usage</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClients.map((client) => {
                  const stats = clientStats.get(client.id);
                  const daysRemaining = calculateDaysRemaining(client.subscription_end_date);
                  const isExpired = daysRemaining <= 0;
                  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7;
                  
                  return (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{client.name}</p>
                          <p className="text-sm text-gray-500">{client.contact_email}</p>
                          {client.company_code && (
                            <p className="text-xs text-gray-400 mt-1">Code: {client.company_code}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getSubscriptionBadgeColor(client.subscription_plan)}`}>
                            {client.subscription_plan}
                          </span>
                          {client.subscription_end_date && (
                            <div>
                              <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${getDaysRemainingColor(daysRemaining)}`}>
                                {isExpired ? (
                                  <>
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Expired {Math.abs(daysRemaining)} days ago
                                  </>
                                ) : (
                                  <>
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                                  </>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Expires: {new Date(client.subscription_end_date).toLocaleDateString('lt-LT')}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(client.subscription_status)}`}>
                          {client.subscription_status}
                        </span>
                        {!client.is_active && (
                          <p className="text-xs text-red-500 mt-1">Inactive</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {stats ? (
                          <div className="text-sm space-y-1">
                            <p className="text-gray-700">{stats.farms_count} farms</p>
                            <p className="text-gray-700">{stats.users_count} users</p>
                            <p className="text-gray-500">{stats.animals_count} animals</p>
                            <p className="text-gray-500">{stats.treatments_count} treatments/30d</p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Loading...</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-700">
                          {new Date(client.created_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedClient(client);
                              setShowDetailsModal(true);
                              loadClientPayments(client.id);
                            }}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(client)}
                            className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${client.is_active ? 'text-green-600' : 'text-gray-400'}`}
                            title={client.is_active ? 'Deactivate' : 'Activate'}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Client"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredClients.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No clients found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search or add a new client</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Add New Client</h3>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Code
                    </label>
                    <input
                      type="text"
                      value={formData.company_code}
                      onChange={(e) => setFormData({ ...formData, company_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      VAT Code
                    </label>
                    <input
                      type="text"
                      value={formData.vat_code}
                      onChange={(e) => setFormData({ ...formData, vat_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Subscription Plan - Custom Days and Amount */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Subscription Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Days *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.subscription_days}
                      onChange={(e) => setFormData({ ...formData, subscription_days: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 30 or 180"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter 7 for trial, 30 for monthly, 180 for 6 months</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Amount (€) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.subscription_amount}
                      onChange={(e) => setFormData({ ...formData, subscription_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 0 or 30 or 150"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter 0 for free trial</p>
                  </div>
                </div>
                
                {/* Quick Presets */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, subscription_days: 7, subscription_amount: 0 })}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                  >
                    7d Trial (€0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, subscription_days: 30, subscription_amount: 30 })}
                    className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg text-xs font-medium text-blue-700 transition-colors"
                  >
                    30d (€30)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, subscription_days: 180, subscription_amount: 150 })}
                    className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 rounded-lg text-xs font-medium text-purple-700 transition-colors"
                  >
                    180d (€150)
                  </button>
                </div>
              </div>

              {/* Plan Summary */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h5 className="text-sm font-semibold text-blue-900 mb-3">Subscription Summary:</h5>
                <div className="space-y-2 text-sm text-blue-800">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-bold">{formData.subscription_days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-bold">€{formData.subscription_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expires:</span>
                    <span className="font-bold">
                      {new Date(Date.now() + formData.subscription_days * 24 * 60 * 60 * 1000).toLocaleDateString('lt-LT')}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-blue-300 text-green-700">
                    <p className="text-xs">✓ Unlimited farms and users</p>
                  </div>
                </div>
              </div>

              {/* VAT Setting */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-900">VAT Registered</p>
                  <p className="text-xs text-gray-500">Include VAT in invoices</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.vat_registered}
                    onChange={(e) => setFormData({ ...formData, vat_registered: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddClient}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Create Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Code Modal */}
      {showRegistrationModal && registrationCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-8 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Client Created Successfully!</h3>
              <p className="text-green-100">Registration code has been generated</p>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Registration Code</h4>
                <div className="bg-gray-900 rounded-lg p-6 font-mono text-center">
                  <p className="text-3xl font-bold text-green-400 tracking-wider mb-2">{registrationCode}</p>
                  <button
                    onClick={() => copyToClipboard(registrationCode)}
                    className="text-xs text-gray-400 hover:text-gray-200 underline"
                  >
                    Click to copy
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Registration URL</h4>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-gray-700 mb-2 break-all">{getRegistrationUrl(registrationCode)}</p>
                  <button
                    onClick={() => copyToClipboard(getRegistrationUrl(registrationCode))}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium underline"
                  >
                    Copy URL
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-semibold text-amber-900 mb-1">Next Steps</h5>
                    <ol className="text-xs text-amber-800 space-y-1 list-decimal list-inside">
                      <li>Send the registration code to the client</li>
                      <li>Client visits the registration URL</li>
                      <li>Client creates their account with email & password</li>
                      <li>They can immediately start using the system</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => {
                  setShowRegistrationModal(false);
                  setRegistrationCode(null);
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Details Modal */}
      {showDetailsModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Client Details</h3>
              <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Client Info */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">{selectedClient.name}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm text-gray-900">{selectedClient.contact_email}</p>
                    </div>
                  </div>
                  {selectedClient.contact_phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-sm text-gray-900">{selectedClient.contact_phone}</p>
                      </div>
                    </div>
                  )}
                  {selectedClient.company_code && (
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Company Code</p>
                        <p className="text-sm text-gray-900">{selectedClient.company_code}</p>
                      </div>
                    </div>
                  )}
                  {selectedClient.vat_code && (
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">VAT Code</p>
                        <p className="text-sm text-gray-900">{selectedClient.vat_code}</p>
                      </div>
                    </div>
                  )}
                  {selectedClient.address && (
                    <div className="flex items-start gap-3 col-span-2">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500">Address</p>
                        <p className="text-sm text-gray-900">
                          {selectedClient.address}
                          {selectedClient.city && `, ${selectedClient.city}`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Subscription Info */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Subscription Details</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Plan</p>
                    <p className="text-lg font-bold text-gray-900 capitalize">{selectedClient.subscription_plan}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <p className="text-lg font-bold text-gray-900 capitalize">{selectedClient.subscription_status}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Active</p>
                    <p className="text-lg font-bold text-gray-900">{selectedClient.is_active ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Max Farms</p>
                    <p className="text-lg font-bold text-gray-900">{selectedClient.max_farms}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">Max Users</p>
                    <p className="text-lg font-bold text-gray-900">{selectedClient.max_users}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 mb-1">VAT Registered</p>
                    <p className="text-lg font-bold text-gray-900">{selectedClient.vat_registered ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>

              {/* Usage Stats */}
              {clientStats.get(selectedClient.id) && (
                <div className="border-t pt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">Current Usage</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-xs text-blue-600 mb-1">Farms</p>
                      <p className="text-2xl font-bold text-blue-900">{clientStats.get(selectedClient.id)?.farms_count}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-xs text-purple-600 mb-1">Users</p>
                      <p className="text-2xl font-bold text-purple-900">{clientStats.get(selectedClient.id)?.users_count}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4">
                      <p className="text-xs text-amber-600 mb-1">Animals</p>
                      <p className="text-2xl font-bold text-amber-900">{clientStats.get(selectedClient.id)?.animals_count}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-xs text-green-600 mb-1">Treatments/30d</p>
                      <p className="text-2xl font-bold text-green-900">{clientStats.get(selectedClient.id)?.treatments_count}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="border-t pt-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Important Dates</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p className="text-gray-900 font-medium">{new Date(selectedClient.created_at).toLocaleDateString()}</p>
                  </div>
                  {selectedClient.subscription_start_date && (
                    <div>
                      <p className="text-gray-500">Subscription Start</p>
                      <p className="text-gray-900 font-medium">{new Date(selectedClient.subscription_start_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {selectedClient.subscription_end_date && (
                    <div>
                      <p className="text-gray-500">Subscription End</p>
                      <p className="text-gray-900 font-medium">{new Date(selectedClient.subscription_end_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {selectedClient.next_billing_date && (
                    <div>
                      <p className="text-gray-500">Next Billing</p>
                      <p className="text-gray-900 font-medium">{new Date(selectedClient.next_billing_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment History */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-700">Payment History</h4>
                  <button
                    onClick={() => setShowAddPaymentForm(!showAddPaymentForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Payment
                  </button>
                </div>

                {/* Add Payment Form */}
                {showAddPaymentForm && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h5 className="text-sm font-semibold text-blue-900 mb-3">Extend Subscription</h5>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Days to Add</label>
                        <input
                          type="number"
                          min="0"
                          value={paymentFormData.days}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, days: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Amount (€)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={paymentFormData.amount}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Notes (Optional)</label>
                        <input
                          type="text"
                          value={paymentFormData.notes}
                          onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="e.g., Bank transfer, Cash payment"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddPayment}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                      >
                        Confirm Payment
                      </button>
                      <button
                        onClick={() => {
                          setShowAddPaymentForm(false);
                          setPaymentFormData({ days: 30, amount: 30, notes: '' });
                        }}
                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-xs text-blue-700 mt-2">
                      New expiration: {new Date(new Date(selectedClient.subscription_end_date || new Date()).getTime() + paymentFormData.days * 24 * 60 * 60 * 1000).toLocaleDateString('lt-LT')}
                    </p>
                  </div>
                )}

                {/* Payments List */}
                {clientPayments.length > 0 ? (
                  <div className="space-y-2">
                    {clientPayments.map((payment) => (
                      <div key={payment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-lg font-bold text-green-600">€{payment.amount.toFixed(2)}</span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                {payment.days_purchased} days
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              {new Date(payment.payment_date).toLocaleDateString('lt-LT')} at {new Date(payment.payment_date).toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {payment.notes && (
                              <p className="text-xs text-gray-500 mt-1">{payment.notes}</p>
                            )}
                          </div>
                          <CreditCard className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No payment history yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
