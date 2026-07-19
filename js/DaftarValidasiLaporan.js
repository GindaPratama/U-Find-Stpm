// ==========================================
// DaftarValidasiLaporan.js
// Menampilkan laporan berstatus "pending" dan memvalidasinya
// (approve -> status "searching", reject -> status "rejected" + catatan)
// ==========================================

let currentReport = null; // { table, id }

const kehilanganBody = document.getElementById("kehilanganBody");
const temuanBody = document.getElementById("temuanBody");

const rejectModal = document.getElementById("rejectModal");
const rejectReason = document.getElementById("rejectReason");

document
  .getElementById("closeRejectModal")
  .addEventListener("click", closeRejectModal);
document
  .getElementById("cancelRejectBtn")
  .addEventListener("click", closeRejectModal);
document
  .getElementById("submitRejectBtn")
  .addEventListener("click", submitReject);

function openRejectModal(table, id) {
  currentReport = { table, id };
  rejectReason.value = "";
  rejectModal.classList.add("show");
}

function closeRejectModal() {
  currentReport = null;
  rejectModal.classList.remove("show");
}

async function submitReject() {
  const reason = rejectReason.value.trim();
  if (!reason) {
    alert("Alasan penolakan wajib diisi!");
    return;
  }
  if (!currentReport) return;

  const { table, id } = currentReport;
  const { error } = await supabaseClient
    .from(table)
    .update({ status: "rejected", catatan_status: reason })
    .eq("id", id);

  if (error) {
    console.error("Gagal menolak laporan:", error);
    alert("Gagal menolak laporan: " + error.message);
    return;
  }

  closeRejectModal();
  await loadData();
}

async function approveLaporan(table, id) {
  const { error } = await supabaseClient
    .from(table)
    .update({ status: "searching", catatan_status: null })
    .eq("id", id);

  if (error) {
    console.error("Gagal menyetujui laporan:", error);
    alert("Gagal menyetujui laporan: " + error.message);
    return;
  }

  await loadData();
}

function renderRows(tbody, rows, table) {
  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="9">Tidak ada laporan yang menunggu validasi.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map((row, idx) => {
      const pelapor = row.Mahasiswa || {};
      const gambar = row.gambar_url
        ? `<img src="${escapeHtml(row.gambar_url)}" alt="${escapeHtml(row.nama_barang)}" />`
        : `<span style="color:#9aa3b8;">-</span>`;

      return `
        <tr data-id="${row.id}">
          <td>${idx + 1}</td>
          <td>${formatWaktu(row.created_at)}</td>
          <td>${escapeHtml(pelapor.Nama_Lengkap)}</td>
          <td>${escapeHtml(pelapor.No_Hp)}</td>
          <td>${escapeHtml(row.nama_barang)}</td>
          <td>${gambar}</td>
          <td>${escapeHtml(row.ciri_barang)}</td>
          <td>${escapeHtml(row.lokasi)}</td>
          <td class="action-cell">
            <button class="btn-approve" data-action="approve" data-table="${table}" data-id="${row.id}" title="Setujui">
              <i class="fa-solid fa-check"></i>
            </button>
            <button class="btn-reject" data-action="reject" data-table="${table}" data-id="${row.id}" title="Tolak">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  tbody.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = btn.dataset.table;
      const id = btn.dataset.id;
      if (btn.dataset.action === "approve") {
        approveLaporan(t, id);
      } else {
        openRejectModal(t, id);
      }
    });
  });
}

async function loadData() {
  const { data: kehilangan, error: err1 } = await supabaseClient
    .from("laporan_kehilangan")
    .select("*, Mahasiswa(Nama_Lengkap, No_Hp)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (err1) {
    console.error("Gagal memuat laporan kehilangan:", err1);
    kehilanganBody.innerHTML = `<tr class="empty-row"><td colspan="9">Gagal memuat data.</td></tr>`;
  } else {
    renderRows(kehilanganBody, kehilangan, "laporan_kehilangan");
  }

  const { data: temuan, error: err2 } = await supabaseClient
    .from("laporan_temuan")
    .select("*, Mahasiswa(Nama_Lengkap, No_Hp)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (err2) {
    console.error("Gagal memuat laporan temuan:", err2);
    temuanBody.innerHTML = `<tr class="empty-row"><td colspan="9">Gagal memuat data.</td></tr>`;
  } else {
    renderRows(temuanBody, temuan, "laporan_temuan");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const auth = await requireSatpamSession();
  if (!auth) return;
  await loadData();
});
