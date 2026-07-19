// ==========================================
// PemantauanStatus.js
// Menampilkan SEMUA laporan (kehilangan + temuan), semua status,
// dengan filter tombol Semua / Laporan Hilang / Laporan Temuan.
// ==========================================

const statusBody = document.getElementById("statusBody");
const filterButtons = document.querySelectorAll(".filter-btn");

let allRows = []; // gabungan kehilangan + temuan, sudah diberi label "jenis"

const STATUS_LABEL = {
  pending: { text: "Menunggu Validasi", cls: "status-pending" },
  searching: { text: "Sedang Dicari", cls: "status-searching" },
  rejected: { text: "Ditolak", cls: "status-rejected" },
  found: { text: "Sudah Ditemukan/Diklaim", cls: "status-found" },
};

function renderStatusBadge(status) {
  const cfg = STATUS_LABEL[status] || { text: status, cls: "status-pending" };
  return `<span class="status-pill ${cfg.cls}">${escapeHtml(cfg.text)}</span>`;
}

function renderRows(rows) {
  if (!rows || rows.length === 0) {
    statusBody.innerHTML = `<tr class="empty-row"><td colspan="10">Tidak ada data untuk filter ini.</td></tr>`;
    return;
  }

  statusBody.innerHTML = rows
    .map((row, idx) => {
      const pelapor = row.Mahasiswa || {};
      const gambar = row.gambar_url
        ? `<img src="${escapeHtml(row.gambar_url)}" alt="${escapeHtml(row.nama_barang)}" />`
        : `<span style="color:#9aa3b8;">-</span>`;

      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${row.jenis === "hilang" ? "Kehilangan" : "Temuan"}</td>
          <td>${formatWaktu(row.created_at)}</td>
          <td>${escapeHtml(pelapor.Nama_Lengkap)}</td>
          <td>${escapeHtml(pelapor.No_Hp)}</td>
          <td>${escapeHtml(row.nama_barang)}</td>
          <td>${gambar}</td>
          <td>${escapeHtml(row.ciri_barang)}</td>
          <td>${escapeHtml(row.lokasi)}</td>
          <td>${renderStatusBadge(row.status)}</td>
        </tr>
      `;
    })
    .join("");
}

function applyFilter(filter) {
  let filtered = allRows;
  if (filter === "hilang")
    filtered = allRows.filter((r) => r.jenis === "hilang");
  if (filter === "temuan")
    filtered = allRows.filter((r) => r.jenis === "temuan");
  renderRows(filtered);
}

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    applyFilter(btn.dataset.filter);
  });
});

async function loadData() {
  const { data: kehilangan, error: err1 } = await supabaseClient
    .from("laporan_kehilangan")
    .select("*, Mahasiswa(Nama_Lengkap, No_Hp)")
    .order("created_at", { ascending: false });

  const { data: temuan, error: err2 } = await supabaseClient
    .from("laporan_temuan")
    .select("*, Mahasiswa(Nama_Lengkap, No_Hp)")
    .order("created_at", { ascending: false });

  if (err1 || err2) {
    console.error("Gagal memuat data:", err1 || err2);
    statusBody.innerHTML = `<tr class="empty-row"><td colspan="10">Gagal memuat data.</td></tr>`;
    return;
  }

  allRows = [
    ...(kehilangan || []).map((r) => ({ ...r, jenis: "hilang" })),
    ...(temuan || []).map((r) => ({ ...r, jenis: "temuan" })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  applyFilter("semua");
}

document.addEventListener("DOMContentLoaded", async () => {
  const auth = await requireSatpamSession();
  if (!auth) return;
  await loadData();
});
