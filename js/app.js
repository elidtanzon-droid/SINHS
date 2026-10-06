document.addEventListener("DOMContentLoaded", async () => {

  const supabase = supabaseClient;

  // =====================================
  // CHECK LOGIN
  // =====================================

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    window.location.href = "index.html";
    return;
  }

  const currentUser = user;

  // =====================================
  // LOAD PROFILE
  // =====================================

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();

  if (profileError) {
    console.error(profileError);
  }

  if (profile) {

    const userName =
      document.getElementById("userName");

    const userRole =
      document.getElementById("userRole");

    if (userName) {
      userName.textContent =
        profile.full_name;
    }

    if (userRole) {
      userRole.textContent =
        profile.role === "teacher"
          ? "Teacher"
          : "Student";
    }

    // Only teachers see announcement button
    const announcementButton =
      document.getElementById(
        "newAnnouncementBtn"
      );

    if (announcementButton) {
      announcementButton.style.display =
        profile.role === "teacher"
          ? "block"
          : "none";
    }
  }

  // =====================================
  // PAGE NAVIGATION
  // =====================================

  const navigationButtons =
    document.querySelectorAll(
      "[data-section]"
    );

  navigationButtons.forEach((button) => {

    button.addEventListener("click", () => {

      const sectionId =
        button.getAttribute(
          "data-section"
        );

      // Hide all sections
      document
        .querySelectorAll(
          ".portal-section"
        )
        .forEach((section) => {
          section.style.display = "none";
        });

      // Show selected section
      const selectedSection =
        document.getElementById(
          sectionId
        );

      if (selectedSection) {
        selectedSection.style.display =
          "block";
      }

    });

  });

  // =====================================
  // LOGOUT
  // =====================================

  const logoutButton =
    document.getElementById("logoutBtn");

  if (logoutButton) {

    logoutButton.addEventListener(
      "click",
      async () => {

        await supabase.auth.signOut();

        window.location.href =
          "index.html";

      }
    );

  }

  // =====================================
  // LOAD ANNOUNCEMENTS
  // =====================================

  await loadAnnouncements();

  async function loadAnnouncements() {

    const container =
      document.getElementById(
        "announcementsList"
      );

    if (!container) return;

    const { data, error } =
      await supabase
        .from("announcements")
        .select(`
          *,
          profiles:created_by (
            full_name
          )
        `)
        .order(
          "created_at",
          { ascending: false }
        );

    if (error) {

      console.error(error);

      container.innerHTML =
        "<p>Unable to load announcements.</p>";

      return;
    }

    if (!data || data.length === 0) {

      container.innerHTML =
        "<p>No announcements yet.</p>";

      return;
    }

    container.innerHTML = "";

    data.forEach((announcement) => {

      const item =
        document.createElement("div");

      item.className =
        "announcement-item";

      item.innerHTML = `
        <h3>
          ${escapeHTML(
            announcement.title
          )}
        </h3>

        <p>
          ${escapeHTML(
            announcement.content
          )}
        </p>

        <small>
          Posted by
          ${escapeHTML(
            announcement.profiles?.full_name ||
            "Teacher"
          )}
        </small>
      `;

      container.appendChild(item);

    });
  }

  // =====================================
  // LOAD CONVERSATIONS
  // =====================================

  await loadConversations();

  async function loadConversations() {

    const container =
      document.getElementById(
        "conversationList"
      );

    if (!container) return;

    const { data, error } =
      await supabase
        .from("conversation_members")
        .select(`
          conversation_id,
          conversations (
            id,
            name,
            is_group
          )
        `)
        .eq(
          "user_id",
          currentUser.id
        );

    if (error) {

      console.error(error);

      container.innerHTML =
        "<p>Unable to load conversations.</p>";

      return;
    }

    if (!data || data.length === 0) {

      container.innerHTML =
        "<p>No conversations yet.</p>";

      return;
    }

    container.innerHTML = "";

    data.forEach((item) => {

      const conversation =
        item.conversations;

      const button =
        document.createElement("button");

      button.className =
        "conversation-button";

      button.textContent =
        conversation.name ||
        (
          conversation.is_group
            ? "Group Chat"
            : "Chat"
        );

      button.addEventListener(
        "click",
        () => {
          openConversation(
            conversation.id
          );
        }
      );

      container.appendChild(button);

    });
  }

  // =====================================
  // OPEN CONVERSATION
  // =====================================

  async function openConversation(
    conversationId
  ) {

    window.currentConversation =
      conversationId;

    await loadMessages(
      conversationId
    );
  }

  // =====================================
  // LOAD MESSAGES
  // =====================================

  async function loadMessages(
    conversationId
  ) {

    const container =
      document.getElementById(
        "messagesList"
      );

    if (!container) return;

    const { data, error } =
      await supabase
        .from("messages")
        .select(`
          id,
          content,
          image_url,
          sender_id,
          created_at,
          profiles:sender_id (
            full_name
          )
        `)
        .eq(
          "conversation_id",
          conversationId
        )
        .order(
          "created_at",
          { ascending: true }
        );

    if (error) {

      console.error(error);

      container.innerHTML =
        "<p>Unable to load messages.</p>";

      return;
    }

    container.innerHTML = "";

    if (!data || data.length === 0) {

      container.innerHTML =
        "<div class='empty-chat'>" +
        "<p>No messages yet.</p>" +
        "</div>";

      return;
    }

    data.forEach((message) => {

      const messageElement =
        document.createElement("div");

      messageElement.className =
        message.sender_id === currentUser.id
          ? "message own-message"
          : "message";

      let image = "";

      if (message.image_url) {

        image = `
          <img
            src="${message.image_url}"
            class="message-image"
            alt="Sent image"
          >
        `;

      }

      messageElement.innerHTML = `
        <strong>
          ${escapeHTML(
            message.profiles?.full_name ||
            "User"
          )}
        </strong>

        ${
          message.content
            ? `<p>${escapeHTML(
                message.content
              )}</p>`
            : ""
        }

        ${image}

        <small>
          ${new Date(
            message.created_at
          ).toLocaleString()}
        </small>
      `;

      container.appendChild(
        messageElement
      );

    });

    container.scrollTop =
      container.scrollHeight;
  }

  // =====================================
  // SEND MESSAGE
  // =====================================

  const messageForm =
    document.getElementById(
      "messageForm"
    );

  if (messageForm) {

    messageForm.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();

        const conversationId =
          window.currentConversation;

        if (!conversationId) {

          alert(
            "Select a conversation first."
          );

          return;
        }

        const input =
          document.getElementById(
            "messageInput"
          );

        const content =
          input.value.trim();

        if (!content) return;

        const { error } =
          await supabase
            .from("messages")
            .insert({
              conversation_id:
                conversationId,

              sender_id:
                currentUser.id,

              content:
                content
            });

        if (error) {

          alert(error.message);

          return;
        }

        input.value = "";

        await loadMessages(
          conversationId
        );

      }
    );
  }

  // =====================================
  // TEACHER ANNOUNCEMENT
  // =====================================

  const announcementButton =
    document.getElementById(
      "newAnnouncementBtn"
    );

  if (
    announcementButton &&
    profile &&
    profile.role === "teacher"
  ) {

    announcementButton.addEventListener(
      "click",
      async () => {

        const title =
          prompt(
            "Announcement title:"
          );

        if (!title) return;

        const content =
          prompt(
            "Announcement message:"
          );

        if (!content) return;

        const { error } =
          await supabase
            .from("announcements")
            .insert({
              title: title,
              content: content,
              created_by:
                currentUser.id
            });

        if (error) {

          alert(error.message);

          return;
        }

        await loadAnnouncements();

      }
    );
  }

  // =====================================
  // HTML SECURITY
  // =====================================

  function escapeHTML(value) {

    const element =
      document.createElement("div");

    element.textContent =
      value || "";

    return element.innerHTML;
  }

});
