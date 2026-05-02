// Email sending boundary.
//
// Three concerns kept apart:
// 1. EmailSender — interface used by everything that needs to send mail
//    (better-auth callbacks, account-deletion confirmation, …). Always
//    receives fully-rendered HTML + plain text. Never touches templates.
// 2. ResendEmailSender — production implementation. Posts to the Resend
//    HTTP API.
// 3. CapturingEmailSender — test double that records sent payloads
//    instead of dispatching. Lets tests assert on what was sent.
//
// Plus: getEmailSender() is the runtime factory. Production wires the
// Resend impl when RESEND_API_KEY is set; otherwise it falls back to a
// log-only sender so dev environments don't crash. Tests construct the
// CapturingEmailSender directly.

const RESEND_API = "https://api.resend.com/emails";

export interface EmailMessage {
	to: string;
	subject: string;
	html: string;
	text: string;
	replyTo?: string;
}

export interface EmailSender {
	send(message: EmailMessage): Promise<void>;
}

export class ResendEmailSender implements EmailSender {
	constructor(
		private readonly apiKey: string,
		private readonly from: string,
		private readonly defaultReplyTo?: string,
	) {}

	async send(message: EmailMessage): Promise<void> {
		const res = await fetch(RESEND_API, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: this.from,
				to: [message.to],
				subject: message.subject,
				html: message.html,
				text: message.text,
				reply_to: message.replyTo ?? this.defaultReplyTo,
			}),
		});
		if (!res.ok) {
			const body = await res.text();
			throw new Error(`Resend error ${res.status}: ${body}`);
		}
	}
}

// Local-dev fallback that prints to the Convex log instead of sending.
// Surface only when RESEND_API_KEY is unset so production never trips it.
export class ConsoleEmailSender implements EmailSender {
	async send(message: EmailMessage): Promise<void> {
		console.log(
			JSON.stringify({
				event: "email.console_only",
				to: message.to,
				subject: message.subject,
				preview: message.text.slice(0, 200),
			}),
		);
	}
}

export class CapturingEmailSender implements EmailSender {
	public readonly sent: EmailMessage[] = [];
	async send(message: EmailMessage): Promise<void> {
		this.sent.push(message);
	}
}

export function getEmailSender(): EmailSender {
	const apiKey = process.env.RESEND_API_KEY;
	const from = process.env.EMAIL_FROM || "Soravur <mail@noono.sh>";
	const replyTo = process.env.EMAIL_REPLY_TO;
	if (!apiKey) return new ConsoleEmailSender();
	return new ResendEmailSender(apiKey, from, replyTo);
}

// ------------------------------------------------------------------
// Templates. Inline HTML strings are deliberate: only three messages,
// Gmail strips SVG/data-URIs anyway, and we don't want a JSX compile
// step inside the Convex bundle. Plain-text variants are produced
// alongside so spam scores stay sane.
// ------------------------------------------------------------------

const APP_NAME = "Soravur";

function appUrl(): string {
	return (process.env.APP_URL || "https://soravur.uz").replace(/\/$/, "");
}

