const API = ""; // The UI is served by the same Express app, so API requests use the same origin.
const $ = (selector) => document.querySelector(selector);
const state = { accounts: [], page: 1, limit: 20, total: 0, historyAccountId: "" };

function money(amount, currency = "INR") {
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount || 0)); }
  catch { return `${currency} ${Number(amount || 0).toFixed(2)}`; }
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function showNotice(message, type = "success") {
  const notice = $("#notice"); notice.textContent = message; notice.className = `notice ${type}`; notice.hidden = false;
  notice.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function clearNotice() { $("#notice").hidden = true; }
async function request(url, options = {}) {
  const response = await fetch(`${API}${url}`, { ...options, headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers } });
  let payload;
  try { payload = await response.json(); } catch { payload = { success: false, error: { message: `Request failed (${response.status})` } }; }
  if (!response.ok || payload.success === false) {
    const error = payload.error || {};
    const details = Array.isArray(error.details) ? `\n${error.details.map((item) => `${item.field}: ${item.message}`).join("\n")}` : "";
    throw new Error(`${error.code ? `${error.code}: ` : ""}${error.message || `Request failed (${response.status})`}${details}`);
  }
  return payload;
}
function optionsForAccounts(selected = "") {
  const placeholder = '<option value="">Select account</option>';
  return placeholder + state.accounts.map((account) => `<option value="${account._id}" ${account._id === selected ? "selected" : ""}>${escapeHtml(account.name)} · ${escapeHtml(account.currency)} · ${money(account.balance, account.currency)}</option>`).join("");
}
function renderAccounts() {
  const tbody = $("#accountsTable");
  $("#totalAccounts").textContent = state.accounts.length;
  const totalInr = state.accounts.filter((account) => account.currency === "INR").reduce((sum, account) => sum + Number(account.balance || 0), 0);
  $("#totalBalance").textContent = money(totalInr, "INR");
  $("#accountCountLabel").textContent = `${state.accounts.length} account${state.accounts.length === 1 ? "" : "s"}`;
  if (!state.accounts.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No accounts yet. Create the first account above.</td></tr>';
  } else {
    tbody.innerHTML = state.accounts.map((account) => `<tr>
      <td><span class="account-name">${escapeHtml(account.name)}</span></td>
      <td><span class="account-id" title="${account._id}">${account._id}</span></td>
      <td>${escapeHtml(account.currency)}</td>
      <td class="number-cell balance-cell">${money(account.balance, account.currency)}</td>
      <td><button class="table-action view-history" data-account-id="${account._id}" type="button">View history</button></td>
    </tr>`).join("");
  }
  const currentTransaction = $("#transactionAccount").value;
  const currentFrom = $("#transferFrom").value;
  const currentTo = $("#transferTo").value;
  const currentHistory = $("#historyAccount").value || state.historyAccountId;
  $("#transactionAccount").innerHTML = optionsForAccounts(currentTransaction);
  $("#transferFrom").innerHTML = optionsForAccounts(currentFrom);
  $("#transferTo").innerHTML = optionsForAccounts(currentTo);
  $("#historyAccount").innerHTML = optionsForAccounts(currentHistory);
  document.querySelectorAll(".view-history").forEach((button) => button.addEventListener("click", () => {
    state.historyAccountId = button.dataset.accountId;
    $("#historyAccount").value = state.historyAccountId;
    state.page = 1;
    loadHistory().catch((error) => showNotice(error.message, "error"));
    $("#historyAccount").scrollIntoView({ behavior: "smooth", block: "center" });
  }));
}
function transactionAmount(item, currency = "INR") {
  if (item.type === "debit") return `− ${money(item.amount, currency)}`;
  if (item.type === "transfer") return money(item.amount, currency);
  return `+ ${money(item.amount, currency)}`;
}
function balanceAfter(item, accountId, currency = "INR") {
  if (item.type === "transfer") {
    if (String(item.fromAccountId) === accountId) return money(item.fromBalanceAfter, currency);
    if (String(item.toAccountId) === accountId) return money(item.toBalanceAfter, currency);
  }
  return item.balanceAfter == null ? "—" : money(item.balanceAfter, currency);
}
function dateText(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
async function loadAccounts() {
  const payload = await request("/api/accounts");
  state.accounts = Array.isArray(payload.data) ? payload.data : [];
  renderAccounts();
  if (state.historyAccountId && state.accounts.some((item) => item._id === state.historyAccountId)) {
    $("#historyAccount").value = state.historyAccountId;
  }
}
async function loadHistory() {
  const accountId = $("#historyAccount").value;
  if (!accountId) {
    $("#historyTable").innerHTML = '<tr><td colspan="6" class="empty-state">Select an account to load transactions.</td></tr>';
    $("#paginationInfo").textContent = "No transactions loaded";
    $("#totalTransactions").textContent = "—";
    $("#previousPage").disabled = true; $("#nextPage").disabled = true;
    return;
  }
  state.historyAccountId = accountId;
  state.limit = Number($("#historyLimit").value || 20);
  const params = new URLSearchParams({ page: String(state.page), limit: String(state.limit) });
  const type = $("#historyType").value;
  const referenceId = $("#historyReference").value.trim();
  if (type) params.set("type", type);
  if (referenceId) params.set("referenceId", referenceId);
  const payload = await request(`/api/accounts/${encodeURIComponent(accountId)}/transactions?${params}`);
  const items = Array.isArray(payload.data) ? payload.data : [];
  const pagination = payload.pagination || { page: state.page, limit: state.limit, total: items.length, totalPages: 1, hasPreviousPage: state.page > 1, hasNextPage: false };
  state.total = pagination.total || 0;
  $("#totalTransactions").textContent = state.total;
  const selectedAccount = state.accounts.find((account) => account._id === accountId);
  const currency = selectedAccount?.currency || "INR";
  $("#historySubtitle").textContent = `Showing newest first · ${selectedAccount?.name || "Selected account"}`;
  $("#historyTable").innerHTML = items.length ? items.map((item) => `<tr>
    <td><span class="pill pill-${escapeHtml(item.type)}">${escapeHtml(item.type)}</span></td>
    <td>${escapeHtml(item.referenceId)}</td>
    <td>${escapeHtml(item.description || "—")}</td>
    <td class="number-cell">${transactionAmount(item, currency)}</td>
    <td>${balanceAfter(item, accountId, currency)}</td>
    <td>${dateText(item.createdAt)}</td>
  </tr>`).join("") : '<tr><td colspan="6" class="empty-state">No transactions match these filters.</td></tr>';
  const start = state.total ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const end = Math.min(pagination.page * pagination.limit, state.total);
  $("#paginationInfo").textContent = `Showing ${start}–${end} of ${state.total} transaction${state.total === 1 ? "" : "s"} · Page ${pagination.page} of ${Math.max(1, pagination.totalPages)}`;
  $("#previousPage").disabled = !pagination.hasPreviousPage;
  $("#nextPage").disabled = !pagination.hasNextPage;
}
async function refreshAll(keepHistory = true) {
  clearNotice();
  await loadAccounts();
  if (keepHistory && $("#historyAccount").value) await loadHistory();
}
function formObject(form) { return Object.fromEntries(new FormData(form).entries()); }

$("#createAccountForm").addEventListener("submit", async (event) => {
  event.preventDefault(); clearNotice();
  const form = event.currentTarget; const body = formObject(form);
  try {
    const payload = await request("/api/accounts", { method: "POST", body: JSON.stringify(body) });
    form.reset(); await refreshAll(false);
    const created = payload.data;
    $("#transactionAccount").value = created._id;
    $("#historyAccount").value = created._id; state.historyAccountId = created._id; state.page = 1;
    await loadHistory();
    showNotice(`Account “${created.name}” created successfully. Account ID: ${created._id}`);
  } catch (error) { showNotice(error.message, "error"); }
});

$("#transactionForm").addEventListener("submit", async (event) => {
  event.preventDefault(); clearNotice(); const form = event.currentTarget; const data = formObject(form);
  const accountId = data.accountId; delete data.accountId; data.amount = Number(data.amount);
  try {
    await request(`/api/accounts/${encodeURIComponent(accountId)}/transactions`, { method: "POST", body: JSON.stringify(data) });
    form.reset(); await refreshAll(false);
    $("#historyAccount").value = accountId; state.historyAccountId = accountId; state.page = 1; await loadHistory();
    showNotice(`${data.type === "credit" ? "Credit" : "Debit"} transaction recorded successfully.`);
  } catch (error) { showNotice(error.message, "error"); }
});

$("#transferForm").addEventListener("submit", async (event) => {
  event.preventDefault(); clearNotice(); const form = event.currentTarget; const data = formObject(form); data.amount = Number(data.amount);
  try {
    await request("/api/transfers", { method: "POST", body: JSON.stringify(data) });
    form.reset(); await refreshAll(false);
    $("#historyAccount").value = data.fromAccountId; state.historyAccountId = data.fromAccountId; state.page = 1; await loadHistory();
    showNotice("Transfer completed successfully. Both account balances have been refreshed.");
  } catch (error) { showNotice(error.message, "error"); }
});

$("#historyForm").addEventListener("submit", async (event) => { event.preventDefault(); state.page = 1; try { await loadHistory(); clearNotice(); } catch (error) { showNotice(error.message, "error"); } });
$("#previousPage").addEventListener("click", async () => { if (state.page > 1) { state.page -= 1; try { await loadHistory(); } catch (error) { showNotice(error.message, "error"); } } });
$("#nextPage").addEventListener("click", async () => { state.page += 1; try { await loadHistory(); } catch (error) { state.page -= 1; showNotice(error.message, "error"); } });
$("#refreshAll").addEventListener("click", async () => { try { await refreshAll(); showNotice("Accounts and transaction history refreshed."); } catch (error) { showNotice(error.message, "error"); } });

(async function init() {
  try {
    await request("/health"); $("#apiStatus").textContent = "API connected"; $(".status-dot").classList.add("online");
    await refreshAll(false);
  } catch (error) {
    $("#apiStatus").textContent = "API unavailable";
    showNotice(`Could not load the API. Make sure the Node.js server is running.\n${error.message}`, "error");
  }
})();
