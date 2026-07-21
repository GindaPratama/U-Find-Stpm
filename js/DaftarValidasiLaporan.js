// ==========================================
// DaftarValidasiLaporan.js
// ==========================================

let currentReport = null;
let currentApproveReport = null;
let currentSatpamNIP = null;

const kehilanganBody = document.getElementById("kehilanganBody");
const temuanBody = document.getElementById("temuanBody");

function showWarning(text) {
  const warningMessage = document.getElementById("warningMessage");
  const warningModal = document.getElementById("warningModal");
  if (warningMessage) warningMessage.textContent = text;
  if (warningModal) warningModal.classList.add("show");
}

function escapeHtml(text) {
  if (!text) return "-";
  return String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatWaktu(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")} WIB<br>${d.toLocaleDateString("id-ID")}`;
}

// ----------------------------------------------------
// UI LOGIC (Sidebar, Dropdown, Modal Logout)
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
});

// ----------------------------------------------------
// LOGIKA MODAL PENOLAKAN (Reject)
// ----------------------------------------------------
window.openRejectModal = function (table, id) {
  currentReport = { table, id };
  const rejectReason = document.getElementById("rejectReason");
  const rejectErrorText = document.getElementById("rejectErrorText");

  if (rejectReason) {
    rejectReason.value = "";
    rejectReason.style.borderColor = "var(--border)";
  }
  if (rejectErrorText) rejectErrorText.style.display = "none";
  document.getElementById("rejectModal").classList.add("show");
};

window.closeRejectModal = function () {
  currentReport = null;
  document.getElementById("rejectModal").classList.remove("show");
};

