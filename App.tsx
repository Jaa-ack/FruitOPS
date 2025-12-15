import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Sprout, ShoppingCart, Users, Package, Menu, X } from 'lucide-react';
import { fetchAll, postLog } from './services/api';
import Dashboard from './components/Dashboard';
import Production from './components/Production';
import Inventory from './components/Inventory';
import Orders from './components/Orders';
import CRM from './components/CRM';
import GeminiAdvisor from './components/GeminiAdvisor';
import { FarmLog } from './types';

// Sidebar Component
const Sidebar = ({ mobile, closeMobile }: { mobile?: boolean, closeMobile?: () => void }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const links = [
    { path: '/', name: '總覽', icon: <LayoutDashboard size={20} /> },
    { path: '/production', name: '智慧生產', icon: <Sprout size={20} /> },
    { path: '/inventory', name: '分級庫存', icon: <Package size={20} /> },
    { path: '/orders', name: '訂單管理', icon: <ShoppingCart size={20} /> },
    { path: '/crm', name: '顧客關係', icon: <Users size={20} /> },
  ];

  return (
    <div className={`h-full bg-emerald-900 text-white flex flex-col ${mobile ? 'w-64' : 'w-64 hidden md:flex'}`}>
      <div className="p-6 border-b border-emerald-800 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight">欣欣果園 🍎</h1>
        {mobile && <button onClick={closeMobile}><X size={20}/></button>}
      </div>
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {links.map(link => (
          <Link
            key={link.path}
            to={link.path}
            onClick={closeMobile}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              isActive(link.path) 
                ? 'bg-emerald-700 text-white shadow-lg translate-x-1' 
                : 'text-emerald-200 hover:bg-emerald-800 hover:text-white'
            }`}
          >
            {link.icon}
            <span className="font-medium text-sm">{link.name}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-emerald-800 text-xs text-emerald-400 text-center">
        欣欣果園系統 <br/> v1.0.0
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // Global State (fetched from API)
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Data State
  const [plots, setPlots] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  const handleAddLog = (log: FarmLog) => {
    // Send to API then refresh logs
    postLog(log).then(() => fetchAll('logs').then((r) => setLogs(r)));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAll('plots'), fetchAll('inventory'), fetchAll('orders'), fetchAll('customers'), fetchAll('logs')])
      .then(([p, i, o, c, l]) => {
        setPlots(p); setInventory(i); setOrders(o); setCustomers(c); setLogs(l);
      })
      .catch((err) => console.error('Fetch error', err))
      .finally(() => setLoading(false));
  }, []);

  const globalContext = { plots, inventory, orders, customers, logs };

  return (
    <Router>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
            <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="absolute left-0 top-0 bottom-0 z-50" onClick={e => e.stopPropagation()}>
                     <Sidebar mobile closeMobile={() => setIsMobileMenuOpen(false)} />
                </div>
            </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <header className="h-16 bg-white shadow-sm border-b border-gray-200 flex items-center px-6 justify-between shrink-0 z-10">
            <div className="flex items-center gap-4">
                <button className="md:hidden text-gray-600" onClick={() => setIsMobileMenuOpen(true)}>
                    <Menu size={24} />
                </button>
                <h2 className="text-gray-800 font-semibold md:hidden">欣欣果園</h2>
            </div>
            <div className="flex items-center gap-4">
               <span className="text-sm text-gray-500 hidden md:inline">欣欣果園智慧營運管理系統</span>
               <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border border-emerald-200">
                 S
               </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
            <div className="max-w-7xl mx-auto pb-20">
              <Routes>
                <Route path="/" element={<Dashboard orders={orders} inventory={inventory} />} />
                <Route path="/production" element={<Production plots={plots} logs={logs} onAddLog={handleAddLog} />} />
                <Route path="/inventory" element={<Inventory inventory={inventory} />} />
                <Route path="/orders" element={<Orders orders={orders} />} />
                <Route path="/crm" element={<CRM customers={customers} />} />
              </Routes>
            </div>
          </main>
          
          {/* AI Advisor Floating Action Button */}
          <GeminiAdvisor contextData={globalContext} />
        </div>
      </div>
    </Router>
  );
};

export default App;