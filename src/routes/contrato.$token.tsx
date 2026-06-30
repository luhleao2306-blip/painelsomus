import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { getContractByToken, signContract } from '@/lib/contracts.functions';
import { ContractTemplate } from '@/components/ContractTemplate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, CheckCircle2, AlertCircle, FileSignature, Lock } from 'lucide-react';
import somusLogoUrl from '@/assets/somus-logo.png';
import { SignaturePad } from '@/components/SignaturePad';

export const Route = createFileRoute('/contrato/$token')({
  head: () => ({
    meta: [
      { title: 'Contrato Somus — Revise e assine' },
      { name: 'description', content: 'Documento exclusivo e seguro da Somus para revisão e assinatura eletrônica.' },
      { property: 'og:title', content: 'Contrato Somus — Revise e assine' },
      { property: 'og:description', content: 'Documento exclusivo e seguro da Somus para revisão e assinatura eletrônica.' },
    ],
  }),
  component: ContractSignPage,
});

function maskCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function ContractSignPage() {
  const { token } = Route.useParams();
  const getFn = useServerFn(getContractByToken);
  const signFn = useServerFn(signContract);

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success'>('loading');
  const [reason, setReason] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [accepted, setAccepted] = useState(false);
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [signatureImg, setSignatureImg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const contractRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getFn({ data: { token } })
      .then((r: any) => {
        if (r.valid) { setData(r.contract); setStatus('valid'); }
        else { setReason(r.reason || ''); setStatus('invalid'); }
      })
      .catch(() => setStatus('invalid'));
  }, [token, getFn]);

  async function onSign() {
    if (!accepted) return toast.error('Você precisa marcar a concordância com os termos.');
    if (name.trim().length < 3) return toast.error('Informe seu nome completo.');
    if (cpf.replace(/\D/g, '').length !== 11) return toast.error('CPF inválido.');
    if (!signatureImg) return toast.error('Desenhe sua assinatura no quadro abaixo.');
    setSubmitting(true);
    try {
      const baseHtml = contractRef.current?.innerHTML || '';
      const signatureBlock = `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;"><img src="${signatureImg}" alt="Assinatura" style="max-height:120px;display:inline-block;" /><div style="font-size:12px;color:#475569;margin-top:6px;">${name.trim()} — CPF ${cpf}</div></div>`;
      const html = baseHtml + signatureBlock;
      await signFn({ data: { token, name: name.trim(), cpf, html } });
      setStatus('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao assinar');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return (
      <Shell>
        <div className="py-24 text-center">
          <Loader2 className="h-7 w-7 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Carregando contrato…</p>
        </div>
      </Shell>
    );
  }

  if (status === 'invalid') {
    return (
      <Shell>
        <Card className="max-w-lg mx-auto border-destructive/30 shadow-xl">
          <CardContent className="p-10 text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="font-display text-2xl">Link indisponível</h2>
            <p className="text-muted-foreground text-sm">
              {reason === 'signed'
                ? 'Este contrato já foi assinado.'
                : 'O link de assinatura é inválido, foi cancelado ou expirou. Entre em contato com a equipe Somus.'}
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (status === 'success') {
    return (
      <Shell>
        <Card className="max-w-lg mx-auto border-primary/30 shadow-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary via-primary/70 to-primary" />
          <CardContent className="p-10 text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center ring-8 ring-primary/5">
              <CheckCircle2 className="h-9 w-9 text-primary" />
            </div>
            <h2 className="font-display text-3xl">Contrato assinado!</h2>
            <p className="text-muted-foreground">
              Recebemos sua assinatura com sucesso. Em breve a equipe Somus vai liberar o seu acesso à plataforma
              e você receberá um e-mail com o link para criar a sua senha.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Documento exclusivo e seguro
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
            Revise e assine seu contrato
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Confira atentamente os dados abaixo. Ao assinar você concorda com todos os termos do contrato.
          </p>
        </div>

        <Card className="overflow-hidden shadow-xl">
          <div className="max-h-[680px] overflow-y-auto bg-neutral-50 p-4 md:p-8">
            <div ref={contractRef}>
              <ContractTemplate
                contractor={data.contractor_snapshot || {}}
                commercial={data.commercial_data || {}}
              />
            </div>
          </div>
        </Card>

        <Card className="shadow-xl">
          <CardContent className="p-6 md:p-8 space-y-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileSignature className="h-4 w-4 text-primary" /> Assinatura eletrônica
            </div>

            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <Checkbox checked={accepted} onCheckedChange={(c) => setAccepted(!!c)} className="mt-0.5" />
              <span>Li e concordo com todos os termos e condições do contrato acima.</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nome completo *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" />
              </div>
              <div>
                <Label>CPF *</Label>
                <Input value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} placeholder="000.000.000-00" />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Assinatura *</Label>
              <SignaturePad value={signatureImg} onChange={setSignatureImg} />
            </div>

            <Button onClick={onSign} disabled={submitting} size="lg" className="w-full md:w-auto shadow-lg shadow-primary/20">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileSignature className="h-4 w-4 mr-2" />}
              Assinar e Enviar
            </Button>

            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Sua assinatura será registrada com data, hora e IP de origem.
            </p>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      </div>
      <header className="relative border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <img src={somusLogoUrl} alt="Somus" className="h-8 w-auto dark:invert" />
          <div className="hidden md:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Conexão segura
          </div>
        </div>
      </header>
      <main className="relative max-w-6xl mx-auto px-6 py-10 md:py-14">{children}</main>
      <footer className="relative border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Somus — Todos os direitos reservados
      </footer>
    </div>
  );
}
