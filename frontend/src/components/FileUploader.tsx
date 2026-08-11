"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileSpreadsheet, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onUpload: (file: File) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
}

export function FileUploader({ 
  onUpload, 
  accept = {
    'text/csv': ['.csv'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls']
  },
  maxSize = 10485760 // 10MB
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    if (rejectedFiles.length > 0) {
      setError(rejectedFiles[0].errors[0]?.message || "Invalid file");
      return;
    }
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setStatus("idle");
      setProgress(0);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles: 1,
  });

  const handleUpload = () => {
    if (!file) return;
    
    setStatus("uploading");
    
    // Simulate upload progress
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setStatus("success");
        onUpload(file);
        
        // Reset after 3 seconds
        setTimeout(() => {
          setFile(null);
          setStatus("idle");
          setProgress(0);
        }, 3000);
      }
    }, 200);
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith(".csv")) return <FileText size={32} className="text-blue-500" />;
    if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) return <FileSpreadsheet size={32} className="text-green-500" />;
    return <FileText size={32} className="text-slate-500" />;
  };

  return (
    <div className="w-full space-y-4">
      <div 
        {...getRootProps()} 
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[250px]",
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/50",
          status === "uploading" && "opacity-50 pointer-events-none"
        )}
      >
        <input {...getInputProps()} />
        
        {!file ? (
          <>
            <div className="p-4 rounded-full bg-secondary mb-4">
              <UploadCloud size={32} className="text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">
              {isDragActive ? "Drop file here" : "Drag & drop file here"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse from your computer
            </p>
            <div className="text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-md">
              Supported formats: CSV, XLSX (Max 10MB)
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center animate-fade-in">
            {getFileIcon(file.name)}
            <h3 className="text-md font-semibold mt-3 mb-1 truncate max-w-xs">{file.name}</h3>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            
            {status === "idle" && (
              <button 
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="mt-4 text-xs text-destructive hover:underline"
              >
                Remove file
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
          <AlertCircle size={16} className="mr-2 shrink-0" />
          {error}
        </div>
      )}

      {file && status !== "success" && (
        <button
          onClick={handleUpload}
          disabled={status === "uploading"}
          className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-70"
        >
          {status === "uploading" ? "Uploading..." : "Upload Dataset"}
        </button>
      )}

      {status === "uploading" && (
        <div className="w-full bg-secondary rounded-full h-2 mt-2 overflow-hidden">
          <div 
            className="bg-primary h-2 transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {status === "success" && (
        <div className="flex items-center justify-center text-green-500 text-sm bg-green-500/10 p-3 rounded-lg border border-green-500/20">
          <CheckCircle2 size={16} className="mr-2 shrink-0" />
          Upload completed successfully!
        </div>
      )}
    </div>
  );
}
