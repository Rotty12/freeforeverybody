require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");
const jwt = require("jsonwebtoken");

const { createUser, verifyUser } = require("./api/auth/usersStore");

const app = express();
const PORT = process.env.PORT || 3000;

const GMAIL_USER = String(process.env.GMAIL_USER || "").trim();
const GMAIL_PASS = String(process.env.GMAIL_PASS || "").trim();
const GMAIL_RECIPIENT = String(process.env.GMAIL_RECIPIENT || process.env.GMAIL_USER || "").trim();

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";

if (!GMAIL_USER || !GMAIL_PASS) {
  console.warn(
    "Missing GMAIL_USER or GMAIL_PASS environment variables. Signup email will fail until they are configured."
  );
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

app.use(express.json());
app.use((req, res, next) => {
  const blocked = ["/.env", "/server.js", "/package.json", "/package-lock.json"];
  if (blocked.includes(req.path)) {
    return res.status(404).end();
  }
  next();
});

app.use(express.static(path.join(__dirname, "public")));

app.post("/api/signup", async (req, res) => {
  const { fullName, email, phone, homeAddress } = req.body;

  if (!fullName || !email || !phone || !homeAddress) {
    return res.status(400).json({ error: "Please fill in all required fields." });
  }

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

    res.json({ ok: true });
  } catch (error) {
    console.error("Gmail send failed:", error);
    if (error.code === "EAUTH" || String(error.responseCode) === "535") {
      return res.status(500).json({ error: "Gmail authentication failed. Use a Gmail App Password for GMAIL_PASS." });
    }

    if (error.code === "ETIMEDOUT" || error.code === "ESOCKET") {
      return res.status(500).json({
        error: "Email server connection timed out. Try again later or use an email API provider instead of SMTP."
      });
    }

    res.status(500).json({ error: `Unable to send signup details by email. ${error.code || "SMTP_ERROR"}` });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, name, phone, homeAddress } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    // Keep compatibility: name is optional for account creation,
    // but we need these fields to "receive sign up form in my email".
    const fullName = name || "";
    if (!fullName || !phone || !homeAddress) {
      return res.status(400).json({ error: "Full name, phone, and home address are required." });
    }

    const user = await createUser({ email, password, name: fullName });
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

    // Email notification (old behavior from /api/signup)
    if (!GMAIL_USER || !GMAIL_PASS) {
      return res.status(500).json({ error: "Email service is not configured." });
    }

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

    const mailResult = await transporter.sendMail({
      from: GMAIL_USER,
      to: GMAIL_RECIPIENT,
      subject: "New signup submission",
      text: textMessage,
      html: htmlMessage
    });

    console.log("Signup email sent:", {
      to: GMAIL_RECIPIENT,
      messageId: mailResult && mailResult.messageId ? mailResult.messageId : null
    });

    return res.status(201).json({ token, user });
  } catch (error) {
    const msg = error && error.message ? error.message : "Signup failed.";
    if (String(msg).toLowerCase().includes("exists")) return res.status(409).json({ error: msg });
    return res.status(400).json({ error: msg });
  }
});

app.post("/api/auth/signin", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await verifyUser({ email, password });
    const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

    return res.json({ token, user });
  } catch (error) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
});

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      const fallbackPort = Number(PORT) + 1;
      console.warn(`Port ${PORT} is already in use. Trying ${fallbackPort} instead...`);
      app.listen(fallbackPort, () => {
        console.log(`Backend server running at http://localhost:${fallbackPort}`);
      }).on("error", (fallbackError) => {
        console.error(`Unable to start server on port ${fallbackPort}:`, fallbackError);
        process.exit(1);
      });
    } else {
      console.error("Server error:", error);
      process.exit(1);
    }
  });
}

module.exports = app;
