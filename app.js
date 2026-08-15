/* =========================================================
   VILLAGEDEKO — MAIN APP
   MODERN UI + FIREBASE

   IMPORTANT STRUCTURE

   postType === "village"
      -> Village Feed

   postType === "chaupal"
      -> Story / Chaupal Feed

   Legacy post:
      no postType + villageId
      -> Village Feed

   Both remain inside Firebase:
      posts
========================================================= */

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  db,
  auth
} from "./firebase-config.js";


/* =========================================================
   CONFIG
========================================================= */

const IMGBB_API_KEY =
  "e84ab1cea009540780712f8c85910840";


/* =========================================================
   GLOBAL STATE
========================================================= */

const $ = id =>
  document.getElementById(id);

let currentUser = null;

let villages = [];

let allPosts = [];

let currentVillage = null;

let previousView = "homeView";


/* =========================================================
   STATES
========================================================= */

const STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];


/* =========================================================
   HELPERS
========================================================= */

const esc = value =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");


const uid = () =>
  currentUser?.uid || null;


function getTimeValue(value) {

  if (!value) return 0;

  if (
    typeof value.toMillis === "function"
  ) {
    return value.toMillis();
  }

  if (
    typeof value.seconds === "number"
  ) {
    return value.seconds * 1000;
  }

  if (
    value instanceof Date
  ) {
    return value.getTime();
  }

  return 0;
}


/* =========================================================
   POST TYPE SEPARATION
========================================================= */

/*
   THIS IS IMPORTANT.

   Village Feed:
   1. Explicit village post
   2. Old/legacy post with villageId
      but no postType

   Chaupal:
   Explicit postType === "chaupal"

   This prevents the two feeds from mixing.
*/

function isVillagePost(post) {

  if (!post) return false;

  if (
    post.postType === "chaupal"
  ) {
    return false;
  }

  if (
    post.postType === "village"
  ) {
    return true;
  }

  /*
     Backward compatibility
     for old VillageDeko posts.
  */

  return Boolean(
    post.villageId ||
    post.villageName ||
    post.vDistrict ||
    post.vState
  );
}


function isChaupalPost(post) {

  return Boolean(
    post &&
    post.postType === "chaupal"
  );
}


/* =========================================================
   LOGIN
========================================================= */

function requireLogin() {

  if (!currentUser) {

    showLoginGate();

    return false;
  }

  return true;
}


function showLoginGate() {

  $("appShell")
    ?.classList
    .add("hidden");

  $("loginGate")
    ?.classList
    .remove("hidden");
}


function showApp() {

  $("loginGate")
    ?.classList
    .add("hidden");

  $("appShell")
    ?.classList
    .remove("hidden");
}


/* =========================================================
   MODALS
========================================================= */

function openModal(id) {

  const modal = $(id);

  if (!modal) return;

  modal.classList.add("is-open");

  modal.classList.remove("hidden");
}


function closeModal(id) {

  const modal = $(id);

  if (!modal) return;

  modal.classList.remove("is-open");

  modal.classList.add("hidden");
}


/* =========================================================
   DRAWER
========================================================= */

function openDrawer() {

  if (!requireLogin()) return;

  $("drawer")
    ?.classList
    .add("is-open");
}


function closeDrawer() {

  $("drawer")
    ?.classList
    .remove("is-open");
}


/* =========================================================
   VIEW SYSTEM
========================================================= */

