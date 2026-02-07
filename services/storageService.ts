
import { RoadReport, User, UserRole, ReportStatus } from '../types';




const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const storageService = {
  // Reports
  getReports: async (): Promise<RoadReport[]> => {
    try {
      const response = await fetch(`${API_URL}/reports`);
      if (!response.ok) throw new Error('Failed to fetch reports');
      return await response.json();
    } catch (e) {
      console.error("API Error: Failed to fetch reports", e);
      return [];
    }
  },

  saveReport: async (report: RoadReport): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
      return response.ok;
    } catch (e) {
      console.error("API Error: Failed to save report", e);
      return false;
    }
  },

  updateReportStatus: async (id: string, status: ReportStatus, repairMediaUrl?: string): Promise<void> => {
    try {
      await fetch(`${API_URL}/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, repairMediaUrl })
      });
    } catch (e) {
      console.error("API Error: Failed to update report status.", e);
    }
  },

  assignReport: async (reportId: string, contractorId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/reports/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, contractorId })
      });
      return response.ok;
    } catch (e) {
      console.error("API Error: Failed to assign report", e);
      return false;
    }
  },

  getContractors: async (department?: string): Promise<User[]> => {
    try {
      const url = department ? `${API_URL}/contractors?department=${department}` : `${API_URL}/contractors`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch contractors');
      return await response.json();
    } catch (e) {
      console.error("API Error: Failed to fetch contractors", e);
      return [];
    }
  },

  // Auth (New Async Methods)
  login: async (email: string, password: string): Promise<User | null> => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (e) {
      console.error("Login failed", e);
      return null;
    }
  },

  register: async (user: User): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      return response.ok;
    } catch (e) {
      console.error("Registration failed", e);
      return false;
    }
  },

  // LEGACY (Keep empty/mocked to prevent build errors before App.tsx update if needed, 
  // but better to remove if we update App.tsx immediately)
  getUsers: (): User[] => {
    return []; // Deprecated
  },
  saveUser: (user: User): void => {
    // Deprecated
  },
  getWards: async (department?: string): Promise<User[]> => {
    try {
      const url = department ? `${API_URL}/wards?department=${department}` : `${API_URL}/wards`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch wards');
      return await response.json();
    } catch (e) {
      console.error("API Error: Failed to fetch wards", e);
      return [];
    }
  },

  assignReportToWard: async (reportId: string, wardId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/reports/assign-ward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, wardId })
      });
      return response.ok;
    } catch (e) {
      console.error("API Error: Failed to assign report to ward", e);
      return false;
    }
  },
};
