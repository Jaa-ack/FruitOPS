import React, { useState } from 'react';
import { Order } from '../types';
import { Search, Filter, Phone, Smartphone, FileText, ShoppingBag, Truck } from 'lucide-react';

interface OrdersProps {
  orders: Order[];
}

const Orders: React.FC<OrdersProps> = ({ orders }) => {
    const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

    const statusOptions: { key: string; label: string }[] = [
        { key: 'All', label: '全部' },
        { key: 'Pending', label: '待處理' },
        { key: 'Confirmed', label: '已確認' },
        { key: 'Shipped', label: '已出貨' },
        { key: 'Completed', label: '已完成' },
    ];

    const mapStatusName = (status: string) => {
        switch(status) {
            case 'Pending': return '待處理';
            case 'Confirmed': return '已確認';
            case 'Shipped': return '已出貨';
            case 'Completed': return '已完成';
            case 'Cancelled': return '已取消';
            default: return status;
        }
    };

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'All' || order.status === filter;
    const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || order.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getChannelIcon = (channel: string) => {
    switch (channel) {
        case 'Line': return <Smartphone size={16} className="text-green-500" />;
        case 'Phone': return <Phone size={16} className="text-blue-500" />;
        case 'Google Form': return <FileText size={16} className="text-purple-500" />;
        case 'Wholesale': return <Truck size={16} className="text-orange-500" />;
        default: return <ShoppingBag size={16} className="text-gray-500" />;
    }
  };

    const mapChannelName = (channel: string) => {
        switch(channel) {
            case 'Line': return 'LINE';
            case 'Phone': return '電話';
            case 'Google Form': return 'Google 表單';
            case 'Wholesale': return '批發';
            case 'Direct': return '直接銷售';
            default: return channel;
        }
    };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
        'Pending': 'bg-yellow-100 text-yellow-800',
        'Confirmed': 'bg-blue-100 text-blue-800',
        'Shipped': 'bg-purple-100 text-purple-800',
        'Completed': 'bg-green-100 text-green-800',
        'Cancelled': 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
            {mapStatusName(status)}
        </span>
    );
  };

  return (
    <div className="space-y-6">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
     <h2 className="text-2xl font-bold text-gray-800">全通路訂單</h2>
        <div className="flex gap-2">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="搜尋訂單..." 
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button className="bg-white border border-gray-300 p-2 rounded-lg text-gray-600 hover:bg-gray-50">
                <Filter size={20} />
            </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
                    {statusOptions.map(status => (
                            <button 
                                key={status.key}
                                onClick={() => setFilter(status.key)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === status.key ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                            >
                                    {status.label}
                            </button>
                    ))}
      </div>

    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-600 text-sm font-semibold border-b border-gray-200">
                    <tr>
                        <th className="p-4">訂單編號</th>
                        <th className="p-4">來源</th>
                        <th className="p-4">客戶名稱</th>
                        <th className="p-4">內容</th>
                        <th className="p-4 text-right">總金額</th>
                        <th className="p-4">狀態</th>
                        <th className="p-4">操作</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map(order => (
                            <tr key={order.id} className="hover:bg-gray-50 group">
                                <td className="p-4 font-mono text-gray-500">{order.id}</td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2" title={order.channel}>
                                        {getChannelIcon(order.channel)}
                                        <span className="hidden md:inline text-gray-600">{mapChannelName(order.channel)}</span>
                                    </div>
                                </td>
                                <td className="p-4 font-medium text-gray-800">{order.customerName}</td>
                                <td className="p-4 text-gray-600">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="text-xs">
                                            {item.productName} ({item.grade}) x {item.qty}
                                        </div>
                                    ))}
                                </td>
                                <td className="p-4 text-right font-mono font-medium">NT$ {order.total.toLocaleString()}</td>
                                <td className="p-4">{getStatusBadge(order.status)}</td>
                                <td className="p-4">
                                    <button className="text-brand-600 hover:text-brand-800 text-xs font-semibold">管理</button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={7} className="p-8 text-center text-gray-400">沒有符合的訂單</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Orders;