function showView(id) {

  [
    "homeView",
    "stateView",
    "villageView",
    "weddingView",
    "chaupalView"
  ]
    .forEach(view => {

      $(view)
        ?.classList
        .add("hidden");

    });


  $(id)
    ?.classList
    .remove("hidden");


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function goHome() {

  showView("homeView");

  loadHome();
}


function goBackFromVillage() {

  showView(previousView);
}


/* =========================================================
   VILLAGE FEED ELEMENT
========================================================= */

/*
   New modern HTML:
      #villageFeed

   Old HTML:
      #villageSectionFeed
*/

function getVillageFeedContainer() {

  return (
    $("villageFeed") ||
    $("villageSectionFeed") ||
    $("statePostsFeed")
  );
}


/* =========================================================
   CHAUPAL FEED ELEMENT
========================================================= */

function getChaupalFeedContainer() {

  return $("chaupalFeedContainer");
}


/* =========================================================
   STATES
========================================================= */

function fillStates() {

  const selects = [
    $("stateSelect"),
    $("vState"),
    $("wState")
  ];


  selects.forEach(select => {

    if (!select) return;


    const firstOption =
      select.options?.[0];


    select.innerHTML = "";


    if (firstOption) {

      select.appendChild(
        firstOption
      );

    }


    STATES.forEach(state => {

      const option =
        document.createElement(
          "option"
        );

      option.value = state;

      option.textContent = state;

      select.appendChild(
        option
      );

    });

  });


  if ($("stateCount")) {

    $("stateCount").textContent =
      STATES.length;

  }

}


function renderStates() {

  const grid =
    $("statesGrid");

  if (!grid) return;


  grid.innerHTML =
    STATES
      .map((state, index) => {

        const emoji =
          [
            "🌴",
            "🏜️",
            "🏔️",
            "🌾",
            "🌊",
            "🌿"
          ][index % 6];


        return `
          <button
            onclick="selectState('${esc(state)}')"
            class="state-card"
            type="button"
          >
            <span class="state-emoji">
              ${emoji}
            </span>

            <b>
              ${esc(state)}
            </b>

            <small>
              Explore villages →
            </small>
          </button>
        `;

      })
      .join("");

}


/* =========================================================
   VILLAGE CARD
========================================================= */

function villageCard(village) {

  const image =
    village.images?.[0] || "";


  const following =
    currentUser &&
    Array.isArray(
      village.followers
    ) &&
    village.followers.includes(
      currentUser.uid
    );


  return `
    <article
      class="village-card"
    >

      <button
        onclick="openVillage('${esc(village.id)}',event)"
        class="w-full text-left"
        type="button"
      >

        ${
          image

            ? `
              <img
                src="${esc(image)}"
                class="village-cover"
                loading="lazy"
                alt="${esc(village.vName)}"
              >
            `

            : `
              <div
                class="village-cover placeholder"
              >
                🌾
              </div>
            `
        }


        <div class="p-4">

          <div
            class="flex justify-between gap-2"
          >

            <div>

              <h4
                class="font-black text-sm"
              >
                ${esc(village.vName)}
              </h4>


              <p
                class="text-[10px] text-slate-500"
              >
                📍
                ${esc(village.vDistrict)},
                ${esc(village.vState)}
              </p>

            </div>

          </div>


          <p
            class="text-xs text-slate-600 mt-2 line-clamp-2"
          >
            ${esc(village.vDescription)}
          </p>


          <div
            class="flex gap-2 mt-3 text-[10px] font-bold text-slate-500"
          >

            <span>
              🎯
              ${(village.activities || []).length}
              activities
            </span>

            <span>
              📦
              ${(village.packages || []).length}
              packages
            </span>

            <span>
              🏡 Stay
            </span>

          </div>

        </div>

      </button>


      <div
        class="px-4 pb-4 flex gap-2"
      >

        <button
          onclick="toggleFollow('${esc(village.id)}',event)"
          class="follow-btn ${
            following
              ? "following"
              : ""
          }"
          type="button"
        >
          ${
            following
              ? "✓ Following"
              : "＋ Follow"
          }
        </button>


        <button
          onclick="handleShare('${esc(village.vName)}',event)"
          class="icon-btn"
          type="button"
        >
          ↗ Share
        </button>

      </div>

    </article>
  `;
}


/* =========================================================
   VILLAGE LIST
========================================================= */

function renderVillageList(
  list,
  container
) {

  if (!container) return;


  if (!list.length) {

    container.innerHTML = `
      <div class="empty">
        Abhi koi village listed nahi hai.
      </div>
    `;

    return;
  }


  container.innerHTML =
    list
      .map(village => {

        const following =
          currentUser &&
          Array.isArray(
            village.followers
          ) &&
          village.followers.includes(
            currentUser.uid
          );


        return `
          <div
            class="flex items-center gap-3 p-3 border border-slate-200 rounded-2xl bg-white"
          >

            <button
              onclick="openVillage('${esc(village.id)}',event)"
              class="flex-1 min-w-0 text-left"
              type="button"
            >

              <div
                class="flex items-center gap-3"
              >

                <div
                  class="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xl shrink-0"
                >
                  🏘️
                </div>


                <div
                  class="min-w-0"
                >

                  <b
                    class="block text-sm truncate"
                  >
                    ${esc(village.vName)}
                  </b>


                  <span
                    class="block text-[10px] text-slate-500 truncate"
                  >
                    📍
                    ${esc(village.vDistrict)},
                    ${esc(village.vState)}
                  </span>


                  <span
                    class="block text-[10px] text-slate-400 mt-0.5"
                  >
                    ${(village.images || []).length}
                    photos ·
                    ${(village.followers || []).length}
                    followers
                  </span>

                </div>

              </div>

            </button>


            <button
              onclick="toggleFollow('${esc(village.id)}',event)"
              class="follow-btn ${
                following
                  ? "following"
                  : ""
              } shrink-0"
              type="button"
            >
              ${
                following
                  ? "✓ Following"
                  : "＋ Follow"
              }
            </button>

          </div>
        `;

      })
      .join("");

}


/* =========================================================
   VILLAGE CARDS
========================================================= */

function renderVillageCards(
  list,
  container
) {

  if (!container) return;


  container.innerHTML =
    list.length

      ? list
          .map(villageCard)
          .join("")

      : `
        <p class="empty">
          Abhi is area mein village
          listing nahi hai.
        </p>
      `;
}


/* =========================================================
   FIND VILLAGE FOR POST
========================================================= */

function findVillageForPost(post) {

  if (!post) return null;


  return (

    villages.find(
      village =>
        village.id === post.villageId
    )

    ||

    villages.find(
      village =>
        village.vName === post.villageName
    )

    ||

    null
  );
}


/* =========================================================
   POST CARD
========================================================= */

function postCard(post) {

  const village =
    findVillageForPost(post);


  const isMine =
    !post.isGalleryPhoto &&
    currentUser?.uid ===
      post.ownerUid;


  const villageName =
    village?.vName ||
    post.villageName ||
    post.location ||
    "Village";


  const district =
    village?.vDistrict ||
    post.vDistrict ||
    "";


  const state =
    village?.vState ||
    post.vState ||
    "";


  const locationLine = [
    villageName,
    district,
    state
  ]
    .filter(Boolean)
    .join(" · ");


  const villageButton =
    village

      ? `
        <button
          onclick="openVillage('${esc(village.id)}',event)"
          class="post-village-link"
          type="button"
        >
          View Village →
        </button>
      `

      : "";


  const image =
    post.imageUrl || "";


  return `
    <article
      class="post-card village-post-card"
      data-post-id="${esc(post.id)}"
    >

      <div class="post-top">

        <div
          class="mini-avatar"
        >
          ${esc(
            (
              post.author ||
              "U"
            )
              .charAt(0)
              .toUpperCase()
          )}
        </div>


        <div
          class="min-w-0"
        >

          <b>
            ${esc(
              post.author ||
              "VillageDeko User"
            )}
          </b>


          <small>
            📍
            <strong>
              ${esc(locationLine)}
            </strong>
          </small>

        </div>


        ${villageButton}


        <button
          onclick="handleShare('${esc(villageName)}',event)"
          class="ml-auto icon-btn"
          type="button"
        >
          ↗
        </button>

      </div>


      ${
        image

          ? `
            <div
              class="post-image-wrapper"
            >

              <img
                src="${esc(image)}"
                class="post-image post-photo"
                loading="lazy"
                alt="${esc(villageName)}"
                onclick="openImageViewer(this.src)"
                onerror="handleImageError(this)"
              >

            </div>
          `

          : `
            <div
              class="post-image-wrapper"
            >

              <div
                class="post-image-placeholder"
              >
                🌾
              </div>

            </div>
          `
      }


      ${
        post.text

          ? `
            <div
              class="post-content"
            >

              <p
                class="post-text"
              >
                ${esc(post.text)}
              </p>

            </div>
          `

          : ""
      }


      <div
        class="post-actions"
      >

        ${
          post.isGalleryPhoto

            ? ""

            : `
              <button
                onclick="toggleLike('${esc(post.id)}',event)"
                type="button"
              >
                ❤️ Like
              </button>


              <button
                onclick="openComments('${esc(post.id)}')"
                type="button"
              >
                💬 Comment
              </button>
            `
        }


        <button
          onclick="handleShare('${esc(villageName)}',event)"
          type="button"
        >
          ↗ Share
        </button>


        ${
          isMine

            ? `
              <button
                onclick="handleEdit('${esc(post.id)}',event)"
                class="owner-edit"
                type="button"
              >
                Edit
              </button>


              <button
                onclick="handleDelete('${esc(post.id)}',event)"
                class="owner-delete"
                type="button"
              >
                Delete
              </button>
            `

            : ""
        }

      </div>

    </article>
  `;
}


/* =========================================================
   RENDER POSTS
========================================================= */

function renderPosts(
  posts,
  container
) {

  if (!container) return;


  const sorted =
    [...posts].sort(
      (a, b) =>
        getTimeValue(b.createdAt) -
        getTimeValue(a.createdAt)
    );


  container.innerHTML =
    sorted.length

      ? sorted
          .map(postCard)
          .join("")

      : `
        <div class="empty">
          Abhi koi post nahi hai.
        </div>
      `;
}


/* =========================================================
   VILLAGE FEED
========================================================= */

function renderVillageFeed() {

  const container =
    getVillageFeedContainer();


  if (!container) return;


  const villagePosts =
    allPosts.filter(
      isVillagePost
    );


  renderPosts(
    villagePosts,
    container
  );
}


/* =========================================================
   CHAUPAL FEED
========================================================= */

function renderChaupalFeed() {

  const container =
    getChaupalFeedContainer();


  if (!container) return;


  const chaupalPosts =
    allPosts.filter(
      isChaupalPost
    );


  renderPosts(
    chaupalPosts,
    container
  );
}


/* =========================================================
   HOME
========================================================= */

async function loadHome() {

  renderVillageCards(
    villages,
    $("homeVillagesList")
  );


  if ($("villageCount")) {

    $("villageCount")
      .textContent =
      villages.length;

  }


  if ($("postCount")) {

    $("postCount")
      .textContent =
      allPosts.length;

  }


  /*
     Modern Village Feed
  */

  renderVillageFeed();
}


/* =========================================================
   SEARCH
========================================================= */

function filterExplore(term) {

  const queryText =
    String(term || "")
      .trim()
      .toLowerCase();


  if (!queryText) {

    renderVillageCards(
      villages,
      $("homeVillagesList")
    );

    return;
  }


  const matching =
    villages.filter(
      village => {

        const haystack = [

          village.vName,

          village.vDistrict,

          village.vState,

          village.vDescription,

          village.hostName,

          ...(village.activities || [])
            .map(
              activity =>
                activity.name
            )

        ]
          .join(" ")
          .toLowerCase();


        return haystack.includes(
          queryText
        );

      }
    );


  renderVillageCards(
    matching,
    $("homeVillagesList")
  );
}


/* =========================================================
   MODERN SEARCH SUPPORT
========================================================= */

function searchVillage() {

  const input =
    $("villageSearch");


  if (!input) return;


  const queryText =
    input.value
      .trim()
      .toLowerCase();


  if (!queryText) {

    renderVillageFeed();

    return;
  }


  const matching =
    allPosts.filter(
      isVillagePost
    )
    .filter(post => {

      const village =
        findVillageForPost(post);


      const text = [

        village?.vName,

        village?.vDistrict,

        village?.vState,

        post.villageName,

        post.vDistrict,

        post.vState,

        post.author,

        post.text

      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();


      return text.includes(
        queryText
      );

    });


  const container =
    getVillageFeedContainer();


  if (!container) return;


  renderPosts(
    matching,
    container
  );


  if (!matching.length) {

    showMessage(
      `"${input.value}" VillageDeko mein nahi mila.`
    );

    return;
  }


  container.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


/* =========================================================
   LOAD VILLAGES
========================================================= */

async function loadVillages() {

  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          "villagesListings"
        )
      );


    villages =
      snapshot.docs
        .map(
          document => ({
            id: document.id,
            ...document.data()
          })
        )
        .sort(
          (a, b) =>
            getTimeValue(
              b.createdAt
            ) -
            getTimeValue(
              a.createdAt
            )
        );


  } catch (error) {

    console.error(
      "Village loading failed:",
      error
    );

    villages = [];

  }

}


