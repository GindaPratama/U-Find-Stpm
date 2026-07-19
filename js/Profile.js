// Profile.js (Satpam)
// Ambil data profil (NIP, Nama, Shift, No HP, Email) dari tabel Satpam
// berdasarkan user yang sedang login, plus dropdown & logout
// (sama seperti Dashboard.js supaya perilakunya konsisten).

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
// 1. DROPDOWN PROFIL
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
// 2. AMBIL DATA PROFIL DARI DATABASE
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
  const namaTopEl = document.getElementById("profileNamaTop");

  if (!supabaseClient) {
    console.error("supabaseClient null, cek SUPABASE_URL & SUPABASE_ANON_KEY.");
    if (namaTopEl) namaTopEl.textContent = "Gagal memuat";
    return;
  }

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
    .select("NIP_Satpam, Nama_Lengkap, Shift_Tugas, No_Hp, Email")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("Gagal mengambil data profil:", error);
    if (namaTopEl) namaTopEl.textContent = "Gagal memuat data";
    return;
  }

  if (!satpamData) {
    console.error(
      "Data satpam tidak ditemukan untuk user_id ini. Cek apakah baris di tabel Satpam punya user_id yang sama dengan auth.uid(), dan cek RLS policy SELECT untuk baris milik sendiri.",
    );
    if (namaTopEl) namaTopEl.textContent = "Data tidak ditemukan";
    return;
  }

  document.querySelectorAll(".username").forEach((el) => {
    el.textContent = satpamData.NIP_Satpam;
  });

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "-";
  };

  setText("profileNamaTop", satpamData.Nama_Lengkap);
  setText("profileNama", satpamData.Nama_Lengkap);
  setText("profileNip", satpamData.NIP_Satpam);
  setText("profileShift", satpamData.Shift_Tugas);
  setText("profileNoHp", satpamData.No_Hp);
  setText("profileEmail", satpamData.Email);
});

// ==========================================
// 3. LOGOUT
// ==========================================
const logoutButtons = document.querySelectorAll(
  ".dropdown-item-danger, #btnKeluar",
);

logoutButtons.forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    sessionStorage.removeItem("loggedInNip");
    window.location.href = "../index.html";
  });
});
