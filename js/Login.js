// ==========================================
// Login.js
// ==========================================

// 1. TOGGLE ICON MATA PASSWORD
const togglePassword = document.querySelector("#togglePassword");
const password = document.querySelector("#password");

if (togglePassword && password) {
  togglePassword.addEventListener("click", function () {
    if (password.type === "password") {
      password.type = "text";
      this.classList.replace("fa-eye", "fa-eye-slash");
    } else {
      password.type = "password";
      this.classList.replace("fa-eye-slash", "fa-eye");
    }
  });
}

// 2. MODAL PERINGATAN
const warningModal = document.getElementById("warningModal");
const warningMessage = document.getElementById("warningMessage");
const warningOkBtn = document.getElementById("warningOkBtn");

function showWarning(message) {
  warningMessage.textContent = message;
  warningModal.classList.add("open");
}

if (warningOkBtn) {
  warningOkBtn.addEventListener("click", () => {
    warningModal.classList.remove("open");
  });
}

// 3. LOGIKA LOGIN KE SUPABASE
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");

if (loginForm) {
  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault(); // Menahan form agar tidak langsung pindah halaman

    if (!supabaseClient) {
      showWarning("Koneksi ke database belum siap.");
      return;
    }

    const nipVal = document.getElementById("nip").value.trim();
    const passwordVal = document.getElementById("password").value;

    if (!nipVal || !passwordVal) {
      showWarning("Mohon lengkapi NIP dan Password terlebih dahulu.");
      return;
    }

    const originalBtnText = loginBtn.textContent;
    loginBtn.disabled = true;
    loginBtn.textContent = "Memproses...";

    try {
      // Step 1: Ambil Email berdasarkan NIP lewat fungsi RPC
      const { data: emailResult, error: satpamError } =
        await supabaseClient.rpc("get_email_by_nip", { p_nip: nipVal });

      if (satpamError || !emailResult) {
        showWarning("NIP tidak ditemukan atau salah.");
        loginBtn.disabled = false;
        loginBtn.textContent = originalBtnText;
        return;
      }

      // Step 2: Login ke Supabase Auth dengan Email dan Password
      const { error: signInError } =
        await supabaseClient.auth.signInWithPassword({
          email: emailResult,
          password: passwordVal,
        });

      if (signInError) {
        showWarning("NIP atau Password Salah!");
        loginBtn.disabled = false;
        loginBtn.textContent = originalBtnText;
        return;
      }

      // Sukses Login! Pindah ke Dashboard
      window.location.href = "html/Dashboard.html";
    } catch (err) {
      console.error(err);
      showWarning("Terjadi kesalahan tak terduga. Coba lagi nanti.");
      loginBtn.disabled = false;
      loginBtn.textContent = originalBtnText;
    }
  });
}
