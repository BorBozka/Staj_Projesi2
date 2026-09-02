import type { EmailDeliveryConfig } from "../config/env.js"
import { LoggingEmailSender, type DeliveryLogger, type EmailSender } from "./email-sender.js"
import { SmtpEmailSender } from "./smtp-email-sender.js"

export function createEmailSender(config: EmailDeliveryConfig, logger?: DeliveryLogger): EmailSender {
  if (config.mode === "log") return new LoggingEmailSender(logger)
  return new SmtpEmailSender({ ...config.smtp, fromAddress: config.fromAddress, fromName: config.fromName })
}