function shell(bodyHtml: string): string {
	// Inline CSS only. No <style>. No external assets.
	return `<!doctype html>
<html lang="uz">
<body style="margin:0;padding:0;background:#fafaf8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf8">
    <tr><td align="center" style="padding:40px 16px">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px">
        <tr><td style="padding:32px 36px 12px 36px">
          <p style="margin:0;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#737373">${APP_NAME}</p>
        </td></tr>
        ${bodyHtml}
        <tr><td style="padding:24px 36px 32px 36px;border-top:1px solid #f4f4f0">
          <p style="margin:0;font-size:12px;color:#737373;line-height:1.6">
            Bu xat ${APP_NAME} tomonidan yuborildi. Agar siz bu xatni kutmagan bo'lsangiz, xatdagi havolaga bosmang va xabarni o'chiring.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buttonRow(label: string, href: string): string {
	return `<tr><td style="padding:8px 36px 24px 36px">
    <a href="${href}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;padding:12px 22px;border-radius:8px">${label}</a>
  </td></tr>`;
}

export function verificationEmail(opts: {
	to: string;
	url: string;
	displayName?: string;
}): EmailMessage {
	const greeting = opts.displayName
		? `Salom, ${opts.displayName}!`
		: "Salom!";
	const html = shell(`
    <tr><td style="padding:16px 36px 8px 36px">
      <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:500;letter-spacing:-0.01em">${greeting}</h1>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#1a1a1a">
        ${APP_NAME} hisobingizni tasdiqlash uchun quyidagi tugmani bosing. Havola 24 soat davomida amal qiladi.
      </p>
    </td></tr>
    ${buttonRow("Hisobni tasdiqlash", opts.url)}
    <tr><td style="padding:0 36px 24px 36px">
      <p style="margin:0;font-size:13px;color:#737373;word-break:break-all">
        Yoki shu havolani brauzerga nusxalab qo'ying:<br/>
        <a href="${opts.url}" style="color:#404040">${opts.url}</a>
      </p>
    </td></tr>
  `);
	const text = `${greeting}\n\n${APP_NAME} hisobingizni tasdiqlash uchun quyidagi havolaga o'ting (24 soat amal qiladi):\n\n${opts.url}\n\nAgar siz bu xatni kutmagan bo'lsangiz, e'tibor bermang.`;
	return {
		to: opts.to,
		subject: `${APP_NAME} — hisobingizni tasdiqlang`,
		html,
		text,
	};
}

export function passwordResetEmail(opts: {
	to: string;
	url: string;
	displayName?: string;
}): EmailMessage {
	const greeting = opts.displayName
		? `Salom, ${opts.displayName}!`
		: "Salom!";
	const html = shell(`
    <tr><td style="padding:16px 36px 8px 36px">
      <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:500;letter-spacing:-0.01em">Parolni tiklash</h1>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#1a1a1a">
        ${greeting} ${APP_NAME} hisobingiz uchun parolni tiklash so'rovi olindi. Yangi parol o'rnatish uchun:
      </p>
    </td></tr>
    ${buttonRow("Yangi parol o'rnatish", opts.url)}
    <tr><td style="padding:0 36px 24px 36px">
      <p style="margin:0 0 12px 0;font-size:13px;color:#737373;word-break:break-all">
        Yoki shu havolani brauzerga nusxalab qo'ying:<br/>
        <a href="${opts.url}" style="color:#404040">${opts.url}</a>
      </p>
      <p style="margin:0;font-size:13px;color:#737373;line-height:1.6">
        Havola 1 soat davomida amal qiladi. Agar siz bu so'rovni jo'natmagan bo'lsangiz, hech narsa qilmang — hisobingiz xavfsiz.
      </p>
    </td></tr>
  `);
	const text = `${greeting}\n\n${APP_NAME} parolingizni tiklash so'rovi olindi. Yangi parol o'rnatish uchun (1 soat amal qiladi):\n\n${opts.url}\n\nAgar siz bu so'rovni jo'natmagan bo'lsangiz, e'tibor bermang.`;
	return {
		to: opts.to,
		subject: `${APP_NAME} — parolingizni tiklang`,
		html,
		text,
	};
}

export function accountDeletedEmail(opts: {
	to: string;
	displayName?: string;
}): EmailMessage {
	const greeting = opts.displayName
		? `Salom, ${opts.displayName}!`
		: "Salom!";
	const html = shell(`
    <tr><td style="padding:16px 36px 24px 36px">
      <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:500;letter-spacing:-0.01em">Hisobingiz o'chirildi</h1>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#1a1a1a">
        ${greeting} ${APP_NAME} hisobingiz so'rov bo'yicha o'chirildi. Endi tizimga kira olmaysiz.
      </p>
      <p style="margin:0;font-size:14px;color:#525252;line-height:1.6">
        Agar bu xatoga aylangan bo'lsa yoki yordam kerak bo'lsa, ${appUrl()} sahifasidan biz bilan bog'laning.
      </p>
    </td></tr>
  `);
	const text = `${greeting}\n\n${APP_NAME} hisobingiz so'rov bo'yicha o'chirildi. Endi tizimga kira olmaysiz.\n\nAgar bu xatoga aylangan bo'lsa, ${appUrl()} sahifasidan biz bilan bog'laning.`;
	return {
		to: opts.to,
		subject: `${APP_NAME} — hisobingiz o'chirildi`,
		html,
		text,
	};
}
