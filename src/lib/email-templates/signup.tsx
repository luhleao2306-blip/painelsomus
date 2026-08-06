import * as React from 'react'

import { Text } from '@react-email/components'
import { CtaBlock, EmailLayout, noteBox, noteText, paragraph } from './_layout'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, recipient, confirmationUrl }: SignupEmailProps) => (
  <EmailLayout
    preview={`Confirme seu acesso ao ${siteName}`}
    eyebrow="Confirmação de cadastro"
    title="Confirme seu acesso"
    siteName={siteName}
  >
    <Text style={paragraph}>
      Olá{recipient ? `, ${recipient}` : ''}! Sua conta no <strong>{siteName}</strong>{' '}
      foi criada. Confirme seu e-mail para liberar o acesso ao portal.
    </Text>
    <CtaBlock href={confirmationUrl} label="Confirmar meu e-mail" />
    <div style={noteBox}>
      <Text style={noteText}>
        Se você não criou esta conta, basta ignorar este e-mail — nenhum acesso
        será liberado.
      </Text>
    </div>
  </EmailLayout>
)

export default SignupEmail
