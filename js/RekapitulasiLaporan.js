// ==========================================
// RekapitulasiLaporan.js
// ==========================================

const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const btnFilter = document.getElementById("btnFilter");
const btnDownload = document.getElementById("btnDownload");
const tabelPeriodeLabel = document.getElementById("tabelPeriodeLabel");
const chartPeriodeLabel = document.getElementById("chartPeriodeLabel");
const tdTotalHilang = document.getElementById("totalHilang");
const tdTotalTemuan = document.getElementById("totalTemuan");
const tdTotalKlaim = document.getElementById("totalKlaim");

const successModal = document.getElementById("successModal");
const errorModal = document.getElementById("errorModal");
const errorMessage = document.getElementById("errorMessage");

document
  .getElementById("closeSuccessBtn")
  ?.addEventListener("click", () => successModal.classList.remove("show"));
document
  .getElementById("closeErrorBtn")
  ?.addEventListener("click", () => errorModal.classList.remove("show"));

let rekapChartInstance = null;
let currentData = { hilang: 0, temuan: 0, klaim: 0 };

function formatDateToDMY(dateString) {
  if (!dateString) return "-";
  const d = new Date(dateString);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function setDefaultDates() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const formatInput = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  startDateInput.value = formatInput(firstDay);
  endDateInput.value = formatInput(today);
}

// ----------------------------------------------------
// UI LOGIC (Sidebar, Dropdown, Modal Logout)
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Sidebar Toggle
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

  // Profile Dropdown
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

  // Logout Modal
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
});

async function loadData() {
  if (!supabaseClient) return;
  const start = startDateInput.value;
  const end = endDateInput.value;

  if (!start || !end) {
    errorMessage.textContent = "Harap pilih tanggal awal dan akhir.";
    errorModal.classList.add("show");
    return;
  }

  const endDateTime = `${end} 23:59:59`;
  const labelPeriode = `${formatDateToDMY(start)} - ${formatDateToDMY(end)}`;
  tabelPeriodeLabel.textContent = labelPeriode;
  chartPeriodeLabel.textContent = labelPeriode;

  try {
    const { count: countHilang, error: errHilang } = await supabaseClient
      .from("Laporan_Hilang")
      .select("*", { count: "exact", head: true })
      .gte("created_at", start)
      .lte("created_at", endDateTime);
    if (errHilang) throw new Error("Error Laporan_Hilang: " + errHilang.message);

    const { count: countTemuan, error: errTemuan } = await supabaseClient
      .from("Laporan_Temuan")
      .select("*", { count: "exact", head: true })
      .gte("created_at", start)
      .lte("created_at", endDateTime);
    if (errTemuan) throw new Error("Error Laporan_Temuan: " + errTemuan.message);

    const { count: countKlaim, error: errKlaim } = await supabaseClient
      .from("Klaim_Barang")
      .select("*", { count: "exact", head: true })
      .gte("created_at", start)
      .lte("created_at", endDateTime);
    if (errKlaim) throw new Error("Error Klaim_Barang: " + errKlaim.message);

    currentData = { hilang: countHilang || 0, temuan: countTemuan || 0, klaim: countKlaim || 0 };
    updateUI();
    updateUI(start, end);
  } catch (err) {
    errorMessage.textContent = err.message || "Gagal mengambil data dari server.";
    errorModal.classList.add("show");
  }
}

function updateUI() {
  const start = startDateInput.value;
  const end = endDateInput.value;
  const labelPeriode = `${formatDateToDMY(start)} - ${formatDateToDMY(end)}`;
  tabelPeriodeLabel.textContent = labelPeriode;
  chartPeriodeLabel.textContent = labelPeriode;
  tdTotalHilang.textContent = currentData.hilang;
  tdTotalTemuan.textContent = currentData.temuan;
  tdTotalKlaim.textContent = currentData.klaim;

  const ctx = document.getElementById("rekapChart").getContext("2d");
  if (rekapChartInstance) rekapChartInstance.destroy();

  rekapChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Barang Hilang", "Barang Temuan", "Barang Diklaim"],
      datasets: [
        {
          label: "Total Laporan",
          data: [currentData.hilang, currentData.temuan, currentData.klaim],
          backgroundColor: ["#ef4444", "#22c55e", "#93c5fd"],
          borderColor: ["#b91c1c", "#15803d", "#3b82f6"],
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.6,
          categoryPercentage: 0.8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } },
    },
  });
}

function downloadExcel() {
  try {
    if (!window.XLSX)
      throw new Error("Library Excel belum termuat, pastikan koneksi internet lancar.");
    const start = formatDateToDMY(startDateInput.value);
    const end = formatDateToDMY(endDateInput.value);
    const excelData = [
      { Kategori: "Periode Waktu", Total: `${start} s/d ${end}` },
      { Kategori: "", Total: "" },
      { Kategori: "Nama Laporan", Total: "Total Laporan" },
      { Kategori: "Barang Hilang", Total: currentData.hilang },
      { Kategori: "Barang Temuan", Total: currentData.temuan },
      { Kategori: "Barang Diklaim", Total: currentData.klaim },
    ];
    const worksheet = XLSX.utils.json_to_sheet(excelData, { skipHeader: true });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Laporan");
    XLSX.writeFile(workbook, `Rekap_U-Find_${start}_sd_${end}.xlsx`);
    successModal.classList.add("show");
  } catch (err) {
    errorMessage.textContent = "Laporan gagal diunduh: " + err.message;
    errorModal.classList.add("show");
  }
}

if (btnFilter) btnFilter.addEventListener("click", loadData);
if (btnDownload) btnDownload.addEventListener("click", downloadExcel);

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof requireSatpamSession === "function") {
    const auth = await requireSatpamSession();
    if (auth) {
      currentSatpamNIP = auth.satpam.NIP_Satpam;
      document.querySelectorAll(".username").forEach((el) => {
        const fullName = auth.satpam.Nama_Lengkap || "Satpam";
        el.textContent = fullName.trim().split(/\s+/).slice(0, 2).join(" ");
      });
      setDefaultDates();
      await loadData();
    }
  }
});
