let currentUser = null;
let currentProfile = null;
let currentConversation = null;


const $ = (id) =>
  document.getElementById(id);


// -------------------------
// NAVIGATION
// -------------------------

document
  .querySelectorAll(".sidebar nav button")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        showSection(
          button.dataset.section
        );

      }
    );

  });


// -------------------------
// LOGOUT
// -------------------------

document
  .getElementById("logoutBtn")
  .addEventListener(
    "click",
    async () => {

      await supabaseClient.auth.signOut();

      window.location.href =
        "index.html";

    }
  );


// -------------------------
// PAGE INITIALIZATION
// -------------------------

async function init() {

  const {
    data: { session }
  } =
    await supabaseClient.auth.getSession();


  if (!session) {

    window.location.href =
      "index.html";

    return;
  }


  currentUser =
    session.user;


  const {
    data: profile
  } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();


  currentProfile =
    profile;


  $("userName").textContent =
    profile?.full_name ||
    currentUser.email;


  if (
    profile?.role === "teacher"
  ) {

    $("newAnnouncementBtn")
      .hidden = false;

  }


  await loadAnnouncements();

}


// -------------------------
// SECTION SWITCHING
// -------------------------

function showSection(id) {

  document
    .querySelectorAll(".section")
    .forEach(section => {

      section.classList.remove(
        "active"
      );

    });


  $(id).classList.add("active");


  $("pageTitle").textContent =
    id.charAt(0).toUpperCase() +
    id.slice(1);

}


// -------------------------
// ANNOUNCEMENTS
// -------------------------

async function loadAnnouncements() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("announcements")
      .select(
        "id,title,body,created_at"
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(error);

    return;
  }


  $("announcementList")
    .innerHTML = "";


  (data || []).forEach(
    announcement => {

      const article =
        document.createElement(
          "article"
        );


      article.className =
        "announcement";


      const title =
        document.createElement(
          "h3"
        );

      title.textContent =
        announcement.title;


      const body =
        document.createElement(
          "p"
        );

      body.textContent =
        announcement.body;


      const date =
        document.createElement(
          "small"
        );

      date.textContent =
        new Date(
          announcement.created_at
        ).toLocaleString();


      article.appendChild(title);

      article.appendChild(body);

      article.appendChild(date);


      $("announcementList")
        .appendChild(article);

    }
  );

}


// -------------------------
// START
// -------------------------

init();
