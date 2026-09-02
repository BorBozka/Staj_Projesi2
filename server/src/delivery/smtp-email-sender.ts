import nodemailer from "nodemailer"

import type { EmailMessage, EmailSender } from "./email-sender.js"

export interface SmtpEmailSenderOptions {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  fromAddress: string
  fromName: string
}

/** SMTP is isolated here so use-cases only depend on EmailSender. */
export class SmtpEmailSender implements EmailSender {
  private readonly transport: nodemailer.Transporter

  constructor(private readonly options: SmtpEmailSenderOptions) {
    this.transport = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: { user: options.user, pass: options.password },
    })
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transport.sendMail({
      from: { address: this.options.fromAddress, name: this.options.fromName },
      to: { address: message.to.address, name: message.to.name },
      subject: message.subject,
      text: message.text,
    })
  }
}
