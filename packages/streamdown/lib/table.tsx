import { CheckIcon, CopyIcon, DownloadIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "./utils";

type TableData = {
  headers: string[];
  rows: string[][];
};

function extractTableDataFromElement(tableElement: HTMLElement): TableData {
  const headers: string[] = [];
  const rows: string[][] = [];

  // Extract headers
  const headerCells = tableElement.querySelectorAll("thead th");
  headerCells.forEach((cell) => {
    headers.push(cell.textContent?.trim() || "");
  });

  // Extract rows
  const bodyRows = tableElement.querySelectorAll("tbody tr");
  bodyRows.forEach((row) => {
    const rowData: string[] = [];
    const cells = row.querySelectorAll("td");
    cells.forEach((cell) => {
      rowData.push(cell.textContent?.trim() || "");
    });
    rows.push(rowData);
  });

  return { headers, rows };
}

function tableDataToCSV(data: TableData): string {
  const { headers, rows } = data;

  const escapeCSV = (value: string): string => {
    // If the value contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const csvRows: string[] = [];

  // Add headers
  if (headers.length > 0) {
    csvRows.push(headers.map(escapeCSV).join(","));
  }

  // Add data rows
  rows.forEach((row) => {
    csvRows.push(row.map(escapeCSV).join(","));
  });

  return csvRows.join("\n");
}

function tableDataToMarkdown(data: TableData): string {
  const { headers, rows } = data;

  if (headers.length === 0) {
    return "";
  }

  const markdownRows: string[] = [];

  // Add headers
  markdownRows.push(`| ${headers.join(" | ")} |`);

  // Add separator row
  markdownRows.push(`| ${headers.map(() => "---").join(" | ")} |`);

  // Add data rows
  rows.forEach((row) => {
    // Pad row with empty strings if it's shorter than headers
    const paddedRow = [...row];
    while (paddedRow.length < headers.length) {
      paddedRow.push("");
    }
    markdownRows.push(`| ${paddedRow.join(" | ")} |`);
  });

  return markdownRows.join("\n");
}

export type TableCopyButtonProps = {
  children?: React.ReactNode;
  className?: string;
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
  format?: "csv" | "markdown" | "text";
};

export const TableCopyButton = ({
  children,
  className,
  onCopy,
  onError,
  timeout = 2000,
  format = "markdown",
}: TableCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef(0);

  const copyTableData = async () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      onError?.(new Error("Clipboard API not available"));
      return;
    }

    try {
      if (!isCopied) {
        // Find the closest table element
        const button = document.activeElement as HTMLElement;
        const tableWrapper = button.closest('[data-streamdown="table-wrapper"]');
        const tableElement = tableWrapper?.querySelector("table") as HTMLTableElement;

        if (!tableElement) {
          onError?.(new Error("Table not found"));
          return;
        }

        const tableData = extractTableDataFromElement(tableElement);
        let content = "";

        switch (format) {
          case "csv":
            content = tableDataToCSV(tableData);
            break;
          case "markdown":
            content = tableDataToMarkdown(tableData);
            break;
          case "text":
            content = tableDataToCSV(tableData).replace(/,/g, "\t");
            break;
          default:
            content = tableDataToCSV(tableData);
        }

        await navigator.clipboard.writeText(content);
        setIsCopied(true);
        onCopy?.();
        timeoutRef.current = window.setTimeout(
          () => setIsCopied(false),
          timeout
        );
      }
    } catch (error) {
      onError?.(error as Error);
    }
  };

  useEffect(() => {
    return () => {
      window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <button
      className={cn("text-muted-foreground p-1 transition-all", className)}
      onClick={copyTableData}
      type="button"
      title={`Copy table as ${format}`}
    >
      {children ?? <Icon size={14} />}
    </button>
  );
};

export type TableDownloadButtonProps = {
  children?: React.ReactNode;
  className?: string;
  onDownload?: () => void;
  onError?: (error: Error) => void;
  format?: "csv" | "markdown";
  filename?: string;
};

export const TableDownloadButton = ({
  children,
  className,
  onDownload,
  onError,
  format = "csv",
  filename,
}: TableDownloadButtonProps) => {
  const downloadTableData = () => {
    try {
      // Find the closest table element
      const button = document.activeElement as HTMLElement;
      const tableWrapper = button.closest('[data-streamdown="table-wrapper"]');
      const tableElement = tableWrapper?.querySelector("table") as HTMLTableElement;

      if (!tableElement) {
        onError?.(new Error("Table not found"));
        return;
      }

      const tableData = extractTableDataFromElement(tableElement);
      let content = "";
      let mimeType = "";
      let extension = "";

      switch (format) {
        case "csv":
          content = tableDataToCSV(tableData);
          mimeType = "text/csv";
          extension = "csv";
          break;
        case "markdown":
          content = tableDataToMarkdown(tableData);
          mimeType = "text/markdown";
          extension = "md";
          break;
        default:
          content = tableDataToCSV(tableData);
          mimeType = "text/csv";
          extension = "csv";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `table.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onDownload?.();
    } catch (error) {
      onError?.(error as Error);
    }
  };

  return (
    <button
      className={cn("text-muted-foreground p-1 transition-all", className)}
      onClick={downloadTableData}
      type="button"
      title={`Download table as ${format.toUpperCase()}`}
    >
      {children ?? <DownloadIcon size={14} />}
    </button>
  );
};

export type TableDownloadDropdownProps = {
  children?: React.ReactNode;
  className?: string;
  onDownload?: (format: 'csv' | 'markdown') => void;
  onError?: (error: Error) => void;
};

export const TableDownloadDropdown = ({
  children,
  className,
  onDownload,
  onError,
}: TableDownloadDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const downloadTableData = (format: 'csv' | 'markdown') => {
    try {
      const tableWrapper = dropdownRef.current?.closest('[data-streamdown="table-wrapper"]');
      const tableElement = tableWrapper?.querySelector("table") as HTMLTableElement;

      if (!tableElement) {
        onError?.(new Error("Table not found"));
        return;
      }

      const tableData = extractTableDataFromElement(tableElement);
      let content = "";
      let mimeType = "";

      switch (format) {
        case "csv":
          content = tableDataToCSV(tableData);
          mimeType = "text/csv";
          break;
        case "markdown":
          content = tableDataToMarkdown(tableData);
          mimeType = "text/markdown";
          break;
      }
      
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `table.${format === 'csv' ? 'csv' : 'md'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsOpen(false);
      onDownload?.(format);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        className={cn("text-muted-foreground p-1 transition-all", className)}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        title="Download table"
      >
        {children ?? <DownloadIcon size={14} />}
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-md shadow-lg z-10 min-w-[120px]">
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
            onClick={() => downloadTableData('csv')}
            type="button"
          >
            CSV
          </button>
          <button
            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
            onClick={() => downloadTableData('markdown')}
            type="button"
          >
            Markdown
          </button>
        </div>
      )}
    </div>
  );
};