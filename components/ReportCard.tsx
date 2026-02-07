import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RoadReport, ReportStatus, UserRole, User } from '../types';
import { SEVERITY_LABELS } from '../constants';
import { storageService } from '../services/storageService';
import { generateWorkOrder } from '../utils/pdfGenerator';

// Official Govt Theme Colors for Tags
const SEVERITY_BADGES: Record<number, string> = {
    0: 'bg-green-100 text-green-800 border-green-200', // Low
    1: 'bg-blue-100 text-blue-800 border-blue-200',   // Minor
    2: 'bg-yellow-100 text-yellow-800 border-yellow-200', // Moderate
    3: 'bg-orange-100 text-orange-800 border-orange-200', // Severe
    4: 'bg-red-100 text-red-800 border-red-200',      // Critical
};

const STATUS_BADGES: Record<string, string> = {
    PENDING: 'bg-orange-100 text-orange-800 border-orange-200',
    IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200',
    ASSIGNED_TO_WARD: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    FIXED: 'bg-green-100 text-green-800 border-green-200',
    REJECTED: 'bg-gray-100 text-gray-800 border-gray-200',
};

interface ReportCardProps {
    report: RoadReport;
    userRole: UserRole;
    onStatusUpdate?: (id: string, status: ReportStatus, repairMediaUrl?: string) => void;
    assignTo?: 'WARD' | 'CONTRACTOR';
}

