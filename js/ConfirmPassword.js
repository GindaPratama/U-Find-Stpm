// ConfirmPassword.js
// Halaman ini dibuka lewat link recovery dari email (dikirim oleh
// resetPasswordForEmail di ResetPassword.js). Supabase-js otomatis
// membaca token recovery dari URL dan memicu event PASSWORD_RECOVERY.

// ==================== KONFIGURASI SUPABASE ====================
// Samakan persis dengan Login.js / ResetPassword.js
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
// 1. TOGGLE ICON MATA UNTUK SETIAP FIELD PASSWORD
// ==========================================
document.querySelectorAll(".toggle-password").forEach((icon) => {
  icon.addEventListener("click", function () {
    const targetId = this.getAttribute("data-target");
    const input = document.getElementById(targetId);
    if (!input) return;

    if (input.type === "password") {
      input.type = "text";
      this.classList.remove("fa-eye");
      this.classList.add("fa-eye-slash");
    } else {
      input.type = "password";
      this.classList.remove("fa-eye-slash");
      this.classList.add("fa-eye");
    }
  });
});

// ==========================================
// 2. VALIDASI SESI RECOVERY
// ==========================================
const form = document.querySelector("form");
const newPasswordInput = document.getElementById("new_password");
const confirmPasswordInput = document.getElementById("confirm_password");
const submitBtn = form ? form.querySelector(".btn-primary") : null;
const actionButtons = document.querySelector(".action-buttons");

// pesan info/error, dibuat dinamis
const message = document.createElement("p");
message.id = "form-message";
message.style.fontSize = "0.78rem";
message.style.fontWeight = "600";
message.style.marginTop = "-8px";
message.style.marginBottom = "14px";
message.style.lineHeight = "1.4";
message.style.display = "none";
if (form && actionButtons) {
  form.insertBefore(message, actionButtons);
}

function showMessage(text, isError = true) {
  message.textContent = text;
  message.style.color = isError ? "#d1453b" : "#1c8a4b";
  message.style.display = text ? "block" : "none";
}

let hasValidRecoverySession = false;

function lockForm(reasonText) {
  hasValidRecoverySession = false;
  if (newPasswordInput) newPasswordInput.disabled = true;
  if (confirmPasswordInput) confirmPasswordInput.disabled = true;
  if (submitBtn) submitBtn.setAttribute("aria-disabled", "true");
  showMessage(reasonText, true);
}

if (supabaseClient) {
  // Event ini terpicu otomatis kalau URL mengandung token recovery yang valid
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && session) {
      hasValidRecoverySession = true;
      showMessage("");
    }
  });

  // Fallback: kalau setelah beberapa saat tidak ada sesi recovery sama sekali,
  // berarti link sudah kadaluarsa / rusak / dibuka tanpa lewat email.
  setTimeout(async () => {
    if (hasValidRecoverySession) return;
    const { data } = await supabaseClient.auth.getSession();
    if (!data.session) {
      lockForm(
        "Link reset password tidak valid atau sudah kadaluarsa. Silakan minta link baru lewat halaman Lupa Password.",
      );
    }
  }, 1500);
} else {
  lockForm("Koneksi ke Supabase belum terkonfigurasi.");
}

// ==========================================
// 3. SUBMIT: UPDATE PASSWORD
// ==========================================
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!hasValidRecoverySession) {
      showMessage(
        "Sesi reset password belum valid. Silakan buka ulang link dari email kamu.",
      );
      return;
    }

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!newPassword || !confirmPassword) {
      showMessage("Mohon isi kedua field password.");
      return;
    }

    if (newPassword.length < 6) {
      showMessage("Password minimal 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage("Konfirmasi password tidak sama dengan password baru.");
      return;
    }

    const originalLabel = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
      submitBtn.textContent = "Menyimpan...";
      submitBtn.style.pointerEvents = "none";
    }

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error(error);
        showMessage("Gagal mengubah password: " + error.message);
        return;
      }

      // logout dari sesi recovery supaya user login ulang dengan password baru
      await supabaseClient.auth.signOut();

      showMessage(
        "Password berhasil diubah! Mengarahkan ke halaman login...",
        false,
      );
      form.reset();

      setTimeout(() => {
        window.location.href = "../index.html";
      }, 1800);
    } catch (err) {
      console.error(err);
      showMessage("Terjadi kesalahan tak terduga. Coba lagi nanti.");
    } finally {
      if (submitBtn) {
        submitBtn.textContent = originalLabel;
        submitBtn.style.pointerEvents = "auto";
      }
    }
  });
}
