
import React, { useState } from 'react';
import { RoadReport, User, ReportStatus } from '../types';
import ReportCard from './ReportCard';
import ReportMap from './ReportMap';

interface ContractorDashboardProps {
    user: User;
    reports: RoadReport[];
    onStatusUpdate: (id: string, status: ReportStatus, repairMediaUrl?: string) => Promise<void>;
}

const ContractorDashboard: React.FC<ContractorDashboardProps> = ({ user, reports, onStatusUpdate }) => {
    const [activeTab, setActiveTab] = useState<'ASSIGNED' | 'RESOLVED'>('ASSIGNED');

    // Filter reports assigned to this contractor
    const myReports = reports.filter(r => r.assignedContractorId === user.id);

    const assigned = myReports.filter(r => r.status !== ReportStatus.FIXED);
    const resolved = myReports.filter(r => r.status === ReportStatus.FIXED);

    const displayReports = activeTab === 'ASSIGNED' ? assigned : resolved;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-white border border-amber-100 rounded-xl p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-5 pointer-events-none">
                    <i className="fas fa-hard-hat text-[150px] text-amber-800"></i>
                </div>

                <div className="relative z-10">
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border bg-amber-100 text-amber-800 border-amber-200">
                        <i className="fas fa-tools mr-2"></i>
                        Contractor Portal
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">
                        Work Orders
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl">
                        Hello, <span className="font-bold text-amber-800">{user.username}</span>. View your assigned tasks and upload proof of repairs.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('ASSIGNED')}
                    className={`py-4 px-6 text-sm font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'ASSIGNED' ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Assigned ({assigned.length})
                </button>
                <button
                    onClick={() => setActiveTab('RESOLVED')}
                    className={`py-4 px-6 text-sm font-bold uppercase tracking-wide border-b-2 transition-colors ${activeTab === 'RESOLVED' ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Completed ({resolved.length})
                </button>
            </div>

            {/* Smart Route Map (Only for Assigned) */}
            {activeTab === 'ASSIGNED' && assigned.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                        <i className="fas fa-route text-blue-600 mr-2"></i>
                        Optimized Repair Route
                    </h3>
                    <ReportMap reports={assigned} showRoute={true} />
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayReports.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                        <p className="text-gray-500">No reports found in this category.</p>
                    </div>
                ) : (
                    displayReports.map(report => (
                        <ReportCard
                            key={report.id}
                            report={report}
                            userRole={user.role}
                            onStatusUpdate={onStatusUpdate}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default ContractorDashboard;
