
import React from 'react';
import { Severity, ReportStatus } from './types';

export const SEVERITY_COLORS: Record<Severity, string> = {
  [Severity.LOW]: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  [Severity.MINOR]: 'bg-blue-50 text-blue-700 border-blue-100',
  [Severity.MODERATE]: 'bg-amber-50 text-amber-700 border-amber-100',
  [Severity.SEVERE]: 'bg-orange-50 text-orange-700 border-orange-100',
  [Severity.CRITICAL]: 'bg-red-50 text-red-700 border-red-100',
};

export const STATUS_COLORS: Record<ReportStatus, string> = {
  [Severity.LOW as unknown as ReportStatus]: 'bg-slate-100 text-slate-600',
  [ReportStatus.PENDING]: 'bg-slate-100 text-slate-600',
  [ReportStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-600',
  [ReportStatus.FIXED]: 'bg-emerald-100 text-emerald-600',
  [ReportStatus.REJECTED]: 'bg-red-100 text-red-600',
};





export const SEVERITY_LABELS: Record<Severity, string> = {
  [Severity.LOW]: 'Optimal',
  [Severity.MINOR]: 'Minor Wear',
  [Severity.MODERATE]: 'Moderate Damage',
  [Severity.SEVERE]: 'Severe Damage',
  [Severity.CRITICAL]: 'CRITICAL',
};

export const getSeverityIcon = (severity: Severity) => {
  switch (severity) {
    case Severity.LOW: return <i className="fas fa-check-circle"></i>;
    case Severity.MINOR: return <i className="fas fa-info-circle"></i>;
    case Severity.MODERATE: return <i className="fas fa-exclamation-circle"></i>;
    case Severity.SEVERE: return <i className="fas fa-exclamation-triangle"></i>;
    case Severity.CRITICAL: return <i className="fas fa-biohazard"></i>;
    default: return null;
  }
};
