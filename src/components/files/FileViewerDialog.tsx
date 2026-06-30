import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink, Download, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useData } from '@/contexts/DataContext';

interface ViewerItem {
  id: string;
  name: string;
  type?: string;
  filePath?: string | null;
  externalLink?: string | null;
  downloadEnabled?: boolean;
}

interface FileViewerDialogProps {
  item: ViewerItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowDownload?: boolean;
}

export function FileViewerDialog({ item, open, onOpenChange, allowDownload = true }: FileViewerDialogProps) {
  const { getDownloadUrl } = useData();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!item || !open) {
        setUrl(null);
        return;
      }
      if (item.filePath) {
        setLoading(true);
        const u = await getDownloadUrl(item.filePath);
        if (!cancelled) {
          setUrl(u);
          setLoading(false);
        }
      } else if (item.externalLink) {
        setUrl(item.externalLink);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [item, open, getDownloadUrl]);

  if (!item) return null;

  const isImage = item.type?.toUpperCase() === 'IMAGE' || /\.(png|jpe?g|gif|webp|svg)$/i.test(item.filePath || '');
  const isPdf = item.type?.toUpperCase() === 'PDF' || /\.pdf$/i.test(item.filePath || '');
  const canEmbed = !!url && (isImage || isPdf || !!item.filePath);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base truncate pr-4">{item.name}</DialogTitle>
          <div className="flex items-center gap-2">
            {allowDownload && url && item.filePath && (
              <Button variant="outline" size="sm" asChild>
                <a href={url} download={item.name}>
                  <Download className="h-3.5 w-3.5 mr-1" /> Baixar
                </a>
              </Button>
            )}
            {item.externalLink && (
              <Button variant="ghost" size="sm" asChild>
                <a href={item.externalLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir externo
                </a>
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 bg-muted/20 overflow-auto flex items-center justify-center">
          {loading && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
          {!loading && url && isImage && (
            <img src={url} alt={item.name} className="max-w-full max-h-full object-contain" />
          )}
          {!loading && url && !isImage && canEmbed && (
            <iframe src={url} title={item.name} className="w-full h-full border-0 bg-background" />
          )}
          {!loading && !url && (
            <p className="text-sm text-muted-foreground p-8 text-center">
              Não há visualização interna disponível para este item.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
