const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

loadEnv(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 3000);
const OWNER_EMAIL = process.env.OWNER_EMAIL || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const SITE_NAME = process.env.SITE_NAME || "Российская школа психоанализа";
const DATA_DIR = path.join(__dirname, "data");
const APPLICATIONS_FILE = path.join(DATA_DIR, "applications.jsonl");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "POST" && url.pathname === "/api/apply") {
      await handleApplication(req, res);
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      serveStatic(url.pathname, res, req.method === "HEAD");
      return;
    }

    sendJson(res, 405, { ok: false, message: "Метод не поддерживается." });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { ok: false, message: "Внутренняя ошибка сервера." });
  }
});

if (require.main === module) {
  startServer(PORT);
}

function startServer(port = PORT) {
  return server.listen(port, () => {
    const address = server.address();
    const actualPort = typeof address === "object" && address ? address.port : port;
    console.log(`${SITE_NAME}: http://localhost:${actualPort}`);
    if (!isMailConfigured()) {
      console.log("Почта пока не настроена: заполните OWNER_EMAIL, FROM_EMAIL и RESEND_API_KEY в .env.");
    }
  });
}

async function handleApplication(req, res) {
  const body = await readJson(req);
  const application = normalizeApplication(body, req);
  const validationError = validateApplication(application);

  if (validationError) {
    sendJson(res, 400, { ok: false, message: validationError });
    return;
  }

  await saveApplication(application);

  let emailSent = false;
  let emailError = "";

  if (isMailConfigured()) {
    try {
      await sendApplicationEmail(application);
      emailSent = true;
    } catch (error) {
      emailError = error.message;
      console.error("Email delivery failed:", error);
    }
  }

  if (isMailConfigured() && !emailSent) {
    sendJson(res, 502, {
      ok: false,
      emailSent,
      setupRequired: false,
      message: "Заявка сохранена, но почтовый сервис не принял письмо. Проверьте FROM_EMAIL и настройки Resend.",
      emailError,
    });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    emailSent,
    setupRequired: !isMailConfigured(),
    message: emailSent
      ? "Заявка отправлена. Мы свяжемся с вами."
      : "Заявка сохранена. Почтовая отправка будет работать после настройки владельца сайта.",
    emailError,
  });
}

function normalizeApplication(body, req) {
  return {
    id: cryptoRandomId(),
    createdAt: new Date().toISOString(),
    name: cleanText(body.name, 120),
    email: cleanText(body.email, 160),
    phone: cleanText(body.phone, 80),
    interest: cleanText(body.interest, 160),
    experience: cleanText(body.experience, 160),
    message: cleanText(body.message, 1200),
    consent: body.consent === true || body.consent === "on" || body.consent === "true",
    website: cleanText(body.website, 200),
    ip: req.socket.remoteAddress || "",
    userAgent: cleanText(req.headers["user-agent"] || "", 240),
  };
}

function validateApplication(application) {
  if (application.website) return "Заявка отклонена.";
  if (!application.name) return "Укажите имя.";
  if (!application.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.email)) {
    return "Укажите корректный email.";
  }
  if (!application.interest) return "Выберите интересующую программу.";
  if (!application.consent) return "Подтвердите согласие на обработку данных.";
  return "";
}

async function saveApplication(application) {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  await fs.promises.appendFile(APPLICATIONS_FILE, `${JSON.stringify(application)}\n`, "utf8");
}

async function sendApplicationEmail(application) {
  const subject = `Новая заявка: ${application.interest}`;
  const html = `
    <h1>Новая заявка с сайта</h1>
    <p><strong>Имя:</strong> ${escapeHtml(application.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(application.email)}</p>
    <p><strong>Телефон:</strong> ${escapeHtml(application.phone || "не указан")}</p>
    <p><strong>Интерес:</strong> ${escapeHtml(application.interest)}</p>
    <p><strong>Опыт:</strong> ${escapeHtml(application.experience || "не указан")}</p>
    <p><strong>Комментарий:</strong><br>${escapeHtml(application.message || "без комментария").replace(/\n/g, "<br>")}</p>
    <p><small>ID заявки: ${application.id}<br>Дата: ${application.createdAt}</small></p>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: OWNER_EMAIL,
      reply_to: application.email,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend API error ${response.status}: ${text}`);
  }
}

function serveStatic(urlPath, res, headOnly) {
  const safePath = path
    .normalize(decodeURIComponent(urlPath.split("?")[0]))
    .replace(/^(\.\.[/\\])+/, "");
  const requestedPath = safePath === "/" ? "/index.html" : safePath;
  const filePath = path.join(__dirname, requestedPath);

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Файл не найден.");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
    });

    if (headOnly) {
      res.end();
      return;
    }

    fs.createReadStream(filePath).pipe(res);
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 100_000) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON."));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function isMailConfigured() {
  return Boolean(OWNER_EMAIL && FROM_EMAIL && RESEND_API_KEY);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cryptoRandomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

module.exports = { server, startServer };