/* =========================================================
   LOAD ALL POSTS
========================================================= */

async function loadAllPosts() {

  try {

    let snapshot;


    try {

      snapshot =
        await getDocs(
          query(
            collection(
              db,
              "posts"
            ),
            orderBy(
              "createdAt",
              "desc"
            )
          )
        );

    } catch (orderError) {

      console.warn(
        "Ordered post query failed. Using fallback.",
        orderError
      );


      snapshot =
        await getDocs(
          collection(
            db,
            "posts"
          )
        );

    }


    allPosts =
      snapshot.docs
        .map(
          document => ({
            id: document.id,
            ...document.data()
          })
        )
        .sort(
          (a, b) =>
            getTimeValue(
              b.createdAt
            ) -
            getTimeValue(
              a.createdAt
            )
        );


  } catch (error) {

    console.error(
      "Posts loading failed:",
      error
    );

    allPosts = [];

  }


  if ($("postCount")) {

    $("postCount")
      .textContent =
      allPosts.length;

  }

}


/* =========================================================
   STATE VIEW
========================================================= */

async function selectState(
  state
) {

  if (!state) {

    goHome();

    return;
  }


  previousView =
    "stateView";


  showView(
    "stateView"
  );


  if ($("stateTitle")) {

    $("stateTitle")
      .textContent =
      state;

  }


  if ($("stateSubtitle")) {

    $("stateSubtitle")
      .textContent =
      `${state} ke villages, photos, stays, activities aur packages`;

  }


  const villageList =
    villages.filter(
      village =>
        village.vState ===
        state
    );


  if ($("stateVillageCount")) {

    $("stateVillageCount")
      .textContent =
      `${villageList.length} listed`;

  }


  renderVillageList(
    villageList,
    $("stateVillages")
  );


  /*
     ONLY VILLAGE POSTS
  */

  const posts =
    allPosts
      .filter(
        isVillagePost
      )
      .filter(
        post => {

          const village =
            findVillageForPost(
              post
            );


          return (
            village?.vState ||
            post.vState
          ) === state;

        }
      );


  renderPosts(
    posts,
    $("statePostsFeed")
  );
}


/* =========================================================
   OPEN VILLAGE
========================================================= */

async function openVillage(
  id,
  event
) {

  event?.stopPropagation();


  currentVillage =
    villages.find(
      village =>
        village.id === id
    );


  if (!currentVillage) {

    showMessage(
      "Village nahi mila."
    );

    return;
  }


  previousView =
    $("stateView")
      ?.classList
      .contains("hidden")

      ? "homeView"

      : "stateView";


  showView(
    "villageView"
  );


  renderVillageHeader();


  await loadVillagePosts();


  renderVillageDetails();


  renderVillageExtras();
}


/* =========================================================
   VILLAGE HEADER
========================================================= */

function renderVillageHeader() {

  const village =
    currentVillage;


  if (!village) return;


  const following =
    currentUser &&
    Array.isArray(
      village.followers
    ) &&
    village.followers.includes(
      currentUser.uid
    );


  const header =
    $("villageHeader");


  if (!header) return;


  header.innerHTML = `

    <div
      class="section-card overflow-hidden p-0"
    >

      <div
        class="village-profile-cover"
      >

        ${
          village.images?.[0]

            ? `
              <img
                src="${esc(village.images[0])}"
                alt="${esc(village.vName)}"
              >
            `

            : ""
        }


        <div
          class="cover-gradient"
        ></div>


        <div
          class="village-profile-info"
        >

          <div
            class="avatar"
          >
            🌾
          </div>


          <div
            class="flex-1"
          >

            <h2
              class="text-xl font-black text-white"
            >
              ${esc(village.vName)}
            </h2>


            <p
              class="text-[11px] text-white/80"
            >
              📍
              ${esc(village.vDistrict)},
              ${esc(village.vState)}
            </p>


            <p
              class="text-[10px] text-white/80 mt-1"
            >
              ${(village.images || []).length}
              photos ·
              ${(village.followers || []).length}
              followers
            </p>

          </div>


          <button
            onclick="toggleFollow('${esc(village.id)}',event)"
            class="profile-follow ${
              following
                ? "following"
                : ""
            }"
            type="button"
          >
            ${
              following
                ? "✓ Following"
                : "Follow"
            }
          </button>

        </div>

      </div>

    </div>

  `;
}


/* =========================================================
   LOAD VILLAGE POSTS
========================================================= */

async function loadVillagePosts() {

  const container =
    $("villageSectionFeed");


  /*
     Modern HTML can also use
     villageFeed inside village page.
  */

  const feed =
    container ||
    $("villageFeed");


  if (!feed || !currentVillage) {
    return;
  }


  try {

    const snapshot =
      await getDocs(
        query(
          collection(
            db,
            "posts"
          ),
          where(
            "villageId",
            "==",
            currentVillage.id
          )
        )
      );


    const posts =
      snapshot.docs
        .map(
          document => ({
            id: document.id,
            ...document.data()
          })
        )
        .filter(
          isVillagePost
        );


    /*
       VILLAGE LISTING GALLERY

       All uploaded village photos
       should also appear in village feed.
    */

    const galleryImages =
      Array.isArray(
        currentVillage.images
      )

        ? currentVillage.images
            .filter(Boolean)

        : [];


    const galleryPosts =
      galleryImages.map(
        (
          imageUrl,
          index
        ) => ({

          id:
            `village-gallery-${currentVillage.id}-${index}`,

          ownerUid:
            currentVillage.ownerUid ||
            "",

          author:
            currentVillage.hostName ||
            currentVillage.vName ||
            "VillageDeko",

          location:
            currentVillage.vName ||
            "Village",

          villageId:
            currentVillage.id,

          villageName:
            currentVillage.vName ||
            "",

          vDistrict:
            currentVillage.vDistrict ||
            "",

          vState:
            currentVillage.vState ||
            "",

          text:
            index === 0
              ? "Village cover photo"
              : "Village photo",

          imageUrl,

          postType:
            "village",

          createdAt:
            currentVillage.createdAt ||
            null,

          isGalleryPhoto:
            true

        })
      );


    /*
       Avoid duplicate gallery images.
    */

    const postImageUrls =
      new Set(
        posts
          .map(
            post =>
              post.imageUrl
          )
          .filter(Boolean)
      );


    const uniqueGalleryPosts =
      galleryPosts.filter(
        post =>
          !postImageUrls.has(
            post.imageUrl
          )
      );


    const finalPosts =
      [
        ...posts,
        ...uniqueGalleryPosts
      ]
        .sort(
          (a, b) =>
            getTimeValue(
              b.createdAt
            ) -
            getTimeValue(
              a.createdAt
            )
        );


    renderPosts(
      finalPosts,
      feed
    );


  } catch (error) {

    console.error(
      "Village feed load failed:",
      error
    );


    feed.innerHTML = `
      <div class="empty">
        Feed load nahi ho paaya.
      </div>
    `;

  }

}


