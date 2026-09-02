export interface EmailMessage {
  to: { address: string; name?: string }
  subject: string
  text: string
}

/**
 * Infrastructure boundary used by application services. It intentionally knows nothing about
 * meetings, visitors, invitations, or Prisma.
 */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>
}

export interface DeliveryLogger {
  info(context: Record<string, unknown>, message: string): void
  error(context: Record<string, unknown>, message: string): void
}

export const consoleDeliveryLogger: DeliveryLogger = {
  info: (context, message) => console.info(message, context),
  error: (context, message) => console.error(message, context),
}

/** Development/test default. It deliberately never logs body/link content or raw tokens. */
export class LoggingEmailSender implements EmailSender {
  constructor(private readonly logger: DeliveryLogger = consoleDeliveryLogger) {}

  async send(message: EmailMessage): Promise<void> {
    this.logger.info({ recipient: message.to.address, subject: message.subject }, "E-posta log delivery ile işlendi.")
  }
}
