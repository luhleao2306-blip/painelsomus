# Plan - Fix and Enhance Operations Forms

The user reported that "this forms part is not working." Based on investigation, there are two distinct form systems: "Visão de Clientes" (managed via `src/routes/formularios.tsx`) and the "Operações Formulários" (managed via `src/routes/operacoes.formularios.tsx`). The latter allows creating custom forms but lacks a robust submission mechanism and real-time syncing of submissions.

## User Review Required

> [!IMPORTANT]
> I found two separate form areas in your system. Which one exactly is not working for you?
> 1. The **"Visão de Clientes"** (Strategic forms sent to clients)?
> 2. The **"Formulários de Operações"** (Custom forms you create yourself)?
>
> I will proceed with fixing the custom forms in Operations as they appear to be missing the real-time submission link to the database.

## Proposed Changes

### Database & Backend
- Add `client_id`, `contact_name`, and `contact_email` to `public_form_submissions` table if missing (verified in RPC, but need to check table schema).
- Ensure `public_form_shares` can store custom form definitions.

### Frontend - Operations Forms (`src/routes/operacoes.formularios.tsx`)
- Fix the `ShareLinkDialog` to correctly generate and store public share links in the database.
- Update the submission list to pull from `public_form_submissions` in real-time.
- Standardize the UI to match the "Somus" premium dark/noir aesthetic.

### Frontend - Public Form Page (`src/routes/f.$data.tsx`)
- Ensure it handles both legacy (Base64) and token-based (Database) forms correctly.
- Fix the submission logic to use the `submit_public_form` RPC properly.

## Technical Details

- **RPC Fix**: Ensure `submit_public_form` handles all fields required by the Operations forms.
- **Store Sync**: Ensure `opStore` in `src/lib/operacoes-store.ts` correctly handles `formAnswers` and triggers re-renders when new submissions arrive.
- **Permissions**: Verify that `anon` users can indeed execute the submission RPC and that RLS allows the `authenticated` users to read those submissions.
