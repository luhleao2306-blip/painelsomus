import * as React from 'react'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

export const colors = {
  ink: '#0A0A0A',
  body: '#3F3F46',
  muted: '#8A8A93',
  line: '#E7E7EA',
  panel: '#FAFAFA',
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  margin: '0',
  padding: '0',
}

const outer = {
  width: '100%',
  padding: '32px 12px 48px',
  backgroundColor: '#F4F4F5',
}

const card = {
  maxWidth: '560px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  border: `1px solid ${colors.line}`,
  borderRadius: '16px',
  overflow: 'hidden' as const,
}

const brandBar = {
  backgroundColor: colors.ink,
  padding: '22px 32px',
}

const wordmark = {
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 700 as const,
  letterSpacing: '0.32em',
  margin: '0',
  textTransform: 'uppercase' as const,
}

const brandSub = {
  color: 'rgba(255,255,255,0.55)',
  fontSize: '10px',
  letterSpacing: '0.28em',
  textTransform: 'uppercase' as const,
  margin: '6px 0 0',
}

const inner = { padding: '36px 32px 8px' }

const eyebrowStyle = {
  fontSize: '10px',
  letterSpacing: '0.28em',
  textTransform: 'uppercase' as const,
  color: colors.muted,
  margin: '0 0 12px',
  fontWeight: 600 as const,
}

const h1 = {
  fontSize: '26px',
  lineHeight: '1.2',
  fontWeight: 600 as const,
  color: colors.ink,
  margin: '0 0 16px',
  letterSpacing: '-0.02em',
}

export const paragraph = {
  fontSize: '15px',
  lineHeight: '1.65',
  color: colors.body,
  margin: '0 0 18px',
}

export const button = {
  display: 'inline-block',
  backgroundColor: colors.ink,
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600 as const,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none',
}

export const linkFallback = {
  fontSize: '12px',
  lineHeight: '1.6',
  color: colors.muted,
  wordBreak: 'break-all' as const,
  margin: '0 0 4px',
}

export const noteBox = {
  backgroundColor: colors.panel,
  border: `1px solid ${colors.line}`,
  borderRadius: '12px',
  padding: '14px 16px',
  margin: '4px 0 8px',
}

export const noteText = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: colors.body,
  margin: '0',
}

const hr = { borderColor: colors.line, margin: '28px 0 18px' }

const footerText = {
  fontSize: '11px',
  lineHeight: '1.7',
  color: colors.muted,
  margin: '0 0 4px',
}

const footerWrap = { padding: '0 32px 30px' }

export const EmailLayout = ({
  preview,
  eyebrow,
  title,
  siteName,
  children,
}: {
  preview: string
  eyebrow: string
  title: React.ReactNode
  siteName: string
  children: React.ReactNode
}) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Section style={outer}>
        <Container style={card}>
          <Section style={brandBar}>
            <Text style={wordmark}>Somus</Text>
            <Text style={brandSub}>Somus Hub · Portal</Text>
          </Section>

          <Section style={inner}>
            <Text style={eyebrowStyle}>{eyebrow}</Text>
            <Heading style={h1}>{title}</Heading>
            {children}
            <Hr style={hr} />
          </Section>

          <Section style={footerWrap}>
            <Text style={footerText}>
              Este é um e-mail automático do {siteName}. Se você não solicitou,
              pode ignorá-lo com segurança.
            </Text>
            <Text style={footerText}>
              © 2026 Somus Group ·{' '}
              <Link href="https://portal.somus.group" style={{ color: colors.muted }}>
                portal.somus.group
              </Link>
            </Text>
          </Section>
        </Container>
      </Section>
    </Body>
  </Html>
)

export const CtaBlock = ({ href, label }: { href: string; label: string }) => (
  <>
    <Section style={{ margin: '6px 0 24px' }}>
      <Link href={href} style={button}>
        {label}
      </Link>
    </Section>
    <Text style={linkFallback}>
      Se o botão não funcionar, copie e cole este link no navegador:
    </Text>
    <Text style={linkFallback}>
      <Link href={href} style={{ color: colors.body }}>
        {href}
      </Link>
    </Text>
  </>
)
