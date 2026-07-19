// ==========================================
// 1. TOGGLE ICON MATA PASSWORD
// ==========================================
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
