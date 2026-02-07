import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RoadReport, ReportStatus, UserRole } from '../types';

export const generateWorkOrder = (report: RoadReport, assignedToName?: string) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header - Official Government Style
    doc.setFillColor(30, 58, 138); // Blue #1E3A8A
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFICIAL WORK ORDER', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('MINISTRY OF ROAD TRANSPORT & HIGHWAYS', pageWidth / 2, 25, { align: 'center' });
    doc.text('Infrastructure Maintenance Division', pageWidth / 2, 30, { align: 'center' });

    // Report Meta
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Order Generation Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 15, 50);
    doc.text(`Reference ID: ${report.id}`, 15, 55);

    // Title Section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Repair Authorization Request', 15, 70);

    // Primary Info Table
    // @ts-ignore
    autoTable(doc, {
        startY: 75,
        head: [['Field', 'Details']],
        body: [
            ['Damage Type', report.analysis?.damageTypes.join(', ') || 'N/A'],
            ['Severity Level', `Level ${report.analysis?.severity} - ${report.analysis?.severity === 4 ? 'CRITICAL' : 'Moderate'}`],
            ['Location Coordinates', `${report.location?.lat.toFixed(6)}, ${report.location?.lng.toFixed(6)}`],
            ['Assigned Dept', report.department || 'General'],
            ['Assigned Contractor', assignedToName || 'Pending Assignment'],
            ['Status', report.status.replace('_', ' ')]
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 3 },
    });

    // Image Section (if available)
    if (report.mediaType === 'image' && report.mediaUrl) {
        try {
            // @ts-ignore
            const finalY = doc.lastAutoTable.finalY + 10;
            doc.text('Evidence:', 15, finalY);
            doc.addImage(report.mediaUrl, 'JPEG', 15, finalY + 5, 80, 60);

            // Add simple map link
            doc.setFontSize(10);
            doc.setTextColor(0, 100, 255);
            doc.textWithLink('Click to open in Google Maps', 105, finalY + 10, { url: `https://www.google.com/maps?q=${report.location?.lat},${report.location?.lng}` });
            doc.setTextColor(0, 0, 0);
        } catch (e) {
            console.warn("Could not add image to PDF", e);
        }
    }

    // Instructions
    const bottomY = 220;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Contractor Instructions:', 15, bottomY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text([
        '1. Verify safety of the site before commencing work.',
        '2. Take "Before" photos from the same angle as the evidence.',
        '3. Execute repairs according to Standard Operating Procedure (SOP-884).',
        '4. Upload "After" photos to the portal to mark as Resolved.'
    ], 15, bottomY + 7);

    // Signature Area
    const signY = 260;
    doc.line(15, signY, 80, signY); // Line
    doc.text('Authorized Signature', 15, signY + 5);

    doc.line(120, signY, 190, signY); // Line
    doc.text('Contractor Acknowledgement', 120, signY + 5);

    doc.save(`WorkOrder_${report.id}.pdf`);
};
