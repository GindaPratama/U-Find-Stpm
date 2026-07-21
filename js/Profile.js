// File Profile.js: Mengatur UI dan Data untuk Halaman Profile

document.addEventListener("DOMContentLoaded", () => {
  const trigger = document.getElementById("profileTrigger");
  const dropdown = document.getElementById("profileDropdown");

  if (trigger && dropdown) {
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropdown.classList.toggle("open");
      trigger.classList.toggle("open");
    });

    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
        dropdown.classList.remove("open");
        trigger.classList.remove("open");
      }
    });
  }

  const logoutModal = document.getElementById("logoutModal");
  const showModal = (e) => {
    e.preventDefault();
    logoutModal?.classList.add("show");
  };

  document
    .getElementById("dropdownLogoutBtn")
    ?.addEventListener("click", showModal);
  document
    .getElementById("btnKeluarUtama")
    ?.addEventListener("click", showModal);

  document.getElementById("cancelLogoutBtn")?.addEventListener("click", () => {
    logoutModal?.classList.remove("show");
  });

  document
    .getElementById("submitLogoutBtn")
    ?.addEventListener("click", async (e) => {
      e.target.textContent = "Keluar...";
      e.target.disabled = true;
      if (typeof supabaseClient !== "undefined" && supabaseClient)
        await supabaseClient.auth.signOut();
      sessionStorage.removeItem("loggedInNip");
      window.location.href = "../index.html";
    });

  async function initAuth() {
    if (typeof requireSatpamSession === "function") {
      const auth = await requireSatpamSession();
      if (auth) {
        document
          .querySelectorAll(".username")
          .forEach((el) => (el.textContent = auth.satpam.NIP_Satpam));

        const setText = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.textContent = val || "-";
        };

        setText("profileNamaTop", auth.satpam.Nama_Lengkap);
        setText("profileNama", auth.satpam.Nama_Lengkap);
        setText("profileNip", auth.satpam.NIP_Satpam);
        setText("profileShift", auth.satpam.Shift_Tugas);
        setText("profileNoHp", auth.satpam.No_Hp);
        setText("profileEmail", auth.satpam.Email);
      }
    }
  }

  initAuth();
});
