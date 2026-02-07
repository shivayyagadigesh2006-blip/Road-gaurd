import EXIF from 'exif-js';

export const getGPSFromImage = (file: File): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve, reject) => {
        // exif-js type definition might be missing in some environments, accessing as any for safety
        (EXIF as any).getData(file, function (this: any) {
            const lat = EXIF.getTag(this, 'GPSLatitude');
            const latRef = EXIF.getTag(this, 'GPSLatitudeRef');
            const lng = EXIF.getTag(this, 'GPSLongitude');
            const lngRef = EXIF.getTag(this, 'GPSLongitudeRef');

            if (lat && latRef && lng && lngRef) {
                const latitude = convertDMSToDD(lat[0], lat[1], lat[2], latRef);
                const longitude = convertDMSToDD(lng[0], lng[1], lng[2], lngRef);
                resolve({ lat: latitude, lng: longitude });
            } else {
                resolve(null);
            }
        });
    });
};

const convertDMSToDD = (degrees: number, minutes: number, seconds: number, direction: string): number => {
    let dd = degrees + minutes / 60 + seconds / (60 * 60);
    if (direction === 'S' || direction === 'W') {
        dd = dd * -1;
    }
    return dd;
};