/* =========================================================
   VILLAGE DETAILS
========================================================= */

function renderVillageDetails() {

  const village =
    currentVillage;


  const container =
    $("villageSectionDetails");


  if (!container || !village) {
    return;
  }


  container.innerHTML = `

    <div
      class="space-y-3"
    >

      <p
        class="text-sm leading-relaxed"
      >
        ${esc(
          village.vDescription
        )}
      </p>


      <div
        class="grid grid-cols-2 gap-2"
      >

        <div
          class="info-box"
        >

          <b>
            Host
          </b>

          <p>
            ${esc(
              village.hostName
            )}
          </p>

        </div>


        <div
          class="info-box"
        >

          <b>
            Contact
          </b>

          <p>
            ${esc(
              village.hostWhatsapp
            )}
          </p>

        </div>

      </div>


      ${
        village.bankDetails

          ? `
            <p
              class="text-[10px] text-slate-400"
            >
              Bank details are kept private.
            </p>
          `

          : ""
      }

    </div>

  `;
}


/* =========================================================
   VILLAGE EXTRAS
========================================================= */

function renderVillageExtras() {

  const village =
    currentVillage;


  if (!village) return;


  const activities =
    $("villageSectionActivities");


  const packages =
    $("villageSectionPackages");


  if (activities) {

    activities.innerHTML =
      (village.activities || []).length

        ? `
          <div
            class="grid gap-2"
          >

            ${
              village.activities
                .map(
                  activity => `
                    <div
                      class="info-box"
                    >

                      <b>
                        🎯
                        ${esc(
                          activity.name
                        )}
                      </b>

                      <p>
                        ${esc(
                          activity.description ||
                          ""
                        )}

                        ${
                          activity.price

                            ? `
                              · ₹
                              ${esc(
                                activity.price
                              )}
                              /person
                            `

                            : ""
                        }
                      </p>

                    </div>
                  `
                )
                .join("")
            }

          </div>
        `

        : `
          <div class="empty">
            Activities abhi add nahi ki gayi.
          </div>
        `;

  }


  if (packages) {

    packages.innerHTML =
      (village.packages || []).length

        ? `
          <div
            class="grid gap-2"
          >

            ${
              village.packages
                .map(
                  pkg => `
                    <div
                      class="package-card"
                    >

                      <b>
                        📦
                        ${esc(
                          pkg.name
                        )}
                      </b>


                      <strong>
                        ₹
                        ${esc(
                          pkg.price
                        )}
                        /person
                      </strong>


                      <span>
                        ${esc(
                          pkg.days
                        )}
                        days
                      </span>


                      <p>
                        ${esc(
                          pkg.description ||
                          ""
                        )}
                      </p>

                    </div>
                  `
                )
                .join("")
            }

          </div>
        `

        : `
          <div class="empty">
            Packages abhi add nahi kiye gaye.
          </div>
        `;

  }

}


/* =========================================================
   VILLAGE TABS
========================================================= */

function showVillageSection(
  name,
  button
) {

  [
    "feed",
    "details",
    "activities",
    "packages"
  ]
    .forEach(section => {

      const id =
        "villageSection" +
        section
          .charAt(0)
          .toUpperCase() +
        section.slice(1);


      $(id)
        ?.classList
        .toggle(
          "hidden",
          section !== name
        );

    });


  document
    .querySelectorAll(
      ".vtab"
    )
    .forEach(
      tab =>
        tab.classList.remove(
          "active"
        )
    );


  button
    ?.classList
    .add("active");


  /*
     Feed is always loaded fresh
     when user opens Feed tab.
  */

  if (name === "feed") {

    loadVillagePosts();

  }

}


/* =========================================================
   FOLLOW
========================================================= */

async function toggleFollow(
  id,
  event
) {

  event?.stopPropagation();


  if (!requireLogin()) {
    return;
  }


  const village =
    villages.find(
      item =>
        item.id === id
    );


  if (!village) return;


  try {

    const ref =
      doc(
        db,
        "villagesListings",
        id,
        "followers",
        uid()
      );


    const snapshot =
      await getDoc(ref);


    if (snapshot.exists()) {

      await deleteDoc(ref);

    } else {

      await setDoc(
        ref,
        {
          uid: uid(),
          createdAt:
            serverTimestamp()
        }
      );

    }


    await refreshVillageFollowers(
      id
    );


    renderVillageList(
      villages,
      $("stateVillages")
    );


    renderVillageCards(
      villages,
      $("homeVillagesList")
    );


    if (
      currentVillage?.id === id
    ) {

      renderVillageHeader();

    }


  } catch (error) {

    console.error(
      "Follow error:",
      error
    );


    showMessage(
      "Follow update nahi ho paya."
    );

  }

}


async function refreshVillageFollowers(
  id
) {

  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          "villagesListings",
          id,
          "followers"
        )
      );


    const village =
      villages.find(
        item =>
          item.id === id
      );


    if (village) {

      village.followers =
        snapshot.docs.map(
          document =>
            document.id
        );

    }

  } catch (error) {

    console.warn(
      "Followers load failed:",
      error
    );

  }

}


/* =========================================================
   LIKE
========================================================= */

async function toggleLike(
  id,
  event
) {

  event?.stopPropagation();


  if (!requireLogin()) {
    return;
  }


  try {

    const likeRef =
      doc(
        db,
        "posts",
        id,
        "likes",
        uid()
      );


    const snapshot =
      await getDoc(
        likeRef
      );


    if (snapshot.exists()) {

      await deleteDoc(
        likeRef
      );

    } else {

      await setDoc(
        likeRef,
        {
          uid: uid(),
          createdAt:
            serverTimestamp()
        }
      );

    }


    /*
       Refresh currently visible feeds.
    */

    if (
      currentVillage?.id
    ) {

      await loadVillagePosts();

    }


    renderVillageFeed();


    renderChaupalFeed();


  } catch (error) {

    console.error(
      "Like error:",
      error
    );


    showMessage(
      "Like update nahi ho paya."
    );

  }

}


/* =========================================================
   COMMENTS
========================================================= */

