/* ================= GLOBAL ================= */
let editingId = null;


/* ================= AUTH ================= */

function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    return alert("Enter credentials");
  }

  const users = getUsers();

  const user = users.find(u => u.email === email);

  if (!user) {
    return alert("User not found. Please register.");
  }

  if (user.password !== password) {
    return alert("Incorrect password");
  }

  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userEmail", email);

  window.location.href = "dashboard.html";
}

function logout() {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userEmail");
  window.location.href = "login.html";
}

function checkAuth() {
  const isLoggedIn = localStorage.getItem("isLoggedIn");
  const user = localStorage.getItem("userEmail");

  if (isLoggedIn !== "true" || !user) {
    window.location.href = "login.html";
  }
}


/* ================= USER ================= */

function setUserEmail() {
  const email = localStorage.getItem("userEmail") || "User";
  const el = document.getElementById("userEmail");
  if (el) el.innerText = email;
}


/* ================= STORAGE (UPDATED ✅) ================= */

// 👉 USER-SPECIFIC ITEMS
function getItems() {
  const raw = localStorage.getItem("items");

  let allItems;
  try {
    allItems = raw ? JSON.parse(raw) : {};
  } catch {
    allItems = {};
  }

  const user = localStorage.getItem("userEmail");

  if (!user) return [];

  return allItems[user] || [];
}

function saveItems(userItems) {
  const user = localStorage.getItem("userEmail");

  if (!user) {
    alert("User not logged in!");
    return;
  }

  const raw = localStorage.getItem("items");

  let allItems;
  try {
    allItems = raw ? JSON.parse(raw) : {};
  } catch {
    allItems = {};
  }

  allItems[user] = userItems;

  localStorage.setItem("items", JSON.stringify(allItems));
}


/* ================= USER STORAGE ================= */

function getUsers() {
  return JSON.parse(localStorage.getItem("users")) || [];
}

function saveUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}


/* ================= DASHBOARD ================= */
function loadDashboard() {
  setUserEmail();

  const items = getItems();

  const total = items.length;
  const active = items.filter(i => i.status === "active").length;
  const inactive = items.filter(i => i.status === "inactive").length;

  const today = new Date().toISOString().split("T")[0];

  const overdue = items.filter(i =>
    i.dueDate && i.dueDate < today && i.status === "active"
  ).length;

  /* ================= TOP CARDS ================= */
  document.getElementById("dashboardCards").innerHTML = `
    <div class="card">📦 Total<br>${total}</div>
    <div class="card">✅ Active<br>${active}</div>
    <div class="card">⛔ Inactive<br>${inactive}</div>
    <div class="card">🚨 Overdue<br>${overdue}</div>
  `;

  /* ================= CHART 1 ================= */
  drawChart(active, inactive);

  /* ================= PRIORITY FIX (IMPORTANT) ================= */
  const priorities = {
    High: items.filter(i => i.priority?.toLowerCase() === "high").length,
    Medium: items.filter(i => i.priority?.toLowerCase() === "medium").length,
    Low: items.filter(i => i.priority?.toLowerCase() === "low").length
  };

  /* ================= PRIORITY CHART ================= */
  const pCtx = document.getElementById("priorityChart");

  if (pCtx) {
    new Chart(pCtx, {
      type: "bar",
      data: {
        labels: ["High", "Medium", "Low"],
        datasets: [{
          label: "Tasks",
          data: [priorities.High, priorities.Medium, priorities.Low]
        }]
      }
    });
  }

  /* ================= CATEGORY ================= */
  const categoryMap = {};
  items.forEach(i => {
    const cat = i.category || "Other";
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });

  document.getElementById("categoryList").innerHTML =
    Object.entries(categoryMap)
      .map(([k, v]) => `<li>${k}: ${v}</li>`)
      .join("");

  /* ================= PRIORITY LIST ================= */
  document.getElementById("priorityList").innerHTML = `
    <li>🔴 High: ${priorities.High}</li>
    <li>🟠 Medium: ${priorities.Medium}</li>
    <li>🟢 Low: ${priorities.Low}</li>
  `;

  /* ================= UPCOMING ================= */
  const upcoming = items
    .filter(i => i.dueDate && i.status === "active")
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  document.getElementById("upcomingList").innerHTML =
    upcoming.length === 0
      ? "<li>No upcoming tasks</li>"
      : upcoming.map(i => `<li>${i.title} (${i.dueDate})</li>`).join("");

  /* ================= SMART SUMMARY ================= */
  let summary = "";

  if (overdue > 0) {
    summary += `⚠️ ${overdue} overdue tasks. `;
  }

  if (priorities.High > 3) {
    summary += `🔥 Too many high priority tasks. `;
  }

  if (active === 0 && total > 0) {
    summary += `🎉 All tasks completed!`;
  }

  if (!summary) {
    summary = "Everything looks good 👍";
  }

  document.getElementById("smartSummary").innerText = summary;
}

