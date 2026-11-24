// ======================================================
// SEVENED ACADEMY LAW
// SUPABASE CLOUD VERSION
// ======================================================


// 1. SUPABASE SOZLAMALARI

const SUPABASE_URL =
  "https://uanbykrpdefnotvzogac.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_eOi21erPMBkoq4LO_HaQDw_uNetqbNR";

if (!window.supabase) {
  alert("Supabase kutubxonasi yuklanmadi.");
  throw new Error("Supabase topilmadi.");
}

if (SUPABASE_KEY === "BU_YERGA_SB_PUBLISHABLE_KEY") {
  alert("Supabase Publishable Key kiriting.");
  throw new Error("Supabase kaliti kiritilmagan.");
}

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// 2. UMUMIY O'ZGARUVCHILAR

let tasks = [];
let guides = [];
let currentUser = null;
let selectedCategory = "Barchasi";
let editingGuideId = null;
let calendarDate = new Date();

const $ = selector => document.querySelector(selector);


// 3. YORDAMCHI FUNKSIYALAR

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showMessage(message) {
  alert(message);
}


// ======================================================
// 4. LOGIN VA RO'YXATDAN O'TISH
// ======================================================

let isSignUpMode = false;

const authForm = $("#authForm");
const authMessage = $("#authMessage");
const authSwitch = $("#authSwitch");
const authTitle = $("#authTitle");
const authSubmit = $("#authSubmit");

function setAuthMessage(message) {
  authMessage.textContent = message;
}

authSwitch.addEventListener("click", () => {
  isSignUpMode = !isSignUpMode;

  authTitle.textContent = isSignUpMode
    ? "Yangi akkaunt yaratish"
    : "Xush kelibsiz!";

  authSubmit.textContent = isSignUpMode
    ? "Ro‘yxatdan o‘tish"
    : "Tizimga kirish";

  authSwitch.textContent = isSignUpMode
    ? "Akkauntingiz bormi? Tizimga kiring"
    : "Akkauntingiz yo‘qmi? Ro‘yxatdan o‘ting";

  setAuthMessage("");
});

authForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = $("#authEmail").value.trim();
  const password = $("#authPassword").value;

  if (password.length < 8) {
    setAuthMessage("Parol kamida 8 ta belgidan iborat bo‘lishi kerak.");
    return;
  }

  authSubmit.disabled = true;
  authSubmit.textContent = "Kutib turing...";

  try {
    if (isSignUpMode) {
      const { error } = await supabaseClient.auth.signUp({
        email,
        password
      });

      if (error) throw error;

      setAuthMessage(
        "Ro‘yxatdan o‘tish yakunlandi. Emailingizni tekshiring."
      );

    } else {
      const { error } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) throw error;

      setAuthMessage("Tizimga muvaffaqiyatli kirdingiz!");
    }

  } catch (error) {
    console.error(error);
    setAuthMessage(error.message);

  } finally {
    authSubmit.disabled = false;
    authSubmit.textContent = isSignUpMode
      ? "Ro‘yxatdan o‘tish"
      : "Tizimga kirish";
  }
});


// ======================================================
// 5. FOYDALANUVCHI VA AUTH HOLATI
// ======================================================

function updateAuthUI(user) {
  currentUser = user;

  document.body.classList.toggle(
    "authenticated",
    Boolean(user)
  );

  const accountArea = $("#accountArea");
  accountArea.innerHTML = "";

  if (!user) return;

  const email = document.createElement("span");
  email.className = "account-email";
  email.textContent = user.email || "Foydalanuvchi";

  const logoutButton = document.createElement("button");
  logoutButton.className = "secondary-button";
  logoutButton.textContent = "Chiqish";

  logoutButton.addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      showMessage(error.message);
    }
  });

  accountArea.append(email, logoutButton);
}

supabaseClient.auth.onAuthStateChange((event, session) => {
  updateAuthUI(session?.user || null);

  if (event === "SIGNED_IN") {
    setTimeout(() => {
      loadTasks();
      loadGuides();
    }, 0);
  }

  if (event === "SIGNED_OUT") {
    tasks = [];
    guides = [];

    renderTasks();
    renderGuides();
  }
});

async function checkExistingSession() {
  const { data, error } =
    await supabaseClient.auth.getSession();

  if (error) {
    console.error(error);
    return;
  }

  updateAuthUI(data.session?.user || null);

  if (data.session?.user) {
    await Promise.all([
      loadTasks(),
      loadGuides()
    ]);
  }
}


// ======================================================
// 6. SANA
// ======================================================