async function openComments(
  postId
) {

  if (!requireLogin()) {
    return;
  }


  const modalTitle =
    $("genericTitle");


  const modalBody =
    $("genericBody");


  if (!modalBody) {
    return;
  }


  modalTitle &&
    (
      modalTitle.textContent =
        "💬 Comments"
    );


  modalBody.innerHTML = `
    <div class="empty">
      Comments load ho rahe hain...
    </div>
  `;


  openModal(
    "genericModal"
  );


  try {

    const snapshot =
      await getDocs(
        collection(
          db,
          "posts",
          postId,
          "comments"
        )
      );


    const comments =
      snapshot.docs
        .map(
          document => ({
            id: document.id,
            ...document.data()
          })
        )
        .sort(
          (a, b) =>
            getTimeValue(
              a.createdAt
            ) -
            getTimeValue(
              b.createdAt
            )
        );


    modalBody.innerHTML = `

      <div
        class="space-y-2"
      >

        ${
          comments.length

            ? comments
                .map(
                  comment => `
                    <div
                      class="info-box"
                    >

                      <b>
                        ${esc(
                          comment.author ||
                          "User"
                        )}
                      </b>

                      <p>
                        ${esc(
                          comment.text ||
                          ""
                        )}
                      </p>

                    </div>
                  `
                )
                .join("")

            : `
              <p
                class="empty"
              >
                No comments yet.
              </p>
            `
        }

      </div>


      <form
        onsubmit="addComment(event,'${esc(postId)}')"
        class="flex gap-2 mt-3"
      >

        <input
          id="commentText"
          required
          maxlength="500"
          class="input flex-1"
          placeholder="Write a comment..."
        >


        <button
          class="primary"
          type="submit"
        >
          Post
        </button>

      </form>

    `;


  } catch (error) {

    console.error(
      "Comments loading error:",
      error
    );


    modalBody.innerHTML = `
      <div class="empty">
        Comments load nahi ho paaye.
      </div>
    `;

  }

}


async function addComment(
  event,
  postId
) {

  event.preventDefault();


  if (!requireLogin()) {
    return;
  }


  const input =
    $("commentText");


  const text =
    input?.value
      ?.trim();


  if (!text) return;


  try {

    await addDoc(
      collection(
        db,
        "posts",
        postId,
        "comments"
      ),
      {

        uid:
          uid(),

        author:
          currentUser.displayName ||
          currentUser.email ||
          "VillageDeko User",

        text,

        createdAt:
          serverTimestamp()

      }
    );


    closeModal(
      "genericModal"
    );


    if (
      currentVillage?.id
    ) {

      await loadVillagePosts();

    }


    renderVillageFeed();

    renderChaupalFeed();


    showMessage(
      "Comment post ho gaya 🌾"
    );


  } catch (error) {

    console.error(
      "Comment error:",
      error
    );


    showMessage(
      "Comment post nahi ho paya."
    );

  }

}


/* =========================================================
   SAVE POST
========================================================= */

async function savePost(
  id,
  event
) {

  event?.stopPropagation();


  if (!requireLogin()) {
    return;
  }


  try {

    await setDoc(
      doc(
        db,
        "users",
        uid(),
        "saved",
        id
      ),
      {
        postId: id,
        createdAt:
          serverTimestamp()
      }
    );


    showMessage(
      "Post saved."
    );


  } catch (error) {

    console.error(
      "Save error:",
      error
    );

    showMessage(
      "Post save nahi ho payi."
    );

  }

}


/* =========================================================
   OPEN POST MODAL
========================================================= */

function openPostModal(
  source = "village"
) {

  if (!requireLogin()) {
    return;
  }


  openModal(
    "addStoryModal"
  );


  populateVillageSelect();


  if ($("storyAuthor")) {

    $("storyAuthor")
      .value =
      currentUser.displayName ||
      "";

  }


  if ($("postType")) {

    $("postType")
      .value =
      source === "chaupal"
        ? "chaupal"
        : "village";

  }


  if ($("storyVillage")) {

    $("storyVillage")
      .required =
      source !== "chaupal";

  }


  if ($("storyText")) {

    $("storyText")
      .placeholder =
      source === "chaupal"

        ? "Chaupal ki baat, announcement ya story likhein..."

        : "Caption / story";

  }

}


/* =========================================================
   VILLAGE SELECT
========================================================= */

function populateVillageSelect() {

  const select =
    $("storyVillage");


  if (!select) return;


  select.innerHTML =
    `
      <option value="">
        Select village
      </option>
    `

    +

    villages
      .map(
        village => `
          <option
            value="${esc(village.id)}"
          >
            ${esc(village.vName)}
            —
            ${esc(village.vDistrict)},
            ${esc(village.vState)}
          </option>
        `
      )
      .join("");

}


/* =========================================================
   IMAGE UPLOAD
========================================================= */

async function uploadToImgBB(
  file
) {

  if (!file) {
    return "";
  }


  const formData =
    new FormData();


  formData.append(
    "image",
    file
  );


  const response =
    await fetch(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      {
        method: "POST",
        body: formData
      }
    );


  const data =
    await response.json();


  if (
    !response.ok ||
    !data.success
  ) {

    throw new Error(
      "Image upload failed"
    );

  }


  return data.data.url;
}


/* =========================================================
   CREATE POST
========================================================= */

async function handleImgBBPhotoPost(
  event
) {

  event.preventDefault();


  if (!requireLogin()) {
    return;
  }


  const button =
    $("submitBtn");


  if (button) {

    button.disabled = true;

    button.textContent =
      "Publishing...";

  }


  try {

    const file =
      $("storyImageFile")
        ?.files?.[0];


    const imageUrl =
      file
        ? await uploadToImgBB(file)
        : "";


    const postType =
      $("postType")
        ?.value ||
      "village";


    const villageId =
      $("storyVillage")
        ?.value ||
      "";


    const village =
      villages.find(
        item =>
          item.id ===
          villageId
      );


    /*
       Village post MUST have village.
    */

    if (
      postType === "village" &&
      !village
    ) {

      throw new Error(
        "Village select karein."
      );

    }


    const author =
      currentUser.displayName ||
      $("storyAuthor")
        ?.value
        ?.trim() ||
      currentUser.email ||
      "VillageDeko User";


    const location =
      $("storyLocation")
        ?.value
        ?.trim() ||


      village?.vName ||


      "Chaupal";


    const text =
      $("storyText")
        ?.value
        ?.trim() ||
      "";


    /*
       VERY IMPORTANT:
       Save explicit postType.
    */

    await addDoc(
      collection(
        db,
        "posts"
      ),
      {

        ownerUid:
          uid(),

        author,

        location,

        villageId:
          postType === "village"
            ? village.id
            : null,

        villageName:
          village?.vName ||
          "",

        vDistrict:
          village?.vDistrict ||
          "",

        vState:
          village?.vState ||
          "",

        text,

        imageUrl,

        postType,

        createdAt:
          serverTimestamp()

      }
    );


    const form =
      $("chaupalPostForm");


    form?.reset();


    if ($("postType")) {

      $("postType")
        .value =
        "village";

    }


    if ($("storyVillage")) {

      $("storyVillage")
        .required = true;

    }


    if ($("storyText")) {

      $("storyText")
        .placeholder =
        "Caption / story";

    }


    closeModal(
      "addStoryModal"
    );


    /*
       Refresh all feeds.
    */

    await loadAllPosts();


    renderVillageFeed();

    renderChaupalFeed();


    if (
      village?.id &&
      currentVillage?.id ===
        village.id
    ) {

      await loadVillagePosts();

    }


    await loadHome();


    showMessage(
      postType === "chaupal"

        ? "Chaupal post publish ho gayi 🔥"

        : "Village post publish ho gayi 🌾"
    );


  } catch (error) {

    console.error(
      "Post publishing error:",
      error
    );


    showMessage(
      "Post publish nahi ho payi: " +
      error.message
    );


  } finally {

    if (button) {

      button.disabled = false;

      button.textContent =
        "Publish Post";

    }

  }

}


