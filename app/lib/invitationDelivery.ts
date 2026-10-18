import type { HouseholdAccessRole } from "./database";
export type InvitationDelivery = "not_configured" | "sent" | "failed";
export interface InvitationMessage {
  email: string;
  name: string;
  url: string;
  accessRole: HouseholdAccessRole;
  apiKey?: string;
  from?: string;
  gmailUser?: string;
  gmailPassword?: string;
}
export interface SmtpMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
}
export type SmtpSender = (
  message: SmtpMessage,
  credentials: { user: string; pass: string },
) => Promise<boolean>;
async function gmailSender(
  message: SmtpMessage,
  credentials: { user: string; pass: string },
): Promise<boolean> {
  const { default: nodemailer } = await import("nodemailer");
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: credentials,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  try {
    const result = await transport.sendMail(message);
    return result.accepted.some(
      (recipient: string | { address: string }) =>
        (typeof recipient === "string"
          ? recipient
          : recipient.address
        ).toLowerCase() === message.to.toLowerCase(),
    );
  } finally {
    transport.close();
  }
}
// Only server actions supply credentials; dependency injection keeps verification offline.
export async function deliverInvitation(
  message: InvitationMessage,
  send: typeof fetch = fetch,
  sendSmtp: SmtpSender = gmailSender,
): Promise<InvitationDelivery> {
  const subject = "Invitación a una lista de compras";
  const access = message.accessRole === "list_editor"
    ? "Tendrás acceso de editor: podrás editar artículos y enviar sugerencias. El cierre de compras y la administración de accesos quedan reservados al propietario."
    : "Tendrás acceso de solo lectura: podrás consultar la lista y su historial, pero no editar artículos ni enviar sugerencias.";
  const content = `Te invitaron a la lista «${message.name}». ${access} Inicia sesión con este correo y acepta la invitación: ${message.url}`;
  if (
    (!message.apiKey || !message.from) &&
    message.gmailUser &&
    message.gmailPassword
  ) {
    try {
      return (await sendSmtp(
        { from: message.gmailUser, to: message.email, subject, text: content },
        { user: message.gmailUser, pass: message.gmailPassword },
      ))
        ? "sent"
        : "failed";
    } catch {
      return "failed";
    }
  }
  if (!message.apiKey || !message.from) return "not_configured";
  try {
    const response = await send("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${message.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: message.from,
        to: [message.email],
        subject,
        text: content,
      }),
      signal: AbortSignal.timeout(10000),
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