const ReportCard: React.FC<ReportCardProps> = ({ report, userRole, onStatusUpdate, assignTo }) => {
    const { analysis, timestamp, status, mediaUrl, mediaType, id, location, repairMediaUrl } = report;
    const repairInputRef = useRef<HTMLInputElement>(null);

    // Safety checks
    const damageTypes = analysis?.damageTypes || [];
    const analysisDesc = analysis?.description || 'No analysis available';
    const severity = analysis?.severity ?? 0;
    const boundingBoxes = analysis?.boundingBoxes || [];
    const videoDetections = analysis?.videoDetections || [];

    let potholeCount = 0;
    let crackCount = 0;

    if (mediaType === 'video' && videoDetections.length > 0) {
        // For video: Find the frame with the MOST defects to represent the "Count"
        // This avoids summing up the same pothole across 100 frames
        const maxPotholesFrame = Math.max(...videoDetections.map(frame =>
            frame.boxes.filter(b => b.label.toLowerCase().includes('pothole')).length
        ));
        const maxCracksFrame = Math.max(...videoDetections.map(frame =>
            frame.boxes.filter(b => b.label.toLowerCase().includes('crack')).length
        ));

        potholeCount = maxPotholesFrame;
        crackCount = maxCracksFrame;
    } else {
        // Fallback to existing logic for images or if no video detections
        potholeCount = boundingBoxes.filter(b => b.label.toLowerCase().includes('pothole')).length;
        crackCount = boundingBoxes.filter(b => b.label.toLowerCase().includes('crack')).length;
    }

    const [viewMode, setViewMode] = useState<'original' | 'repair' | 'analysis'>(
        analysis.processedMediaUrl ? 'analysis' : (repairMediaUrl ? 'repair' : 'original')
    );

    React.useEffect(() => {
        if (repairMediaUrl) {
            setViewMode('repair');
        }
    }, [repairMediaUrl]);

    const [isExpanded, setIsExpanded] = useState(false);
    const toggleExpand = () => setIsExpanded(!isExpanded);

    // Assignment Logic
    const [assignees, setAssignees] = useState<User[]>([]);
    const [showAssign, setShowAssign] = useState(false);
    const [selectedAssignee, setSelectedAssignee] = useState('');

    React.useEffect(() => {
        if (showAssign && assignees.length === 0 && assignTo) {
            if (assignTo === 'CONTRACTOR') {
                storageService.getContractors(report.department).then(setAssignees);
            } else if (assignTo === 'WARD') {
                storageService.getWards(report.department).then(setAssignees);
            }
        }
    }, [showAssign, report.department, assignTo]);

    const handleAssign = async () => {
        if (!selectedAssignee || !assignTo) return;

        let success = false;
        if (assignTo === 'CONTRACTOR') {
            success = await storageService.assignReport(id, selectedAssignee);
        } else {
            success = await storageService.assignReportToWard(id, selectedAssignee);
        }

        if (success) {
            setShowAssign(false);
            // Determine next status based on flow
            const nextStatus = assignTo === 'WARD' ? ReportStatus.ASSIGNED_TO_WARD : ReportStatus.IN_PROGRESS;
            // Note: Backend might set status automatically.
            if (onStatusUpdate) onStatusUpdate(id, nextStatus); // Optimistic
            alert('Report assigned successfully!');
        } else {
            alert('Assignment failed.');
        }
    };

    const openInMaps = () => {
        if (location) {
            window.open(`https://www.google.com/maps?q=${location.lat},${location.lng}`, '_blank');
        }
    };

    const handleRepairUploadClick = () => {
        repairInputRef.current?.click();
    };

    const handleRepairFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            onStatusUpdate?.(id, ReportStatus.FIXED, base64);
        };
        reader.readAsDataURL(file);
    };

    let currentMedia = mediaUrl;
    if (viewMode === 'repair' && repairMediaUrl) currentMedia = repairMediaUrl;
    if (viewMode === 'analysis' && analysis.processedMediaUrl) currentMedia = analysis.processedMediaUrl;

    const renderModal = () => {
        if (!isExpanded) return null;

        return createPortal(
            <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-lg shadow-2xl overflow-hidden flex flex-col md:flex-row border border-gray-200 animate-scale-in">
                    {/* Header (Mobile) */}
                    <div className="md:hidden bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center">
                        <span className="font-bold text-gray-700">Case # {id.slice(0, 8)}</span>
                        <button onClick={toggleExpand} className="text-gray-500 hover:text-gray-900"><i className="fas fa-times"></i></button>
                    </div>

                    {/* Left: Media Viewer */}
                    <div className="md:w-3/5 bg-gray-100 flex items-center justify-center relative p-4">
                        {mediaType === 'image' || (viewMode === 'repair' && mediaType === 'image') || (viewMode === 'analysis' && mediaType === 'image') ? (
                            <img src={currentMedia} alt="Evidence" className="max-w-full max-h-[70vh] object-contain shadow-lg animate-fade-in" />
                        ) : (
                            <video src={currentMedia} className="max-w-full max-h-[70vh] animate-fade-in" controls />
                        )}

                        <div className="absolute top-4 left-4 flex space-x-2 bg-white p-1 rounded shadow-md z-10">
                            <button
                                onClick={() => setViewMode('original')}
                                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${viewMode === 'original' ? 'bg-[#1E3A8A] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                Original
                            </button>
                            {status === ReportStatus.FIXED && repairMediaUrl && (
                                <button
                                    onClick={() => setViewMode('repair')}
                                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${viewMode === 'repair' ? 'bg-[#1E3A8A] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    Resolved
                                </button>
                            )}
                            {analysis.processedMediaUrl && (
                                <button
                                    onClick={() => setViewMode('analysis')}
                                    className={`px-3 py-1 text-xs font-bold rounded transition-colors ${viewMode === 'analysis' ? 'bg-[#1E3A8A] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    AI Analysis
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right: Details */}
                    <div className="md:w-2/5 flex flex-col bg-white">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-start hidden md:flex bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-[#1E3A8A]">Detailed Report</h3>
                                <p className="text-xs text-gray-500 font-medium mt-1">FILED: {new Date(timestamp).toLocaleString()}</p>
                            </div>
                            <button onClick={toggleExpand} className="text-gray-400 hover:text-red-500 transition-colors"><i className="fas fa-times text-xl"></i></button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-grow space-y-6">
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Issue Type</h4>
                                <div className="flex flex-wrap gap-2">
                                    {damageTypes.map((type, i) => (
                                        <span key={i} className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded border border-gray-200">
                                            {type}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Automated Assessment</h4>
                                {report.userDescription && (
                                    <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                                        <span className="text-xs font-bold text-blue-800 block mb-1">Citizen Note:</span>
                                        <p className="text-sm text-gray-800 italic">"{report.userDescription}"</p>
                                    </div>
                                )}
                                <div className="bg-gray-50 p-4 rounded border border-gray-200 text-sm text-gray-700 leading-relaxed">
                                    {analysisDesc}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 border border-gray-200 rounded">
                                    <span className="block text-xs font-bold text-gray-400 uppercase">Impact Level</span>
                                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-bold border rounded ${SEVERITY_BADGES[severity] || 'bg-gray-100'}`}>
                                        {SEVERITY_LABELS[severity]}
                                    </span>
                                </div>
                                <div className="p-3 border border-gray-200 rounded">
                                    <span className="block text-xs font-bold text-gray-400 uppercase">Current Status</span>
                                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-bold border rounded ${STATUS_BADGES[status] || 'bg-gray-100'}`}>
                                        {status.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 bg-gray-50">
                            <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                                <span><strong>Reporter ID:</strong> {report.userName}</span>
                                <span><strong>Ref:</strong> {id}</span>
                            </div>
                            {location && (
                                <button onClick={openInMaps} className="w-full btn-govt-outline py-2 border-dashed mb-3">
                                    <i className="fas fa-map-marker-alt mr-2 text-red-500"></i>
                                    Open Location in GIS
                                </button>
                            )}
                            {report.locationAddress && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <div className="flex items-start space-x-2">
                                        <i className="fas fa-map-marker-alt text-blue-600 mt-0.5"></i>
                                        <div className="flex-1">
                                            <p className="text-xs font-semibold text-gray-600 mb-1">Reported Address:</p>
                                            <p className="text-sm font-medium text-gray-800">{report.locationAddress}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        );
    };

    return (
        <>
            <div className="card-govt group flex flex-col h-full overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300 animate-fade-in">
                {/* Media Thumbnail */}
                {/* Media Thumbnail - Enforce 16:9 Aspect Ratio Strict */}
                <div className="relative w-full pt-[56.25%] bg-gray-100 border-b border-gray-200 overflow-hidden">
                    <div className="absolute inset-0 w-full h-full">
                        {mediaType === 'image' || (viewMode === 'repair' && mediaType === 'image') || (viewMode === 'analysis' && mediaType === 'image') ? (
                            <img src={currentMedia} alt="Evidence" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        ) : (
                            <div className="w-full h-full relative bg-gray-900 group-video">
                                <video
                                    src={currentMedia}
                                    className="w-full h-full object-cover block opacity-90 transition-transform duration-700 group-hover:scale-105"
                                    muted
                                    playsInline
                                    loop
                                    type="video/mp4"
                                    onMouseOver={(e) => (e.target as HTMLVideoElement).play().catch(e => console.error("Play error:", e))}
                                    onMouseOut={(e) => (e.target as HTMLVideoElement).pause()}
                                    onError={(e) => console.error("Video Load Error:", e.currentTarget.error, currentMedia)}
                                />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
                                    <div className="w-12 h-12 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/50">
                                        <i className="fas fa-play text-white ml-1"></i>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="absolute top-2 right-2 z-10">
                            <span className={`px-2 py-1 text-[10px] font-bold border rounded shadow-sm ${STATUS_BADGES[status]}`}>
                                {status.replace('_', ' ')}
                            </span>
                            {status === ReportStatus.FIXED && repairMediaUrl && (
                                <span className="ml-2 px-2 py-1 text-[10px] font-bold border rounded shadow-sm bg-white text-[#1E3A8A] border-[#1E3A8A]">
                                    {viewMode === 'repair' ? 'AFTER' : 'BEFORE'}
                                </span>
                            )}
                        </div>

                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                        </div>
                    </div>

                    {/* View Details Button - Positioned to not block video hover but accessible */}
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
                        {status === ReportStatus.FIXED && repairMediaUrl && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setViewMode(viewMode === 'repair' ? 'original' : 'repair'); }}
                                className="bg-[#1E3A8A] text-white px-3 py-1 rounded-full font-bold shadow-lg text-[10px] border border-white/20 hover:scale-105 transition-transform"
                            >
                                {viewMode === 'repair' ? 'Show Before' : 'Show Result'}
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleExpand(); }}
                            className="bg-white text-[#1E3A8A] px-3 py-1 rounded-full font-bold shadow-lg text-[10px] hover:scale-105 transition-transform"
                        >
                            Details
                        </button>
                    </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex flex-col flex-grow"> {/* Increased padding */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded border ${SEVERITY_BADGES[severity] || 'bg-gray-100 border-gray-200'}`}> {/* Increased text size and padding */}
                                {SEVERITY_LABELS[severity]}
                            </span>
                            <span className="text-xs text-gray-500 font-bold">{new Date(timestamp).toLocaleDateString()}</span>
                        </div>
                        <h3 className="font-bold text-gray-800 text-base leading-tight"> {/* Increased text size */}
                            {damageTypes.length > 0 ? damageTypes.join(', ') : 'Infrastructure Report'}
                        </h3>
                        {(potholeCount > 0 || crackCount > 0) && (
                            <div className="flex gap-3 text-xs mt-1.5 pt-1.5 border-t border-gray-100 border-dashed">
                                {potholeCount > 0 && (
                                    <span className="text-gray-600 flex items-center bg-gray-50 px-2 py-0.5 rounded">
                                        <span className="font-bold mr-1">{potholeCount}</span> Potholes
                                    </span>
                                )}
                                {crackCount > 0 && (
                                    <span className="text-gray-600 flex items-center bg-gray-50 px-2 py-0.5 rounded">
                                        <span className="font-bold mr-1">{crackCount}</span> Cracks
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {report.userDescription && (
                        <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-100">
                            <p className="text-[10px] text-blue-800 font-bold uppercase mb-0.5"><i className="fas fa-comment-alt mr-1"></i> Citizen Note</p>
                            <p className="text-xs text-gray-700 italic">"{report.userDescription}"</p>
                        </div>
                    )}

                    <p className="text-sm text-gray-600 line-clamp-2 mb-5 flex-grow leading-relaxed"> {/* Increased text size and leading */}
                        {analysisDesc}
                    </p>

                    {/* Actions */}
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                        <div className="text-xs font-medium text-gray-400 flex items-center">
                            <i className="fas fa-user-circle mr-2 text-gray-300 text-base"></i>
                            {report.userName}
                        </div>

                        <div className="flex items-center space-x-3">
                            {(userRole === UserRole.CORPORATION || userRole === UserRole.ADMIN || userRole === UserRole.CONTRACTOR) && (
                                <button
                                    onClick={() => generateWorkOrder(report, assignees.find(a => a.id === report.assignedContractorId)?.username)}
                                    className="text-gray-400 hover:text-red-700 transition-colors transform hover:scale-110"
                                    title="Download Work Order"
                                >
                                    <i className="fas fa-file-pdf text-lg"></i>
                                </button>
                            )}

                            {location && (
                                <button onClick={openInMaps} className="text-gray-400 hover:text-blue-600 transition-colors transform hover:scale-110" title="View Map">
                                    <i className="fas fa-map-marker-alt text-lg"></i>
                                </button>
                            )}

                            {/* Assignment Button for Dept */}
                            {(userRole === UserRole.CORPORATION || userRole === UserRole.ADMIN) && !report.assignedContractorId && status !== ReportStatus.FIXED && (
                                <div className="relative">
                                    {!showAssign ? (
                                        <button
                                            onClick={() => setShowAssign(true)}
                                            className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded border border-blue-200 transition-colors"
                                        >
                                            Assign
                                        </button>
                                    ) : (
                                        <div className="absolute bottom-full right-0 mb-2 w-64 bg-white shadow-xl border border-gray-200 rounded-lg p-3 z-50">
                                            <h5 className="text-xs font-bold text-gray-700 mb-2">Assign {assignTo === 'WARD' ? 'Ward' : 'Contractor'}</h5>
                                            <select
                                                className="w-full text-xs border border-gray-300 rounded p-1 mb-2"
                                                value={selectedAssignee}
                                                onChange={(e) => setSelectedAssignee(e.target.value)}
                                            >
                                                <option value="">Select...</option>
                                                {assignees.map(c => (
                                                    <option key={c.id} value={c.id}>{c.username}</option>
                                                ))}
                                            </select>
                                            <div className="flex justify-end space-x-2">
                                                <button onClick={() => setShowAssign(false)} className="text-xs text-gray-500">Cancel</button>
                                                <button onClick={handleAssign} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Confirm</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {(userRole === UserRole.ADMIN || userRole === UserRole.CORPORATION || userRole === UserRole.CONTRACTOR) && status !== ReportStatus.FIXED && (
                                <div>
                                    <input type="file" ref={repairInputRef} className="hidden" accept="image/*" onChange={handleRepairFileChange} />
                                    <button
                                        onClick={handleRepairUploadClick}
                                        className="text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded border border-green-200 transition-colors"
                                    >
                                        Resolve
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {renderModal()}
        </>
    );
};

export default ReportCard;
