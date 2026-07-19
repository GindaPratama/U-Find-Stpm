// ==========================================
// AdminAuth.js — dipakai bersama di semua halaman admin/satpam
// (DaftarValidasiLaporan, PemantauanStatus, VerifikasiKlaim, RekapitulasiLaporan)
// ==========================================

const SUPABASE_URL = "https://fctpmyobagajyhgnptbj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_YVSLcfVELiN_hbLy_VdFZQ_QAIcBJ2V";

let supabaseClient = null;
try {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  );
} catch (err) {
  console.error("Supabase belum terhubung dengan sempurna:", err);
}

// ---------- Dropdown Profil ----------
const profileTrigger = document.getElementById("profileTrigger");
const profileDropdown = document.getElementById("profileDropdown");

if (profileTrigger && profileDropdown) {
  profileTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    profileDropdown.classList.toggle("open");
    profileTrigger.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (
      !profileDropdown.contains(e.target) &&
      !profileTrigger.contains(e.target)
    ) {
      profileDropdown.classList.remove("open");
      profileTrigger.classList.remove("open");
    }
  });
}

// ---------- Logout ----------
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    window.location.href = "/index.html";
  });
}

/**
 * Pastikan yang mengakses halaman ini adalah Satpam yang sudah login.
 * Kembalikan data { session, nip } kalau valid, atau redirect ke
 * halaman login & return null kalau tidak valid.
 * Panggil ini di awal tiap file JS halaman admin.
 */
async function requireSatpamSession() {
  if (!supabaseClient) return null;

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "/index.html";
    return null;
  }

  const { data: satpamData, error } = await supabaseClient
    .from("Satpam")
    .select("NIP_Satpam, Nama_Lengkap")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !satpamData) {
    console.error("Bukan akun Satpam / gagal cek data:", error);
    window.location.href = "/index.html";
    return null;
  }

  const usernameEl = document.querySelector(".username");
  if (usernameEl) {
    usernameEl.textContent = satpamData.NIP_Satpam;
  }

  return { session, satpam: satpamData };
}

// ---------- Helper umum ----------
function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatWaktu(isoString) {
  if (!isoString) return "-";
  const d = new Date(isoString);
  const jam = String(d.getHours()).padStart(2, "0");
  const menit = String(d.getMinutes()).padStart(2, "0");
  const hari = String(d.getDate()).padStart(2, "0");
  const bulan = String(d.getMonth() + 1).padStart(2, "0");
  return `${jam}.${menit} WIB<br>${hari}/${bulan}/${d.getFullYear()}`;
}
