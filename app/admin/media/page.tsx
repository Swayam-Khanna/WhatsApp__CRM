"use client";

import { useState, useEffect, useRef } from "react";
import {
  Folder,
  FolderOpen,
  Package,
  UserCheck,
  ShieldAlert,
  Award,
  Sprout,
  FileText,
  Star,
  User,
  Megaphone,
  Upload,
  Trash2,
  Copy,
  ExternalLink,
  File as FileIcon,
  Check,
  Search,
  HardDrive,
  RefreshCw,
  ArrowLeft,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { adminFetch } from "@/lib/api/admin-auth.client";

interface StorageFolder {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  allowedMimeTypes: string[];
  maxSizeMb: number;
  fileCount: number;
  totalBytes: number;
}

interface MediaAsset {
  id: string;
  folder: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  entityType?: string;
  entityId?: string;
  uploadedBy?: string;
  createdAt: string;
}

const FOLDER_ICON_MAP: Record<string, React.ElementType> = {
  Package,
  UserCheck,
  ShieldAlert,
  Award,
  Sprout,
  FileText,
  Star,
  User,
  Megaphone,
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function AdminMediaPage() {
  const [folders, setFolders] = useState<StorageFolder[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async (folderSlug?: string | null) => {
    setLoading(true);
    try {
      const url = folderSlug
        ? `/api/admin/media?folder=${encodeURIComponent(folderSlug)}`
        : "/api/admin/media";
      const res = await adminFetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.folders)) setFolders(data.folders);
        if (Array.isArray(data.assets)) setAssets(data.assets);
      } else {
        toast.error("Failed to load media assets");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error loading media");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(selectedFolder);
  }, [selectedFolder]);

  const handleSelectFolder = (folderSlug: string) => {
    setSelectedFolder(folderSlug);
  };

  const handleCopyUrl = (url: string, id: string) => {
    const fullUrl = window.location.origin + url;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    toast.success("URL copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteAsset = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const res = await adminFetch(`/api/admin/media?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("File deleted successfully");
        setAssets((prev) => prev.filter((a) => a.id !== id));
        void loadData(selectedFolder);
      } else {
        toast.error("Failed to delete file");
      }
    } catch (e: any) {
      toast.error(e.message || "Error deleting file");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const targetFolder = selectedFolder || "products";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", targetFolder);

    setUploading(true);
    try {
      const res = await adminFetch("/api/admin/media", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Uploaded ${file.name} to ${targetFolder}`);
        void loadData(selectedFolder);
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Failed to upload file");
      }
    } catch (err: any) {
      toast.error(err.message || "Upload error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Totals
  const totalFiles = folders.reduce((acc, f) => acc + f.fileCount, 0);
  const totalStorage = folders.reduce((acc, f) => acc + f.totalBytes, 0);

  // Filtered Assets in active view
  const filteredAssets = assets.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.fileName.toLowerCase().includes(q) ||
      (a.originalName && a.originalName.toLowerCase().includes(q)) ||
      (a.entityType && a.entityType.toLowerCase().includes(q))
    );
  });

  const activeFolderConfig = folders.find((f) => f.slug === selectedFolder);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HardDrive className="h-6 w-6 text-emerald-600" />
            Media & File Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Standardized folder architecture backed by Neon PostgreSQL asset catalog
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : selectedFolder ? `Upload to ${activeFolderConfig?.name || selectedFolder}` : "Upload File"}
          </button>
          <button
            onClick={() => void loadData(selectedFolder)}
            className="p-2 border rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border rounded-xl p-4 bg-card shadow-sm">
          <div className="text-sm text-muted-foreground font-medium">Standardized Folders</div>
          <div className="text-2xl font-bold text-foreground mt-1">{folders.length} Folders</div>
          <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            <Check className="h-3 w-3" /> Fully mapped & validated
          </div>
        </div>
        <div className="border rounded-xl p-4 bg-card shadow-sm">
          <div className="text-sm text-muted-foreground font-medium">Total Files Cataloged</div>
          <div className="text-2xl font-bold text-foreground mt-1">{totalFiles} Assets</div>
          <div className="text-xs text-muted-foreground mt-1">Tracked in Neon DB</div>
        </div>
        <div className="border rounded-xl p-4 bg-card shadow-sm">
          <div className="text-sm text-muted-foreground font-medium">Total Volume</div>
          <div className="text-2xl font-bold text-foreground mt-1">{formatFileSize(totalStorage)}</div>
          <div className="text-xs text-muted-foreground mt-1">Stored in persistent uploads</div>
        </div>
      </div>

      {/* Breadcrumb / Navigation */}
      {selectedFolder ? (
        <div className="flex items-center gap-2 text-sm bg-accent/40 p-3 rounded-lg border">
          <button
            onClick={() => setSelectedFolder(null)}
            className="font-medium text-emerald-600 hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> All Folders
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4 text-emerald-600" />
            {activeFolderConfig?.name || selectedFolder}
          </span>
          <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground ml-auto">
            Path: <code className="font-mono">/uploads/{selectedFolder}/</code>
          </span>
        </div>
      ) : (
        <div className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Folder className="h-4 w-4 text-emerald-600" />
          Storage Folders Directory
        </div>
      )}

      {/* VIEW 1: Folder Grid (when no folder is selected) */}
      {!selectedFolder && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folder) => {
            const IconComp = FOLDER_ICON_MAP[folder.icon] || Folder;
            return (
              <div
                key={folder.slug}
                onClick={() => handleSelectFolder(folder.slug)}
                className="group border rounded-xl p-5 bg-card hover:bg-accent/40 hover:border-emerald-500/50 cursor-pointer transition-all shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <IconComp className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                      {folder.fileCount} {folder.fileCount === 1 ? "file" : "files"}
                    </span>
                  </div>
                  <h3 className="font-semibold text-base text-foreground group-hover:text-emerald-600 transition-colors">
                    {folder.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {folder.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span>/{folder.slug}/</span>
                  <span className="font-sans font-medium">{formatFileSize(folder.totalBytes)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: Assets in Active Folder (or Search) */}
      {(selectedFolder || searchQuery) && (
        <div className="space-y-4">
          {/* Search bar within folder */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search files by name or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {filteredAssets.length === 0 ? (
            <div className="border border-dashed rounded-xl p-12 text-center text-muted-foreground bg-accent/20">
              <FileIcon className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="font-medium">No files found in this folder</p>
              <p className="text-xs mt-1">Upload a file using the button above to store it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredAssets.map((asset) => {
                const isImage = asset.mimeType.startsWith("image/");
                return (
                  <div
                    key={asset.id}
                    className="border rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between group"
                  >
                    {/* Thumbnail / Preview */}
                    <div className="aspect-square bg-muted/40 relative flex items-center justify-center overflow-hidden border-b">
                      {isImage ? (
                        <img
                          src={asset.fileUrl}
                          alt={asset.originalName || asset.fileName}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                      ) : (
                        <FileText className="h-12 w-12 text-muted-foreground/60" />
                      )}
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-3">
                      <div className="font-medium text-xs text-foreground truncate" title={asset.originalName || asset.fileName}>
                        {asset.originalName || asset.fileName}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex justify-between">
                        <span>{formatFileSize(asset.sizeBytes)}</span>
                        <span className="capitalize">{asset.folder.split("/")[0]}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 mt-2.5 pt-2 border-t justify-end">
                        <button
                          onClick={() => handleCopyUrl(asset.fileUrl, asset.id)}
                          className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                          title="Copy public URL"
                        >
                          {copiedId === asset.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <a
                          href={asset.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                          title="View file"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteAsset(asset.id, asset.originalName || asset.fileName)}
                          className="p-1.5 hover:bg-red-50 rounded text-muted-foreground hover:text-red-600 transition-colors"
                          title="Delete file"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
