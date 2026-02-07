import React, { useState, useMemo } from 'react';
import { User, RoadReport, ReportStatus, Severity } from '../types';
import ReportCard from './ReportCard';
import ReportMap from './ReportMap';

interface WardDashboardProps {
    user: User;
    reports: RoadReport[];
    onStatusUpdate: (id: string, status: ReportStatus, repairMediaUrl?: string) => Promise<void>;
}

type WardTab = 'ALL' | 'ASSIGNED' | 'ACTION_NEEDED' | 'COMPLETED';

const WardDashboard: React.FC<WardDashboardProps> = ({ user, reports, onStatusUpdate }) => {
    const [activeTab, setActiveTab] = useState<WardTab>('ALL');
    const [showMap, setShowMap] = useState(false);

    // Stats Logic - Ward specific (maybe focuses more on quick counts)
    const stats = useMemo(() => {
        // For Ward users, we might filter by specific ward logic if available, 
        // but for now we assume they see what regular departments see but with a different focus
        let relevant = reports;
        if (user.department) {
            relevant = reports.filter(r => r.department === user.department);
        }

        return {
            all: relevant.length,
            assigned: reports.filter(r => r.assignedWardId === user.id).length,
            actionNeeded: relevant.filter(r => r.status === ReportStatus.PENDING || r.status === ReportStatus.IN_PROGRESS).length,
            completed: relevant.filter(r => r.status === ReportStatus.FIXED).length,
            potholes: relevant.filter(r => r.analysis?.damageTypes?.some(t => t.toLowerCase().includes('pothole'))).length,
            cracks: relevant.filter(r => r.analysis?.damageTypes?.some(t => t.toLowerCase().includes('crack'))).length
        };
    }, [reports, user]);

    // Filtering Logic
    const filteredReports = useMemo(() => {
        let relevant = reports;

        // Base Filter: Dept OR Assigned (Ensures I see things assigned to me even if Dept mismatch)
        if (user.department) {
            relevant = reports.filter(r =>
                r.department === user.department || r.assignedWardId === user.id
            );
        }

        let result = [];
        switch (activeTab) {
            case 'ASSIGNED':
                result = relevant.filter(r => r.assignedWardId === user.id);
                break;
            case 'ACTION_NEEDED':
                // Include ASSIGNED_TO_WARD status
                result = relevant.filter(r => r.status === ReportStatus.ASSIGNED_TO_WARD || r.status === ReportStatus.PENDING || r.status === ReportStatus.IN_PROGRESS);
                break;
            case 'COMPLETED': result = relevant.filter(r => r.status === ReportStatus.FIXED); break;
            default: result = relevant;
        }
        // Sort Newest First
        return result.sort((a, b) => b.timestamp - a.timestamp);
    }, [reports, user, activeTab]);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header - Ward Style (Purple/Indigo) */}
            <div className="relative rounded-xl overflow-hidden p-8 shadow-sm border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-5 pointer-events-none">
                    <i className="fas fa-map-marked-alt text-[180px] text-indigo-900"></i>
                </div>

                <div className="relative z-10">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border bg-indigo-100 text-indigo-800 border-indigo-200">
                        <i className="fas fa-street-view mr-2"></i>
                        Ward Administration
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">
                        Ward Operations
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl">
                        Welcome, <span className="font-bold text-indigo-800">{user.username}</span>.
                        Manage local road maintenance and track issue resolution.
                    </p>
                </div>
            </div>

            {/* Quick Stats Row - Simplified for Ward */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white border border-indigo-100 rounded-lg p-6 shadow-sm flex items-center justify-between group hover:border-indigo-300 transition-all">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Reports</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.all}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <i className="fas fa-clipboard-list text-xl"></i>
                    </div>
                </div>

                <div className="bg-white border border-blue-100 rounded-lg p-6 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-all">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Assigned to Me</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.assigned}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <i className="fas fa-tasks text-xl"></i>
                    </div>
                </div>

                <div className="bg-white border border-orange-100 rounded-lg p-6 shadow-sm flex items-center justify-between group hover:border-orange-300 transition-all">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Action Needed</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.actionNeeded}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                        <i className="fas fa-exclamation-triangle text-xl"></i>
                    </div>
                </div>

                <div className="bg-white border border-green-100 rounded-lg p-6 shadow-sm flex items-center justify-between group hover:border-green-300 transition-all">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completed</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.completed}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                        <i className="fas fa-check-double text-xl"></i>
                    </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-lg p-6 shadow-sm flex items-center justify-between group hover:border-gray-300 transition-all">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Potholes</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.potholes}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 group-hover:bg-gray-600 group-hover:text-white transition-colors">
                        <i className="fas fa-road text-xl"></i>
                    </div>
                </div>

                <div className="bg-white border border-amber-100 rounded-lg p-6 shadow-sm flex items-center justify-between group hover:border-amber-300 transition-all">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cracks</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.cracks}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                        <i className="fas fa-align-justify text-xl"></i>
                    </div>
                </div>
            </div>

            {/* Filter Tabs & Map Toggle */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-gray-100 p-1 rounded-lg gap-4">
                <div className="flex space-x-1 w-full md:w-auto overflow-x-auto">
                    {['ALL', 'ASSIGNED', 'ACTION_NEEDED', 'COMPLETED'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab as WardTab); setShowMap(false); }}
                            className={`px-6 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab && !showMap ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {tab.replace('_', ' ')}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setShowMap(!showMap)}
                    className={`px-4 py-2 rounded-md font-bold text-sm flex items-center transition-all mr-1 ${showMap ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-indigo-700 hover:bg-indigo-50'}`}
                >
                    <i className={`fas ${showMap ? 'fa-list' : 'fa-map-marked-alt'} mr-2`}></i>
                    {showMap ? 'List' : 'Map'}
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
                        <p className="text-gray-500 font-medium">No reports in this category.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredReports.map((report, index) => (
                            <div key={report.id} className={`animate-fade-up stagger-${(index % 5) + 1}`}>
                                <ReportCard
                                    report={report}
                                    userRole={user.role}
                                    onStatusUpdate={onStatusUpdate}
                                    assignTo="CONTRACTOR"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WardDashboard;
