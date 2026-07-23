// ==========================================
// FUNGSI PEMOTONG NAMA (MAKS 2 KATA)
// ==========================================
function getTwoWords(fullName) {
  if (!fullName) return "Satpam";
  return fullName.trim().split(/\s+/).slice(0, 2).join(" ");
}

document.addEventListener("DOMContentLoaded", () => {
  // 1. DROPDOWN PROFIL
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

  // 2. MODAL LOGOUT
  const logoutModal = document.getElementById("logoutModal");
  const showModal = (e) => {
    e.preventDefault();
    logoutModal?.classList.add("open");
  };

  document.getElementById("dropdownLogoutBtn")?.addEventListener("click", showModal);
  document.getElementById("btnKeluarUtama")?.addEventListener("click", showModal);
  document.getElementById("cancelLogoutBtn")?.addEventListener("click", () => {
    logoutModal?.classList.remove("open");
  });

  document.getElementById("submitLogoutBtn")?.addEventListener("click", async (e) => {
    e.target.textContent = "Proses...";
    e.target.disabled = true;
    if (typeof supabaseClient !== "undefined" && supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    sessionStorage.removeItem("loggedInNip");
    window.location.href = "../index.html";
  });

  // 3. INIT AUTH & LOAD DATA SATPAM
  let currentSatpamData = null; // Simpan data untuk proses edit

  async function initAuth() {
    if (typeof requireSatpamSession === "function") {
      const auth = await requireSatpamSession();
      if (auth) {
        currentSatpamData = auth.satpam;
        const navUsername = document.getElementById("navUsername");
        const profileNamaTop = document.getElementById("profileNamaTop");
        const inputNama = document.getElementById("inputNama");

        // Set Header 2 Kata
        if (navUsername) navUsername.textContent = getTwoWords(auth.satpam.Nama_Lengkap);

        // Set Value
        if (profileNamaTop) profileNamaTop.textContent = auth.satpam.Nama_Lengkap || "-";
        if (inputNama) inputNama.value = auth.satpam.Nama_Lengkap || "";

        const setText = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.textContent = val || "-";
        };

        setText("profileNip", auth.satpam.NIP_Satpam);
        setText("profileShift", auth.satpam.Shift_Tugas);
        setText("profileNoHp", auth.satpam.No_Hp);
        setText("profileEmail", auth.satpam.Email);
      }
    }
  }

  initAuth();

  // 4. LOGIKA EDIT NAMA SATPAM
  const btnEditNama = document.getElementById("btnEditNama");
  const actionEditGroup = document.getElementById("actionEditGroup");
  const inputNama = document.getElementById("inputNama");
  const btnBatalEdit = document.getElementById("btnBatalEdit");
  const btnSimpanEdit = document.getElementById("btnSimpanEdit");
  const successUpdateModal = document.getElementById("successUpdateModal");

  // Masuk Mode Edit
  btnEditNama?.addEventListener("click", () => {
    inputNama.disabled = false;
    inputNama.focus();
    const val = inputNama.value;
    inputNama.value = "";
    inputNama.value = val;
    btnEditNama.classList.add("hidden");
    actionEditGroup.classList.remove("hidden");
  });

  // Batal Edit
  btnBatalEdit?.addEventListener("click", () => {
    inputNama.value = currentSatpamData.Nama_Lengkap;
    inputNama.disabled = true;
    btnEditNama.classList.remove("hidden");
    actionEditGroup.classList.add("hidden");
  });

  // Simpan Edit
  btnSimpanEdit?.addEventListener("click", async () => {
    const newName = inputNama.value.trim();
    if (!newName) {
      alert("Nama tidak boleh kosong!");
      return;
    }

    btnSimpanEdit.textContent = "Menyimpan...";
    btnSimpanEdit.disabled = true;

    // Update tabel Satpam di Supabase
    const { error: updateErr } = await supabaseClient
      .from("Satpam")
      .update({ Nama_Lengkap: newName })
      .eq("NIP_Satpam", currentSatpamData.NIP_Satpam);

    if (updateErr) {
      alert("Gagal memperbarui nama: " + updateErr.message);
    } else {
      currentSatpamData.Nama_Lengkap = newName;
      document.getElementById("navUsername").textContent = getTwoWords(newName);
      document.getElementById("profileNamaTop").textContent = newName;

      inputNama.disabled = true;
      btnEditNama.classList.remove("hidden");
      actionEditGroup.classList.add("hidden");
      successUpdateModal.classList.add("open");
    }

    btnSimpanEdit.textContent = "Simpan";
    btnSimpanEdit.disabled = false;
  });

  // Tutup Modal Sukses
  document.getElementById("successOkBtn")?.addEventListener("click", () => {
    successUpdateModal.classList.remove("open");
  });
});
