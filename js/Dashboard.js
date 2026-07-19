// Dashboard.js (Satpam)
// Tampilkan NIP asli satpam yang login (bukan teks statis "Pengguna"),
// urus dropdown profil, dan logout dari Supabase Auth.

// ==================== KONFIGURASI SUPABASE ====================
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

// ==========================================
// 1. DROPDOWN PROFIL (UI, tetap sama seperti sebelumnya)
// ==========================================
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

// ==========================================
// 2. AMBIL NIP SATPAM YANG SEDANG LOGIN
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  const usernameEl = document.querySelector(".username");

  if (!supabaseClient) return;

  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  if (!session) {
    // Belum login / sesi habis -> lempar balik ke halaman login
    window.location.href = "../index.html";
    return;
  }

  const { data: satpamData, error } = await supabaseClient
    .from("Satpam")
    .select("NIP_Satpam")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("Gagal mengambil data satpam:", error);
    return;
  }

  if (satpamData && usernameEl) {
    usernameEl.textContent = satpamData.NIP_Satpam;
  }
});

// ==========================================
// 3. LOGOUT
// ==========================================
const logoutLink = document.querySelector(".dropdown-item-danger");

if (logoutLink) {
  logoutLink.addEventListener("click", async (e) => {
    e.preventDefault();
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    sessionStorage.removeItem("loggedInNip");
    window.location.href = "../index.html";
  });
}
