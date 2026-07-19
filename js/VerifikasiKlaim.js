// ==========================================
// VerifikasiKlaim.js
// Kiri: daftar barang temuan yang berstatus "searching" (siap diklaim)
// Kanan: pengajuan klaim (tabel Klaim) yang statusnya "pending"
// Approve klaim -> status Klaim jadi "approved" & laporan_temuan jadi "found"
// Reject klaim -> status Klaim jadi "rejected" + catatan
// ==========================================

let currentKlaimId = null;

const temuanBody = document.getElementById("temuanBody");
const klaimBody = document.getElementById("klaimBody");

const rejectKlaimModal = document.getElementById("rejectKlaimModal");
const rejectKlaimReason = document.getElementById("rejectKlaimReason");

document
  .getElementById("closeRejectKlaimModal")
  .addEventListener("click", closeRejectKlaimModal);
document
  .getElementById("cancelRejectKlaimBtn")
  .addEventListener("click", closeRejectKlaimModal);
document
  .getElementById("submitRejectKlaimBtn")
  .addEventListener("click", submitRejectKlaim);

function openRejectKlaimModal(klaimId) {
  currentKlaimId = klaimId;
  rejectKlaimReason.value = "";
  rejectKlaimModal.classList.add("show");
}

function closeRejectKlaimModal() {
  currentKlaimId = null;
  rejectKlaimModal.classList.remove("show");
}

async function submitRejectKlaim() {
  const reason = rejectKlaimReason.value.trim();
  if (!reason) {
    alert("Alasan penolakan wajib diisi!");
    return;
  }
  if (!currentKlaimId) return;

  const { error } = await supabaseClient
    .from("Klaim")
    .update({ status: "rejected", catatan: reason })
    .eq("id", currentKlaimId);

  if (error) {
    console.error("Gagal menolak klaim:", error);
    alert("Gagal menolak klaim: " + error.message);
    return;
  }

  closeRejectKlaimModal();
  await loadData();
}

async function approveKlaim(klaimId, laporanTemuanId) {
  const { error: klaimError } = await supabaseClient
    .from("Klaim")
    .update({ status: "approved" })
    .eq("id", klaimId);

  if (klaimError) {
    console.error("Gagal menyetujui klaim:", klaimError);
    alert("Gagal menyetujui klaim: " + klaimError.message);
    return;
  }

  const { error: temuanError } = await supabaseClient
    .from("laporan_temuan")
    .update({ status: "found" })
    .eq("id", laporanTemuanId);

  if (temuanError) {
    console.error("Gagal update status barang temuan:", temuanError);
  }

  await loadData();
}

function renderTemuan(rows) {
  if (!rows || rows.length === 0) {
    temuanBody.innerHTML = `<tr class="empty-row"><td colspan="6">Belum ada barang temuan yang tersedia.</td></tr>`;
    return;
  }
  temuanBody.innerHTML = rows
    .map((row, idx) => {
      const penemu = row.Mahasiswa || {};
      const gambar = row.gambar_url
        ? `<img src="${escapeHtml(row.gambar_url)}" alt="${escapeHtml(row.nama_barang)}" />`
        : `<span style="color:#9aa3b8;">-</span>`;
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${formatWaktu(row.created_at)}</td>
          <td>${escapeHtml(penemu.Nama_Lengkap)}</td>
          <td>${escapeHtml(penemu.No_Hp)}</td>
          <td>${escapeHtml(row.nama_barang)}</td>
          <td>${gambar}</td>
        </tr>
      `;
    })
    .join("");
}

function renderKlaim(rows) {
  if (!rows || rows.length === 0) {
    klaimBody.innerHTML = `<tr class="empty-row"><td colspan="5">Tidak ada pengajuan klaim yang menunggu verifikasi.</td></tr>`;
    return;
  }
  klaimBody.innerHTML = rows
    .map((row) => {
      const pengklaim = row.Mahasiswa || {};
      const barang = row.laporan_temuan?.nama_barang || "-";
      const bukti = row.bukti_url
        ? `<img src="${escapeHtml(row.bukti_url)}" alt="bukti" />`
        : `<span style="color:#9aa3b8;">-</span>`;

      return `
        <tr>
          <td>${escapeHtml(barang)}</td>
          <td>${escapeHtml(pengklaim.Nama_Lengkap)}</td>
          <td>${escapeHtml(pengklaim.No_Hp)}</td>
          <td>${bukti}</td>
          <td class="action-cell">
            <button class="btn-approve" data-action="approve" data-klaim="${row.id}" data-temuan="${row.laporan_temuan_id}" title="Setujui">
              <i class="fa-solid fa-check"></i>
            </button>
            <button class="btn-reject" data-action="reject" data-klaim="${row.id}" title="Tolak">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  klaimBody.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const klaimId = btn.dataset.klaim;
      if (btn.dataset.action === "approve") {
        approveKlaim(klaimId, btn.dataset.temuan);
      } else {
        openRejectKlaimModal(klaimId);
      }
    });
  });
}

async function loadData() {
  const { data: temuan, error: err1 } = await supabaseClient
    .from("laporan_temuan")
    .select("*, Mahasiswa(Nama_Lengkap, No_Hp)")
    .eq("status", "searching")
    .order("created_at", { ascending: false });

  if (err1) {
    console.error("Gagal memuat barang temuan:", err1);
    temuanBody.innerHTML = `<tr class="empty-row"><td colspan="6">Gagal memuat data.</td></tr>`;
  } else {
    renderTemuan(temuan);
  }

  const { data: klaim, error: err2 } = await supabaseClient
    .from("Klaim")
    .select("*, Mahasiswa(Nama_Lengkap, No_Hp), laporan_temuan(nama_barang)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (err2) {
    console.error("Gagal memuat pengajuan klaim:", err2);
    klaimBody.innerHTML = `<tr class="empty-row"><td colspan="5">Gagal memuat data.</td></tr>`;
  } else {
    renderKlaim(klaim);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const auth = await requireSatpamSession();
  if (!auth) return;
  await loadData();
});
