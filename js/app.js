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
// =====================================
// NEW CHAT
// =====================================

const newChatButton =
  document.getElementById("newChatBtn");

const chatDialog =
  document.getElementById("chatDialog");

const cancelChatButton =
  document.getElementById("cancelChatBtn");

if (newChatButton && chatDialog) {

  newChatButton.addEventListener(
    "click",
    async () => {

      chatDialog.showModal();

      await loadUsers();

    }
  );
}

if (cancelChatButton && chatDialog) {

  cancelChatButton.addEventListener(
    "click",
    () => {
      chatDialog.close();
    }
  );
}


// =====================================
// LOAD USERS
// =====================================

async function loadUsers() {

  const userList =
    document.getElementById("userList");

  if (!userList) return;

  userList.innerHTML =
    "<p>Loading users...</p>";

  const { data, error } =
    await supabase
      .from("profiles")
      .select(
        "id, full_name, role, lrn"
      )
      .neq(
        "id",
        currentUser.id
      )
      .order(
        "full_name",
        { ascending: true }
      );

  if (error) {

    console.error(error);

    userList.innerHTML =
      "<p>Unable to load users.</p>";

    return;
  }

  if (!data || data.length === 0) {

    userList.innerHTML =
      "<p>No other users found.</p>";

    return;
  }

  userList.innerHTML = "";

  data.forEach((user) => {

    const button =
      document.createElement("button");

    button.type = "button";

    button.className =
      "user-select-button";

    button.innerHTML = `
      <strong>
        ${escapeHTML(user.full_name)}
      </strong>

      <span>
        ${
          user.role === "teacher"
            ? "Teacher"
            : "Student"
        }
      </span>
    `;

    button.addEventListener(
      "click",
      async () => {

        await createDirectChat(
          user.id
        );

        chatDialog.close();

      }
    );

    userList.appendChild(button);

  });
}


// =====================================
// CREATE DIRECT CHAT
// =====================================

async function createDirectChat(
  targetUserId
) {

  // Check if a chat already exists
  const { data: myMemberships } =
    await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq(
        "user_id",
        currentUser.id
      );

  if (myMemberships) {

    for (const membership of myMemberships) {

      const { data: targetMembership } =
        await supabase
          .from("conversation_members")
          .select("conversation_id")
          .eq(
            "conversation_id",
            membership.conversation_id
          )
          .eq(
            "user_id",
            targetUserId
          )
          .maybeSingle();

      if (targetMembership) {

        await loadConversations();

        await openConversation(
          membership.conversation_id
        );

        return;
      }
    }
  }

  // Create new conversation
  const { data: conversation, error } =
    await supabase
      .from("conversations")
      .insert({
        name: null,
        is_group: false,
        created_by: currentUser.id
      })
      .select()
      .single();

  if (error) {

    console.error(error);

    alert(error.message);

    return;
  }

  // Add both users
  const { error: memberError } =
    await supabase
      .from("conversation_members")
      .insert([
        {
          conversation_id:
            conversation.id,

          user_id:
            currentUser.id
        },

        {
          conversation_id:
            conversation.id,

          user_id:
            targetUserId
        }
      ]);

  if (memberError) {

    console.error(memberError);

    alert(memberError.message);

    return;
  }

  await loadConversations();

  await openConversation(
    conversation.id
  );
}
// ===============================
// GROUP CHAT
// ===============================

const directChatTab = document.getElementById("directChatTab");
const groupChatTab = document.getElementById("groupChatTab");

const directChatSection = document.getElementById("directChatSection");
const groupChatSection = document.getElementById("groupChatSection");

const createGroupBtn = document.getElementById("createGroupBtn");


// Show Direct Chat
if (directChatTab) {
  directChatTab.addEventListener("click", async () => {
    directChatSection.style.display = "block";
    groupChatSection.style.display = "none";

    directChatTab.className = "primary-button";
    groupChatTab.className = "secondary-button";

    await loadUsers();
  });
}


// Show Group Chat
if (groupChatTab) {
  groupChatTab.addEventListener("click", async () => {

    // Only teachers can create groups
    if (currentProfile.role !== "teacher") {
      alert("Only teachers can create group chats.");
      return;
    }

    directChatSection.style.display = "none";
    groupChatSection.style.display = "block";

    directChatTab.className = "secondary-button";
    groupChatTab.className = "primary-button";

    await loadGroupUsers();
  });
}


// Load users for group selection
async function loadGroupUsers() {

  const groupUserList = document.getElementById("groupUserList");

  if (!groupUserList) return;

  groupUserList.innerHTML = "<p>Loading users...</p>";

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, lrn")
    .neq("id", currentUser.id)
    .order("full_name", { ascending: true });

  if (error) {

    console.error(error);

    groupUserList.innerHTML =
      "<p>Unable to load users.</p>";

    return;
  }

  if (!data || data.length === 0) {

    groupUserList.innerHTML =
      "<p>No other users found.</p>";

    return;
  }

  groupUserList.innerHTML = "";

  data.forEach((user) => {

    const item = document.createElement("label");

    item.className = "group-user-item";

    item.innerHTML = `
      <input
        type="checkbox"
        value="${user.id}"
        class="group-user-checkbox"
      >

      <div class="group-user-info">
        <strong>${escapeHTML(user.full_name)}</strong>
        <span>
          ${user.role === "teacher" ? "Teacher" : "Student"}
        </span>
      </div>
    `;

    groupUserList.appendChild(item);

  });
}


