import React, { useState, useMemo } from 'react';
import { User, RoadReport, ReportStatus, Severity } from '../types';
import ReportCard from './ReportCard';
import ReportMap from './ReportMap';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DepartmentDashboardProps {
    user: User;
    reports: RoadReport[];
    onStatusUpdate: (id: string, status: ReportStatus, repairMediaUrl?: string) => Promise<void>;
}

type CorpTab = 'TOTAL' | 'CRITICAL' | 'RESOLVED' | 'PENDING';

const DepartmentDashboard: React.FC<DepartmentDashboardProps> = ({ user, reports, onStatusUpdate }) => {
    const [activeTab, setActiveTab] = useState<CorpTab>('TOTAL');
    const [showMap, setShowMap] = useState(false);

    // Stats Logic
    const stats = useMemo(() => {
        let relevant = reports;
        if (user.department) {
            relevant = reports.filter(r => r.department === user.department);
        }

        return {
            total: relevant.length,
            critical: relevant.filter(r => r.status !== ReportStatus.FIXED && (r.analysis?.severity ?? 0) >= Severity.SEVERE).length,
            resolved: relevant.filter(r => r.status === ReportStatus.FIXED).length,
            pending: relevant.filter(r => r.status === ReportStatus.PENDING || r.status === ReportStatus.IN_PROGRESS || r.status === ReportStatus.ASSIGNED_TO_WARD).length,
            potholes: relevant.filter(r => r.analysis?.damageTypes?.some(t => t.toLowerCase().includes('pothole'))).length,
            cracks: relevant.filter(r => r.analysis?.damageTypes?.some(t => t.toLowerCase().includes('crack'))).length
        };
    }, [reports, user]);

    // Filtering Logic
    const filteredReports = useMemo(() => {
        let relevant = reports;
        if (user.department) {
            relevant = reports.filter(r => r.department === user.department);
        }

        let result = [];
        switch (activeTab) {
            case 'CRITICAL': result = relevant.filter(r => r.status !== ReportStatus.FIXED && (r.analysis?.severity ?? 0) >= Severity.SEVERE); break;
            case 'RESOLVED': result = relevant.filter(r => r.status === ReportStatus.FIXED); break;
            case 'PENDING': result = relevant.filter(r => r.status === ReportStatus.PENDING || r.status === ReportStatus.IN_PROGRESS || r.status === ReportStatus.ASSIGNED_TO_WARD); break;
            default: result = relevant;
        }
        // Sort Newest First
        return result.sort((a, b) => b.timestamp - a.timestamp);
    }, [reports, user, activeTab]);

    return (
        <div className="space-y-10 animate-fade-in">
            {/* Header - Department Style (Blue/Slate) */}
            <div className="relative rounded-xl overflow-hidden p-8 md:p-10 shadow-sm border border-gray-100 bg-gradient-to-r from-blue-50 to-white">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-5 pointer-events-none">
                    <i className="fas fa-building-columns text-[180px] text-gray-800"></i>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border bg-blue-100 text-blue-800 border-blue-200">
                            <i className="fas fa-user-shield mr-2"></i>
                            Department Zone
                        </div>
                        <h2 className="text-4xl font-serif font-bold text-gray-900 mb-2">
                            Department Dashboard
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl">
                            Welcome back, <span className="font-bold text-[#1E3A8A]">{user.username}</span>.
                            Monitor, analyze and approve infrastructure repairs.
                        </p>
                    </div>
                </div>
                {/* DEBUG INFO */}
                <div className="text-xs bg-gray-100 p-2 mt-2 font-mono">
                    Dept: {user.department || 'All'} | Role: {user.role}
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                    { label: 'Total Reports', value: stats.total, color: 'bg-blue-600' },
                    { label: 'Critical Issues', value: stats.critical, color: 'bg-red-600' },
                    { label: 'Resolved Cases', value: stats.resolved, color: 'bg-green-600' },
                    { label: 'Pending Action', value: stats.pending, color: 'bg-orange-500' },
                    { label: 'Total Potholes', value: stats.potholes, color: 'bg-gray-700' },
                    { label: 'Road Cracks', value: stats.cracks, color: 'bg-amber-700' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded p-6 shadow-sm flex flex-col hover:shadow-md transition-shadow">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">{stat.label}</span>
                        <div className="flex items-end justify-between">
                            <span className="text-4xl font-bold text-gray-900">{stat.value}</span>
                            <div className={`h-2 w-14 rounded ${stat.color}`}></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts & Approvals */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded p-8 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-bold text-gray-900">Resolution Efficiency</h3>
                    </div>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Critical', value: stats.critical },
                                        { name: 'Resolved', value: stats.resolved },
                                        { name: 'Pending', value: stats.pending }
                                    ]}
                                    innerRadius={70} outerRadius={100} paddingAngle={0} dataKey="value"
                                >
                                    <Cell fill="#DC2626" />
                                    <Cell fill="#16A34A" />
                                    <Cell fill="#F97316" />
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded p-8 shadow-sm flex flex-col justify-center items-center text-center">
                    <div className="mb-6">
                        <i className="fas fa-file-signature text-5xl text-gray-300"></i>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Pending Approvals</h3>
                    <p className="text-base text-gray-600 mb-8 leading-relaxed">
                        There are <strong className="text-red-600">{stats.critical}</strong> critical reports requiring immediate supervisor authorization.
                    </p>
                    <button className="px-4 py-2 border-2 border-[#1E3A8A] text-[#1E3A8A] font-bold rounded hover:bg-blue-50 transition-colors w-full">
                        View Priority List
                    </button>
                </div>
            </div>

            {/* Filter Tabs & Map Toggle */}
            <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-200 gap-4">
                <div className="flex space-x-8 overflow-x-auto w-full md:w-auto">
                    {['TOTAL', 'CRITICAL', 'RESOLVED', 'PENDING'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab as CorpTab); setShowMap(false); }}
                            className={`pb-4 text-sm font-bold uppercase tracking-wide transition-all border-b-3 whitespace-nowrap ${activeTab === tab && !showMap ? 'border-[#1E3A8A] text-[#1E3A8A]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {tab} Reports
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setShowMap(!showMap)}
                    className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center transition-all ${showMap ? 'bg-[#1E3A8A] text-white shadow-md' : 'bg-white text-[#1E3A8A] border border-[#1E3A8A] hover:bg-blue-50'}`}
                >
                    <i className={`fas ${showMap ? 'fa-list' : 'fa-map-marked-alt'} mr-2`}></i>
                    {showMap ? 'List View' : 'Map View'}
                </button>
            </div>

            {/* Content: Map or Grid */}
            <div className="pb-20">
                {showMap ? (
                    <div className="animate-fade-in relative z-0">
                        <ReportMap reports={filteredReports} />
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="bg-white border border-dashed border-gray-300 rounded p-12 text-center">
                        <p className="text-gray-500 font-medium">No records found matching the criteria.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredReports.map((report, index) => (
                            <div key={report.id} className={`animate-fade-up stagger-${(index % 5) + 1}`}>
                                <ReportCard
                                    report={report}
                                    userRole={user.role}
                                    onStatusUpdate={onStatusUpdate}
                                    assignTo="WARD"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DepartmentDashboard;