function setTodayDate() {
  $("#todayDate").textContent =
    new Date().toLocaleDateString("uz-UZ", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
}


// ======================================================
// 7. VAZIFALARNI CLOUD'DAN YUKLASH
// ======================================================

async function loadTasks() {
  if (!currentUser) {
    tasks = [];
    renderTasks();
    return;
  }

  const userId = currentUser.id;

  try {
    const { data, error } = await supabaseClient
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!currentUser || currentUser.id !== userId) return;

    tasks = (data || []).map(task => ({
      id: task.id,
      title: task.title,
      subject: task.subject || "Umumiy",
      done: task.done,
      important: task.important
    }));

    renderTasks();

  } catch (error) {
    console.error(error);
    showMessage("Vazifalarni yuklashda xatolik: " + error.message);
  }
}


// ======================================================
// 8. STATISTIKA
// ======================================================

function updateStatistics() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.done).length;
  const remaining = total - completed;

  const percent = total === 0
    ? 0
    : Math.round((completed / total) * 100);

  $("#totalTasks").textContent = total;
  $("#completedTasks").textContent = completed;
  $("#remainingTasks").textContent = remaining;
  $("#progressPercent").textContent = percent + "%";
  $("#progressBar").style.width = percent + "%";

  $("#resultCompleted").textContent = completed;
  $("#resultRemaining").textContent = remaining;
  $("#resultPercent").textContent = percent + "%";
}


// ======================================================
// 9. VAZIFALARNI KO'RSATISH
// ======================================================

function renderTasks() {
  const list = $("#taskList");
  list.innerHTML = "";

  tasks.forEach(task => {
    const item = document.createElement("div");

    item.className =
      `task-item ${task.done ? "done" : ""}`;

    item.innerHTML = `
      <input
        class="task-check"
        type="checkbox"
        data-action="toggle"
        data-id="${escapeHTML(task.id)}"
        ${task.done ? "checked" : ""}
      >

      <div class="task-info">
        <div class="task-title">
          ${escapeHTML(task.title)}
        </div>

        <div class="task-subject">
          ${escapeHTML(task.subject)}
        </div>
      </div>

      <button
        class="task-star ${task.important ? "selected" : ""}"
        data-action="star"
        data-id="${escapeHTML(task.id)}"
      >★</button>

      <button
        class="task-delete"
        data-action="delete"
        data-id="${escapeHTML(task.id)}"
      >✕</button>
    `;

    list.appendChild(item);
  });

  $("#emptyTasks").classList.toggle(
    "hidden",
    tasks.length > 0
  );

  $("#taskCount").textContent = tasks.length + " ta";

  updateStatistics();
}


// ======================================================
// 10. VAZIFA FORMASI
// ======================================================

function openTaskForm() {
  $("#taskForm").classList.remove("hidden");
  $("#taskTitle").focus();
}

function closeTaskForm() {
  $("#taskForm").classList.add("hidden");
  $("#taskForm").reset();
}

$("#addTaskButton").addEventListener("click", openTaskForm);
$("#quickAddTask").addEventListener("click", openTaskForm);
$("#cancelTask").addEventListener("click", closeTaskForm);


// ======================================================
// 11. YANGI VAZIFANI SAQLASH
// ======================================================

$("#taskForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentUser) {
    showMessage("Avval akkauntingizga kiring.");
    return;
  }

  const title = $("#taskTitle").value.trim();
  const subject = $("#taskSubject").value;

  if (!title) return;

  const button =
    $("#taskForm button[type='submit']");

  button.disabled = true;

  try {
    const { data, error } = await supabaseClient
      .from("tasks")
      .insert({
        user_id: currentUser.id,
        title,
        subject,
        done: false,
        important: false
      })
      .select()
      .single();

    if (error) throw error;

    tasks.unshift({
      id: data.id,
      title: data.title,
      subject: data.subject,
      done: data.done,
      important: data.important
    });

    renderTasks();
    closeTaskForm();

  } catch (error) {
    console.error(error);
    showMessage("Vazifa saqlanmadi: " + error.message);

  } finally {
    button.disabled = false;
  }
});


// ======================================================
// 12. VAZIFA HOLATINI O'ZGARTIRISH
// ======================================================

$("#taskList").addEventListener("change", async event => {
  const checkbox = event.target.closest(
    '[data-action="toggle"]'
  );

  if (!checkbox || !currentUser) return;

  const task = tasks.find(
    item => item.id === checkbox.dataset.id
  );

  if (!task) return;

  const oldValue = task.done;
  task.done = checkbox.checked;

  renderTasks();

  const { error } = await supabaseClient
    .from("tasks")
    .update({ done: task.done })
    .eq("id", task.id)
    .eq("user_id", currentUser.id);

  if (error) {
    task.done = oldValue;
    renderTasks();
    showMessage(error.message);
  }
});


