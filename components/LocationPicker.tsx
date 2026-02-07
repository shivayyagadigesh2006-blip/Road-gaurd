import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon path issues in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Location {
    lat: number;
    lng: number;
}

interface LocationPickerProps {
    initialLocation: Location | null;
    imageLocation?: Location | null;
    deviceLocation?: Location | null;
    onLocationChange: (location: Location) => void;
    onRefresh: () => void;
}

// Component to handle map clicks and marker dragging
const LocationMarker: React.FC<{
    position: Location,
    setPosition: (pos: Location) => void,
    onChange: (pos: Location) => void
}> = ({ position, setPosition, onChange }) => {

    // Update map view when position changes externally (e.g. from photo upload)
    const map = useMap();
    useEffect(() => {
        map.flyTo([position.lat, position.lng], map.getZoom());
    }, [position, map]);

    const markerRef = React.useRef<any>(null);

    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    const newPos = marker.getLatLng();
                    const newLoc = { lat: newPos.lat, lng: newPos.lng };
                    setPosition(newLoc);
                    onChange(newLoc);
                }
            },
        }),
        [onChange, setPosition],
    );

    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}>
            <Popup>
                Drag to adjust location
            </Popup>
        </Marker>
    );
}

const LocationPicker: React.FC<LocationPickerProps> = ({
    initialLocation,
    imageLocation,
    deviceLocation,
    onLocationChange,
    onRefresh
}) => {
    // Current active position (starts with initial, can be dragged)
    const [position, setPosition] = useState<Location>(initialLocation || { lat: 20.5937, lng: 78.9629 }); // Default to India center
    // Local state for the text input to allow free typing/pasting without jumping cursor
    const [inputValue, setInputValue] = useState(initialLocation ? `${initialLocation.lat.toFixed(6)}, ${initialLocation.lng.toFixed(6)}` : "20.593700, 78.962900");

    // Sync internal state if props change significantly (e.g. new photo uploaded)
    useEffect(() => {
        if (initialLocation) {
            const newPos = initialLocation;
            setPosition(newPos);
            setInputValue(`${newPos.lat.toFixed(6)}, ${newPos.lng.toFixed(6)}`);
        }
    }, [initialLocation]);

    // Determine the source label
    const getSourceLabel = () => {
        if (imageLocation && position.lat === imageLocation.lat && position.lng === imageLocation.lng)
            return { text: "From Image", color: "text-green-700 bg-green-50 border-green-200" };
        if (deviceLocation && position.lat === deviceLocation.lat && position.lng === deviceLocation.lng)
            return { text: "Device GPS", color: "text-blue-700 bg-blue-50 border-blue-200" };
        return { text: "Custom Pin", color: "text-purple-700 bg-purple-50 border-purple-200" };
    };

    const source = getSourceLabel();

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm mb-6">
            <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                        <i className="fas fa-map-marked-alt mr-1"></i> Location
                    </label>
                    <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-bold border ${source.color}`}>
                        {source.text}
                    </span>
                </div>
                <button
                    onClick={onRefresh}
                    className="text-xs bg-white border border-gray-300 text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                    title="Refresh Device Location"
                >
                    <i className="fas fa-crosshairs mr-1"></i> Locate Me
                </button>
            </div>

            <div className="h-[250px] w-full relative z-0">
                {/* z-0 is critical to not overlap with other UI modals if any */}
                <MapContainer
                    center={[position.lat, position.lng]}
                    zoom={15}
                    scrollWheelZoom={false}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker
                        position={position}
                        setPosition={(pos) => {
                            setPosition(pos);
                            setInputValue(`${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}`);
                        }}
                        onChange={onLocationChange}
                    />
                </MapContainer>
            </div>

            <div className="bg-white p-2 text-xs text-gray-500 border-t border-gray-100 flex justify-between items-center">
                <div className="flex items-center w-full max-w-sm">
                    <span className="font-bold mr-2 whitespace-nowrap">Co-ords:</span>
                    <input
                        type="text"
                        placeholder="Paste Lat, Lng here..."
                        value={`${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`}
                        onChange={(e) => {
                            const val = e.target.value;
                            // Try to parse "lat, lng"
                            const parts = val.split(',').map(p => parseFloat(p.trim()));

                            // Check if we have two valid numbers
                            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                                const [lat, lng] = parts;
                                if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                                    const newLoc = { lat, lng };
                                    setPosition(newLoc);
                                    onLocationChange(newLoc);
                                }
                            }
                        }}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none font-mono text-xs"
                    />
                </div>
                <span className="italic hidden sm:inline ml-2 whitespace-nowrap">Paste "Lat, Lng"</span>
            </div>
        </div>
    );
};

export default LocationPicker;
