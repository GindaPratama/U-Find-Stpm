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
// 2. SETUP MODAL DAN VALIDASI SESI
// ==========================================
const form = document.querySelector("form");
const newPasswordInput = document.getElementById("new_password");
const confirmPasswordInput = document.getElementById("confirm_password");
const submitBtn = form ? form.querySelector(".btn-primary") : null;

// Modal Peringatan
const warningModal = document.getElementById("warningModal");
const warningMessage = document.getElementById("warningMessage");
const warningOkBtn = document.getElementById("warningOkBtn");

// Modal Sukses
const successModal = document.getElementById("successModal");
const successOkBtn = document.getElementById("successOkBtn");

function showWarning(text) {
  if (warningMessage) warningMessage.textContent = text;
  if (warningModal) warningModal.classList.add("open");
}

if (warningOkBtn) {
  warningOkBtn.addEventListener("click", () => {
    warningModal.classList.remove("open");
  });
}

function showSuccess() {
  if (successModal) successModal.classList.add("open");
}

// Redirect hanya terjadi setelah user klik tombol "Ya" di modal Berhasil
if (successOkBtn) {
  successOkBtn.addEventListener("click", () => {
    window.location.href = "../index.html";
  });
}

let hasValidRecoverySession = false;

function lockForm(reasonText) {
  hasValidRecoverySession = false;
  if (newPasswordInput) newPasswordInput.disabled = true;
  if (confirmPasswordInput) confirmPasswordInput.disabled = true;
  if (submitBtn) submitBtn.setAttribute("aria-disabled", "true");
  showWarning(reasonText);
}

if (supabaseClient) {
  // Cek apakah URL valid & sesi recovery aktif
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && session) {
      hasValidRecoverySession = true;
    }
  });

  // Fallback cek sesi jika tidak ada sesi recovery
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
    e.preventDefault(); // Tahan form agar tidak langsung berpindah halaman

    if (!hasValidRecoverySession) {
      showWarning(
        "Sesi reset password belum valid. Silakan lakukan reset password lagi lewat halaman Lupa Password.",
      );
      return;
    }

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Sesuai UI requirement: Jika field kosong, tidak cocok, atau terlalu pendek,
    // munculkan modal peringatan dengan teks template dari gambar referensi.
    if (
      !newPassword ||
      !confirmPassword ||
      newPassword !== confirmPassword ||
      newPassword.length < 6
    ) {
      showWarning(
        "Mohon lengkapi data atau pastikan konfirmasi password benar",
      );
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
        showWarning("Gagal mengubah password: " + error.message);
        return;
      }

      // Logout dari sesi recovery agar user login ulang secara manual
      await supabaseClient.auth.signOut();
      form.reset();

      // MUNCULKAN MODAL SUKSES (TIDAK ADA AUTO REDIRECT)
      showSuccess();
    } catch (err) {
      console.error(err);
      showWarning("Terjadi kesalahan tak terduga. Coba lagi nanti.");
    } finally {
      if (submitBtn) {
        submitBtn.textContent = originalLabel;
        submitBtn.style.pointerEvents = "auto";
      }
    }
  });
}
