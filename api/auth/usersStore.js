const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");

const USERS_FILE = path.join(__dirname, "users.json");
const SALT_ROUNDS = 12;

function ensureUsersFile() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }, null, 2), "utf8");
  }
}

function readUsersFile() {
  ensureUsersFile();
  const raw = fs.readFileSync(USERS_FILE, "utf8");
  const parsed = JSON.parse(raw || "{}");
  return Array.isArray(parsed.users) ? parsed.users : [];
}

function writeUsersFile(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2), "utf8");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function findUserByEmail(users, email) {
  const normalized = normalizeEmail(email);
  return users.find((u) => u.email === normalized);
}

async function createUser({ email, password, name }) {
  const users = readUsersFile();

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("Email is required.");

  const existing = findUserByEmail(users, normalizedEmail);
  if (existing) throw new Error("Account already exists for this email.");

  const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
  const newUser = {
    id: cryptoSafeId(),
    email: normalizedEmail,
    name: String(name || "").trim() || "Applicant",
    passwordHash,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  writeUsersFile(users);

  return { id: newUser.id, email: newUser.email, name: newUser.name };
}

async function verifyUser({ email, password }) {
  const users = readUsersFile();
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error("Email is required.");

  const user = findUserByEmail(users, normalizedEmail);
  if (!user) throw new Error("Invalid email or password.");

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) throw new Error("Invalid email or password.");

  return { id: user.id, email: user.email, name: user.name };
}

// Node 16+ has crypto.randomUUID; fall back if missing
function cryptoSafeId() {
  // eslint-disable-next-line global-require
  const crypto = require("crypto");
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return crypto.randomBytes(16).toString("hex");
}

module.exports = {
  createUser,
  verifyUser
};
