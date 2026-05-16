const nodemailer = require("nodemailer");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const { fullName, email, phone, homeAddress } = body;

  if (!fullName || !email || !phone || !homeAddress) {
    return res.status(400).json({ error: "Please fill in all required fields." });
  }

  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_PASS = process.env.GMAIL_PASS;
  const GMAIL_RECIPIENT = process.env.GMAIL_RECIPIENT || process.env.GMAIL_USER;

  if (!GMAIL_USER || !GMAIL_PASS) {
    return res.status(500).json({ error: "Email service is not configured." });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });

  const textMessage = [
    "New signup received",
    `Name: ${fullName}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    `Home address: ${homeAddress}`
  ].join("\n");

  const htmlMessage = [
    "<h2>New signup received</h2>",
    `<p><strong>Name:</strong> ${fullName}</p>`,
    `<p><strong>Email:</strong> ${email}</p>`,
    `<p><strong>Phone:</strong> ${phone}</p>`,
    `<p><strong>Home address:</strong> ${homeAddress}</p>`
  ].join("");

  try {
    await transporter.sendMail({
      from: GMAIL_USER,
      to: GMAIL_RECIPIENT,
      subject: "New signup submission",
      text: textMessage,
      html: htmlMessage
    });

    return res.json({ ok: true });
  } catch (error) {
    console.error("Gmail send failed:", error);
    if (error.code === "EAUTH" || String(error.responseCode) === "535") {
      return res.status(500).json({ error: "Gmail authentication failed. Use a Gmail App Password for GMAIL_PASS in Vercel." });
    }

    if (error.code === "ETIMEDOUT" || error.code === "ESOCKET") {
      return res.status(500).json({ error: "Email server connection timed out. Try redeploying, or use an email API provider instead of SMTP." });
    }

    return res.status(500).json({ error: `Unable to send signup details by email. ${error.code || "SMTP_ERROR"}` });
  }
};
