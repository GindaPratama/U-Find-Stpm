// ==========================================
// PemantauanStatus.js
// ==========================================

let allRows = [];
let currentFilter = "semua";
const statusBody = document.getElementById("statusBody");
const filterButtons = document.querySelectorAll(".filter-btn");
const searchInput = document.getElementById("searchInput");

function escapeHtml(text) {
  if (text === null || text === undefined || text === "") return "-";
  return String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatWaktu(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")} WIB<br>${d.toLocaleDateString("id-ID")}`;
}

const STATUS_CONFIG = {
  "Menunggu Validasi": { cls: "status-pending" },
  "Sedang Dicari": { cls: "status-searching" },
  "Laporan Ditolak": { cls: "status-rejected" },
  "Tersedia dipos": { cls: "status-found" },
  Selesai: { cls: "status-done" },
};

function renderStatusCell(row) {
  const cfg = STATUS_CONFIG[row.status] || { cls: "status-pending" };
  let html = `<span class="status-pill ${cfg.cls}">${escapeHtml(row.status)}</span>`;
  if (row.status === "Laporan Ditolak" && row.Catatan_Status) {
    html += `<span class="status-note">! ${escapeHtml(row.Catatan_Status)}</span>`;
  }
  return html;
}

function renderRows(rows) {
  if (!rows || rows.length === 0) {
    statusBody.innerHTML = `<tr class="empty-row"><td colspan="10">Tidak ada data ditemukan.</td></tr>`;
    return;
  }
  statusBody.innerHTML = rows
    .map((row, idx) => {
      const gambar = row.Foto_Barang
        ? `<img src="${escapeHtml(row.Foto_Barang)}" alt="Barang" />`
        : `<span style="color:#9aa3b8;">-</span>`;
      return `
      <tr>
        <td>${idx + 1}</td>
        <td style="font-weight:600; color:var(--navy-900); white-space:nowrap;">${row.displayId}</td>
        <td>${formatWaktu(row.created_at)}</td>
        <td>${escapeHtml(row.Nama_Lengkap_Mhs)}</td>
        <td>${escapeHtml(row.No_Hp_Mhs)}</td>
        <td>${escapeHtml(row.Nama_Barang)}</td>
        <td>${gambar}</td>
        <td style="max-width:200px; white-space:normal;">${escapeHtml(row.Ciri_Khusus)}</td>
        <td style="max-width:180px; white-space:normal;">${escapeHtml(row.lokasi)}</td>
        <td>${renderStatusCell(row)}</td>
      </tr>
    `;
    })
    .join("");
}

function applyFilters() {
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  let filtered = allRows.filter((row) => {
    let matchTab = currentFilter === "semua" || row.table === currentFilter;
    const matchSearch =
      (row.displayId || "").toLowerCase().includes(query) ||
      (row.Nama_Lengkap_Mhs || "").toLowerCase().includes(query) ||
      (row.Nama_Barang || "").toLowerCase().includes(query) ||
      (row.status || "").toLowerCase().includes(query);
    return matchTab && matchSearch;
  });
  renderRows(filtered);
}

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    applyFilters();
  });
});

if (searchInput) searchInput.addEventListener("keyup", applyFilters);

async function loadData() {
  if (!supabaseClient) return;
  statusBody.innerHTML = `<tr class="empty-row"><td colspan="10">Memuat data dari server...</td></tr>`;

  try {
    const { data: hilang } = await supabaseClient.from("Laporan_Hilang").select("*");
    const { data: temuan } = await supabaseClient.from("Laporan_Temuan").select("*");
    let tempRows = [];

    if (hilang) {
      hilang.forEach((h) => {
        tempRows.push({
          ...h,
          table: "Laporan_Hilang",
          displayId: "LH-" + String(h.Id_Laporan).padStart(3, "0"),
          nimRelation: h.NIM_Pelapor,
          lokasi: h.Lokasi_Kejadian,
        });
      });
    }
    if (temuan) {
      temuan.forEach((t) => {
        tempRows.push({
          ...t,
          table: "Laporan_Temuan",
          displayId: "LT-" + String(t.Id_Temuan).padStart(3, "0"),
          nimRelation: t.NIM_Penemu,
          lokasi: t.Lokasi_Penemuan,
        });
      });
    }

    const nims = [...new Set(tempRows.map((r) => r.nimRelation).filter(Boolean))];
    if (nims.length > 0) {
      const { data: mhsData } = await supabaseClient
        .from("Mahasiswa")
        .select("NIM, Nama_Lengkap, No_Hp")
        .in("NIM", nims);
      tempRows.forEach((row) => {
        const mhs = mhsData?.find((m) => String(m.NIM) === String(row.nimRelation));
        row.Nama_Lengkap_Mhs = mhs ? mhs.Nama_Lengkap : "-";
        row.No_Hp_Mhs = mhs ? mhs.No_Hp : "-";
      });
    }

    allRows = tempRows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    applyFilters();
  } catch (err) {
    statusBody.innerHTML = `<tr class="empty-row"><td colspan="10">Gagal memuat data.</td></tr>`;
  }
}

// ----------------------------------------------------
// UI LOGIC (Sidebar, Dropdown, Modal)
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const closeSidebarBtn = document.getElementById("closeSidebarBtn");

  const toggleSidebar = () => {
    if (sidebar && sidebarOverlay) {
      sidebar.classList.toggle("open");
      sidebarOverlay.classList.toggle("show");
    }
  };

  if (hamburgerBtn) hamburgerBtn.addEventListener("click", toggleSidebar);
  if (closeSidebarBtn) closeSidebarBtn.addEventListener("click", toggleSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener("click", toggleSidebar);

  const trigger = document.getElementById("profileTrigger");
  const dropdown = document.getElementById("profileDropdown");
  if (trigger && dropdown) {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropdown.classList.toggle("open");
      trigger.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
        dropdown.classList.remove("open");
        trigger.classList.remove("open");
      }
    });
  }

  const logoutBtn = document.getElementById("logoutBtn");
  const logoutModal = document.getElementById("logoutModal");
  if (logoutBtn && logoutModal) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logoutModal.classList.add("show");
    });
    document
      .getElementById("cancelLogoutBtn")
      ?.addEventListener("click", () => logoutModal.classList.remove("show"));
    document.getElementById("submitLogoutBtn")?.addEventListener("click", async (e) => {
      e.target.textContent = "Keluar...";
      e.target.disabled = true;
      if (typeof supabaseClient !== "undefined" && supabaseClient)
        await supabaseClient.auth.signOut();
      sessionStorage.removeItem("loggedInNip");
      window.location.href = "../index.html";
    });
  }

  async function initAuth() {
    if (typeof requireSatpamSession === "function") {
      const auth = await requireSatpamSession();
      if (auth) {
        document
          .querySelectorAll(".username")
          .forEach((el) => (el.textContent = auth.satpam.NIP_Satpam));
        await loadData();
      }
    }
  }
  initAuth();
});