/* =========================================================
   ACTIVITY ROW
========================================================= */

function addActivityRow(
  data = {}
) {

  const container =
    $("activitiesRows");


  if (!container) return;


  const id =
    crypto.randomUUID();


  const element =
    document.createElement(
      "div"
    );


  element.className =
    "repeat-row";


  element.id =
    "activity-" + id;


  element.innerHTML = `

    <input
      data-field="name"
      value="${esc(data.name || "")}"
      placeholder="Activity name"
      class="input"
    >


    <input
      data-field="price"
      value="${esc(data.price || "")}"
      placeholder="₹ per person (optional)"
      class="input"
    >


    <input
      data-field="description"
      value="${esc(data.description || "")}"
      placeholder="Details"
      class="input"
    >


    <button
      type="button"
      onclick="document.getElementById('activity-${id}').remove()"
      class="remove-btn"
    >
      ×
    </button>

  `;


  container.appendChild(
    element
  );

}


/* =========================================================
   PACKAGE ROW
========================================================= */

function addPackageRow(
  data = {}
) {

  const container =
    $("packagesRows");


  if (!container) return;


  const id =
    crypto.randomUUID();


  const element =
    document.createElement(
      "div"
    );


  element.className =
    "repeat-row";


  element.id =
    "package-" + id;


  element.innerHTML = `

    <input
      data-field="name"
      value="${esc(data.name || "")}"
      placeholder="Package name"
      class="input"
    >


    <input
      data-field="days"
      value="${esc(data.days || "")}"
      placeholder="Days"
      type="number"
      min="1"
      class="input"
    >


    <input
      data-field="price"
      value="${esc(data.price || "")}"
      placeholder="₹ per person"
      class="input"
    >


    <button
      type="button"
      onclick="document.getElementById('package-${id}').remove()"
      class="remove-btn"
    >
      ×
    </button>


    <input
      data-field="description"
      value="${esc(data.description || "")}"
      placeholder="Package details"
      class="input repeat-description"
    >

  `;


  container.appendChild(
    element
  );

}


/* =========================================================
   COLLECT ROWS
========================================================= */

function collectRows(
  id
) {

  const container =
    $(id);


  if (!container) {
    return [];
  }


  return [
    ...container.children
  ]

    .map(
      row =>
        Object.fromEntries(
          [
            ...row.querySelectorAll(
              "[data-field]"
            )
          ]
            .map(
              input => [
                input.dataset.field,
                input.value.trim()
              ]
            )
        )
    )

    .filter(
      item =>
        item.name
    );

}


/* =========================================================
   CREATE VILLAGE
========================================================= */

async function handleVillageListing(
  event
) {

  event.preventDefault();


  if (!requireLogin()) {
    return;
  }


  const button =
    $("listSubmitBtn");


  if (button) {

    button.disabled = true;

    button.textContent =
      "Publishing...";

  }


  try {

    const files =
      [
        ...(
          $("villageGalleryFiles")
            ?.files ||
          []
        )
      ];


    const images = [];


    for (
      const file of files
    ) {

      images.push(
        await uploadToImgBB(
          file
        )
      );

    }


    const bank = {

      bankName:
        $("bankName")
          ?.value
          ?.trim() || "",

      accountName:
        $("accountName")
          ?.value
          ?.trim() || "",

      accountNumber:
        $("accountNumber")
          ?.value
          ?.trim() || "",

      ifsc:
        $("ifsc")
          ?.value
          ?.trim() || ""

    };


    const bankDetails =
      Object.values(bank)
        .some(Boolean)

        ? bank

        : null;


    await addDoc(
      collection(
        db,
        "villagesListings"
      ),
      {

        ownerUid:
          uid(),

        hostName:
          $("hostName")
            ?.value
            ?.trim() || "",

        hostWhatsapp:
          $("hostWhatsapp")
            ?.value
            ?.trim() || "",

        vName:
          $("vName")
            ?.value
            ?.trim() || "",

        vDistrict:
          $("vDistrict")
            ?.value
            ?.trim() || "",

        vState:
          $("vState")
            ?.value || "",

        vDescription:
          $("vDescription")
            ?.value
            ?.trim() || "",

        images,

        activities:
          collectRows(
            "activitiesRows"
          ),

        packages:
          collectRows(
            "packagesRows"
          ),

        bankDetails,

        createdAt:
          serverTimestamp()

      }
    );


    $("listVillageForm")
      ?.reset();


    if ($("activitiesRows")) {

      $("activitiesRows")
        .innerHTML = "";

      addActivityRow();

    }


    if ($("packagesRows")) {

      $("packagesRows")
        .innerHTML = "";

      addPackageRow();

    }


    closeModal(
      "listVillageModal"
    );


    await loadVillages();


    await Promise.all(
      villages.map(
        village =>
          refreshVillageFollowers(
            village.id
          )
          .catch(
            () => {}
          )
      )
    );


    await loadHome();


    showMessage(
      "Village successfully listed 🌾"
    );


  } catch (error) {

    console.error(
      "Village listing error:",
      error
    );


    showMessage(
      "Village listing failed: " +
      error.message
    );


  } finally {

    if (button) {

      button.disabled = false;

      button.textContent =
        "Publish Village Live";

    }

  }

}


/* =========================================================
   EDIT POST
========================================================= */

async function handleEdit(
  id,
  event
) {

  event?.stopPropagation();


  if (!requireLogin()) {
    return;
  }


  try {

    const reference =
      doc(
        db,
        "posts",
        id
      );


    const snapshot =
      await getDoc(
        reference
      );


    if (
      !snapshot.exists()
    ) {

      showMessage(
        "Post nahi mili."
      );

      return;
    }


    const post =
      snapshot.data();


    if (
      post.ownerUid !== uid()
    ) {

      showMessage(
        "Sirf apni post edit kar sakte ho."
      );

      return;
    }


    const newText =
      prompt(
        "Caption update karein",
        post.text || ""
      );


    if (
      newText === null
    ) {
      return;
    }


    if (
      !newText.trim()
    ) {

      showMessage(
        "Caption empty nahi ho sakta."
      );

      return;
    }


    await updateDoc(
      reference,
      {
        text:
          newText.trim(),

        updatedAt:
          serverTimestamp()
      }
    );


    await loadAllPosts();


    renderVillageFeed();

    renderChaupalFeed();


    if (
      currentVillage?.id
    ) {

      await loadVillagePosts();

    }


    await loadHome();


    showMessage(
      "Post update ho gayi."
    );


  } catch (error) {

    console.error(
      "Edit error:",
      error
    );


    showMessage(
      "Post edit nahi ho payi."
    );

  }

}


/* =========================================================
   DELETE POST
========================================================= */

