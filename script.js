const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const nav = document.querySelector("[data-nav]");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.textContent = isOpen ? "Закрыть" : "Меню";
  });

  document.querySelectorAll(".nav a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.textContent = "Меню";
    });
  });
}

if (header) {
  window.addEventListener("scroll", () => {
    header.style.boxShadow = window.scrollY > 10 ? "0 10px 30px rgba(46, 31, 20, 0.10)" : "none";
  });
}

const trackButtons = document.querySelectorAll("[data-track-buttons] button");
const trackItems = document.querySelectorAll("[data-track-list] article");
trackButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.track;
    trackButtons.forEach((item) => item.classList.toggle("active", item === button));
    trackItems.forEach((item) => item.classList.toggle("hidden", filter !== "all" && item.dataset.track !== filter));
  });
});

const timelineCopy = {
  1900: { title: "1900-е: первые переводы и дискуссии", text: "Психоаналитические идеи быстро входят в круг русскоязычной психиатрии, философии и литературной критики. Обсуждаются сновидения, истерия, бессознательное и новая модель субъективности." },
  1920: { title: "1920-е: институциональные опыты", text: "Психоанализ становится предметом профессиональных обсуждений, педагогических экспериментов и исследований детского развития. Возникают первые организованные формы обучения и практики." },
  1930: { title: "1930-1980-е: перерыв и скрытое влияние", text: "Официальная институциональная линия почти прерывается, но отдельные идеи продолжают жить в психиатрии, литературоведении, философии и частных интеллектуальных кругах." },
  1990: { title: "1990-е: возвращение профессионального поля", text: "После длительного разрыва появляются новые общества, учебные программы, переводы, конференции и регулярные супервизионные форматы." },
  today: { title: "Сегодня: образование, супервизия, исследования", text: "Современная российская психоаналитическая среда объединяет клиническую практику, университетские курсы, частные институты, исследовательские группы и междисциплинарные проекты." },
};

const timelineButtons = document.querySelectorAll("[data-timeline] button");
const timelineDetail = document.querySelector("[data-timeline-detail]");
if (timelineDetail) {
  timelineButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const content = timelineCopy[button.dataset.year];
      timelineButtons.forEach((item) => item.classList.toggle("active", item === button));
      timelineDetail.innerHTML = `<h3>${content.title}</h3><p>${content.text}</p>`;
    });
  });
}

const programSearch = document.querySelector("[data-program-search]");
const programLevel = document.querySelector("[data-program-level]");
const programCards = document.querySelectorAll("[data-program-grid] article");
function filterPrograms() {
  const query = programSearch.value.trim().toLowerCase();
  const level = programLevel.value;
  programCards.forEach((card) => {
    const matchesText = card.textContent.toLowerCase().includes(query);
    const matchesLevel = level === "all" || card.dataset.level === level;
    card.classList.toggle("hidden", !matchesText || !matchesLevel);
  });
}
if (programSearch && programLevel) {
  programSearch.addEventListener("input", filterPrograms);
  programLevel.addEventListener("change", filterPrograms);
}

const librarySearch = document.querySelector("[data-library-search]");
const resources = document.querySelectorAll("[data-resource-list] article");
if (librarySearch) {
  librarySearch.addEventListener("input", () => {
    const query = librarySearch.value.trim().toLowerCase();
    resources.forEach((item) => {
      const haystack = `${item.textContent} ${item.dataset.keywords}`.toLowerCase();
      item.classList.toggle("hidden", !haystack.includes(query));
    });
  });
}

const accordion = document.querySelector("[data-accordion]");
if (accordion) {
  accordion.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = button.nextElementSibling;
      if (panel) panel.classList.toggle("open");
    });
  });
}

const modal = document.querySelector("[data-modal]");
const modalTitle = document.querySelector("[data-modal-title]");
const modalText = document.querySelector("[data-modal-text]");
const modalTexts = {
  "Введение в психоанализ": "Маршрут для первого знакомства: история, ключевые понятия, чтение фрагментов классических текстов и обсуждение клинических примеров без конфиденциальных деталей.",
  "Клиническое чтение случая": "Семинар для тех, кто уже знаком с психологической практикой: участники учатся формулировать гипотезы, видеть динамику переноса и удерживать этическую рамку.",
  "Психоанализ литературы и кино": "Лаборатория для гуманитариев и практиков: анализ символов, повторений, фантазий, травматических сюжетов и зрительской позиции.",
  "Супервизионная группа": "Профессиональный формат для специалистов. Клинический материал обсуждается анонимно, с фокусом на позицию терапевта и динамику отношений.",
  "Детский и подростковый анализ": "Специализация о развитии, игре, семейной системе, тревоге, агрессии, школьных трудностях и работе с родительским запросом.",
  "Словарь психоанализа": "Открытый цикл, где сложные термины разбираются через примеры, историю появления понятия и его место в современной практике.",
};

document.querySelectorAll("[data-open-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!modal || !modalTitle || !modalText) return;
    const title = button.dataset.openModal;
    modalTitle.textContent = title;
    modalText.textContent = modalTexts[title] || "Описание программы будет добавлено позже.";
    modal.showModal();
  });
});

document.querySelector("[data-close-modal]")?.addEventListener("click", () => modal?.close());
document.querySelector("[data-close-modal-link]")?.addEventListener("click", () => modal?.close());

const quiz = document.querySelector("[data-quiz]");
if (quiz) {
  quiz.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const goal = form.get("goal");
    const format = form.get("format");
    const result = document.querySelector("[data-quiz-result]");
    if (!result) return;
    if (goal === "clinical" || format === "practice") {
      result.value = "Рекомендуемый маршрут: клинический семинар плюс супервизионная группа.";
      return;
    }
    if (goal === "culture") {
      result.value = "Рекомендуемый маршрут: лаборатория психоанализа литературы и кино.";
      return;
    }
    if (format === "group") {
      result.value = "Рекомендуемый маршрут: вводный курс и дискуссионная группа по словарю понятий.";
      return;
    }
    result.value = "Рекомендуемый маршрут: открытый цикл «Словарь психоанализа» и вводный курс.";
  });
}

const applyForm = document.querySelector("[data-apply-form]");

if (applyForm) {
  applyForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const status = document.querySelector("[data-form-status]");
    const formData = new FormData(form);

    const name = formData.get("name").trim();
    const email = formData.get("email").trim();
    const consent = form.elements.consent.checked;

    status.classList.remove("error");

    if (!name || !email || !consent) {
      status.classList.add("error");
      status.textContent = "Заполните имя, email и подтвердите согласие на обработку данных.";
      return;
    }

    status.textContent = "Отправляем заявку...";

    try {
      const response = await fetch(form.action, {
        method: form.method,
        body: formData,
        headers: {
          Accept: "application/json"
        }
      });

      if (response.ok) {
        status.textContent = "Спасибо. Заявка отправлена.";
        form.reset();
      } else {
        status.classList.add("error");
        status.textContent = "Не удалось отправить заявку. Попробуйте ещё раз.";
      }
    } catch (error) {
      status.classList.add("error");
      status.textContent = "Ошибка соединения. Проверьте интернет и попробуйте снова.";
    }
  });
}
