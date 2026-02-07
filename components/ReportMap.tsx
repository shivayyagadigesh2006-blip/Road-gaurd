import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { RoadReport, ReportStatus } from '../types';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const createIcon = (color: string, number?: number) => {
    return new L.DivIcon({
        className: 'custom-icon',
        html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-family: sans-serif; font-size: 12px;">${number || ''}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
};

const STATUS_COLORS: Record<string, string> = {
    [ReportStatus.PENDING]: '#F97316', // Orange
    [ReportStatus.IN_PROGRESS]: '#3B82F6', // Blue
    [ReportStatus.ASSIGNED_TO_WARD]: '#6366F1', // Indigo
    [ReportStatus.FIXED]: '#22C55E', // Green
    [ReportStatus.REJECTED]: '#9CA3AF', // Gray
};

interface ReportMapProps {
    reports: RoadReport[];
    showRoute?: boolean;
}

const FitBounds = ({ reports }: { reports: RoadReport[] }) => {
    const map = useMap();
    useEffect(() => {
        if (reports.length > 0) {
            const bounds = L.latLngBounds(reports.map(r => [r.location?.lat || 0, r.location?.lng || 0]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [reports, map]);
    return null;
};

const ReportMap: React.FC<ReportMapProps> = ({ reports, showRoute = false }) => {
    const [viewMode, setViewMode] = useState<'PINS' | 'HEATMAP'>('PINS');

    // Filter reports that have location data
    const validReports = reports.filter(r => r.location && r.location.lat && r.location.lng);

    if (validReports.length === 0) {
        return (
            <div className="h-[400px] w-full bg-gray-100 flex items-center justify-center rounded-lg border border-gray-300">
                <p className="text-gray-500 font-medium">No geospatial data available for these reports.</p>
            </div>
        );
    }

    // Default center (can be overridden by fitBounds)
    const defaultCenter = { lat: 20.5937, lng: 78.9629 }; // India

    return (
        <div className="h-[500px] w-full rounded-xl overflow-hidden shadow-lg border border-gray-200 z-0 relative group">
            <MapContainer
                center={[defaultCenter.lat, defaultCenter.lng]}
                zoom={5}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    url={viewMode === 'HEATMAP'
                        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // Dark map for heatmap
                        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
                    attribution='&copy; OpenStreetMap contributors'
                />

                {viewMode === 'PINS' ? (
                    <>
                        {showRoute && validReports.length > 1 && (
                            <Polyline
                                positions={validReports.map(r => [r.location!.lat, r.location!.lng])}
                                color="#2563EB" // Blue-600
                                weight={4}
                                opacity={0.7}
                                dashArray="10, 10"
                            />
                        )}
                        {validReports.map((report, index) => (
                            <Marker
                                key={report.id}
                                position={[report.location!.lat, report.location!.lng]}
                                icon={createIcon(STATUS_COLORS[report.status] || '#9CA3AF', showRoute ? index + 1 : undefined)}
                            >
                                <Popup>
                                    <div className="min-w-[200px]">
                                        <h3 className="font-bold text-gray-800 text-sm mb-1">{report.analysis?.damageTypes.join(', ')}</h3>
                                        <p className="text-xs text-gray-500 mb-2">ID: {report.id}</p>
                                        <img
                                            src={report.mediaUrl}
                                            className="w-full h-32 object-cover rounded mb-2 border border-gray-200"
                                            alt="Evidence"
                                        />
                                        <div className="flex justify-between items-center mt-2">
                                            <span className={`px-2 py-1 text-[10px] font-bold rounded text-white`} style={{ backgroundColor: STATUS_COLORS[report.status] }}>
                                                {report.status.replace('_', ' ')}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400">
                                                {new Date(report.timestamp).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </>
                ) : (
                    // Severity Visualization (Heatmap-like)
                    validReports.map(report => {
                        const severity = report.analysis?.severity || 0;
                        const color = severity >= 4 ? '#EF4444' : severity >= 3 ? '#F97316' : '#EAB308';
                        const radius = severity * 10; // Bigger circle for higher severity
                        return (
                            <CircleMarker
                                key={report.id}
                                center={[report.location!.lat, report.location!.lng]}
                                radius={radius}
                                fillOpacity={0.6}
                                color={color}
                                stroke={false}
                            >
                                <Popup>
                                    <div className="text-center">
                                        <p className="font-bold text-gray-700">Severity Level: {severity}</p>
                                        <p className="text-xs text-gray-500">Damage Impact Zone</p>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        );
                    })
                )}

                <FitBounds reports={validReports} />
            </MapContainer>

            {/* Toggle Control */}
            <div className="absolute top-4 right-4 z-[1000] flex bg-white rounded-lg shadow-md overflow-hidden border border-gray-300">
                <button
                    onClick={() => setViewMode('PINS')}
                    className={`px-3 py-2 text-xs font-bold transition-colors ${viewMode === 'PINS' ? 'bg-[#1E3A8A] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <i className="fas fa-map-marker-alt mr-1"></i> Pins
                </button>
                <div className="w-px bg-gray-300"></div>
                <button
                    onClick={() => setViewMode('HEATMAP')}
                    className={`px-3 py-2 text-xs font-bold transition-colors ${viewMode === 'HEATMAP' ? 'bg-[#1E3A8A] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <i className="fas fa-fire mr-1"></i> Severity
                </button>
            </div>

            {/* Legend */}
            <div className={`absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-md z-[1000] text-xs transition-opacity duration-300 ${viewMode === 'PINS' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <h4 className="font-bold text-gray-700 mb-2">Status Legend</h4>
                <div className="space-y-1">
                    {Object.entries(STATUS_COLORS).map(([status, color]) => (
                        <div key={status} className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color }}></div>
                            <span className="text-gray-600 capitalize">{status.replace('_', ' ').toLowerCase()}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Heatmap Legend */}
            <div className={`absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-sm p-3 rounded-lg shadow-md z-[1000] text-xs transition-opacity duration-300 ${viewMode === 'HEATMAP' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <h4 className="font-bold text-white mb-2">Severity Zones</h4>
                <div className="space-y-1">
                    <div className="flex items-center text-white"><div className="w-3 h-3 rounded-full mr-2 bg-red-500"></div>Critical (L4)</div>
                    <div className="flex items-center text-white"><div className="w-3 h-3 rounded-full mr-2 bg-orange-500"></div>Severe (L3)</div>
                    <div className="flex items-center text-white"><div className="w-3 h-3 rounded-full mr-2 bg-yellow-500"></div>Moderate (L1-2)</div>
                </div>
            </div>
        </div>
    );
};

export default ReportMap;
