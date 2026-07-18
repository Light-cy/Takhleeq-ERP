import { useState, useMemo } from 'react';
import { AuditRecord } from '../../../../../types';
import { formatAuditValue } from '../../../utils/auditFormatter';
import { exportAuditLogsPDF } from '../utils/pdfGenerator';

export function useAuditLogs(initialLogs: AuditRecord[] = []) {
  const [activeView, setActiveView] = useState<'ledger' | 'analytics'>('ledger');
  const [selectedLog, setSelectedLog] = useState<AuditRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Search filtering
  const filteredLogs = useMemo(() => {
    setCurrentPage(1); // Reset to page 1 on search
    if (!searchQuery.trim()) return initialLogs;
    
    const query = searchQuery.toLowerCase().trim();
    return initialLogs.filter(log => {
      const matchAction = log.action.toLowerCase().includes(query);
      const matchUser = log.user.toLowerCase().includes(query);
      const matchPrevious = log.previousValue?.toLowerCase().includes(query) || false;
      const matchNew = log.newValue?.toLowerCase().includes(query) || false;
      return matchAction || matchUser || matchPrevious || matchNew;
    });
  }, [initialLogs, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage]);

  const handleExportCSV = () => {
    try {
      const headers = ['Date & Time', 'System Event Action', 'Authorizer User', 'Previous State / Value', 'New State / Action Details'];
      
      const formatTimestamp = (ts: string) => {
        try {
          const d = new Date(ts);
          if (isNaN(d.getTime())) return ts;
          const pad = (num: number) => String(num).padStart(2, '0');
          const year = d.getFullYear();
          const month = pad(d.getMonth() + 1);
          const day = pad(d.getDate());
          let hours = d.getHours();
          const minutes = pad(d.getMinutes());
          const seconds = pad(d.getSeconds());
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          return `${year}-${month}-${day} ${pad(hours)}:${minutes}:${seconds} ${ampm}`;
        } catch {
          return ts;
        }
      };

      const rows = filteredLogs.map(log => [
        formatTimestamp(log.timestamp),
        log.action,
        log.user,
        formatAuditValue(log.previousValue, log.newValue),
        formatAuditValue(log.newValue, log.previousValue)
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => 
          row.map(val => {
            const str = val === null || val === undefined ? '' : String(val);
            return `"${str.replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\r\n');
      
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `takhleeq_audit_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export CSV:', error);
    }
  };

  const handleExportPDF = () => {
    exportAuditLogsPDF(filteredLogs, searchQuery);
  };

  return {
    activeView,
    setActiveView,
    selectedLog,
    setSelectedLog,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    filteredLogs,
    paginatedLogs,
    totalPages,
    handleExportCSV,
    handleExportPDF
  };
}
