import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User as UserIcon, Store, Truck, Shield, Search, Edit2, Check, X } from 'lucide-react';

interface UserProfile {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: 'customer' | 'store_owner' | 'delivery_agent' | 'admin';
  createdAt: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [storeCount, setStoreCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<UserProfile['role']>('customer');

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchUsers(), fetchStores()]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const fetchStores = async () => {
    try {
      const storesSnapshot = await getDocs(collection(db, 'stores'));
      setStoreCount(storesSnapshot.size);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserProfile[];
      
      // Sort by created date, newest first
      usersData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleUpdateRole = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: editingRole
      });
      
      setUsers(users.map(u => u.id === userId ? { ...u, role: editingRole } : u));
      setEditingUserId(null);
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role. Check permissions.');
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4 text-purple-500" />;
      case 'store_owner': return <Store className="w-4 h-4 text-orange-500" />;
      case 'delivery_agent': return <Truck className="w-4 h-4 text-blue-500" />;
      default: return <UserIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'store_owner': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'delivery_agent': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const stats = {
    total: users.length,
    customers: users.filter(u => u.role === 'customer').length,
    storeOwners: users.filter(u => u.role === 'store_owner').length,
    stores: storeCount,
    agents: users.filter(u => u.role === 'delivery_agent').length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage users, store owners, and delivery agents.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-gray-100 p-3 rounded-xl">
            <UserIcon className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-orange-50 p-3 rounded-xl">
            <Store className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Active Stores</p>
            <p className="text-2xl font-bold text-gray-900">{stats.stores}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-xl">
            <Truck className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Delivery Agents</p>
            <p className="text-2xl font-bold text-gray-900">{stats.agents}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-50 p-3 rounded-xl">
            <UserIcon className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Customers</p>
            <p className="text-2xl font-bold text-gray-900">{stats.customers}</p>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">User Directory</h2>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-sm font-medium text-gray-500">Name</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-500">Email</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-500">Role</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-500">Joined</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500 font-mono mt-1">{user.id}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4">
                    {editingUserId === user.id ? (
                      <select
                        value={editingRole}
                        onChange={(e) => setEditingRole(e.target.value as UserProfile['role'])}
                        className="block w-full py-1.5 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                      >
                        <option value="customer">Customer</option>
                        <option value="store_owner">Store Owner</option>
                        <option value="delivery_agent">Delivery Agent</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        <span className="capitalize">{user.role.replace('_', ' ')}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingUserId === user.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleUpdateRole(user.id)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingUserId(null)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingUserId(user.id);
                          setEditingRole(user.role);
                        }}
                        className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Edit Role"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