window.submitReject = async function (btn) {
  const rejectReason = document.getElementById("rejectReason");
  const rejectErrorText = document.getElementById("rejectErrorText");
  const reason = rejectReason ? rejectReason.value.trim() : "";

  // Validasi Alasan Kosong
  if (!reason) {
    if (rejectReason) rejectReason.style.borderColor = "#ef4444";
    if (rejectErrorText) rejectErrorText.style.display = "block";
    return;
  }

  if (rejectReason) rejectReason.style.borderColor = "var(--border)";
  if (rejectErrorText) rejectErrorText.style.display = "none";

  if (!currentReport || !currentSatpamNIP) {
    console.error("submitReject dibatalkan: currentReport atau currentSatpamNIP kosong", {
      currentReport,
      currentSatpamNIP,
    });
    showWarning("Sesi tidak valid, harap refresh halaman.");
    return;
  }

  const originalText = btn.textContent;
  btn.textContent = "Memproses...";
  btn.disabled = true;

  const { table, id } = currentReport;
  const pkColumn = table === "Laporan_Hilang" ? "Id_Laporan" : "Id_Temuan";

  try {
    const { data, error } = await supabaseClient
      .from(table)
      .update({
        status: "Ditolak",
        Catatan_Status: reason,
        NIP_Satpam: currentSatpamNIP,
      })
      .eq(pkColumn, id)
      .select();

    if (error) throw error;

    // Kalau RLS diam-diam menolak update, Supabase tidak selalu
    // melempar `error` -> data yang kembali cuma array kosong.
    // Kita anggap itu tetap sebagai kegagalan, bukan sukses.
    if (!data || data.length === 0) {
      throw new Error("Update tidak diterima database (kemungkinan izin/RLS). Hubungi admin.");
    }

    document.getElementById("rejectModal").classList.remove("show");
    setTimeout(() => {
      const successModal = document.getElementById("successRejectModal");
      if (successModal) successModal.classList.add("show");
    }, 250);
  } catch (err) {
    console.error("Gagal menolak laporan:", err);
    document.getElementById("rejectModal").classList.remove("show");
    setTimeout(() => showWarning("Gagal menolak laporan: " + err.message), 250);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
};

window.closeSuccessReject = async function () {
  const successModal = document.getElementById("successRejectModal");
  if (successModal) successModal.classList.remove("show");
  currentReport = null;
  await loadData();
};

// ----------------------------------------------------
// LOGIKA MODAL PERSETUJUAN (Approve)
// ----------------------------------------------------
window.approveLaporan = function (table, id) {
  if (!currentSatpamNIP) {
    console.error("approveLaporan dibatalkan: currentSatpamNIP kosong");
    showWarning("Sesi tidak valid, harap refresh halaman.");
    return;
  }
  currentApproveReport = { table, id };
  document.getElementById("confirmApproveModal").classList.add("show");
};

window.closeApproveModal = function () {
  currentApproveReport = null;
  document.getElementById("confirmApproveModal").classList.remove("show");
};

window.submitApprove = async function (btn) {
  if (!currentApproveReport || !currentSatpamNIP) {
    console.error("submitApprove dibatalkan: currentApproveReport atau currentSatpamNIP kosong", {
      currentApproveReport,
      currentSatpamNIP,
    });
    return;
  }
  const originalText = btn.textContent;
  btn.textContent = "Memproses...";
  btn.disabled = true;

  const { table, id } = currentApproveReport;
  const isHilang = table === "Laporan_Hilang";
  const pkColumn = isHilang ? "Id_Laporan" : "Id_Temuan";
  // Jika laporan hilang, statusnya "Sedang Dicari". Jika laporan temuan, statusnya "Tersedia dipos".
  const newStatus = isHilang ? "Sedang Dicari" : "Tersedia dipos";

  try {
    const { data, error } = await supabaseClient
      .from(table)
      .update({
        status: newStatus,
        Catatan_Status: null,
        NIP_Satpam: currentSatpamNIP,
      })
      .eq(pkColumn, id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error("Update tidak diterima database (kemungkinan izin/RLS). Hubungi admin.");
    }

    document.getElementById("confirmApproveModal").classList.remove("show");
    setTimeout(() => {
      const successModal = document.getElementById("successApproveModal");
      if (successModal) successModal.classList.add("show");
    }, 250);
  } catch (err) {
    console.error("Gagal menyetujui laporan:", err);
    document.getElementById("confirmApproveModal").classList.remove("show");
    setTimeout(() => showWarning("Gagal menyetujui laporan: " + err.message), 250);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
};

window.closeSuccessApprove = async function () {
  const successModal = document.getElementById("successApproveModal");
  if (successModal) successModal.classList.remove("show");
  currentApproveReport = null;
  await loadData();
};

// ----------------------------------------------------
// RENDER TABEL & FETCH DATA
// ----------------------------------------------------
function renderRows(tbody, rows, table) {
  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="9">Tidak ada laporan yang menunggu validasi.</td></tr>`;
    return;
  }
  const isHilang = table === "Laporan_Hilang";
  const pkColumn = isHilang ? "Id_Laporan" : "Id_Temuan";

  tbody.innerHTML = rows
    .map((row, idx) => {
      const gambar = row.Foto_Barang
        ? `<img src="${escapeHtml(row.Foto_Barang)}" alt="Barang" />`
        : `<span style="color:#9aa3b8;">-</span>`;
      const id = row[pkColumn];
      const lokasi = isHilang ? row.Lokasi_Kejadian : row.Lokasi_Penemuan;

      return `<tr data-id="${id}">
      <td>${idx + 1}</td><td>${formatWaktu(row.created_at)}</td><td>${escapeHtml(row.Nama_Lengkap_Mhs)}</td>
      <td>${escapeHtml(row.No_Hp_Mhs)}</td><td>${escapeHtml(row.Nama_Barang)}</td><td>${gambar}</td>
      <td style="max-width:200px; white-space:normal;">${escapeHtml(row.Ciri_Khusus)}</td>
      <td style="max-width:180px; white-space:normal;">${escapeHtml(lokasi)}</td>
      <td class="action-cell">
        <button class="btn-approve" onclick="approveLaporan('${table}', '${id}')" title="Setujui"><i class="fa-solid fa-check"></i></button>
        <button class="btn-reject" onclick="openRejectModal('${table}', '${id}')" title="Tolak"><i class="fa-solid fa-xmark"></i></button>
      </td>
    </tr>`;
    })
    .join("");
}

async function loadData() {
  if (!supabaseClient) return;
  try {
    const { data: kehilangan, error: errHilang } = await supabaseClient
      .from("Laporan_Hilang")
      .select("*")
      .eq("status", "Menunggu Validasi")
      .order("created_at", { ascending: true });
    if (errHilang) throw errHilang;
    if (kehilangan && kehilangan.length > 0) {
      const nims = [...new Set(kehilangan.map((k) => k.NIM_Pelapor).filter(Boolean))];
      if (nims.length > 0) {
        const { data: mhsData } = await supabaseClient
          .from("Mahasiswa")
          .select("NIM, Nama_Lengkap, No_Hp")
          .in("NIM", nims);
        kehilangan.forEach((k) => {
          const mhs = mhsData?.find((m) => String(m.NIM) === String(k.NIM_Pelapor));
          k.Nama_Lengkap_Mhs = mhs ? mhs.Nama_Lengkap : "-";
          k.No_Hp_Mhs = mhs ? mhs.No_Hp : "-";
        });
      }
    }
    renderRows(kehilanganBody, kehilangan, "Laporan_Hilang");
  } catch (err) {
    console.error("Gagal memuat data kehilangan:", err);
    kehilanganBody.innerHTML = `<tr class="empty-row"><td colspan="9">Gagal memuat data kehilangan.</td></tr>`;
  }

  try {
    const { data: temuan, error: errTemuan } = await supabaseClient
      .from("Laporan_Temuan")
      .select("*")
      .eq("status", "Menunggu Validasi")
      .order("created_at", { ascending: true });
    if (errTemuan) throw errTemuan;
    if (temuan && temuan.length > 0) {
      const nims = [...new Set(temuan.map((t) => t.NIM_Penemu).filter(Boolean))];
      if (nims.length > 0) {
        const { data: mhsData } = await supabaseClient
          .from("Mahasiswa")
          .select("NIM, Nama_Lengkap, No_Hp")
          .in("NIM", nims);
        temuan.forEach((t) => {
          const mhs = mhsData?.find((m) => String(m.NIM) === String(t.NIM_Penemu));
          t.Nama_Lengkap_Mhs = mhs ? mhs.Nama_Lengkap : "-";
          t.No_Hp_Mhs = mhs ? mhs.No_Hp : "-";
        });
      }
    }
    renderRows(temuanBody, temuan, "Laporan_Temuan");
  } catch (err) {
    console.error("Gagal memuat data temuan:", err);
    temuanBody.innerHTML = `<tr class="empty-row"><td colspan="9">Gagal memuat data temuan.</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof requireSatpamSession === "function") {
    const auth = await requireSatpamSession();
    if (auth) {
      currentSatpamNIP = auth.satpam.NIP_Satpam;
      document
        .querySelectorAll(".username")
        .forEach((el) => (el.textContent = auth.satpam.NIP_Satpam));
      await loadData();
    } else {
      console.error("requireSatpamSession() mengembalikan null - sesi Satpam tidak valid.");
    }
  } else {
    console.error(
      "requireSatpamSession tidak ditemukan - pastikan AdminAuth.js dimuat sebelum DaftarValidasiLaporan.js"
    );
  }
});