/* ================= ITEMS ================= */

function loadItems(filteredItems = null) {
  setUserEmail();

  const items = filteredItems || getItems();
  const table = document.getElementById("itemsTable");

  if (items.length === 0) {
    table.innerHTML = `<tr><td colspan="7">No items found</td></tr>`;
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  table.innerHTML = items.map(i => {
    const overdue = i.dueDate && i.dueDate < today ? "overdue" : "";

    return `
    <tr class="${overdue}">
      <td>${i.title}</td>
      <td>
        ${i.status}
        <button onclick="toggleStatus(${i.id})">🔄</button>
      </td>
      <td class="${i.priority}">${i.priority}</td>
      <td>${i.category || "-"}</td>
      <td>${i.dueDate || "-"}</td>
      <td>${i.createdAt}</td>
      <td>
        <button onclick="editItem(${i.id})">✏️</button>
        <button onclick="deleteItem(${i.id})">🗑</button>
      </td>
    </tr>
    `;
  }).join("");
}


/* ================= FORM ================= */

function showForm() {
  editingId = null;

  document.getElementById("formTitle").innerText = "Add Item";
  document.getElementById("title").value = "";
  document.getElementById("status").value = "active";
  document.getElementById("priority").value = "low";
  document.getElementById("category").value = "";
  document.getElementById("dueDate").value = "";

  document.getElementById("formModal").classList.remove("hidden");

  // autofocus
  setTimeout(() => {
    document.getElementById("title").focus();
  }, 100);
}


/* ================= EDIT ================= */

function editItem(id) {
  const item = getItems().find(i => i.id === id);
  if (!item) return;

  editingId = id;

  document.getElementById("title").value = item.title;
  document.getElementById("status").value = item.status;
  document.getElementById("priority").value = item.priority;
  document.getElementById("category").value = item.category;
  document.getElementById("dueDate").value = item.dueDate;

  document.getElementById("formTitle").innerText = "Edit Item";

  document.getElementById("formModal").classList.remove("hidden");
}


/* ================= SAVE ================= */

function saveItem() {
  const title = document.getElementById("title").value.trim();
  const status = document.getElementById("status").value;
  const priority = document.getElementById("priority").value;
const category = document.getElementById("category").value;
const dueDate = document.getElementById("dueDate").value;

  if (!title) return alert("Title required");

  let items = getItems();

  if (editingId !== null) {
    items = items.map(item =>
      item.id === editingId
        ? { ...item, title, status, priority, category, dueDate }
        : item
    );
  } else {
    items.push({
      id: Date.now(),
      title,
      status,
      priority,
      category,
      dueDate,
      createdAt: new Date().toISOString().split("T")[0]
    });
  }

  saveItems(items);
  cancelEdit();
  loadItems();
}


/* ================= DELETE ================= */

function deleteItem(id) {
  let items = getItems();

  if (!confirm("Delete this item?")) return;

  items = items.filter(i => i.id !== id);

  saveItems(items);
  loadItems();
}


/* ================= CANCEL ================= */

function cancelEdit() {
  editingId = null;

  document.getElementById("formModal").classList.add("hidden");
}


/* ================= REGISTER ================= */

function register() {
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  const confirm = document.getElementById("regConfirm").value.trim();

  const emailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  const passwordPattern = /^(?=.*\d).{6,}$/;

  if (!email || !password || !confirm) {
    return alert("Fill all fields");
  }

  if (!emailPattern.test(email)) {
    return alert("Enter valid Gmail");
  }

  if (!passwordPattern.test(password)) {
    return alert("Password must be 6+ chars & include number");
  }

  if (password !== confirm) {
    return alert("Passwords do not match");
  }

  let users = getUsers();

  const exists = users.find(u => u.email === email);
  if (exists) {
    return alert("User already exists");
  }

  users.push({ email, password });
  saveUsers(users);

  alert("Registration successful!");
  window.location.href = "login.html";
}

function resetPassword() {
  const email = document.getElementById("resetEmail").value.trim();
  const newPassword = document.getElementById("newPassword").value.trim();

  if (!email || !newPassword) {
    return alert("Fill all fields");
  }

  let users = getUsers();

  const userIndex = users.findIndex(u => u.email === email);

  if (userIndex === -1) {
    return alert("User not found");
  }

  // Update password
  users[userIndex].password = newPassword;

  saveUsers(users);

  alert("Password reset successful!");
  window.location.href = "login.html";
}
// change password
function changePassword() {
  const oldPass = document.getElementById("oldPassword").value.trim();
  const newPass = document.getElementById("newPassword").value.trim();

  let users = getUsers();
  const email = localStorage.getItem("userEmail");

  const userIndex = users.findIndex(u => u.email === email);

  if (users[userIndex].password !== oldPass) {
    return alert("Old password incorrect");
  }

  users[userIndex].password = newPass;
  saveUsers(users);

  alert("Password updated!");
}

function clearMyItems() {
  if (!confirm("Delete all your items?")) return;

  saveItems([]); // clears only current user's items

  alert("All items deleted!");
}

// delete account
function deleteAccount() {
  if (!confirm("This will permanently delete your account. Continue?")) return;

  let users = getUsers();
  const email = localStorage.getItem("userEmail");

  // Remove user
  users = users.filter(u => u.email !== email);
  saveUsers(users);

  // Remove user items
  const allItems = JSON.parse(localStorage.getItem("items")) || {};
  delete allItems[email];
  localStorage.setItem("items", JSON.stringify(allItems));

  // Logout
  logout();
}

// account details
function loadAccountDetails() {
  const email = localStorage.getItem("userEmail") || "User";
  const items = getItems();

  const totalItems = items.length;

  document.getElementById("accountEmail").innerText = email;
  document.getElementById("accountItems").innerText = totalItems;
}

//charts

let chartInstance = null;

function drawChart(active, inactive) {
  const ctx = document.getElementById("statusChart");

  // ❗ Prevent crash if canvas not found
  if (!ctx) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Active", "Inactive"],
      datasets: [{
        data: [active, inactive],
        backgroundColor: ["#10b981", "#ef4444"],
        borderWidth: 0
      }]
    },
    options: {
      cutout: "70%",
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}
// filter func
function filterItems() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const filter = document.getElementById("filterStatus").value;

  const items = getItems();

  const filtered = items.filter(i => {
    const matchSearch = i.title.toLowerCase().includes(search);
    const matchFilter = filter === "all" || i.status === filter;
    return matchSearch && matchFilter;
  });

  loadItems(filtered);
}

// status 
function toggleStatus(id) {
  let items = getItems();

  items = items.map(i =>
    i.id === id
      ? { ...i, status: i.status === "active" ? "inactive" : "active" }
      : i
  );

  saveItems(items);
  loadItems();
}