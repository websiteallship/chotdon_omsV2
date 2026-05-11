
import React, { useState } from 'react';
import {
    LayoutDashboard,
    Inbox,
    PhoneCall,
    CheckCircle2,
    XCircle,
    FileSpreadsheet,
    Package,
    Settings,
    Search,
    Filter,
    RefreshCw,
    Bell,
    ChevronDown,
    User,
    Save,
    Check,
    ChevronLeft,
    ChevronRight,
    X,
    MoreHorizontal,
    Calendar,
    Download,
    Clock,
    UploadCloud,
    FileText,
    AlertCircle,
    Link,
    Users,
    Database,
    ListTree,
    ToggleRight,
    Trash2,
    PlusCircle,
    History,
    ArrowDownToLine,
    ArrowUpFromLine
} from 'lucide-react';

// --- MOCK DATA ---
const BRANDS = [
    { id: 'b1', name: 'ZAPATI (Giày da)' },
    { id: 'b2', name: 'BRAND_B (Thời trang nữ)' },
];

const INITIAL_PRODUCTS = [
    { sku: 'D005CS40', name: 'Giày D005 Cá Sấu', size: '40', price: 269000, active: true },
    { sku: 'D005CS41', name: 'Giày D005 Cá Sấu', size: '41', price: 269000, active: true },
    { sku: 'D005TR40', name: 'Giày D005 Trắng', size: '40', price: 250000, active: true },
    { sku: 'D005TR41', name: 'Giày D005 Trắng', size: '41', price: 250000, active: true },
    { sku: 'D006DE39', name: 'Giày D006 Đen', size: '39', price: 320000, active: false },
];

const INITIAL_MAPPINGS = [
    { id: 'created_at', sysName: 'Thời gian tạo (created_at)', sheetCol: 'Thời gian', required: true, isCustom: false },
    { id: 'customer_name', sysName: 'Họ và tên (customer_name)', sheetCol: 'Tên', required: true, isCustom: false },
    { id: 'phone', sysName: 'Số điện thoại (phone)', sheetCol: 'SĐT', required: true, isCustom: false },
    { id: 'raw_product', sysName: 'Sản phẩm thô (raw_product)', sheetCol: 'Sản phẩm', required: true, isCustom: false },
    { id: 'address', sysName: 'Địa chỉ đầy đủ (address)', sheetCol: 'Địa chỉ', required: false, isCustom: false },
    { id: 'note', sysName: 'Ghi chú (note)', sheetCol: 'Ghi chú', required: false, isCustom: false },
    { id: 'quantity', sysName: 'Số lượng (quantity)', sheetCol: 'Số lượng', required: false, isCustom: false },
    { id: 'color', sysName: 'Màu sắc (color)', sheetCol: 'Màu sắc', required: false, isCustom: false },
];

const INITIAL_HISTORY = [
    { id: 'log_1', type: 'export', source: 'Template_Import_OR.xlsx', date: '2026-05-11 09:30', user: 'Nhân Viên Sale 1', result: 'Thành công (45 đơn)' },
    { id: 'log_2', type: 'import_sku', source: 'Danh_sach_SKU_Zapati.xlsx', date: '2026-05-10 14:15', user: 'Quản Lý Trọng', result: 'Thành công (120 SKU)' },
    { id: 'log_3', type: 'sync_sheet', source: 'Google Sheet (Leads)', date: '2026-05-10 08:00', user: 'Hệ thống (Auto)', result: 'Thành công (15 leads mới)' },
];

