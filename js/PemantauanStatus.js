// ==========================================
// PemantauanStatus.js
// ==========================================

const tbody = document.querySelector("tbody");
const searchInput = document.querySelector('input[type="text"]');

// ----------------------------------------------------
// UI LOGIC (Sidebar, Dropdown, Modal Logout)
// ----------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
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
      if (typeof supabaseClient !== "undefined") await supabaseClient.auth.signOut();
      sessionStorage.removeItem("loggedInNip");
      window.location.href = "../index.html";
    });
  }

  // Pastikan ada sesi Satpam
  if (typeof requireSatpamSession === "function") {
    const auth = await requireSatpamSession();
    if (auth) {
      currentSatpamNIP = auth.satpam.NIP_Satpam;
      document.querySelectorAll(".username").forEach((el) => {
        const fullName = auth.satpam.Nama_Lengkap || "Satpam";
        el.textContent = fullName.trim().split(/\s+/).slice(0, 2).join(" ");
      });
    }
  } else {
    await loadData();
  }
});

function escapeHtml(text) {
  if (text === null || text === undefined || text === "") return "-";
  return String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatWaktu(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")} WIB<br>${d.toLocaleDateString("id-ID")}`;
}

function getStatusColor(status) {
  if (status === "Selesai") return "color: #22c55e;"; // Hijau
  if (status === "Sedang Dicari") return "color: #ef4444;"; // Merah
  if (status === "Tersedia dipos") return "color: #2f6fd1;"; // Biru
  return "color: #e3a53a;"; // Kuning/Gold
}

// ----------------------------------------------------
// FETCH DATA DENGAN FIX "SELESAI"
// ----------------------------------------------------
async function loadData() {
  if (!supabaseClient || !tbody) return;
  tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;">Memuat data...</td></tr>`;

  try {
    // 1. FIX: Tarik semua Laporan Hilang KECUALI yang "Menunggu Validasi"
    const { data: hilang, error: errHilang } = await supabaseClient
      .from("Laporan_Hilang")
      .select("*")
      .neq("status", "Menunggu Validasi");
    if (errHilang) throw errHilang;

    // 2. FIX: Tarik semua Laporan Temuan KECUALI yang "Menunggu Validasi"
    const { data: temuan, error: errTemuan } = await supabaseClient
      .from("Laporan_Temuan")
      .select("*")
      .neq("status", "Menunggu Validasi");
    if (errTemuan) throw errTemuan;

    let allData = [];

    if (hilang) {
      hilang.forEach((h) => {
        allData.push({
          raw_date: new Date(h.created_at || 0).getTime(),
          waktuStr: formatWaktu(h.created_at),
          id_display: `LH-${String(h.Id_Laporan).padStart(3, "0")}`,
          nim: h.NIM_Pelapor,
          nama_barang: h.Nama_Barang,
          gambar: h.Foto_Barang,
          ciri: h.Ciri_Khusus,
          lokasi: h.Lokasi_Kejadian,
          status: h.status,
          type: "hilang",
        });
      });
    }

    if (temuan) {
      temuan.forEach((t) => {
        allData.push({
          raw_date: new Date(t.created_at || 0).getTime(),
          waktuStr: formatWaktu(t.created_at),
          id_display: `LT-${String(t.Id_Temuan).padStart(3, "0")}`,
          nim: t.NIM_Penemu,
          nama_barang: t.Nama_Barang,
          gambar: t.Foto_Barang,
          ciri: t.Ciri_Khusus,
          lokasi: t.Lokasi_Penemuan,
          status: t.status,
          type: "temuan",
        });
      });
    }

    // Urutkan dari yang paling baru
    allData.sort((a, b) => b.raw_date - a.raw_date);

    // Ambil Data Mahasiswa (Nama & No HP)
    const nims = [...new Set(allData.map((d) => d.nim).filter(Boolean))];
    let mhsMap = [];
    if (nims.length > 0) {
      const { data: mhsData } = await supabaseClient
        .from("Mahasiswa")
        .select("NIM, Nama_Lengkap, No_Hp")
        .in("NIM", nims);
      mhsMap = mhsData || [];
    }

    if (allData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;">Tidak ada laporan tersedia.</td></tr>`;
      return;
    }

    // Simpan ke memori global untuk fitur Filter & Search
    window.allStatusData = allData;
    window.mhsStatusMap = mhsMap;

    // Render Data Default
    renderTableData(allData, mhsMap);
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px; color: red;">Gagal memuat data: ${err.message}</td></tr>`;
  }
}

// ----------------------------------------------------
// RENDER TABEL
// ----------------------------------------------------
function renderTableData(dataArray, mhsMap) {
  if (!tbody) return;
  if (dataArray.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 20px;">Data tidak ditemukan.</td></tr>`;
    return;
  }

  tbody.innerHTML = dataArray
    .map((d, index) => {
      const mhs = mhsMap.find((m) => String(m.NIM) === String(d.nim));
      const namaMhs = mhs ? mhs.Nama_Lengkap : "Akun Testing";
      const noHp = mhs ? mhs.No_Hp : "-";

      const imgHtml = d.gambar
        ? `<img src="${escapeHtml(d.gambar)}" alt="Barang" style="width: 60px; height: 40px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border);" />`
        : `<span style="color:#9aa3b8;">-</span>`;

      return `
      <tr>
        <td>${index + 1}</td>
        <td style="font-weight: 600;">${d.id_display}</td>
        <td>${d.waktuStr}</td>
        <td>${escapeHtml(namaMhs)}</td>
        <td>${escapeHtml(noHp)}</td>
        <td>${escapeHtml(d.nama_barang)}</td>
        <td>${imgHtml}</td>
        <td style="max-width: 200px; white-space: normal;">${escapeHtml(d.ciri)}</td>
        <td style="max-width: 150px; white-space: normal;">${escapeHtml(d.lokasi)}</td>
        <td style="${getStatusColor(d.status)} font-weight: 700;">${escapeHtml(d.status)}</td>
      </tr>
    `;
    })
    .join("");
}

// ----------------------------------------------------
// LOGIKA FITUR FILTER (Pill Button & Search)
// ----------------------------------------------------
document.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn || !window.allStatusData) return;

  const text = btn.textContent.trim().toLowerCase();

  if (text === "semua") {
    renderTableData(window.allStatusData, window.mhsStatusMap);
  } else if (text === "laporan hilang") {
    const filtered = window.allStatusData.filter((d) => d.type === "hilang");
    renderTableData(filtered, window.mhsStatusMap);
  } else if (text === "laporan temuan") {
    const filtered = window.allStatusData.filter((d) => d.type === "temuan");
    renderTableData(filtered, window.mhsStatusMap);
  }
});

// Fitur Live Search
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const keyword = e.target.value.toLowerCase();
    if (!window.allStatusData) return;

    const filtered = window.allStatusData.filter((d) => {
      const mhs = window.mhsStatusMap.find((m) => String(m.NIM) === String(d.nim));
      const namaMhs = (mhs ? mhs.Nama_Lengkap : "").toLowerCase();

      return (
        d.id_display.toLowerCase().includes(keyword) ||
        d.nama_barang.toLowerCase().includes(keyword) ||
        d.status.toLowerCase().includes(keyword) ||
        namaMhs.includes(keyword) ||
        d.lokasi.toLowerCase().includes(keyword)
      );
    });
    renderTableData(filtered, window.mhsStatusMap);
  });
}
