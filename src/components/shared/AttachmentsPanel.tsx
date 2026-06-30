import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { Button } from '@/components/ui/button';
import { Paperclip, Upload, Download, Trash2, Loader2, FileIcon } from 'lucide-react';
import { toast } from 'sonner';

type Attachment = {
  id: string;
  entity_type: string;
  entity_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
};

const BUCKET = 'entity-attachments';
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

function humanSize(n: number | null) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachmentsPanel({
  entityType,
  entityId,
}: {
  entityType: 'task' | 'project';
  entityId: string;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);
  const user = userId ? { id: userId } : null;
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('entity_attachments')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });
    if (error) toast.error('Falha ao carregar anexos.');
    setItems((data as Attachment[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (entityId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!user?.id) {
      toast.error('Faça login para enviar anexos.');
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name}: excede o limite de 25 MB.`);
          continue;
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${entityType}/${entityId}/${Date.now()}_${safeName}`;
        const up = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });
        if (up.error) {
          toast.error(`Falha no upload: ${file.name}`);
          continue;
        }
        const ins = await supabase.from('entity_attachments').insert({
          entity_type: entityType,
          entity_id: entityId,
          file_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          uploaded_by: user.id,
        });
        if (ins.error) {
          toast.error(`Falha ao registrar: ${file.name}`);
          await supabase.storage.from(BUCKET).remove([path]);
        }
      }
      await load();
      toast.success('Anexos enviados!');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDownload = async (a: Attachment) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(a.file_path, 60);
    if (error || !data?.signedUrl) {
      toast.error('Não foi possível gerar o link.');
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  const handleDelete = async (a: Attachment) => {
    if (!confirm(`Remover "${a.file_name}"?`)) return;
    const del = await supabase.from('entity_attachments').delete().eq('id', a.id);
    if (del.error) {
      toast.error('Falha ao remover.');
      return;
    }
    await supabase.storage.from(BUCKET).remove([a.file_path]);
    setItems((prev) => prev.filter((x) => x.id !== a.id));
    toast.success('Anexo removido.');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Arquivos, imagens e documentos. Até 25 MB por arquivo.
        </p>
        <Button
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          Enviar
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum anexo enviado ainda.</p>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
            >
              {a.mime_type?.startsWith('image/') ? (
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              ) : (
                <FileIcon className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {humanSize(a.size_bytes)} • {new Date(a.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDownload(a)} title="Baixar">
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(a)}
                title="Remover"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