const STATUS_CONFIG = {
    new: { label: 'Mới', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    called_1: { label: 'Gọi lần 1', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    called_2: { label: 'Gọi lần 2', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    confirmed: { label: 'Chốt đơn', color: 'bg-green-100 text-green-700 border-green-200' },
    failed: { label: 'Thất bại', color: 'bg-red-100 text-red-700 border-red-200' },
    exported: { label: 'Đã xuất Excel', color: 'bg-purple-100 text-purple-700 border-purple-200' },
};

// Generate more data for pagination testing
const generateMockOrders = () => {
    const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng'];
    const middleNames = ['Văn', 'Thị', 'Hoàng', 'Minh', 'Ngọc', 'Hữu', 'Đức', 'Thanh', 'Hải', 'Tuấn'];
    const lastNames = ['Anh', 'Bé', 'Cường', 'Dũng', 'Em', 'Phong', 'Hà', 'Hưng', 'Linh', 'Khánh'];

    const statuses = ['new', 'called_1', 'called_2', 'confirmed', 'failed', 'confirmed']; // Add more 'confirmed' for export testing

    return Array.from({ length: 45 }, (_, i) => {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const createdTime = `2026-05-${(11 - (i % 5)).toString().padStart(2, '0')} 0${8 + (i % 4)}:${(i * 13) % 60}`;
        const mappedSku = i % 2 === 0 ? 'D005CS40' : 'D005TR40';

        return {
            id: `ORD-${(i + 1).toString().padStart(3, '0')}`,
            customer_name: `${firstNames[i % 10]} ${middleNames[(i * 2) % 10]} ${lastNames[(i * 3) % 10]}`,
            phone: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
            address: `${Math.floor(Math.random() * 500) + 1} Đường Nguyễn Trãi`,
            province: i % 2 === 0 ? 'TP. Hồ Chí Minh' : 'Hà Nội',
            district: i % 2 === 0 ? 'Quận 1' : 'Quận Thanh Xuân',
            ward: i % 2 === 0 ? 'Phường Nguyễn Cư Trinh' : 'Phường Thượng Đình',
            raw_product: `Giày D005 - Size ${40 + (i % 3)} - ${i % 2 === 0 ? 'Cá Sấu' : 'Trắng'}`,
            product_sku: status === 'confirmed' ? mappedSku : (i % 4 === 0 ? '' : mappedSku), // Confirmed orders MUST have SKU
            quantity: (i % 3) + 1,
            price: i % 2 === 0 ? 269000 : 250000,
            note: i % 5 === 0 ? 'Gọi lại sau 5h chiều' : '',
            status: status,
            created_at: createdTime,
            history: [
                ...(status !== 'new' ? [{
                    time: `2026-05-11 10:15`,
                    user: 'Nhân Viên Sale 1',
                    detail: `Cập nhật trạng thái: ${STATUS_CONFIG[status].label}`
                }] : []),
                {
                    time: createdTime,
                    user: 'System',
                    detail: 'Import từ Google Sheet'
                }
            ]
        };
    }).sort((a, b) => b.id.localeCompare(a.id));
};

const INITIAL_ORDERS = generateMockOrders();

// --- COMPONENTS ---

const Badge = ({ status }) => {
    const config = STATUS_CONFIG[status] || { label: 'Unknown', color: 'bg-gray-100 text-gray-700' };
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
            {config.label}
        </span>
    );
};

export default function App() {
    // Navigation State
    const [currentView, setCurrentView] = useState('leads'); // 'leads', 'export', 'products', 'users', 'history', 'settings_data', 'settings_brand'
    const [activeBrand, setActiveBrand] = useState(BRANDS[0].id);

    // Data State
    const [orders, setOrders] = useState(INITIAL_ORDERS);
    const [products, setProducts] = useState(INITIAL_PRODUCTS);
    const [mappings, setMappings] = useState(INITIAL_MAPPINGS);
    const [historyLogs, setHistoryLogs] = useState(INITIAL_HISTORY);
    const [searchQuery, setSearchQuery] = useState('');

    // Feature States
    const [statusFilter, setStatusFilter] = useState('all');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isImportingSKU, setIsImportingSKU] = useState(false);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    // Drawer & Selection State
    const [selectedOrderId, setSelectedOrderId] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);

    // Filter Data (Leads View)
    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.phone.includes(searchQuery) ||
            o.id.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesStatus = true;
        if (statusFilter === 'calling') {
            matchesStatus = ['called_1', 'called_2'].includes(o.status);
        } else if (statusFilter !== 'all') {
            matchesStatus = o.status === statusFilter;
        }

        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const selectedOrder = orders.find(o => o.id === selectedOrderId);
    const selectedIndex = filteredOrders.findIndex(o => o.id === selectedOrderId);

    // Column Mapping Actions
    const updateMapping = (id, field, value) => {
        setMappings(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    const addCustomMapping = () => {
        const newId = `custom_${Date.now()}`;
        setMappings(prev => [...prev, { id: newId, sysName: '', sheetCol: '', required: false, isCustom: true }]);
    };

    const removeMapping = (id) => {
        setMappings(prev => prev.filter(m => m.id !== id));
    };

    // Data Actions
    const handleUpdateOrder = (field, value) => {
        setOrders(prev => prev.map(o => {
            if (o.id === selectedOrderId) {
                const updatedOrder = { ...o, [field]: value };
                if (field === 'status' && o.status !== value) {
                    const now = new Date();
                    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

                    const newLog = {
                        time: timeStr,
                        user: 'Nhân Viên Sale 1',
                        detail: `Đổi trạng thái thành: ${STATUS_CONFIG[value].label}`
                    };
                    updatedOrder.history = [newLog, ...(o.history || [])];
                }
                return updatedOrder;
            }
            return o;
        }));
    };

    const handleConfirmOrder = () => {
        if (!selectedOrder.product_sku) {
            alert("Vui lòng Map SKU trước khi Chốt đơn!");
            return;
        }
        handleUpdateOrder('status', 'confirmed');
        setSelectedOrderId(null); // Close drawer on success
    };

    const navigateOrder = (direction) => {
        if (direction === 'prev' && selectedIndex > 0) {
            setSelectedOrderId(filteredOrders[selectedIndex - 1].id);
        } else if (direction === 'next' && selectedIndex < filteredOrders.length - 1) {
            setSelectedOrderId(filteredOrders[selectedIndex + 1].id);
        }
    };

    const handleSyncData = () => {
        if (isSyncing) return;
        setIsSyncing(true);
        setTimeout(() => {
            const now = new Date();
            const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const newOrder = {
                id: `ORD-NEW-${Math.floor(Math.random() * 1000)}`,
                customer_name: 'Khách Hàng Mới Sync',
                phone: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
                address: 'Dữ liệu mới tải về từ Google Sheet',
                province: 'TP. Hồ Chí Minh', district: 'Quận 1', ward: 'Phường Bến Nghé',
                raw_product: 'D005 - Mới Sync', product_sku: '', quantity: 1, price: 269000, note: '',
                status: 'new', created_at: timeStr,
                history: [{ time: timeStr, user: 'System', detail: 'Import từ Google Sheet' }]
            };

            setOrders(prev => [newOrder, ...prev]);

            // Ghi log vào Lịch sử
            setHistoryLogs(prev => [{
                id: `log_${Date.now()}`,
                type: 'sync_sheet',
                source: 'Google Sheet (Leads)',
                date: timeStr,
                user: 'Nhân Viên Sale 1',
                result: 'Thành công (1 leads mới)'
            }, ...prev]);

            setIsSyncing(false);
            setStatusFilter('new');
            setCurrentPage(1);
            setCurrentView('leads');
        }, 1500);
    };

    const handleExportExcel = () => {
        const readyToExport = orders.filter(o => o.status === 'confirmed');
        setIsExporting(true);
        setTimeout(() => {
            const now = new Date();
            const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            // Mock converting confirmed orders to exported
            setOrders(prev => prev.map(o => o.status === 'confirmed' ? { ...o, status: 'exported' } : o));

            // Ghi log vào Lịch sử
            setHistoryLogs(prev => [{
                id: `log_${Date.now()}`,
                type: 'export',
                source: `ZAPATI_OR_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_001.xlsx`,
                date: timeStr,
                user: 'Nhân Viên Sale 1',
                result: `Thành công (${readyToExport.length} đơn)`
            }, ...prev]);

            setIsExporting(false);
            alert("Đã tạo và tải xuống file Excel (Template_Import_OR.xlsx) thành công!");
        }, 2000);
    };

    const handleImportSKU = () => {
        setIsImportingSKU(true);
        setTimeout(() => {
            const now = new Date();
            const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            const newSkus = [
                { sku: 'NEW-001', name: 'Sản phẩm mới import 1', size: 'M', price: 150000, active: true },
                { sku: 'NEW-002', name: 'Sản phẩm mới import 2', size: 'L', price: 150000, active: true },
            ];
            setProducts(prev => [...newSkus, ...prev]);

            // Ghi log vào Lịch sử
            setHistoryLogs(prev => [{
                id: `log_${Date.now()}`,
                type: 'import_sku',
                source: `File_Import_SKU_Zapati.xlsx`,
                date: timeStr,
                user: 'Nhân Viên Sale 1',
                result: `Thành công (2 SKU mới)`
            }, ...prev]);

            setIsImportingSKU(false);
            alert("Import thành công 2 SKU mới!");
        }, 1500);
    };

    const getCount = (type) => {
        if (type === 'all') return orders.length;
        if (type === 'calling') return orders.filter(o => ['called_1', 'called_2'].includes(o.status)).length;
        return orders.filter(o => o.status === type).length;
    };

    // Views Renderers
    const renderLeadsView = () => (
        <main className="flex-1 flex flex-col min-w-0 bg-white relative h-full overflow-hidden">
            {/* Table Toolbar */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-white z-10 shrink-0">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <h1 className="text-xl font-bold text-slate-800 mr-2">Danh sách Leads</h1>
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                        {filteredOrders.length} records
                    </span>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm Mã, Tên, SĐT..."
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        />
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                            className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm font-medium transition-colors ${statusFilter !== 'all' ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Filter className="h-4 w-4" />
                            {statusFilter === 'all' ? 'Lọc' : 'Đang lọc...'}
                        </button>
                        {showFilterDropdown && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowFilterDropdown(false)}></div>
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">Trạng thái</div>
                                    <button onClick={() => { setStatusFilter('all'); setShowFilterDropdown(false); setCurrentPage(1); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50">Tất cả</button>
                                    <button onClick={() => { setStatusFilter('new'); setShowFilterDropdown(false); setCurrentPage(1); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50">Mới</button>
                                    <button onClick={() => { setStatusFilter('calling'); setShowFilterDropdown(false); setCurrentPage(1); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50">Đang gọi</button>
                                    <button onClick={() => { setStatusFilter('confirmed'); setShowFilterDropdown(false); setCurrentPage(1); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50">Chốt đơn</button>
                                    <button onClick={() => { setStatusFilter('exported'); setShowFilterDropdown(false); setCurrentPage(1); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50">Đã xuất Excel</button>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>

                    <button
                        onClick={handleSyncData}
                        disabled={isSyncing}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${isSyncing ? 'bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200' : 'bg-slate-800 text-white hover:bg-slate-700 shadow-sm'}`}
                    >
                        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin text-slate-400' : ''}`} />
                        {isSyncing ? 'Đang tải...' : 'Sync Data'}
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-auto bg-slate-50/50 relative">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Mã Đơn</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-36">Ngày tạo</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Khách hàng</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Điện thoại</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sản phẩm (Raw)</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-36">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {paginatedOrders.length === 0 ? (
                            <tr><td colSpan="6" className="py-12 text-center text-slate-500">Không tìm thấy dữ liệu phù hợp.</td></tr>
                        ) : (
                            paginatedOrders.map((order) => (
                                <tr
                                    key={order.id}
                                    onClick={() => setSelectedOrderId(order.id)}
                                    className={`hover:bg-blue-50/50 transition-colors cursor-pointer group ${selectedOrderId === order.id ? 'bg-blue-50/80 ring-1 ring-inset ring-blue-200' : ''}`}
                                >
                                    <td className="py-3 px-4 text-sm font-medium text-slate-600">{order.id}</td>
                                    <td className="py-3 px-4 text-sm text-slate-500">
                                        <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" />{order.created_at.split(' ')[0]}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">{order.created_at.split(' ')[1]}</div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="font-semibold text-slate-800">{order.customer_name}</div>
                                        <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{order.address}</div>
                                    </td>
                                    <td className="py-3 px-4 text-sm font-medium text-slate-700">{order.phone}</td>
                                    <td className="py-3 px-4">
                                        <div className="text-sm text-slate-700 truncate max-w-[250px]">{order.raw_product}</div>
                                        {!order.product_sku && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded mt-1">CHƯA MAP SKU</span>}
                                    </td>
                                    <td className="py-3 px-4"><Badge status={order.status} /></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="h-14 border-t border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
                <div className="text-sm text-slate-500">
                    Hiển thị <span className="font-medium text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> đến <span className="font-medium text-slate-800">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> trong số <span className="font-medium text-slate-800">{filteredOrders.length}</span> kết quả
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Hiển thị:</span>
                        <select className="border border-slate-300 rounded text-sm px-2 py-1 focus:ring-blue-500 outline-none" value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}>
                            <option value={15}>15</option>
                            <option value={30}>30</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft className="h-5 w-5 text-slate-600" /></button>
                        <div className="px-2 text-sm font-medium text-slate-700">Trang {currentPage} / {totalPages || 1}</div>
                        <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight className="h-5 w-5 text-slate-600" /></button>
                    </div>
                </div>
            </div>
        </main>
    );

    const renderExportView = () => {
        const readyToExport = orders.filter(o => o.status === 'confirmed');

        return (
            <main className="flex-1 overflow-auto bg-slate-50 p-6">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-slate-800">Xuất file Template Import OR</h1>
                        <p className="text-slate-500 text-sm mt-1">Gom các đơn hàng đã chốt để tải xuống Excel theo chuẩn hệ thống kho.</p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Từ ngày</label>
                                    <input type="date" className="border border-slate-300 rounded-md px-3 py-1.5 text-sm" defaultValue="2026-05-01" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Đến ngày</label>
                                    <input type="date" className="border border-slate-300 rounded-md px-3 py-1.5 text-sm" defaultValue="2026-05-11" />
                                </div>
                                <div className="pt-5">
                                    <button className="bg-white border border-slate-300 text-slate-700 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-slate-50">Tìm kiếm</button>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 flex flex-col items-center justify-center text-center">
                            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Đã tìm thấy {readyToExport.length} đơn hàng sẵn sàng xuất</h3>
                            <p className="text-slate-500 text-sm mb-6 max-w-md">Các đơn hàng này đã được nhân viên Sale chốt, map đầy đủ SKU và sẵn sàng đẩy sang hệ thống Fulfillment qua file Excel.</p>

                            <button
                                onClick={handleExportExcel}
                                disabled={isExporting || readyToExport.length === 0}
                                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-white shadow-md transition-all ${isExporting ? 'bg-slate-400 cursor-not-allowed' :
                                        readyToExport.length === 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:shadow-lg'
                                    }`}
                            >
                                {isExporting ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                                {isExporting ? 'Đang tạo file Excel...' : `Tải xuống ${readyToExport.length} Đơn (Template OR)`}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200">
                            <h3 className="font-bold text-slate-800">Preview: Danh sách đơn chờ xuất</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Mã Đơn</th>
                                        <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Khách hàng</th>
                                        <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Mã SKU</th>
                                        <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">SL</th>
                                        <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Tổng thu hộ (COD)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {readyToExport.slice(0, 5).map(o => (
                                        <tr key={o.id} className="hover:bg-slate-50">
                                            <td className="py-3 px-4 text-sm font-medium">{o.id}</td>
                                            <td className="py-3 px-4 text-sm">{o.customer_name}<br /><span className="text-xs text-slate-400">{o.phone}</span></td>
                                            <td className="py-3 px-4 text-sm font-semibold text-blue-600">{o.product_sku}</td>
                                            <td className="py-3 px-4 text-sm">{o.quantity}</td>
                                            <td className="py-3 px-4 text-sm font-medium">{(o.quantity * o.price).toLocaleString()} đ</td>
                                        </tr>
                                    ))}
                                    {readyToExport.length > 5 && (
                                        <tr><td colSpan="5" className="py-3 text-center text-sm text-slate-500 italic bg-slate-50/50">...và {readyToExport.length - 5} đơn khác</td></tr>
                                    )}
                                    {readyToExport.length === 0 && (
                                        <tr><td colSpan="5" className="py-8 text-center text-slate-500">Không có đơn nào ở trạng thái "Chốt đơn"</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        );
    };

    const renderProductsView = () => {
        return (
            <main className="flex-1 overflow-auto bg-slate-50 p-6">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Quản lý Sản phẩm (SKU)</h1>
                            <p className="text-slate-500 text-sm mt-1">Danh mục SKU dùng để Map đơn hàng cho Brand hiện tại.</p>
                        </div>
                        <button
                            onClick={() => document.getElementById('sku-import-trigger').click()}
                            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                        >
                            <UploadCloud className="h-4 w-4" /> Import Excel
                        </button>
                    </div>

                    {/* Fake Import Zone */}
                    <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-8 text-center mb-6 hover:bg-slate-50 transition-colors">
                        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                            {isImportingSKU ? <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" /> : <FileText className="h-6 w-6 text-blue-600" />}
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 mb-1">Kéo thả file Excel vào đây để Import</h3>
                        <p className="text-xs text-slate-500 mb-4">Hỗ trợ file .xlsx, .csv. File import cần đúng định dạng Template Danh sách SKU.</p>
                        <button
                            id="sku-import-trigger"
                            onClick={handleImportSKU}
                            disabled={isImportingSKU}
                            className="text-sm text-blue-600 font-semibold border border-blue-200 bg-blue-50 px-4 py-1.5 rounded-md hover:bg-blue-100 transition"
                        >
                            {isImportingSKU ? 'Đang đọc file...' : 'Chọn file từ máy tính'}
                        </button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-800">Danh sách SKU ({products.length})</h3>
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input type="text" placeholder="Tìm tên, mã SKU..." className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-blue-500" />
                            </div>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Mã SKU</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Tên sản phẩm</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Kích cỡ</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Giá (VNĐ)</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase text-center">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {products.map((p, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="py-3 px-5 text-sm font-bold text-blue-700">{p.sku}</td>
                                        <td className="py-3 px-5 text-sm font-medium text-slate-700">{p.name}</td>
                                        <td className="py-3 px-5 text-sm text-slate-600">{p.size}</td>
                                        <td className="py-3 px-5 text-sm">{p.price.toLocaleString()} đ</td>
                                        <td className="py-3 px-5 text-center">
                                            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${p.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {p.active ? 'Đang bán' : 'Ngừng bán'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        );
    };

    const renderUsersView = () => {
        return (
            <main className="flex-1 overflow-auto bg-slate-50 p-6">
                <div className="max-w-5xl mx-auto space-y-6">
                    <div className="flex items-end justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Quản lý Nhân sự</h1>
                            <p className="text-slate-500 text-sm mt-1">Quản lý danh sách nhân viên Sale và Brand Admin thuộc Brand hiện tại.</p>
                        </div>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4" /> Thêm thành viên
                        </button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-800">Danh sách thành viên (2)</h3>
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input type="text" placeholder="Tìm tên, email..." className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-blue-500" />
                            </div>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Họ và tên</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Email</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Vai trò (Role)</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase text-center">Trạng thái</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr className="hover:bg-slate-50">
                                    <td className="py-3 px-5 text-sm font-bold text-slate-800">Quản Lý Trọng</td>
                                    <td className="py-3 px-5 text-sm text-slate-600">trong@salegenius.vn</td>
                                    <td className="py-3 px-5">
                                        <span className="px-2.5 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded uppercase tracking-wider">Brand Admin</span>
                                    </td>
                                    <td className="py-3 px-5 text-center">
                                        <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">Đang hoạt động</span>
                                    </td>
                                    <td className="py-3 px-5 text-right">
                                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Sửa</button>
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50">
                                    <td className="py-3 px-5 text-sm font-bold text-slate-800">Nhân Viên Sale 1</td>
                                    <td className="py-3 px-5 text-sm text-slate-600">sale1@salegenius.vn</td>
                                    <td className="py-3 px-5">
                                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded uppercase tracking-wider">Sale</span>
                                    </td>
                                    <td className="py-3 px-5 text-center">
                                        <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">Đang hoạt động</span>
                                    </td>
                                    <td className="py-3 px-5 text-right">
                                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Sửa</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        );
    };

    const renderSettingsDataView = () => {
        return (
            <main className="flex-1 overflow-auto bg-slate-50 p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Cài đặt hệ thống</h1>
                        <p className="text-slate-500 text-sm mt-1">Quản lý cấu hình, tích hợp và phân quyền cho Brand hiện hành.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* LEFT COLUMN: Data & Integration (佔 2/3) */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Google Sheet Integration */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                                    <div className="flex items-center gap-2">
                                        <Database className="h-5 w-5 text-blue-600" />
                                        <h3 className="font-bold text-slate-800">Nguồn dữ liệu (Google Sheets)</h3>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                                        <ToggleRight className="h-6 w-6 text-green-500" />
                                        Auto-sync (15 phút/lần)
                                    </div>
                                </div>
                                <div className="p-5 space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Google Sheet ID</label>
                                            <input type="text" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 bg-slate-50" defaultValue="1BxiMVs0XRYFgwnLEx..." />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Data Range (Vùng dữ liệu)</label>
                                            <input type="text" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 bg-slate-50" defaultValue="Sheet1!A:U" />
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 p-3.5 rounded-lg border border-blue-100 flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                        <div className="text-sm text-blue-800">
                                            <p className="font-semibold">Service Account Access Required</p>
                                            <p className="mt-1">Để hệ thống tự động đọc được dữ liệu, hãy share quyền Viewer của file Sheet trên cho email: <br /><strong className="select-all bg-white px-1.5 py-0.5 rounded border border-blue-200 mt-1 inline-block">sync-bot@salegenius-prod.iam.gserviceaccount.com</strong></p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Column Mapping */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2 bg-slate-50/50">
                                    <ListTree className="h-5 w-5 text-blue-600" />
                                    <h3 className="font-bold text-slate-800">Mapping Cột Dữ Liệu</h3>
                                </div>
                                <div className="p-0">
                                    <p className="px-5 py-3 text-sm text-slate-500 border-b border-slate-100 bg-white">
                                        Khai báo tên cột (header) trong file Google Sheet tương ứng với các trường dữ liệu của hệ thống.
                                    </p>
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="py-2.5 px-5 text-xs font-semibold text-slate-500 uppercase w-1/2">Trường hệ thống (DB)</th>
                                                <th className="py-2.5 px-5 text-xs font-semibold text-slate-500 uppercase w-1/2">Tên cột trong Google Sheet</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {mappings.map(m => (
                                                <tr key={m.id} className="group hover:bg-slate-50 transition-colors">
                                                    <td className="py-2.5 px-5">
                                                        {m.isCustom ? (
                                                            <input
                                                                type="text"
                                                                placeholder="Tên trường (vd: utm_source)"
                                                                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-sm focus:ring-blue-500 bg-yellow-50/50 font-medium"
                                                                value={m.sysName}
                                                                onChange={(e) => updateMapping(m.id, 'sysName', e.target.value)}
                                                            />
                                                        ) : (
                                                            <span className="text-sm font-medium text-slate-700">
                                                                {m.sysName} {m.required && <span className="text-red-500">*</span>}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-5 flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Tên cột trong Sheet"
                                                            className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-sm focus:ring-blue-500"
                                                            value={m.sheetCol}
                                                            onChange={(e) => updateMapping(m.id, 'sheetCol', e.target.value)}
                                                        />
                                                        {m.isCustom ? (
                                                            <button
                                                                onClick={() => removeMapping(m.id)}
                                                                className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                                                title="Xoá trường này"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        ) : (
                                                            <div className="w-7"></div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="px-5 py-3 bg-white border-t border-slate-100">
                                        <button
                                            onClick={addCustomMapping}
                                            className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors"
                                        >
                                            <PlusCircle className="h-4 w-4" /> Thêm trường tuỳ chỉnh (Custom field)
                                        </button>
                                    </div>
                                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                                        <button className="bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-700 transition shadow-sm flex items-center gap-2">
                                            <Save className="h-4 w-4" /> Lưu cấu hình Data
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
                                <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2 bg-slate-50/50">
                                    <Settings className="h-5 w-5 text-blue-600" />
                                    <h3 className="font-bold text-slate-800">Cấu hình xuất kho</h3>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tên Brand</label>
                                        <input type="text" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-slate-50 font-medium text-slate-700" disabled defaultValue={BRANDS.find(b => b.id === activeBrand)?.name} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Mã Kho xuất hàng mặc định</label>
                                        <input type="text" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500" defaultValue="KHO_HCM_ZAPATI" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Kênh bán hàng mặc định</label>
                                        <select className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500">
                                            <option>Facebook/Landing Page</option>
                                            <option>Tiktok Shop</option>
                                            <option>Shopee</option>
                                        </select>
                                    </div>
                                    <button className="w-full bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md text-sm font-bold hover:bg-slate-50 transition shadow-sm">
                                        Cập nhật
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    };

    const renderSettingsBrandView = () => {
        return (
            <main className="flex-1 overflow-auto bg-slate-50 p-6">
                <div className="max-w-5xl mx-auto space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Cấu hình Brand & Export</h1>
                        <p className="text-slate-500 text-sm mt-1">Cấu hình thông tin chuẩn dùng để tự động điền vào file Template Import OR khi xuất dữ liệu.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Cột trái: Thông tin xuất kho chung */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full">
                                <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2 bg-slate-50/50">
                                    <Settings className="h-5 w-5 text-blue-600" />
                                    <h3 className="font-bold text-slate-800">Thông tin xuất kho</h3>
                                </div>
                                <div className="p-5 space-y-5">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tên Brand</label>
                                        <input type="text" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-slate-50 font-medium text-slate-700" disabled defaultValue={BRANDS.find(b => b.id === activeBrand)?.name} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Mã Kho (WMS)</label>
                                        <input type="text" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 font-medium text-blue-700" defaultValue="KHO_HCM_ZAPATI" />
                                        <p className="text-[11px] text-slate-500 mt-1">Áp dụng cho cột "Mã kho".</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Kênh bán hàng mặc định</label>
                                        <select className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500">
                                            <option>Facebook/Landing Page</option>
                                            <option>Tiktok Shop</option>
                                            <option>Shopee</option>
                                        </select>
                                        <p className="text-[11px] text-slate-500 mt-1">Áp dụng cho cột "Kênh bán hàng".</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cột phải: Giá trị mặc định Template OR */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
                                <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2 bg-slate-50/50">
                                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                                    <h3 className="font-bold text-slate-800">Giá trị mặc định Template Excel (OR)</h3>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <p className="text-sm text-slate-500 mb-6">
                                        Các tham số dưới đây sẽ được <strong>tự động điền cố định</strong> vào tất cả các dòng đơn hàng khi hệ thống sinh file Excel Template Import OR cho kho.
                                    </p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 flex-1">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Loại (Type)</label>
                                            <input type="text" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500" defaultValue="Order" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">BizType</label>
                                            <input type="text" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500" defaultValue="B2C" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Mã gói vận chuyển</label>
                                            <input type="text" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500" defaultValue="STD" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cần đóng gói</label>
                                            <select className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500">
                                                <option value="YES">YES</option>
                                                <option value="NO">NO</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Yêu cầu chứng từ</label>
                                            <select className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500">
                                                <option value="NO">NO</option>
                                                <option value="YES">YES</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Lấy hàng tại kho</label>
                                            <select className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500">
                                                <option value="YES">YES</option>
                                                <option value="NO">NO</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
                                        <button className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-sm flex items-center gap-2">
                                            <Check className="h-4 w-4" /> Lưu cấu hình Export
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    };

    const renderHistoryView = () => {
        return (
            <main className="flex-1 overflow-auto bg-slate-50 p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex items-end justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Lịch sử xuất/nhập file</h1>
                            <p className="text-slate-500 text-sm mt-1">Theo dõi các hoạt động đồng bộ Google Sheet, nhập SKU và xuất đơn hàng ra Excel.</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 flex-wrap gap-4">
                            <h3 className="font-bold text-slate-800">Lịch sử thao tác</h3>
                            <div className="flex items-center gap-3">
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input type="text" placeholder="Tìm tên file, người dùng..." className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-blue-500" />
                                </div>
                                <select className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:ring-blue-500 bg-white">
                                    <option value="all">Tất cả hoạt động</option>
                                    <option value="export">Xuất Excel (OR)</option>
                                    <option value="import_sku">Nhập danh sách SKU</option>
                                    <option value="sync_sheet">Đồng bộ Google Sheet</option>
                                </select>
                            </div>
                        </div>

                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase w-48">Thời gian</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Hành động</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase">File / Nguồn dữ liệu</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase">Người thực hiện</th>
                                    <th className="py-3 px-5 text-xs font-semibold text-slate-500 uppercase text-right">Kết quả</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {historyLogs.map(log => {
                                    let ActionIcon, actionLabel, badgeClass;
                                    if (log.type === 'export') {
                                        ActionIcon = ArrowUpFromLine;
                                        actionLabel = 'Xuất file Excel';
                                        badgeClass = 'bg-purple-100 text-purple-700 border-purple-200';
                                    } else if (log.type === 'import_sku') {
                                        ActionIcon = ArrowDownToLine;
                                        actionLabel = 'Nhập file SKU';
                                        badgeClass = 'bg-green-100 text-green-700 border-green-200';
                                    } else {
                                        ActionIcon = RefreshCw;
                                        actionLabel = 'Sync Google Sheet';
                                        badgeClass = 'bg-blue-100 text-blue-700 border-blue-200';
                                    }

                                    return (
                                        <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                                    <Calendar className="h-4 w-4 text-slate-400" />
                                                    {log.date}
                                                </div>
                                            </td>
                                            <td className="py-4 px-5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${badgeClass}`}>
                                                    <ActionIcon className="h-3.5 w-3.5" /> {actionLabel}
                                                </span>
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-slate-400" />
                                                    <span className="text-sm font-semibold text-slate-800">{log.source}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-5 text-sm text-slate-600">
                                                {log.user}
                                            </td>
                                            <td className="py-4 px-5 text-right">
                                                <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-md">
                                                    <CheckCircle2 className="h-4 w-4" /> {log.result}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {historyLogs.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="py-12 text-center text-slate-500">
                                            Chưa có lịch sử hoạt động nào.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 relative overflow-hidden">

            {/* HEADER */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shrink-0">
                <div className="flex items-center gap-8">
                    <div className="font-bold text-xl text-blue-700 flex items-center gap-2">
                        <Package className="h-6 w-6" />
                        <span>SaleGenius</span>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 transition px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer">
                        <span className="text-sm font-medium text-slate-600">Brand:</span>
                        <select
                            className="bg-transparent border-none text-sm font-bold text-slate-800 focus:ring-0 cursor-pointer outline-none"
                            value={activeBrand}
                            onChange={(e) => setActiveBrand(e.target.value)}
                        >
                            {BRANDS.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="p-2 text-slate-400 hover:text-slate-600 relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full"></span>
                    </button>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded-md">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">NV</div>
                        <div className="text-sm hidden md:block">
                            <p className="font-semibold leading-tight">Nhân Viên Sale 1</p>
                            <p className="text-xs text-slate-500">Zapati Team</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* SIDEBAR */}
                <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between hidden lg:flex shrink-0">
                    <div className="py-4">
                        <div className="px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Chính</div>
                        <nav className="space-y-1 px-2">
                            <button
                                onClick={() => setCurrentView('leads')}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'leads' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
                            >
                                <Inbox className="h-4 w-4" /> Bảng Leads
                            </button>
                        </nav>

                        <div className="px-4 mt-6 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Lọc nhanh (Leads)</div>
                        <nav className="space-y-1 px-2 opacity-90">
                            <button onClick={() => { setStatusFilter('all'); setCurrentPage(1); setCurrentView('leads'); }} className={`w-full flex items-center justify-between px-3 py-1.5 text-sm font-medium rounded-md ${currentView === 'leads' && statusFilter === 'all' ? 'text-blue-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>
                                <div className="flex items-center gap-3">Tất cả</div><span className="bg-slate-100 py-0.5 px-2 rounded-full text-[10px]">{getCount('all')}</span>
                            </button>
                            <button onClick={() => { setStatusFilter('new'); setCurrentPage(1); setCurrentView('leads'); }} className={`w-full flex items-center justify-between px-3 py-1.5 text-sm font-medium rounded-md ${currentView === 'leads' && statusFilter === 'new' ? 'text-blue-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>
                                <div className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Mới</div><span className="bg-slate-100 py-0.5 px-2 rounded-full text-[10px]">{getCount('new')}</span>
                            </button>
                            <button onClick={() => { setStatusFilter('confirmed'); setCurrentPage(1); setCurrentView('leads'); }} className={`w-full flex items-center justify-between px-3 py-1.5 text-sm font-medium rounded-md ${currentView === 'leads' && statusFilter === 'confirmed' ? 'text-blue-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>
                                <div className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-green-500" /> Chốt đơn</div><span className="bg-slate-100 py-0.5 px-2 rounded-full text-[10px]">{getCount('confirmed')}</span>
                            </button>
                        </nav>

                        <div className="px-4 mt-8 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Quản lý</div>
                        <nav className="space-y-1 px-2">
                            <button
                                onClick={() => setCurrentView('export')}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'export' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
                            >
                                <FileSpreadsheet className="h-4 w-4" /> Xuất Excel (OR)
                            </button>
                            <button
                                onClick={() => setCurrentView('products')}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'products' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
                            >
                                <Package className="h-4 w-4" /> Sản phẩm (SKU)
                            </button>
                            <button
                                onClick={() => setCurrentView('users')}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'users' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
                            >
                                <Users className="h-4 w-4" /> Nhân sự Brand
                            </button>
                            <button
                                onClick={() => setCurrentView('history')}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'history' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
                            >
                                <History className="h-4 w-4" /> Lịch sử xuất/nhập
                            </button>
                        </nav>

                        <div className="px-4 mt-8 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Hệ thống</div>
                        <nav className="space-y-1 px-2">
                            <button
                                onClick={() => setCurrentView('settings_data')}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'settings_data' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
                            >
                                <Database className="h-4 w-4" /> Nguồn dữ liệu (Sheet)
                            </button>
                            <button
                                onClick={() => setCurrentView('settings_brand')}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentView === 'settings_brand' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}`}
                            >
                                <Settings className="h-4 w-4" /> Cấu hình Brand
                            </button>
                        </nav>
                    </div>
                </aside>

                {/* DYNAMIC MAIN CONTENT */}
                {currentView === 'leads' && renderLeadsView()}
                {currentView === 'export' && renderExportView()}
                {currentView === 'products' && renderProductsView()}
                {currentView === 'users' && renderUsersView()}
                {currentView === 'history' && renderHistoryView()}
                {currentView === 'settings_data' && renderSettingsDataView()}
                {currentView === 'settings_brand' && renderSettingsBrandView()}

            </div>

            {/* --- SLIDE-OUT DRAWER FOR DETAIL VIEW (Only active in Leads view) --- */}
            {currentView === 'leads' && selectedOrderId && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedOrderId(null)} />
            )}

            <div className={`fixed inset-y-0 right-0 w-full max-w-[600px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${currentView === 'leads' && selectedOrderId ? 'translate-x-0' : 'translate-x-full'}`}>
                {selectedOrder && (
                    <>
                        {/* Drawer Header */}
                        <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setSelectedOrderId(null)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200">
                                    <X className="h-5 w-5" />
                                </button>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 leading-tight">Đơn {selectedOrder.id}</h2>
                                    <span className="text-xs text-slate-500">Cập nhật: {selectedOrder.created_at}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <select
                                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 bg-white"
                                    value={selectedOrder.status}
                                    onChange={(e) => handleUpdateOrder('status', e.target.value)}
                                >
                                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                        <option key={key} value={key}>{config.label}</option>
                                    ))}
                                </select>

                                <div className="flex border border-slate-200 rounded-lg overflow-hidden ml-2 bg-white shadow-sm">
                                    <button onClick={() => navigateOrder('prev')} disabled={selectedIndex <= 0} className="p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button>
                                    <div className="w-px bg-slate-200"></div>
                                    <button onClick={() => navigateOrder('next')} disabled={selectedIndex >= filteredOrders.length - 1} className="p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button>
                                </div>
                            </div>
                        </div>

                        {/* Drawer Body (Scrollable) */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">

                            {/* Customer Info Card */}
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                                    <User className="h-4 w-4 text-blue-500" /> Khách hàng
                                </h3>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Họ và tên</label>
                                            <input type="text" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500" value={selectedOrder.customer_name} onChange={(e) => handleUpdateOrder('customer_name', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Số điện thoại</label>
                                            <div className="flex gap-2">
                                                <input type="text" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 font-bold text-slate-800" value={selectedOrder.phone} onChange={(e) => handleUpdateOrder('phone', e.target.value)} />
                                                <button className="bg-green-100 text-green-700 px-3 rounded-md hover:bg-green-200 shrink-0"><PhoneCall className="h-4 w-4" /></button>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Địa chỉ giao hàng (Số nhà, tên đường)</label>
                                        <textarea rows="2" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 resize-none" value={selectedOrder.address} onChange={(e) => handleUpdateOrder('address', e.target.value)} />
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div><label className="block text-xs font-semibold text-slate-500 mb-1">Tỉnh/Thành</label><input type="text" className="w-full border rounded-md px-3 py-2 text-sm" value={selectedOrder.province || ''} onChange={(e) => handleUpdateOrder('province', e.target.value)} /></div>
                                        <div><label className="block text-xs font-semibold text-slate-500 mb-1">Quận/Huyện</label><input type="text" className="w-full border rounded-md px-3 py-2 text-sm" value={selectedOrder.district || ''} onChange={(e) => handleUpdateOrder('district', e.target.value)} /></div>
                                        <div><label className="block text-xs font-semibold text-slate-500 mb-1">Phường/Xã</label><input type="text" className="w-full border rounded-md px-3 py-2 text-sm" value={selectedOrder.ward || ''} onChange={(e) => handleUpdateOrder('ward', e.target.value)} /></div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Ghi chú của Sale</label>
                                        <textarea rows="2" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-yellow-50 focus:ring-blue-500 resize-none" value={selectedOrder.note} onChange={(e) => handleUpdateOrder('note', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* Product Info Card */}
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                                    <Package className="h-4 w-4 text-blue-500" /> Thông tin Sản phẩm
                                </h3>

                                <div className="p-3 bg-slate-100/50 rounded-lg mb-5 border border-slate-100 text-sm">
                                    <span className="text-slate-500 block text-xs mb-1">Nguồn: Landing Page (Data thô)</span>
                                    <strong className="text-slate-800">{selectedOrder.raw_product}</strong>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">Map với SKU hệ thống <span className="text-red-500">*</span></label>
                                        <select
                                            className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-blue-500 ${!selectedOrder.product_sku ? 'border-orange-400 bg-orange-50 ring-4 ring-orange-50' : 'border-slate-300'}`}
                                            value={selectedOrder.product_sku}
                                            onChange={(e) => handleUpdateOrder('product_sku', e.target.value)}
                                        >
                                            <option value="">-- Sale chọn SKU chính xác --</option>
                                            {products.filter(p => p.active).map(p => (
                                                <option key={p.sku} value={p.sku}>{p.sku} - {p.name} (Size: {p.size})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Số lượng</label>
                                            <input type="number" className="w-full border rounded-md px-3 py-2 text-sm focus:ring-blue-500" value={selectedOrder.quantity} onChange={(e) => handleUpdateOrder('quantity', parseInt(e.target.value) || 1)} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Giá bán (VNĐ)</label>
                                            <input type="number" className="w-full border rounded-md px-3 py-2 text-sm focus:ring-blue-500 font-medium" value={selectedOrder.price} onChange={(e) => handleUpdateOrder('price', parseInt(e.target.value) || 0)} />
                                        </div>
                                    </div>

                                    <div className="pt-4 mt-2 border-t border-slate-100 flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                                        <span className="text-sm font-semibold text-slate-600">Tổng thu hộ (COD):</span>
                                        <span className="text-xl font-black text-blue-700">{(selectedOrder.quantity * selectedOrder.price).toLocaleString()} đ</span>
                                    </div>
                                </div>
                            </div>

                            {/* Activity History */}
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                                    <Clock className="h-4 w-4 text-blue-500" /> Lịch sử cập nhật
                                </h3>
                                <div className="relative pl-4 border-l-2 border-slate-100 space-y-5 ml-2 mt-2">
                                    {selectedOrder.history?.map((log, idx) => (
                                        <div key={idx} className="relative">
                                            <div className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-400"></div>
                                            <p className="text-sm text-slate-800 font-medium">{log.detail}</p>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium">
                                                <span className="text-blue-600">{log.time}</span><span>•</span><span>{log.user}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!selectedOrder.history || selectedOrder.history.length === 0) && <div className="text-sm text-slate-500 italic">Chưa có lịch sử cập nhật.</div>}
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer Actions */}
                        <div className="p-5 border-t border-slate-200 bg-white grid grid-cols-3 gap-3 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <button onClick={() => handleUpdateOrder('status', 'failed')} className="col-span-1 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm"><XCircle className="h-4 w-4" /> Báo hủy</button>
                            <button className="col-span-1 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm"><Save className="h-4 w-4" /> Lưu</button>
                            <button onClick={handleConfirmOrder} className="col-span-3 mt-1 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md flex items-center justify-center gap-2 text-base"><Check className="h-5 w-5" /> XÁC NHẬN CHỐT ĐƠN</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}