async function handleDelete(
  id,
  event
) {

  event?.stopPropagation();


  if (!requireLogin()) {
    return;
  }


  try {

    const reference =
      doc(
        db,
        "posts",
        id
      );


    const snapshot =
      await getDoc(
        reference
      );


    if (
      !snapshot.exists()
    ) {

      showMessage(
        "Post nahi mili."
      );

      return;
    }


    const post =
      snapshot.data();


    if (
      post.ownerUid !== uid()
    ) {

      showMessage(
        "Sirf apni post delete kar sakte ho."
      );

      return;
    }


    const confirmed =
      window.confirm(
        "Apni post delete karni hai?"
      );


    if (!confirmed) {
      return;
    }


    await deleteDoc(
      reference
    );


    /*
       Remove from local state immediately.
    */

    allPosts =
      allPosts.filter(
        item =>
          item.id !== id
      );


    renderVillageFeed();

    renderChaupalFeed();


    if (
      currentVillage?.id
    ) {

      await loadVillagePosts();

    }


    await loadHome();


    showMessage(
      "Post delete ho gayi."
    );


  } catch (error) {

    console.error(
      "Delete error:",
      error
    );


    showMessage(
      "Post delete nahi ho payi."
    );

  }

}


/* =========================================================
   SHARE
========================================================= */

async function handleShare(
  title,
  event
) {

  event?.stopPropagation();


  const url =
    window.location.href;


  if (
    navigator.share
  ) {

    try {

      await navigator.share({
        title:
          "VillageDeko",
        text:
          title,
        url
      });

    } catch (_) {}

    return;
  }


  try {

    await navigator
      .clipboard
      ?.writeText(url);


    showMessage(
      "Link copied."
    );


  } catch (_) {

    showMessage(
      "Share link copy nahi ho paya."
    );

  }

}


/* =========================================================
   WEDDING
========================================================= */

async function submitWedding(
  event
) {

  event.preventDefault();


  if (!requireLogin()) {
    return;
  }


  try {

    await addDoc(
      collection(
        db,
        "weddingInquiries"
      ),
      {

        ownerUid:
          uid(),

        name:
          $("wName")
            ?.value || "",

        phone:
          $("wPhone")
            ?.value || "",

        state:
          $("wState")
            ?.value || "",

        guests:
          $("wGuests")
            ?.value || "",

        date:
          $("wDate")
            ?.value || "",

        message:
          $("wMessage")
            ?.value || "",

        createdAt:
          serverTimestamp()

      }
    );


    event.target.reset();


    showMessage(
      "Wedding inquiry submitted."
    );


  } catch (error) {

    console.error(
      "Wedding error:",
      error
    );


    showMessage(
      "Wedding inquiry submit nahi ho payi."
    );

  }

}


/* =========================================================
   OWNED DATA
========================================================= */

async function showMyListings() {

  if (!requireLogin()) {
    return;
  }


  await showOwned(
    "villagesListings",
    "My Village Listings",
    village =>
      `${village.vName}, ${village.vDistrict} — ${village.vState}`
  );

}


async function showMyHosts() {

  if (!requireLogin()) {
    return;
  }


  await showOwned(
    "villagesListings",
    "My Host Listings",
    village =>
      `${village.hostName} · ${village.vName} · ${village.hostWhatsapp}`
  );

}


async function showMyWeddings() {

  if (!requireLogin()) {
    return;
  }


  await showOwned(
    "weddingInquiries",
    "My Wedding Listings",
    wedding =>
      `${wedding.state || "India"} · ${wedding.date || ""} · ${wedding.guests || ""} guests`
  );

}


async function showOwned(
  collectionName,
  title,
  formatter
) {

  try {

    const snapshot =
      await getDocs(
        query(
          collection(
            db,
            collectionName
          ),
          where(
            "ownerUid",
            "==",
            uid()
          )
        )
      );


    if ($("genericTitle")) {

      $("genericTitle")
        .textContent =
        title;

    }


    if ($("genericBody")) {

      $("genericBody").innerHTML =
        snapshot.docs.length

          ? snapshot.docs
              .map(
                document => `
                  <div
                    class="info-box mb-2"
                  >
                    <b>
                      ${esc(
                        formatter(
                          document.data()
                        )
                      )}
                    </b>
                  </div>
                `
              )
              .join("")

          : `
              <div class="empty">
                Kuch nahi mila.
              </div>
            `;

    }


    openModal(
      "genericModal"
    );


  } catch (error) {

    console.error(
      "Owned data error:",
      error
    );

    showMessage(
      "Data load nahi ho paya."
    );

  }

}


/* =========================================================
   SETTINGS
========================================================= */

function openSettings() {

  if ($("settingEmail")) {

    $("settingEmail")
      .checked =
      localStorage.getItem(
        "showEmail"
      ) === "true";

  }


  if ($("settingNotifications")) {

    $("settingNotifications")
      .checked =
      localStorage.getItem(
        "notifications"
      ) !== "false";

  }


  openModal(
    "settingsModal"
  );

}


function openPrivacy() {

  openModal(
    "privacyModal"
  );

}


function saveSetting(
  key,
  value
) {

  localStorage.setItem(
    key,
    value
  );

}


/* =========================================================
   GOOGLE LOGIN
========================================================= */

async function googleLogin() {

  const buttons = [
    $("googleLoginGateBtn")
  ];


  buttons.forEach(
    button => {

      if (!button) return;

      button.disabled = true;

      button.textContent =
        "Connecting...";

    }
  );


  $("loginError")
    ?.classList
    .add("hidden");


  $("loginModalError")
    ?.classList
    .add("hidden");


  try {

    const provider =
      new GoogleAuthProvider();


    await signInWithPopup(
      auth,
      provider
    );


    closeModal(
      "loginModal"
    );


  } catch (error) {

    console.error(
      "Google login error:",
      error
    );


    const message =
      "Google login failed: " +
      (
        error?.message ||
        "Unknown error"
      );


    [
      $("loginError"),
      $("loginModalError")
    ]
      .forEach(
        element => {

          if (!element) return;

          element.textContent =
            message;

          element.classList
            .remove(
              "hidden"
            );

        }
      );


  } finally {

    buttons.forEach(
      button => {

        if (!button) return;

        button.disabled = false;

        button.innerHTML =
          `
            <span class="google-g">
              G
            </span>
            Continue with Google
          `;

      }
    );

  }

}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

  try {

    await signOut(
      auth
    );

    closeDrawer();


  } catch (error) {

    console.error(
      "Logout error:",
      error
    );

  }

}


/* =========================================================
   PROFILE PHOTO
========================================================= */

async function loadProfilePhoto() {

  if (!currentUser) {
    return;
  }


  try {

    const snapshot =
      await getDoc(
        doc(
          db,
          "users",
          uid()
        )
      );


    const photo =
      snapshot.exists()

        ? (
            snapshot.data()
              .photoURL ||
            currentUser.photoURL ||
            ""
          )

        : (
            currentUser.photoURL ||
            ""
          );


    setProfilePhotoUI(
      photo
    );


  } catch (error) {

    console.error(
      "Profile load failed:",
      error
    );

  }

}


function setProfilePhotoUI(
  url
) {

  const topImage =
    $("topProfilePhoto");

  const topEmoji =
    $("topProfileEmoji");


  const drawerImage =
    $("drawerProfilePhoto");

  const drawerEmoji =
    $("drawerProfileEmoji");


  [
    topImage,
    drawerImage
  ]
    .forEach(
      image => {

        if (!image) return;

        image.src =
          url || "";

        image.classList
          .toggle(
            "hidden",
            !url
          );

      }
    );


  [
    topEmoji,
    drawerEmoji
  ]
    .forEach(
      element => {

        if (!element) return;

        element.classList
          .toggle(
            "hidden",
            Boolean(url)
          );

      }
    );

}