// Create group
if (createGroupBtn) {

  createGroupBtn.addEventListener("click", async () => {

    if (currentProfile.role !== "teacher") {

      alert("Only teachers can create group chats.");

      return;
    }

    const groupName =
      document.getElementById("groupName").value.trim();

    if (!groupName) {

      alert("Please enter a group name.");

      return;
    }

    const selectedUsers =
      Array.from(
        document.querySelectorAll(".group-user-checkbox:checked")
      ).map((checkbox) => checkbox.value);

    if (selectedUsers.length === 0) {

      alert("Please select at least one member.");

      return;
    }

    createGroupBtn.disabled = true;
    createGroupBtn.textContent = "Creating...";

    try {

      // Create conversation
      const { data: conversation, error: conversationError } =
        await supabase
          .from("conversations")
          .insert({
            name: groupName,
            is_group: true,
            created_by: currentUser.id
          })
          .select()
          .single();

      if (conversationError) {
        throw conversationError;
      }


      // Add teacher + selected members
      const members = [
        {
          conversation_id: conversation.id,
          user_id: currentUser.id
        },

        ...selectedUsers.map((userId) => ({
          conversation_id: conversation.id,
          user_id: userId
        }))
      ];


      const { error: memberError } =
        await supabase
          .from("conversation_members")
          .insert(members);

      if (memberError) {
        throw memberError;
      }


      // Reset dialog
      document.getElementById("groupName").value = "";

      document
        .querySelectorAll(".group-user-checkbox")
        .forEach((checkbox) => {
          checkbox.checked = false;
        });


      chatDialog.close();

      await loadConversations();

      await openConversation(conversation.id);

    } catch (error) {

      console.error(error);

      alert(
        "Could not create the group: " +
        error.message
      );

    } finally {

      createGroupBtn.disabled = false;
      createGroupBtn.textContent = "Create Group";

    }

  });

}
// ===============================
// GROUP CHAT
// ===============================

const directChatTab = document.getElementById("directChatTab");
const groupChatTab = document.getElementById("groupChatTab");

const directChatSection = document.getElementById("directChatSection");
const groupChatSection = document.getElementById("groupChatSection");

const createGroupBtn = document.getElementById("createGroupBtn");

// Direct Chat tab
if (directChatTab) {
  directChatTab.addEventListener("click", async () => {
    directChatSection.style.display = "block";
    groupChatSection.style.display = "none";

    directChatTab.className = "primary-button";
    groupChatTab.className = "secondary-button";

    await loadUsers();
  });
}

// Group Chat tab
if (groupChatTab) {
  groupChatTab.addEventListener("click", async () => {

    // Only teachers can create groups
    if (currentProfile.role !== "teacher") {
      alert("Only teachers can create group chats.");
      return;
    }

    directChatSection.style.display = "none";
    groupChatSection.style.display = "block";

    directChatTab.className = "secondary-button";
    groupChatTab.className = "primary-button";

    await loadGroupUsers();
  });
}

// Load users for group selection
async function loadGroupUsers() {

  const groupUserList = document.getElementById("groupUserList");

  if (!groupUserList) return;

  groupUserList.innerHTML = "<p>Loading users...</p>";

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, lrn")
    .neq("id", currentUser.id)
    .order("full_name", { ascending: true });

  if (error) {

    console.error(error);

    groupUserList.innerHTML =
      "<p>Unable to load users.</p>";

    return;
  }

  if (!data || data.length === 0) {

    groupUserList.innerHTML =
      "<p>No other users found.</p>";

    return;
  }

  groupUserList.innerHTML = "";

  data.forEach((user) => {

    const item = document.createElement("label");

    item.className = "group-user-item";

    item.innerHTML = `
      <input
        type="checkbox"
        value="${user.id}"
        class="group-user-checkbox"
      >

      <div class="group-user-info">
        <strong>${escapeHTML(user.full_name)}</strong>
        <span>
          ${user.role === "teacher" ? "Teacher" : "Student"}
        </span>
      </div>
    `;

    groupUserList.appendChild(item);

  });
}

// Create Group
if (createGroupBtn) {

  createGroupBtn.addEventListener("click", async () => {

    if (currentProfile.role !== "teacher") {

      alert("Only teachers can create group chats.");

      return;
    }

    const groupName =
      document.getElementById("groupName").value.trim();

    if (!groupName) {

      alert("Please enter a group name.");

      return;
    }

    const selectedUsers =
      Array.from(
        document.querySelectorAll(".group-user-checkbox:checked")
      ).map((checkbox) => checkbox.value);

    if (selectedUsers.length === 0) {

      alert("Please select at least one member.");

      return;
    }

    createGroupBtn.disabled = true;
    createGroupBtn.textContent = "Creating...";

    try {

      // Create the conversation
      const { data: conversation, error: conversationError } =
        await supabase
          .from("conversations")
          .insert({
            name: groupName,
            is_group: true,
            created_by: currentUser.id
          })
          .select()
          .single();

      if (conversationError) {
        throw conversationError;
      }

      // Add teacher and selected members
      const members = [
        {
          conversation_id: conversation.id,
          user_id: currentUser.id
        },

        ...selectedUsers.map((userId) => ({
          conversation_id: conversation.id,
          user_id: userId
        }))
      ];

      const { error: memberError } =
        await supabase
          .from("conversation_members")
          .insert(members);

      if (memberError) {
        throw memberError;
      }

      // Reset form
      document.getElementById("groupName").value = "";

      document
        .querySelectorAll(".group-user-checkbox")
        .forEach((checkbox) => {
          checkbox.checked = false;
        });

      // Close dialog
      chatDialog.close();

      // Refresh conversations
      await loadConversations();

      // Open new group
      await openConversation(conversation.id);

    } catch (error) {

      console.error(error);

      alert(
        "Could not create the group: " +
        error.message
      );

    } finally {

      createGroupBtn.disabled = false;
      createGroupBtn.textContent = "Create Group";

    }

  });
