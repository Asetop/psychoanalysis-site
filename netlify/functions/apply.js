const OWNER_EMAIL = process.env.OWNER_EMAIL || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, message: "Метод не поддерживается." });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, message: "Некорректный формат заявки." });
  }

  const application = normalizeApplication(body, event);
  const validationError = validateApplication(application);

  if (validationError) {
    return json(400, { ok: false, message: validationError });
  }

  if (!isMailConfigured()) {
    return json(500, {
      ok: false,
      message: "Почтовая отправка на Netlify еще не настроена. Добавьте OWNER_EMAIL, FROM_EMAIL и RESEND_API_KEY в переменные окружения сайта.",
    });
  }

  try {
    await sendApplicationEmail(application);
    return json(200, {
      ok: true,
      emailSent: true,
      message: "Заявка отправлена. Мы свяжемся с вами.",
    });
  } catch (error) {
    console.error("Email delivery failed:", error);
    return json(502, {
      ok: false,
      message: "Почтовый сервис временно не принял заявку. Попробуйте позже.",
    });
  }
};

function normalizeApplication(body, event) {
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
    ip: event.headers["x-forwarded-for"] || "",
    userAgent: cleanText(event.headers["user-agent"] || "", 240),
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

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(payload),
  };
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

