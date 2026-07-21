// ==========================================
// ResetPassword.js
// Menggunakan konfigurasi Supabase dari AdminAuth.js
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const emailInput = document.getElementById("email");
  const sendBtn = document.getElementById("sendBtn");
  const actionButtons = document.querySelector(".action-buttons");

  // ==========================================
  // ELEMEN TEKS INLINE (UNTUK PESAN SUKSES)
  // ==========================================
  const successMessage = document.createElement("p");
  successMessage.style.fontSize = "0.78rem";
  successMessage.style.fontWeight = "600";
  successMessage.style.marginTop = "-4px";
  successMessage.style.marginBottom = "18px";
  successMessage.style.lineHeight = "1.4";
  successMessage.style.color = "#009688"; // Warna hijau sesuai gambar
  successMessage.style.display = "none"; // Disembunyikan dulu
  form.insertBefore(successMessage, actionButtons);

  // ==========================================
  // LOGIKA MODAL PERINGATAN (UNTUK ERROR/KOSONG)
  // ==========================================
  const warningModal = document.getElementById("warningModal");
  const warningMessage = document.getElementById("warningMessage");
  const warningOkBtn = document.getElementById("warningOkBtn");

  function showModal(message) {
    if (!warningModal) {
      alert(message);
      return;
    }
    warningMessage.textContent = message;
    warningModal.classList.add("open");
  }

  if (warningOkBtn) {
    warningOkBtn.addEventListener("click", () => {
      warningModal.classList.remove("open");
    });
  }

  // ==========================================
  // SUBMIT FORM
  // ==========================================
  form.addEventListener("submit", async (e) => {
    // Menahan form agar tidak langsung pindah halaman!
    e.preventDefault();
    successMessage.style.display = "none";

    const email = emailInput.value.trim();

    // Validasi kosong -> Muncul Pop-Up Modal Peringatan
    if (!email) {
      showModal("Harap Masukan Email");
      return;
    }

    // Memastikan AdminAuth.js sudah termuat
    if (typeof supabaseClient === "undefined" || !supabaseClient) {
      showModal("Koneksi ke Supabase belum terkonfigurasi.");
      return;
    }

    sendBtn.disabled = true;
    const originalLabel = sendBtn.textContent;
    sendBtn.textContent = "Mengirim...";

    try {
      const redirectTo = new URL("ConfirmPassword.html", window.location.href)
        .href;

      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        console.error(error);
        showModal("Terjadi kesalahan, coba lagi nanti.");
        return;
      }

      // Pesan Sukses -> Tampil di bawah input teks (Bukan Pop-Up)
      successMessage.textContent =
        "Jika email tersebut terdaftar, kami sudah mengirimkan link reset password. Silakan cek email kamu (termasuk folder Spam).";
      successMessage.style.display = "block";

      form.reset();
    } catch (err) {
      console.error(err);
      showModal("Terjadi kesalahan, coba lagi nanti.");
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = originalLabel;
    }
  });
});