async function handleProfilePhoto(
  event
) {

  if (!requireLogin()) {
    return;
  }


  const file =
    event.target
      ?.files?.[0];


  if (!file) {
    return;
  }


  if (
    !file.type.startsWith(
      "image/"
    )
  ) {

    showMessage(
      "Sirf image upload karein."
    );


    event.target.value =
      "";


    return;
  }


  const input =
    event.target;


  try {

    input.disabled = true;


    const url =
      await uploadToImgBB(
        file
      );


    await setDoc(
      doc(
        db,
        "users",
        uid()
      ),
      {

        uid:
          uid(),

        displayName:
          currentUser.displayName ||
          "",

        email:
          currentUser.email ||
          "",

        photoURL:
          url,

        updatedAt:
          serverTimestamp()

      },
      {
        merge: true
      }
    );


    setProfilePhotoUI(
      url
    );


    showMessage(
      "Profile photo update ho gayi."
    );


  } catch (error) {

    console.error(
      "Profile photo error:",
      error
    );


    showMessage(
      "Profile photo upload failed."
    );


  } finally {

    input.disabled = false;

    input.value = "";

  }

}


/* =========================================================
   AUTH UI
========================================================= */

function updateAuthUI() {

  const logged =
    Boolean(
      currentUser
    );


  if ($("drawerName")) {

    $("drawerName")
      .textContent =
      logged

        ? (
            currentUser.displayName ||
            "VillageDeko User"
          )

        : "Guest";

  }


  if ($("drawerEmail")) {

    $("drawerEmail")
      .textContent =
      logged

        ? (
            currentUser.email ||
            ""
          )

        : "";

  }


  if ($("drawerProfileLabel")) {

    $("drawerProfileLabel")
      .textContent =
      logged

        ? (
            currentUser.displayName ||
            "Your Profile"
          )

        : "Your Profile";

  }


  if (!logged) {

    setProfilePhotoUI("");

  }

}


/* =========================================================
   IMAGE VIEWER
========================================================= */

function openImageViewer(
  url
) {

  const image =
    $("imageViewerImg");


  const modal =
    $("imageViewerModal");


  if (!image || !modal) {
    return;
  }


  image.src =
    url;


  modal.classList
    .add("is-open");


  document.body.style
    .overflow =
    "hidden";

}


function closeImageViewer(
  event
) {

  event?.stopPropagation();


  const modal =
    $("imageViewerModal");


  const image =
    $("imageViewerImg");


  modal
    ?.classList
    .remove("is-open");


  if (image) {

    image.src =
      "";

  }


  document.body.style
    .overflow =
    "";

}


/* =========================================================
   IMAGE ERROR
========================================================= */

function handleImageError(
  image
) {

  if (!image) return;


  image.style.display =
    "none";


  image.parentElement
    ?.classList
    .add(
      "image-error"
    );

}


/* =========================================================
   CHAUPAL OPEN
========================================================= */

function openChaupal() {

  if (!requireLogin()) {
    return;
  }


  showView(
    "chaupalView"
  );


  renderChaupalFeed();

}


/* =========================================================
   WEDDING OPEN
========================================================= */

function openWedding() {

  if (!requireLogin()) {
    return;
  }


  showView(
    "weddingView"
  );

}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
  message
) {

  let box =
    $("villageMessage");


  if (!box) {

    box =
      document.createElement(
        "div"
      );


    box.id =
      "villageMessage";


    Object.assign(
      box.style,
      {

        position:
          "fixed",

        left:
          "50%",

        bottom:
          "25px",

        transform:
          "translateX(-50%)",

        zIndex:
          "99999",

        maxWidth:
          "90%",

        padding:
          "14px 20px",

        borderRadius:
          "14px",

        background:
          "#214d2d",

        color:
          "#ffffff",

        fontSize:
          "14px",

        fontWeight:
          "600",

        boxShadow:
          "0 10px 30px rgba(0,0,0,0.18)",

        textAlign:
          "center",

        transition:
          "opacity 0.25s ease"

      }
    );


    document.body
      .appendChild(
        box
      );

  }


  box.textContent =
    message;


  box.style.opacity =
    "1";


  clearTimeout(
    box.hideTimer
  );


  box.hideTimer =
    setTimeout(
      () => {

        box.style.opacity =
          "0";

      },
      3000
    );

}


/* =========================================================
   MODAL BACKDROP
========================================================= */

document
  .querySelectorAll(
    ".modal"
  )
  .forEach(
    modal => {

      modal.addEventListener(
        "click",
        event => {

          if (
            event.target ===
            modal
          ) {

            modal.classList
              .remove(
                "is-open"
              );

          }

        }
      );

    }
  );


/* =========================================================
   DRAWER BACKDROP
========================================================= */

$("drawer")
  ?.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        $("drawer")
      ) {

        closeDrawer();

      }

    }
  );


/* =========================================================
   SEARCH EVENTS
========================================================= */

$("searchButton")
  ?.addEventListener(
    "click",
    searchVillage
  );


$("villageSearch")
  ?.addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Enter"
      ) {

        searchVillage();

      }

    }
  );


/* =========================================================
   EXPLORE BUTTON
========================================================= */

$("exploreVillage")
  ?.addEventListener(
    "click",
    () => {

      const target =
        $("villageFeedSection") ||
        $("villageFeed") ||
        $("homeVillagesList");


      target?.scrollIntoView({
        behavior:
          "smooth",
        block:
          "start"
      });

    }
  );


/* =========================================================
   EXPERIENCE CARDS
========================================================= */

document
  .querySelectorAll(
    ".experience-card"
  )
  .forEach(
    card => {

      card.addEventListener(
        "click",
        () => {

          const title =
            card.querySelector(
              "strong"
            )
              ?.textContent ||
            "Village Experience";


          showMessage(
            `${title} section VillageDeko mein build ho raha hai 🌾`
          );

        }
      );

    }
  );


/* =========================================================
   GLOBAL FUNCTIONS
========================================================= */

Object.assign(
  window,
  {

    openModal,

    closeModal,

    openLogin:
      showLoginGate,

    googleLogin,

    openDrawer,

    closeDrawer,

    goHome,

    selectState,

    filterExplore,

    searchVillage,

    openVillage,

    goBackFromVillage,

    toggleFollow,

    showVillageSection,

    openPostModal,

    handleImgBBPhotoPost,

    handleVillageListing,

    addActivityRow,

    addPackageRow,

    toggleLike,

    savePost,

    openComments,

    addComment,

    handleEdit,

    handleDelete,

    handleShare,

    openWedding,

    openChaupal,

    submitWedding,

    showMyListings,

    showMyHosts,

    showMyWeddings,

    openSettings,

    openPrivacy,

    saveSetting,

    logout,

    openImageViewer,

    closeImageViewer,

    handleProfilePhoto,

    handleImageError

  }
);


/* =========================================================
   INITIAL SETUP
========================================================= */

fillStates();

renderStates();

addActivityRow();

addPackageRow();


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(
  auth,
  async user => {

    currentUser =
      user;


    updateAuthUI();


    if (!user) {

      showLoginGate();

      return;

    }


    showApp();


    /*
       Load villages first
       because post cards need
       village information.
    */

    await loadVillages();


    /*
       Load profile.
    */

    await loadProfilePhoto();


    /*
       Load followers.
    */

    await Promise.all(
      villages.map(
        village =>
          refreshVillageFollowers(
            village.id
          )
          .catch(
            () => {}
          )
      )
    );


    /*
       Load all posts once.
    */

    await loadAllPosts();


    /*
       Render everything.
    */

    await loadHome();


    renderVillageFeed();

    renderChaupalFeed();

  }
);