// ======================================================
// 13. MUHIMLIK VA O'CHIRISH
// ======================================================

$("#taskList").addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");

  if (!button || !currentUser) return;

  const task = tasks.find(
    item => item.id === button.dataset.id
  );

  if (!task) return;

  if (button.dataset.action === "star") {
    const oldValue = task.important;
    task.important = !oldValue;

    renderTasks();

    const { error } = await supabaseClient
      .from("tasks")
      .update({ important: task.important })
      .eq("id", task.id)
      .eq("user_id", currentUser.id);

    if (error) {
      task.important = oldValue;
      renderTasks();
      showMessage(error.message);
    }
  }

  if (button.dataset.action === "delete") {
    if (!confirm("Vazifani o‘chirmoqchimisiz?")) return;

    const oldTasks = [...tasks];

    tasks = tasks.filter(
      item => item.id !== task.id
    );

    renderTasks();

    const { error } = await supabaseClient
      .from("tasks")
      .delete()
      .eq("id", task.id)
      .eq("user_id", currentUser.id);

    if (error) {
      tasks = oldTasks;
      renderTasks();
      showMessage(error.message);
    }
  }
});


// ======================================================
// 14. QO'LLANMALARNI CLOUD'DAN YUKLASH
// ======================================================

async function loadGuides() {
  if (!currentUser) {
    guides = [];
    renderGuides();
    return;
  }

  const userId = currentUser.id;

  try {
    const { data, error } = await supabaseClient
      .from("guides")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!currentUser || currentUser.id !== userId) return;

    guides = (data || []).map(row => ({
      id: row.id,
      title: row.title,
      category: row.category || "Boshqa",
      content: row.content || "",
      filePath: row.file_path,
      fileName: row.file_name,
      fileType: row.file_type,
      type: row.file_path ? "file" : "text"
    }));

    renderGuides();

  } catch (error) {
    console.error(error);
    showMessage("Qo‘llanmalarni yuklashda xatolik: " + error.message);
  }
}


// ======================================================
// 15. QO'LLANMA EDITORI
// ======================================================

function openGuideEditor(guide = null) {
  editingGuideId = guide ? guide.id : null;

  $("#guideForm").reset();

  $("#editorHeading").textContent = guide
    ? "Qo‘llanmani tahrirlash"
    : "Yangi qo‘llanma";

  if (guide) {
    $("#guideTitle").value = guide.title || "";
    $("#guideCategory").value = guide.category || "Boshqa";
    $("#guideContent").value = guide.content || "";
  }

  $("#guideEditor").classList.remove("hidden");

  $("#guideEditor").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });

  $("#guideTitle").focus();
}

function closeGuideEditor() {
  $("#guideEditor").classList.add("hidden");
  $("#guideForm").reset();
  editingGuideId = null;
}

$("#createGuide").addEventListener("click", () => openGuideEditor());
$("#closeEditor").addEventListener("click", closeGuideEditor);
$("#cancelGuide").addEventListener("click", closeGuideEditor);


// ======================================================
// 16. MATNLI QO'LLANMANI SAQLASH
// ======================================================

$("#guideForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!currentUser) {
    showMessage("Avval akkauntingizga kiring.");
    return;
  }

  const title = $("#guideTitle").value.trim();
  const category = $("#guideCategory").value;
  const content = $("#guideContent").value.trim();

  if (!title) {
    showMessage("Qo‘llanma nomini kiriting.");
    return;
  }

  const userId = currentUser.id;
  const button = $("#guideForm button[type='submit']");

  button.disabled = true;

  try {
    const values = {
      title,
      category,
      content,
      updated_at: new Date().toISOString()
    };

    let result;

    if (editingGuideId) {
      result = await supabaseClient
        .from("guides")
        .update(values)
        .eq("id", editingGuideId)
        .eq("user_id", userId);
    } else {
      result = await supabaseClient
        .from("guides")
        .insert({
          ...values,
          user_id: userId
        });
    }

    if (result.error) throw result.error;

    await loadGuides();
    closeGuideEditor();

    showMessage("Qo‘llanma saqlandi!");

  } catch (error) {
    console.error(error);
    showMessage("Saqlashda xatolik: " + error.message);

  } finally {
    button.disabled = false;
  }
});


// ======================================================
// 17. FAYL NOMINI XAVFSIZLASHTIRISH
// ======================================================

