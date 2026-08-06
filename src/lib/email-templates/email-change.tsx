import * as React from 'react'

import { Text } from '@react-email/components'
import { CtaBlock, EmailLayout, noteBox, noteText, paragraph } from './_layout'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <EmailLayout
    preview={`Confirme a alteração de e-mail no ${siteName}`}
    eyebrow="Segurança da conta"
    title="Confirmar novo e-mail"
    siteName={siteName}
  >
    <Text style={paragraph}>
      Recebemos um pedido para alterar o e-mail da sua conta no{' '}
      <strong>{siteName}</strong>.
    </Text>
    <div style={noteBox}>
      <Text style={noteText}>
        <strong>De:</strong> {oldEmail || email}
        <br />
        <strong>Para:</strong> {newEmail}
      </Text>
    </div>
    <CtaBlock href={confirmationUrl} label="Confirmar alteração" />
    <Text style={paragraph}>
      Se você não solicitou essa mudança, ignore este e-mail e o endereço atual
      será mantido.
    </Text>
  </EmailLayout>
)

export default EmailChangeEmail
