// File Dashboard.js

document.addEventListener("DOMContentLoaded", () => {
  // Logika UI Sidebar (Hamburger Menu - Mobile Only)
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const closeSidebarBtn = document.getElementById("closeSidebarBtn");

  const toggleSidebar = () => {
    if (sidebar && sidebarOverlay) {
      sidebar.classList.toggle("open");
      sidebarOverlay.classList.toggle("show");
    }
  };

  if (hamburgerBtn) hamburgerBtn.addEventListener("click", toggleSidebar);
  if (closeSidebarBtn) closeSidebarBtn.addEventListener("click", toggleSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener("click", toggleSidebar);

  // Logika UI Dropdown Profil
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

  // Logika UI Modal Logout
  const logoutBtn = document.getElementById("logoutBtn");
  const logoutModal = document.getElementById("logoutModal");

  if (logoutBtn && logoutModal) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      logoutModal.classList.add("show");
    });

    document.getElementById("cancelLogoutBtn")?.addEventListener("click", () => {
      logoutModal.classList.remove("show");
    });

    document.getElementById("submitLogoutBtn")?.addEventListener("click", async (e) => {
      e.target.textContent = "Keluar...";
      e.target.disabled = true;
      if (typeof supabaseClient !== "undefined" && supabaseClient) {
        await supabaseClient.auth.signOut();
      }
      sessionStorage.removeItem("loggedInNip");
      window.location.href = "../index.html";
    });
  }

  // Validasi Sesi & Ambil NIP
  async function initAuth() {
    // SESUDAH
    if (typeof requireSatpamSession === "function") {
      const auth = await requireSatpamSession();
      if (auth) {
        currentSatpamNIP = auth.satpam.NIP_Satpam;
        document.querySelectorAll(".username").forEach((el) => {
          const fullName = auth.satpam.Nama_Lengkap || "Satpam";
          el.textContent = fullName.trim().split(/\s+/).slice(0, 2).join(" ");
        });
      }
    }
  }

  initAuth();
});