function safeFileName(name) {
  return String(name || "guide-file")
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .slice(0, 100) || "guide-file";
}


// ======================================================
// 18. PDF, WORD VA RASMLARNI YUKLASH
// ======================================================

$("#uploadGuide").addEventListener("click", () => {
  $("#guideFile").click();
});

$("#guideFile").addEventListener("change", async event => {
  const files = Array.from(event.target.files || []);

  if (!files.length) return;

  if (!currentUser) {
    showMessage("Avval akkauntingizga kiring.");
    event.target.value = "";
    return;
  }

  const allowed = [
    "pdf", "doc", "docx", "png", "jpg", "jpeg"
  ];

  const userId = currentUser.id;

  for (const file of files) {
    const extension = file.name
      .split(".")
      .pop()
      .toLowerCase();

    if (!allowed.includes(extension)) {
      showMessage(file.name + ": bu fayl turiga ruxsat yo‘q.");
      continue;
    }

    if (file.size > 20 * 1024 * 1024) {
      showMessage(file.name + ": fayl 20 MB dan katta.");
      continue;
    }

    let filePath = null;

    try {
      filePath =
        `${userId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;

      const { error: uploadError } =
        await supabaseClient.storage
          .from("guide-files")
          .upload(filePath, file, {
            upsert: false,
            contentType: file.type || "application/octet-stream"
          });

      if (uploadError) throw uploadError;

      const { error: insertError } =
        await supabaseClient
          .from("guides")
          .insert({
            user_id: userId,
            title: file.name,
            category: "Boshqa",
            content: "",
            file_path: filePath,
            file_name: file.name,
            file_type: file.type || "application/octet-stream"
          });

      if (insertError) throw insertError;

    } catch (error) {
      if (filePath) {
        await supabaseClient.storage
          .from("guide-files")
          .remove([filePath]);
      }

      console.error(error);
      showMessage(file.name + " yuklanmadi: " + error.message);
    }
  }

  await loadGuides();
  event.target.value = "";
});


// ======================================================
// 19. QO'LLANMALARNI KO'RSATISH
// ======================================================

function renderGuides() {
  const list = $("#guideList");
  const search = $("#guideSearch").value.trim().toLowerCase();

  const filtered = guides.filter(guide => {
    const categoryMatch =
      selectedCategory === "Barchasi" ||
      guide.category === selectedCategory;

    const searchMatch =
      (guide.title || "").toLowerCase().includes(search);

    return categoryMatch && searchMatch;
  });

  list.innerHTML = "";

  filtered.forEach(guide => {
    const card = document.createElement("article");
    card.className = "guide-card";

    const isFile = guide.type === "file";

    const description = isFile
      ? "Fayl: " + (guide.fileName || guide.title)
      : (guide.content || "Matn kiritilmagan").slice(0, 100);

    card.innerHTML = `
      <div class="guide-card-top">
        <span class="guide-file-icon">
          ${isFile ? "📎" : "📘"}
        </span>
        <span class="muted small">
          ${isFile ? "Fayl" : "Matn"}
        </span>
      </div>

      <span class="guide-category">
        ${escapeHTML(guide.category)}
      </span>

      <h3>${escapeHTML(guide.title)}</h3>

      <p>${escapeHTML(description)}</p>

      <div class="guide-actions">
        <button class="primary-button"
          data-guide-action="open"
          data-id="${escapeHTML(guide.id)}">
          Ochish
        </button>

        ${!isFile ? `
          <button class="secondary-button"
            data-guide-action="edit"
            data-id="${escapeHTML(guide.id)}">
            Tahrirlash
          </button>
        ` : ""}

        <button class="secondary-button"
          data-guide-action="delete"
          data-id="${escapeHTML(guide.id)}">
          O‘chirish
        </button>
      </div>
    `;

    list.appendChild(card);
  });

  $("#guideCount").textContent = guides.length + " ta";

  $("#emptyGuides").classList.toggle(
    "hidden",
    filtered.length > 0
  );
}

$("#guideSearch").addEventListener("input", renderGuides);


// ======================================================
// 20. KATEGORIYA FILTRI
// ======================================================

$("#categoryList").addEventListener("click", event => {
  const button = event.target.closest(".category-btn");

  if (!button) return;

  selectedCategory = button.dataset.category;

  document.querySelectorAll(".category-btn").forEach(item => {
    item.classList.toggle("selected", item === button);
  });

  renderGuides();
});


// ======================================================
// 21. QO'LLANMALARNI OCHISH, TAHRIRLASH, O'CHIRISH
// ======================================================

$("#guideList").addEventListener("click", async event => {
  const button =
    event.target.closest("button[data-guide-action]");

  if (!button || !currentUser) return;

  const guide = guides.find(
    item => String(item.id) === button.dataset.id
  );

  if (!guide) return;

  const action = button.dataset.guideAction;
  const userId = currentUser.id;

  if (action === "edit") {
    openGuideEditor(guide);
  }

  if (action === "delete") {
    if (!confirm(
      `"${guide.title}" qo‘llanmasini o‘chirmoqchimisiz?`
    )) return;

    try {
      if (guide.filePath) {
        const { error: storageError } =
          await supabaseClient.storage
            .from("guide-files")
            .remove([guide.filePath]);

        if (storageError) throw storageError;
      }

      const { error } = await supabaseClient
        .from("guides")
        .delete()
        .eq("id", guide.id)
        .eq("user_id", userId);

      if (error) throw error;

      await loadGuides();

    } catch (error) {
      console.error(error);
      showMessage("O‘chirishda xatolik: " + error.message);
    }
  }

  if (action === "open") {
    if (guide.type === "file") {
      try {
        const { data, error } =
          await supabaseClient.storage
            .from("guide-files")
            .createSignedUrl(guide.filePath, 600);

        if (error) throw error;

        const newWindow = window.open(
          data.signedUrl,
          "_blank"
        );

        if (!newWindow) {
          showMessage("Brauzer yangi oynani blokladi.");
        }

      } catch (error) {
        console.error(error);
        showMessage("Faylni ochib bo‘lmadi: " + error.message);
      }

    } else {
      openGuideViewer(guide);
    }
  }
});


// ======================================================
// 22. MATNLI QO'LLANMANI KO'RISH
// ======================================================

function openGuideViewer(guide) {
  const overlay = document.createElement("div");
  overlay.className = "guide-view-overlay";

  overlay.innerHTML = `
    <div class="guide-view-box">
      <div class="guide-view-header">
        <div>
          <span class="guide-category">
            ${escapeHTML(guide.category)}
          </span>
          <h2>${escapeHTML(guide.title)}</h2>
        </div>

        <button class="icon-button close-viewer">✕</button>
      </div>

      <div class="guide-view-content"></div>
    </div>
  `;

  overlay.querySelector(
    ".guide-view-content"
  ).textContent = guide.content || "Matn mavjud emas.";

  document.body.appendChild(overlay);

  overlay.querySelector(".close-viewer")
    .addEventListener("click", () => overlay.remove());

  overlay.addEventListener("click", event => {
    if (event.target === overlay) overlay.remove();
  });
}


// ======================================================
// 23. KALENDAR
// ======================================================

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  $("#calendarTitle").textContent =
    calendarDate.toLocaleDateString("uz-UZ", {
      month: "long",
      year: "numeric"
    });

  const grid = $("#calendarGrid");
  grid.innerHTML = "";

  const weekdays = [
    "Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"
  ];

  weekdays.forEach(day => {
    const cell = document.createElement("div");
    cell.className = "calendar-cell weekday";
    cell.textContent = day;
    grid.appendChild(cell);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7;
  const daysInMonth =
    new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < offset; i++) {
    const blank = document.createElement("div");
    blank.className = "calendar-cell";
    blank.style.visibility = "hidden";
    grid.appendChild(blank);
  }

  const now = new Date();

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    cell.className = "calendar-cell";
    cell.textContent = day;

    if (
      day === now.getDate() &&
      month === now.getMonth() &&
      year === now.getFullYear()
    ) {
      cell.classList.add("today");
    }

    grid.appendChild(cell);
  }
}

$("#previousMonth").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});

$("#nextMonth").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});


// ======================================================
// 24. MENYU
// ======================================================

document.querySelectorAll(".menu-item").forEach(link => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".menu-item").forEach(item => {
      item.classList.remove("active");
    });

    link.classList.add("active");
  });
});


// ======================================================
// 25. MA'LUMOTLARNI EKSPORT QILISH
// ======================================================

$("#exportData").addEventListener("click", () => {
  const data = {
    tasks,
    guides,
    exportedAt: new Date().toISOString()
  };

  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "sevened-data.json";
  link.click();

  URL.revokeObjectURL(url);
});


// ======================================================
// 26. DASTURNI ISHGA TUSHIRISH
// ======================================================

async function initializeApp() {
  setTodayDate();
  renderTasks();
  renderGuides();
  renderCalendar();

  await checkExistingSession();
}

initializeApp();


// ======================================================
// SEVENED ACADEMY LAW — END
// ======================================================