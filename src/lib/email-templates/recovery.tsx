import * as React from 'react'

import { Text } from '@react-email/components'
import { CtaBlock, EmailLayout, noteBox, noteText, paragraph } from './_layout'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <EmailLayout
    preview={`Redefina sua senha do ${siteName}`}
    eyebrow="Segurança da conta"
    title="Redefinir sua senha"
    siteName={siteName}
  >
    <Text style={paragraph}>
      Recebemos um pedido para redefinir a senha da sua conta no{' '}
      <strong>{siteName}</strong>. Clique no botão abaixo para criar uma nova senha.
    </Text>
    <CtaBlock href={confirmationUrl} label="Criar nova senha" />
    <div style={noteBox}>
      <Text style={noteText}>
        Por segurança, este link expira em 1 hora e só pode ser usado uma vez. Se
        você não pediu a redefinição, sua senha atual continua válida.
      </Text>
    </div>
  </EmailLayout>
)

export default RecoveryEmail
