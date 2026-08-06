import * as React from 'react'

import { Text } from '@react-email/components'
import { CtaBlock, EmailLayout, noteBox, noteText, paragraph } from './_layout'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, confirmationUrl }: InviteEmailProps) => (
  <EmailLayout
    preview={`Você foi convidado para o ${siteName}`}
    eyebrow="Convite de acesso"
    title="Você foi convidado"
    siteName={siteName}
  >
    <Text style={paragraph}>
      A equipe Somus criou um acesso para você no <strong>{siteName}</strong>.
      Aceite o convite abaixo para definir sua senha e entrar no portal.
    </Text>
    <CtaBlock href={confirmationUrl} label="Aceitar convite" />
    <div style={noteBox}>
      <Text style={noteText}>
        Se você não esperava este convite, pode ignorar este e-mail.
      </Text>
    </div>
  </EmailLayout>
)

export default InviteEmail
