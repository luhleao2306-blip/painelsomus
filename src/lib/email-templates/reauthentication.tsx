import * as React from 'react'

import { Text } from '@react-email/components'
import { EmailLayout, colors, noteBox, noteText, paragraph } from './_layout'

interface ReauthenticationEmailProps {
  token: string
}

const code = {
  fontSize: '32px',
  fontWeight: 700 as const,
  letterSpacing: '0.32em',
  color: colors.ink,
  margin: '4px 0 20px',
  textAlign: 'center' as const,
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailLayout
    preview="Seu código de verificação Somus"
    eyebrow="Verificação em duas etapas"
    title="Seu código de verificação"
    siteName="Somus Hub"
  >
    <Text style={paragraph}>
      Use o código abaixo para concluir a verificação da sua identidade.
    </Text>
    <Text style={code}>{token}</Text>
    <div style={noteBox}>
      <Text style={noteText}>
        O código expira em poucos minutos. Nunca compartilhe este código com
        outras pessoas.
      </Text>
    </div>
  </EmailLayout>
)

export default ReauthenticationEmail
