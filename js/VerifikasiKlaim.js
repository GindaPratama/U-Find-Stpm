// ==========================================
// VerifikasiKlaim.js
// ==========================================

let currentApproveKlaim = null;
let currentRejectKlaimId = null;
let currentSatpamNIP = null;

const temuanBody = document.getElementById("temuanBody");
const klaimBody = document.getElementById("klaimBody");

// Elemen Modal Peringatan & Pop Up
const rejectKlaimModal = document.getElementById("rejectKlaimModal");
const rejectKlaimReason = document.getElementById("rejectKlaimReason");
const confirmApproveModal = document.getElementById("confirmApproveModal");
const successApproveModal = document.getElementById("successApproveModal");
const warningModal = document.getElementById("warningModal");
const warningMessage = document.getElementById("warningMessage");

function showWarning(text) {
  warningMessage.textContent = text;
  warningModal.classList.add("show");
}
document
  .getElementById("closeWarningBtn")
  ?.addEventListener("click", () => warningModal.classList.remove("show"));

function escapeHtml(text) {
  if (text === null || text === undefined || text === "") return "-";
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
// LOGIKA MENOLAK KLAIM
// ----------------------------------------------------
document.getElementById("closeRejectKlaimModal")?.addEventListener("click", closeRejectModal);
document.getElementById("cancelRejectKlaimBtn")?.addEventListener("click", closeRejectModal);
document.getElementById("submitRejectKlaimBtn")?.addEventListener("click", submitRejectKlaim);

function closeRejectModal() {
  currentRejectKlaimId = null;
  rejectKlaimModal.classList.remove("show");
}

window.openRejectKlaimModal = function (klaimId) {
  currentRejectKlaimId = klaimId;
  if (rejectKlaimReason) rejectKlaimReason.value = "";
  rejectKlaimModal.classList.add("show");
};

async function submitRejectKlaim() {
  const reason = rejectKlaimReason.value.trim();
  if (!reason) {
    showWarning("Alasan harus di isi!");
    return;
  }
  if (!currentRejectKlaimId || !currentSatpamNIP) return;

  const btn = document.getElementById("submitRejectKlaimBtn");
  btn.textContent = "Memproses...";
  btn.disabled = true;

  try {
    const { data: dKlaim, error: errKlaim } = await supabaseClient
      .from("Klaim_Barang")
      .update({ status: "Ditolak", Catatan_Status: reason, NIP_Satpam: currentSatpamNIP })
      .eq("Id_Klaim", currentRejectKlaimId)
      .select(); // Menggunakan .select() untuk memaksa error jika diblokir RLS
    if (errKlaim) throw errKlaim;
    if (!dKlaim || dKlaim.length === 0)
      throw new Error("Akses diblokir oleh keamanan database Supabase.");

    closeRejectModal();
    await loadData(); // Render ulang agar otomatis hilang
  } catch (err) {
    showWarning("Gagal menolak klaim: " + err.message);
  } finally {
    btn.textContent = "Kirim";
    btn.disabled = false;
  }
}

// ----------------------------------------------------
// LOGIKA MENYETUJUI KLAIM (TERKONEKSI KE SEMUA TABEL)
// ----------------------------------------------------
window.approveKlaim = function (klaimId, temuanId, laporanId) {
  if (!currentSatpamNIP) {
    showWarning("Sesi tidak valid, harap refresh halaman.");
    return;
  }
  currentApproveKlaim = { klaimId, temuanId, laporanId };
  confirmApproveModal.classList.add("show");
};

document.getElementById("cancelApproveBtn")?.addEventListener("click", () => {
  currentApproveKlaim = null;
  confirmApproveModal.classList.remove("show");
});

document.getElementById("submitApproveBtn")?.addEventListener("click", async () => {
  if (!currentApproveKlaim || !currentSatpamNIP) return;
  const btn = document.getElementById("submitApproveBtn");
  btn.textContent = "Memproses...";
  btn.disabled = true;

  const { klaimId, temuanId, laporanId } = currentApproveKlaim;

  try {
    // 1. Update status Klaim_Barang
    const { data: dKlaim, error: errKlaim } = await supabaseClient
      .from("Klaim_Barang")
      .update({ status: "Selesai", Catatan_Status: null, NIP_Satpam: currentSatpamNIP })
      .eq("Id_Klaim", klaimId)
      .select();
    if (errKlaim) throw errKlaim;
    if (!dKlaim || dKlaim.length === 0)
      throw new Error("Gagal merubah status Klaim (Akses diblokir database).");

    // 2. Update status Laporan_Temuan
    const { data: dTemuan, error: errTemuan } = await supabaseClient
      .from("Laporan_Temuan")
      .update({ status: "Selesai" })
      .eq("Id_Temuan", temuanId)
      .select();
    if (errTemuan) throw errTemuan;
    if (!dTemuan || dTemuan.length === 0)
      throw new Error("Gagal merubah status Temuan (Akses diblokir database).");

    // 3. Update status Laporan_Hilang (Hanya jika laporan hilang dipilih saat klaim)
    if (laporanId) {
      const { data: dHilang, error: errHilang } = await supabaseClient
        .from("Laporan_Hilang")
        .update({ status: "Selesai" })
        .eq("Id_Laporan", laporanId)
        .select();
      if (errHilang) throw errHilang;
      if (!dHilang || dHilang.length === 0)
        throw new Error("Gagal merubah status Laporan Hilang (Akses diblokir database).");
    }

    // Eksekusi ulang penarikan data agar BARIS DI TABEL LANGSUNG HILANG
    await loadData();

    // Sembunyikan konfirmasi & Tampilkan Modal Berhasil
    confirmApproveModal.classList.remove("show");
    successApproveModal.classList.add("show");
  } catch (err) {
    confirmApproveModal.classList.remove("show"); // Tutup pop-up loading
    showWarning("Gagal menyetujui klaim: " + err.message);
  } finally {
    btn.textContent = "Ya";
    btn.disabled = false;
  }
});

document.getElementById("closeSuccessApproveBtn")?.addEventListener("click", () => {
  successApproveModal.classList.remove("show");
  currentApproveKlaim = null;
});

// ----------------------------------------------------
// RENDER TABEL & FETCH DATA
// ----------------------------------------------------
function renderTemuan(rows) {
  if (!rows || rows.length === 0) {
    temuanBody.innerHTML = `<tr class="empty-row"><td colspan="6">Belum ada barang temuan yang tersedia.</td></tr>`;
    return;
  }
  temuanBody.innerHTML = rows
    .map((row, idx) => {
      const gambar = row.Foto_Barang
        ? `<img src="${escapeHtml(row.Foto_Barang)}" alt="Barang" />`
        : `<span style="color:#9aa3b8;">-</span>`;
      return `<tr><td>${idx + 1}</td><td>${formatWaktu(row.created_at)}</td><td>${escapeHtml(row.Nama_Lengkap_Mhs)}</td><td>${escapeHtml(row.No_Hp_Mhs)}</td><td>${escapeHtml(row.Nama_Barang)}</td><td>${gambar}</td></tr>`;
    })
    .join("");
}

function renderKlaim(rows) {
  if (!rows || rows.length === 0) {
    klaimBody.innerHTML = `<tr class="empty-row"><td colspan="5">Tidak ada pengajuan klaim.</td></tr>`;
    return;
  }
  klaimBody.innerHTML = rows
    .map((row) => {
      const bukti = row.Bukti_Kepemilikan
        ? `<img src="${escapeHtml(row.Bukti_Kepemilikan)}" alt="Bukti" />`
        : `<span style="color:#9aa3b8;">-</span>`;

      const idLaporanParam = row.Id_Laporan ? row.Id_Laporan : null;

      return `<tr>
        <td>${escapeHtml(row.Nama_Barang_Temuan)}</td>
        <td>${escapeHtml(row.Nama_Lengkap_Mhs)}</td>
        <td>${escapeHtml(row.No_Hp_Mhs)}</td>
        <td>${bukti}</td>
        <td class="action-cell">
          <button class="btn-approve" onclick="approveKlaim(${row.Id_Klaim}, ${row.Id_Temuan}, ${idLaporanParam})" title="Setujui"><i class="fa-solid fa-check"></i></button>
          <button class="btn-reject" onclick="openRejectKlaimModal(${row.Id_Klaim})" title="Tolak"><i class="fa-solid fa-xmark"></i></button>
        </td>
      </tr>`;
    })
    .join("");
}

async function loadData() {
  if (!supabaseClient) return;

  try {
    const { data: klaim, error: errKlaim } = await supabaseClient
      .from("Klaim_Barang")
      .select("*")
      .eq("status", "Menunggu Validasi");
    if (errKlaim) throw errKlaim;

    const { data: temuan, error: errTemuan } = await supabaseClient
      .from("Laporan_Temuan")
      .select("*")
      .eq("status", "Tersedia dipos")
      .order("created_at", { ascending: false });
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
    renderTemuan(temuan);

    if (klaim && klaim.length > 0) {
      const klaimNims = [...new Set(klaim.map((k) => k.NIM_Pengambil).filter(Boolean))];
      let mhsKlaimMap = [];
      if (klaimNims.length > 0) {
        const { data: mhsData } = await supabaseClient
          .from("Mahasiswa")
          .select("NIM, Nama_Lengkap, No_Hp")
          .in("NIM", klaimNims);
        mhsKlaimMap = mhsData || [];
      }

      const relevantTemuanIds = [...new Set(klaim.map((k) => k.Id_Temuan))];
      let temuanKlaimMap = [];
      if (relevantTemuanIds.length > 0) {
        const { data: temuanKlaim } = await supabaseClient
          .from("Laporan_Temuan")
          .select("Id_Temuan, Nama_Barang")
          .in("Id_Temuan", relevantTemuanIds);
        temuanKlaimMap = temuanKlaim || [];
      }

      klaim.forEach((k) => {
        const mhs = mhsKlaimMap.find((m) => String(m.NIM) === String(k.NIM_Pengambil));
        const brg = temuanKlaimMap.find((t) => String(t.Id_Temuan) === String(k.Id_Temuan));
        k.Nama_Lengkap_Mhs = mhs ? mhs.Nama_Lengkap : "-";
        k.No_Hp_Mhs = mhs ? mhs.No_Hp : "-";
        k.Nama_Barang_Temuan = brg ? brg.Nama_Barang : "ID Barang Tidak Valid";
      });
    }
    renderKlaim(klaim);
  } catch (err) {
    showWarning("Gagal menarik data dari server: " + err.message);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (typeof requireSatpamSession === "function") {
    const auth = await requireSatpamSession();
    if (auth) {
      currentSatpamNIP = auth.satpam.NIP_Satpam;
      document.querySelectorAll(".username").forEach((el) => {
        const fullName = auth.satpam.Nama_Lengkap || "Satpam";
        el.textContent = fullName.trim().split(/\s+/).slice(0, 2).join(" ");
      });

      temuanBody.innerHTML = `<tr class="empty-row"><td colspan="6">Memuat data...</td></tr>`;
      klaimBody.innerHTML = `<tr class="empty-row"><td colspan="5">Memuat data...</td></tr>`;
      await loadData();
    }
  }
});
