import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { validateInvite, redeemInvite } from '@/lib/invites.functions';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, AlertCircle, Building2 } from 'lucide-react';

export const Route = createFileRoute('/invite/$token')({
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const validateFn = useServerFn(validateInvite);
  const redeemFn = useServerFn(redeemInvite);

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [reason, setReason] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    full_name: '', email: '', password: '',
    // collaborator
    cpf: '', birth_date: '', role_function: '',
    // client
    company_name: '', cnpj: '', industry: '', phone: '',
  });

  useEffect(() => {
    validateFn({ data: { token } })
      .then((r) => {
        if (r.valid) { setStatus('valid'); setRole(r.role); }
        else { setStatus('invalid'); setReason(r.reason); }
      })
      .catch(() => { setStatus('invalid'); setReason('error'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const isClient = role === 'client';

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Senha precisa ter no mínimo 8 caracteres'); return; }
    setSubmitting(true);
    try {
      if (isClient) {
        await redeemFn({ data: {
          kind: 'client', token,
          email: form.email, password: form.password, full_name: form.full_name,
          company_name: form.company_name, cnpj: form.cnpj,
          industry: form.industry, phone: form.phone,
        } });
      } else {
        await redeemFn({ data: {
          kind: 'collaborator', token,
          email: form.email, password: form.password, full_name: form.full_name,
          cpf: form.cpf, birth_date: form.birth_date, role_function: form.role_function,
        } });
      }
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: form.email, password: form.password,
      });
      if (signErr) throw signErr;
      toast.success('Cadastro concluído! Bem-vindo.');
      navigate({ to: '/dashboard' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro no cadastro');
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'invalid') {
    const messages: Record<string, string> = {
      not_found: 'Este link de convite não existe.',
      inactive: 'Este convite foi desativado.',
      expired: 'Este convite expirou.',
      exhausted: 'Este convite já atingiu o limite de cadastros.',
      error: 'Erro ao validar o convite.',
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Convite inválido</CardTitle>
            <CardDescription>{messages[reason] || 'Convite inválido.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate({ to: '/login' })}>Ir para o login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = isClient ? Building2 : ShieldCheck;
  const roleLabel = isClient
    ? 'Acesso Cliente'
    : `Acesso ${role === 'master' ? 'Administrador' : role}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary mb-2">
            <Icon className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-wide">{roleLabel}</span>
          </div>
          <CardTitle>Complete seu cadastro</CardTitle>
          <CardDescription>
            {isClient
              ? 'Preencha os dados da sua empresa para acessar o portal.'
              : 'Preencha seus dados para acessar o sistema.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">{isClient ? 'Seu nome' : 'Nome completo'}</Label>
              <Input id="full_name" required maxLength={120} value={form.full_name} onChange={update('full_name')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required maxLength={255} value={form.email} onChange={update('email')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha (mínimo 8 caracteres)</Label>
              <Input id="password" type="password" required minLength={8} maxLength={72} value={form.password} onChange={update('password')} />
            </div>

            {isClient ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="company_name">Nome da empresa</Label>
                  <Input id="company_name" required maxLength={200} value={form.company_name} onChange={update('company_name')} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input id="cnpj" required maxLength={20} placeholder="00.000.000/0000-00" value={form.cnpj} onChange={update('cnpj')} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" maxLength={30} value={form.phone} onChange={update('phone')} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="industry">Segmento / Indústria</Label>
                  <Input id="industry" maxLength={120} placeholder="Ex: Arquitetura" value={form.industry} onChange={update('industry')} />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input id="cpf" required maxLength={20} value={form.cpf} onChange={update('cpf')} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="birth_date">Data de nascimento</Label>
                    <Input id="birth_date" type="date" required value={form.birth_date} onChange={update('birth_date')} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role_function">Função / Cargo</Label>
                  <Input id="role_function" required maxLength={120} value={form.role_function} onChange={update('role_function')} />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar conta e entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
