/* =========================================
   VILLAGEDEKO — FOUNDATION APP
========================================= */

document.addEventListener("DOMContentLoaded", () => {

  const searchInput = document.getElementById("villageSearch");
  const searchButton = document.getElementById("searchButton");
  const exploreButton = document.getElementById("exploreVillage");

  /*
    Temporary local village data.
    Later this same structure can connect
    to Firebase / database without changing
    the whole UI.
  */
  const villages = [
    {
      name: "Kankroli",
      district: "Rajsamand",
      state: "Rajasthan"
    },
    {
      name: "Khejarli",
      district: "Jodhpur",
      state: "Rajasthan"
    },
    {
      name: "Khimsar",
      district: "Nagaur",
      state: "Rajasthan"
    }
  ];


  /* =========================================
     SEARCH
  ========================================= */

  function searchVillage() {

    const query = searchInput.value.trim().toLowerCase();

    if (!query) {
      showMessage("Kisi village ka naam search karo 🌾");
      searchInput.focus();
      return;
    }

    const result = villages.find(village =>
      village.name.toLowerCase().includes(query) ||
      village.district.toLowerCase().includes(query) ||
      village.state.toLowerCase().includes(query)
    );

    if (result) {

      showMessage(
        `${result.name} · ${result.district} · ${result.state}`
      );

    } else {

      showMessage(
        `"${searchInput.value}" abhi VillageDeko mein nahi mila.`
      );

    }
  }


  searchButton?.addEventListener("click", searchVillage);


  searchInput?.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {
      searchVillage();
    }

  });


  /* =========================================
     EXPLORE VILLAGE
  ========================================= */

  exploreButton?.addEventListener("click", () => {

    document.querySelector(".experience-grid")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  });


  /* =========================================
     EXPERIENCE CARDS
  ========================================= */

  const experienceCards =
    document.querySelectorAll(".experience-card");

  experienceCards.forEach(card => {

    card.addEventListener("click", () => {

      const title =
        card.querySelector("strong")?.textContent || "Village Experience";

      showMessage(
        `${title} section VillageDeko mein build ho raha hai 🌾`
      );

    });

  });


  /* =========================================
     SIMPLE MESSAGE SYSTEM
  ========================================= */

  function showMessage(message) {

    let box = document.getElementById("villageMessage");

    if (!box) {

      box = document.createElement("div");

      box.id = "villageMessage";

      box.style.position = "fixed";
      box.style.left = "50%";
      box.style.bottom = "25px";
      box.style.transform = "translateX(-50%)";
      box.style.zIndex = "9999";
      box.style.maxWidth = "90%";
      box.style.padding = "14px 20px";
      box.style.borderRadius = "14px";
      box.style.background = "#214d2d";
      box.style.color = "#ffffff";
      box.style.fontSize = "14px";
      box.style.fontWeight = "600";
      box.style.boxShadow = "0 10px 30px rgba(0,0,0,0.18)";
      box.style.textAlign = "center";
      box.style.transition = "opacity 0.25s ease";

      document.body.appendChild(box);
    }

    box.textContent = message;
    box.style.opacity = "1";

    clearTimeout(box.hideTimer);

    box.hideTimer = setTimeout(() => {
      box.style.opacity = "0";
    }, 3000);

  }

});
