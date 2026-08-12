"use client";

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';

interface ExportButtonProps {
  data: any[];
  filename: string;
}

export function ExportButton({ data, filename }: ExportButtonProps) {
  const handleExport = () => {
    // Create a new workbook and add a worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    
    // Save the file
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleExport}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Export to Excel
    </Button>
  );
}
