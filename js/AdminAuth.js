// ==========================================
// AdminAuth.js
// Pusat Keamanan Sesi dan Alat Bantu Global
// ==========================================

const SUPABASE_URL = "https://fctpmyobagajyhgnptbj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YVSLcfVELiN_hbLy_VdFZQ_QAIcBJ2V";

let supabaseClient = null;
try {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
  console.error("Gagal menginisialisasi Supabase:", err);
}

/**
 * Memastikan sesi login valid dan menarik data lengkap Satpam.
 */
async function requireSatpamSession() {
  if (!supabaseClient) return null;

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "../index.html";
    return null;
  }

  // Mengambil semua data yang dibutuhkan, termasuk untuk Profile
  const { data: satpamData, error } = await supabaseClient
    .from("Satpam")
    .select("NIP_Satpam, Nama_Lengkap, Shift_Tugas, No_Hp, Email")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !satpamData) {
    window.location.href = "../index.html";
    return null;
  }

  return { session, satpam: satpamData };
}

/**
 * Mencegah serangan XSS pada input teks
 */
function escapeHtml(text) {
  if (text == null) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Mengubah format waktu ISO menjadi teks yang mudah dibaca
 */
function formatWaktu(isoString) {
  if (!isoString) return "-";
  const d = new Date(isoString);
  const jam = String(d.getHours()).padStart(2, "0");
  const menit = String(d.getMinutes()).padStart(2, "0");
  const hari = String(d.getDate()).padStart(2, "0");
  const bulan = String(d.getMonth() + 1).padStart(2, "0");
  return `${jam}.${menit} WIB<br>${hari}/${bulan}/${d.getFullYear()}`;
}
