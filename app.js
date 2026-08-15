/* =========================================
   VILLAGEDEKO — MAIN APP
   MODERN UI + FIREBASE
   VILLAGE FEED SEPARATE
   STORY/SOCIAL FEED SEPARATE
========================================= */

import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  db,
  auth
} from "./firebase-config.js";


document.addEventListener("DOMContentLoaded", () => {

  /* =========================================
     MAIN ELEMENTS
  ========================================= */

  const searchInput =
    document.getElementById("villageSearch");

  const searchButton =
    document.getElementById("searchButton");

  const exploreButton =
    document.getElementById("exploreVillage");

  const villageFeed =
    document.getElementById("villageFeed");


  /* =========================================
     SEARCH VILLAGE
  ========================================= */

  searchButton?.addEventListener(
    "click",
    searchVillage
  );


  searchInput?.addEventListener(
    "keydown",
    (event) => {

      if (event.key === "Enter") {
        searchVillage();
      }

    }
  );


  function searchVillage() {

    const query =
      searchInput?.value
        .trim()
        .toLowerCase();


    if (!query) {

      showMessage(
        "Kisi village ka naam search karo 🌾"
      );

      searchInput?.focus();

      return;
    }


    const cards =
      document.querySelectorAll(
        ".village-post-card"
      );


    let found = false;


    cards.forEach(card => {

      const text =
        card.textContent.toLowerCase();


      if (text.includes(query)) {

        card.style.display = "";


        if (!found) {

          card.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });

        }


        found = true;

      } else {

        card.style.display = "none";

      }

    });


    if (!found) {

      showMessage(
        `"${searchInput.value}" abhi VillageDeko mein nahi mila.`
      );

    }

  }


  /* =========================================
     EXPLORE
  ========================================= */

  exploreButton?.addEventListener(
    "click",
    () => {

      const target =
        document.getElementById(
          "villageFeedSection"
        ) ||
        villageFeed;


      target?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    }
  );


  /* =========================================
     EXPERIENCE CARDS
  ========================================= */

  const experienceCards =
    document.querySelectorAll(
      ".experience-card"
    );


  experienceCards.forEach(card => {

    card.addEventListener(
      "click",
      () => {

        const title =
          card.querySelector(
            "strong"
          )?.textContent ||
          "Village Experience";


        showMessage(
          `${title} section VillageDeko mein build ho raha hai 🌾`
        );

      }
    );

  });


  /* =========================================
     AUTH
  ========================================= */

  onAuthStateChanged(
    auth,
    async (user) => {

      if (!user) {

        renderFeedMessage(
          "VillageDeko feed dekhne ke liye login karo."
        );

        return;
      }


      await loadVillageFeed(user);

    }
  );


  /* =========================================
     VILLAGE FEED
     
     ONLY VILLAGE POSTS
     
     Collection:
     posts
     
     Story/Social posts ko yahan
     mix nahi kiya jayega.
  ========================================= */

  async function loadVillageFeed(user) {

    if (!villageFeed) return;


    villageFeed.innerHTML = `
      <div class="feed-loading">
        <p>🌾 Gaon ki posts load ho rahi hain...</p>
      </div>
    `;


    try {

      const postsSnapshot =
        await getDocs(
          collection(
            db,
            "posts"
          )
        );


      if (postsSnapshot.empty) {

        renderFeedMessage(
          "Abhi VillageDeko par koi village post nahi hai 🌾"
        );

        return;
      }


      const posts = [];


      postsSnapshot.forEach(
        postDoc => {

          const data =
            postDoc.data();


          /*
            Sirf woh posts Village Feed
            mein aayengi jinke paas
            village information hai.
          */

          if (
            data.villageName ||
            data.villageId ||
            data.vDistrict ||
            data.district
          ) {

            posts.push({
              id: postDoc.id,
              ...data
            });

          }

        }
      );


      if (posts.length === 0) {

        renderFeedMessage(
          "Abhi koi village post available nahi hai 🌾"
        );

        return;
      }


      /* =========================================
         NEWEST FIRST
      ========================================= */

      posts.sort(
        (a, b) => {

          return (
            getTimestampValue(
              b.createdAt
            ) -
            getTimestampValue(
              a.createdAt
            )
          );

        }
      );


      villageFeed.innerHTML = "";


      /* =========================================
         CREATE EACH POST
      ========================================= */

      for (const post of posts) {

        const card =
          await createPostCard(
            post,
            user
          );


        villageFeed.appendChild(
          card
        );

      }

    } catch (error) {

      console.error(
        "VillageDeko feed error:",
        error
      );


      renderFeedMessage(
        "Posts load nahi ho pa rahi hain. Firebase connection check karo."
      );

    }

  }


  /* =========================================
     CREATE VILLAGE POST CARD
  ========================================= */

  async function createPostCard(
    post,
    user
  ) {

    const card =
      document.createElement(
        "article"
      );


    card.className =
      "village-post-card";


    card.dataset.postId =
      post.id;


    /* =========================================
       VILLAGE INFORMATION
    ========================================= */

    const villageName =
      post.villageName ||
      "Village";


    const district =
      post.vDistrict ||
      post.district ||
      "";


    const state =
      post.vState ||
      post.state ||
      "";


    const locationText =
      [
        villageName,
        district,
        state
      ]
      .filter(Boolean)
      .join(" · ");


    /* =========================================
       AUTHOR
    ========================================= */

    const author =
      post.author ||
      post.authorName ||
      "VillageDeko User";


    /* =========================================
       TEXT
    ========================================= */

    const text =
      post.text ||
      post.caption ||
      "";


    /* =========================================
       IMAGE
    ========================================= */

    const imageUrl =
      post.imageUrl ||
      "";


    let imageHTML = "";


    if (imageUrl) {

      imageHTML = `
        <div class="post-image-wrapper">

          <img
            class="post-image"
            src="${escapeHTML(imageUrl)}"
            alt="${escapeHTML(villageName)}"
            loading="lazy"
            onerror="
              this.style.display='none';
              this.parentElement.classList.add('image-error');
            "
          />

        </div>
      `;

    } else {

      imageHTML = `
        <div class="post-image-wrapper">

          <div class="post-image-placeholder">
            🌾
          </div>

        </div>
      `;

    }


    /* =========================================
       LIKE DATA
    ========================================= */

    let likeCount = 0;

    let likedByUser = false;


    try {

      const likesSnapshot =
        await getDocs(
          collection(
            db,
            "posts",
            post.id,
            "likes"
          )
        );


      likeCount =
        likesSnapshot.size;


      likedByUser =
        likesSnapshot.docs.some(
          likeDoc =>
            likeDoc.id === user.uid
        );

    } catch (error) {

      console.warn(
        "Like data load error:",
        error
      );

    }


    /* =========================================
       OWNER
    ========================================= */

    const isOwner =
      post.ownerUid === user.uid;


    const deleteButtonHTML =
      isOwner
        ? `
          <button
            class="post-delete-button"
            data-action="delete"
            type="button"
          >
            Delete
          </button>
        `
        : "";


    /* =========================================
       POST HTML
    ========================================= */

    card.innerHTML = `

      ${imageHTML}

      <div class="post-content">

        <div class="post-top-row">

          <div class="post-location">
            📍 ${escapeHTML(locationText)}
          </div>

          ${deleteButtonHTML}

        </div>


        <div class="post-author">
          ${escapeHTML(author)}
        </div>


        ${
          text
            ? `
              <p class="post-text">
                ${escapeHTML(text)}
              </p>
            `
            : ""
        }


        <div class="post-actions">

          <button
            class="post-like-button ${
              likedByUser
                ? "liked"
                : ""
            }"
            data-action="like"
            type="button"
          >

            ${
              likedByUser
                ? "❤️"
                : "🤍"
            }

            <span class="like-count">
              ${likeCount}
            </span>

            Like

          </button>


          <button
            class="post-comment-button"
            data-action="comments"
            type="button"
          >
            💬 Comment
          </button>

        </div>


        <div
          class="comments-area"
          hidden
        >

          <div class="comments-list">
            Loading comments...
          </div>


          <div class="comment-form">

            <input
              type="text"
              class="comment-input"
              placeholder="Comment likho..."
              maxlength="500"
            />


            <button
              class="comment-submit"
              data-action="add-comment"
              type="button"
            >
              Post
            </button>

          </div>

        </div>

      </div>

    `;


    /* =========================================
       LIKE EVENT
    ========================================= */

    card
      .querySelector(
        "[data-action='like']"
      )
      ?.addEventListener(
        "click",
        () => {

          toggleLike(
            post,
            user,
            card
          );

        }
      );


    /* =========================================
       COMMENT EVENT
    ========================================= */

    card
      .querySelector(
        "[data-action='comments']"
      )
      ?.addEventListener(
        "click",
        () => {

          toggleComments(
            post,
            card
          );

        }
      );


    /* =========================================
       ADD COMMENT
    ========================================= */

    card
      .querySelector(
        "[data-action='add-comment']"
      )
      ?.addEventListener(
        "click",
        () => {

          addComment(
            post,
            user,
            card
          );

        }
      );


    /* =========================================
       DELETE
    ========================================= */

    card
      .querySelector(
        "[data-action='delete']"
      )
      ?.addEventListener(
        "click",
        () => {

          deletePost(
            post,
            user,
            card
          );

        }
      );


    return card;

  }


  /* =========================================
     LIKE / UNLIKE
  ========================================= */

  async function toggleLike(
    post,
    user,
    card
  ) {

    const likeButton =
      card.querySelector(
        ".post-like-button"
      );


    const likeCountElement =
      card.querySelector(
        ".like-count"
      );


    if (!likeButton) return;


    likeButton.disabled = true;


    try {

      const likeRef =
        doc(
          db,
          "posts",
          post.id,
          "likes",
          user.uid
        );


      const existingLike =
        await getDoc(
          likeRef
        );


      const currentCount =
        Number(
          likeCountElement?.textContent || 0
        );


      if (
        existingLike.exists()
      ) {

        await deleteDoc(
          likeRef
        );


        likeButton.classList.remove(
          "liked"
        );


        likeButton.innerHTML = `
          🤍
          <span class="like-count">
            ${Math.max(
              0,
              currentCount - 1
            )}
          </span>
          Like
        `;

      } else {

        await setDoc(
          likeRef,
          {
            uid: user.uid,
            createdAt: new Date()
          }
        );


        likeButton.classList.add(
          "liked"
        );


        likeButton.innerHTML = `
          ❤️
          <span class="like-count">
            ${currentCount + 1}
          </span>
          Like
        `;

      }

    } catch (error) {

      console.error(
        "Like error:",
        error
      );


      showMessage(
        "Like nahi ho paya. Dobara try karo."
      );

    }


    likeButton.disabled = false;

  }


  /* =========================================
     COMMENTS OPEN / CLOSE
  ========================================= */

  async function toggleComments(
    post,
    card
  ) {

    const area =
      card.querySelector(
        ".comments-area"
      );


    if (!area) return;


    if (!area.hidden) {

      area.hidden = true;

      return;
    }


    area.hidden = false;


    await loadComments(
      post,
      card
    );

  }


  /* =========================================
     LOAD COMMENTS
  ========================================= */

  async function loadComments(
    post,
    card
  ) {

    const list =
      card.querySelector(
        ".comments-list"
      );


    if (!list) return;


    list.innerHTML =
      "<p>Comments load ho rahe hain...</p>";


    try {

      const commentsSnapshot =
        await getDocs(
          collection(
            db,
            "posts",
            post.id,
            "comments"
          )
        );


      if (
        commentsSnapshot.empty
      ) {

        list.innerHTML =
          "<p>Abhi koi comment nahi hai.</p>";

        return;
      }


      const comments = [];


      commentsSnapshot.forEach(
        commentDoc => {

          comments.push({
            id: commentDoc.id,
            ...commentDoc.data()
          });

        }
      );


      comments.sort(
        (a, b) => {

          return (
            getTimestampValue(
              a.createdAt
            ) -
            getTimestampValue(
              b.createdAt
            )
          );

        }
      );


      list.innerHTML = "";


      comments.forEach(
        comment => {

          const item =
            document.createElement(
              "div"
            );


          item.className =
            "comment-item";


          const commentAuthor =
            comment.author ||
            comment.authorName ||
            "User";


          item.innerHTML = `

            <strong>
              ${escapeHTML(
                commentAuthor
              )}
            </strong>

            <p>
              ${escapeHTML(
                comment.text || ""
              )}
            </p>

          `;


          list.appendChild(
            item
          );

        }
      );

    } catch (error) {

      console.error(
        "Comments error:",
        error
      );


      list.innerHTML =
        "<p>Comments load nahi ho paaye.</p>";

    }

  }


  /* =========================================
     ADD COMMENT
  ========================================= */

  async function addComment(
    post,
    user,
    card
  ) {

    const input =
      card.querySelector(
        ".comment-input"
      );


    const submitButton =
      card.querySelector(
        ".comment-submit"
      );


    const text =
      input?.value.trim();


    if (!text) {

      showMessage(
        "Pehle comment likho."
      );

      return;
    }


    submitButton.disabled = true;


    try {

      const commentRef =
        doc(
          collection(
            db,
            "posts",
            post.id,
            "comments"
          )
        );


      await setDoc(
        commentRef,
        {

          uid:
            user.uid,

          author:
            user.displayName ||
            user.email ||
            "VillageDeko User",

          text:
            text,

          createdAt:
            new Date()

        }
      );


      input.value = "";


      await loadComments(
        post,
        card
      );


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


    submitButton.disabled = false;

  }


  /* =========================================
     DELETE OWN POST
  ========================================= */

  async function deletePost(
    post,
    user,
    card
  ) {

    if (
      post.ownerUid !==
      user.uid
    ) {

      showMessage(
        "Aap sirf apni post delete kar sakte ho."
      );

      return;
    }


    const confirmed =
      window.confirm(
        "Kya aap ye post delete karna chahte ho?"
      );


    if (!confirmed) return;


    try {

      await deleteDoc(
        doc(
          db,
          "posts",
          post.id
        )
      );


      card.remove();


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


  /* =========================================
     TIMESTAMP HELPER
  ========================================= */

  function getTimestampValue(
    timestamp
  ) {

    if (!timestamp) return 0;


    if (
      typeof timestamp.toMillis ===
      "function"
    ) {

      return timestamp.toMillis();

    }


    if (
      timestamp.seconds !==
      undefined
    ) {

      return (
        timestamp.seconds * 1000
      );

    }


    if (
      timestamp instanceof Date
    ) {

      return timestamp.getTime();

    }


    return 0;

  }


  /* =========================================
     FEED MESSAGE
  ========================================= */

  function renderFeedMessage(
    message
  ) {

    if (!villageFeed) return;


    villageFeed.innerHTML = `
      <div class="feed-message">
        <p>
          ${escapeHTML(message)}
        </p>
      </div>
    `;

  }


  /* =========================================
     SAFE HTML
  ========================================= */

  function escapeHTML(
    value
  ) {

    return String(
      value ?? ""
    )
      .replaceAll(
        "&",
        "&amp;"
      )
      .replaceAll(
        "<",
        "&lt;"
      )
      .replaceAll(
        ">",
        "&gt;"
      )
      .replaceAll(
        '"',
        "&quot;"
      )
      .replaceAll(
        "'",
        "&#039;"
      );

  }


  /* =========================================
     MESSAGE SYSTEM
  ========================================= */

  function showMessage(
    message
  ) {

    let box =
      document.getElementById(
        "villageMessage"
      );


    if (!box) {

      box =
        document.createElement(
          "div"
        );


      box.id =
        "villageMessage";


      box.style.position =
        "fixed";

      box.style.left =
        "50%";

      box.style.bottom =
        "25px";

      box.style.transform =
        "translateX(-50%)";

      box.style.zIndex =
        "9999";

      box.style.maxWidth =
        "90%";

      box.style.padding =
        "14px 20px";

      box.style.borderRadius =
        "14px";

      box.style.background =
        "#214d2d";

      box.style.color =
        "#ffffff";

      box.style.fontSize =
        "14px";

      box.style.fontWeight =
        "600";

      box.style.boxShadow =
        "0 10px 30px rgba(0,0,0,0.18)";

      box.style.textAlign =
        "center";

      box.style.transition =
        "opacity 0.25s ease";


      document.body.appendChild(
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

});
