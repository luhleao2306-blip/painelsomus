import * as React from 'react'

import { Text } from '@react-email/components'
import { CtaBlock, EmailLayout, noteBox, noteText, paragraph } from './_layout'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <EmailLayout
    preview={`Seu link de acesso ao ${siteName}`}
    eyebrow="Acesso rápido"
    title="Seu link de acesso"
    siteName={siteName}
  >
    <Text style={paragraph}>
      Use o botão abaixo para entrar no <strong>{siteName}</strong> sem digitar
      senha.
    </Text>
    <CtaBlock href={confirmationUrl} label="Entrar no portal" />
    <div style={noteBox}>
      <Text style={noteText}>
        O link expira em 1 hora e funciona apenas uma vez. Não compartilhe com
        ninguém.
      </Text>
    </div>
  </EmailLayout>
)

export default MagicLinkEmail
