// ==========================================
// SINHS PORTAL - MAIN APP
// ==========================================

const supabase = supabaseClient;

let currentUser = null;
let currentConversation = null;

// ==========================================
// START APP
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;

  await loadProfile();
  await loadAnnouncements();
  await loadConversations();

  setupNavigation();
  setupLogout();
  setupMessaging();
  setupAnnouncementButton();
});

// ==========================================
// LOAD PROFILE
// ==========================================

async function loadProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    console.error("Profile error:", error);
    return;
  }

  const nameElement = document.getElementById("userName");
  const roleElement = document.getElementById("userRole");

  if (nameElement) {
    nameElement.textContent = data.full_name;
  }

  if (roleElement) {
    roleElement.textContent =
      data.role === "teacher" ? "Teacher" : "Student";
  }

  // Only teachers can create announcements
  const announcementButton =
    document.getElementById("newAnnouncementBtn");

  if (announcementButton) {
    announcementButton.style.display =
      data.role === "teacher" ? "block" : "none";
  }
}

// ==========================================
// ANNOUNCEMENTS
// ==========================================

async function loadAnnouncements() {
  const container =
    document.getElementById("announcementsList");

  if (!container) return;

  const { data, error } = await supabase
    .from("announcements")
    .select(`
      *,
      profiles:created_by (
        full_name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Announcement error:", error);
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
    const item = document.createElement("div");

    item.className = "announcement-item";

    item.innerHTML = `
      <h3>${escapeHTML(announcement.title)}</h3>

      <p>
        ${escapeHTML(announcement.content)}
      </p>

      <small>
        Posted by ${escapeHTML(
          announcement.profiles?.full_name || "Teacher"
        )}
        • ${formatDate(announcement.created_at)}
      </small>
    `;

    container.appendChild(item);
  });
}

// ==========================================
// CONVERSATIONS
// ==========================================

async function loadConversations() {
  const list =
    document.getElementById("conversationList");

  if (!list) return;

  const { data, error } = await supabase
    .from("conversation_members")
    .select(`
      conversation_id,
      conversations (
        id,
        name,
        is_group,
        created_by
      )
    `)
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("Conversation error:", error);
    list.innerHTML =
      "<p>Unable to load conversations.</p>";
    return;
  }

  list.innerHTML = "";

  if (!data || data.length === 0) {
    list.innerHTML =
      "<p>No conversations yet.</p>";
    return;
  }

  data.forEach((item) => {
    const conversation = item.conversations;

    const button = document.createElement("button");

    button.className = "conversation-button";

    button.textContent =
      conversation.name ||
      (conversation.is_group
        ? "Group Chat"
        : "Conversation");

    button.addEventListener("click", () => {
      openConversation(conversation.id);
    });

    list.appendChild(button);
  });
}

// ==========================================
// OPEN CONVERSATION
// ==========================================

async function openConversation(conversationId) {
  currentConversation = conversationId;

  await loadMessages(conversationId);

  subscribeToMessages(conversationId);
}

// ==========================================
// LOAD MESSAGES
// ==========================================

async function loadMessages(conversationId) {
  const container =
    document.getElementById("messagesList");

  if (!container) return;

  const { data, error } = await supabase
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
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Message error:", error);
    container.innerHTML =
      "<p>Unable to load messages.</p>";
    return;
  }

  container.innerHTML = "";

  data.forEach((message) => {
    displayMessage(message);
  });

  container.scrollTop = container.scrollHeight;
}

// ==========================================
// DISPLAY MESSAGE
// ==========================================

function displayMessage(message) {
  const container =
    document.getElementById("messagesList");

  if (!container) return;

  const messageElement =
    document.createElement("div");

  messageElement.className =
    message.sender_id === currentUser.id
      ? "message own-message"
      : "message";

  let imageHTML = "";

  if (message.image_url) {
    imageHTML = `
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
        message.profiles?.full_name || "User"
      )}
    </strong>

    ${
      message.content
        ? `<p>${escapeHTML(message.content)}</p>`
        : ""
    }

    ${imageHTML}

    <small>
      ${formatDate(message.created_at)}
    </small>
  `;

  container.appendChild(messageElement);
}

// ==========================================
// SEND MESSAGE
// ==========================================

async function sendMessage() {
  if (!currentConversation) {
    alert("Please select a conversation first.");
    return;
  }

  const input =
    document.getElementById("messageInput");

  const fileInput =
    document.getElementById("messageImage");

  if (!input) return;

  const content = input.value.trim();

  let imageURL = null;

  // ========================================
  // UPLOAD IMAGE
  // ========================================

  if (fileInput && fileInput.files.length > 0) {
    const file = fileInput.files[0];

    const fileName =
      `${currentUser.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } =
      await supabase.storage
        .from("message-images")
        .upload(fileName, file);

    if (uploadError) {
      console.error(uploadError);
      alert("Image upload failed.");
      return;
    }

    const { data } =
      supabase.storage
        .from("message-images")
        .getPublicUrl(fileName);

    imageURL = data.publicUrl;
  }

  if (!content && !imageURL) {
    return;
  }

  const { error } = await supabase
    .from("messages")
    .insert({
      conversation_id: currentConversation,
      sender_id: currentUser.id,
      content: content || null,
      image_url: imageURL
    });

  if (error) {
    console.error("Send message error:", error);
    alert(error.message);
    return;
  }

  input.value = "";

  if (fileInput) {
    fileInput.value = "";
  }
}

// ==========================================
// REALTIME MESSAGES
// ==========================================

let messageChannel = null;

function subscribeToMessages(conversationId) {

  if (messageChannel) {
    supabase.removeChannel(messageChannel);
  }

  messageChannel = supabase
    .channel("messages-" + conversationId)

    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter:
          `conversation_id=eq.${conversationId}`
      },

      async (payload) => {

        const { data } = await supabase
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
          .eq("id", payload.new.id)
          .single();

        if (data) {
          displayMessage(data);

          const container =
            document.getElementById(
              "messagesList"
            );

          if (container) {
            container.scrollTop =
              container.scrollHeight;
          }
        }
      }
    )

    .subscribe();
}

// ==========================================
// CREATE DIRECT CHAT
// ==========================================

async function createDirectChat(targetUserId) {

  // Create conversation
  const { data: conversation, error } =
    await supabase
      .from("conversations")
      .insert({
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

  // Add current user
  await supabase
    .from("conversation_members")
    .insert({
      conversation_id: conversation.id,
      user_id: currentUser.id
    });

  // Add target user
  const { error: memberError } =
    await supabase
      .from("conversation_members")
      .insert({
        conversation_id: conversation.id,
        user_id: targetUserId
      });

  if (memberError) {
    console.error(memberError);
    alert(memberError.message);
    return;
  }

  await loadConversations();

  openConversation(conversation.id);
}

// ==========================================
// CREATE GROUP CHAT
// ==========================================

async function createGroupChat(
  groupName,
  userIds
) {

  const { data: conversation, error } =
    await supabase
      .from("conversations")
      .insert({
        name: groupName,
        is_group: true,
        created_by: currentUser.id
      })
      .select()
      .single();

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  const members = [
    currentUser.id,
    ...userIds
  ];

  const uniqueMembers =
    [...new Set(members)];

  const rows =
    uniqueMembers.map((userId) => ({
      conversation_id:
        conversation.id,
      user_id: userId
    }));

  const { error: memberError } =
    await supabase
      .from("conversation_members")
      .insert(rows);

  if (memberError) {
    console.error(memberError);
    alert(memberError.message);
    return;
  }

  await loadConversations();

  openConversation(conversation.id);
}

// ==========================================
// SETUP MESSAGE FORM
// ==========================================

function setupMessaging() {

  const form =
    document.getElementById("messageForm");

  if (!form) return;

  form.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      await sendMessage();
    }
  );
}

// ==========================================
// ANNOUNCEMENT CREATION
// ==========================================

function setupAnnouncementButton() {

  const button =
    document.getElementById(
      "newAnnouncementBtn"
    );

  if (!button) return;

  button.addEventListener(
    "click",
    async () => {

      const title =
        prompt("Announcement title:");

      if (!title) return;

      const content =
        prompt("Announcement message:");

      if (!content) return;

      const { error } =
        await supabase
          .from("announcements")
          .insert({
            title,
            content,
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

// ==========================================
// NAVIGATION
// ==========================================

function setupNavigation() {
  const buttons = document.querySelectorAll("[data-section]");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const sectionId = button.getAttribute("data-section");

      document.querySelectorAll(".portal-section").forEach((section) => {
        section.style.display = "none";
      });

      const selectedSection = document.getElementById(sectionId);

      if (selectedSection) {
        selectedSection.style.display = "block";
      }
    });
  });
}

// ==========================================
// LOGOUT
// ==========================================

function setupLogout() {

  const button =
    document.getElementById("logoutBtn");

  if (!button) return;

  button.addEventListener(
    "click",
    async () => {

      await supabase.auth.signOut();

      window.location.href =
        "index.html";
    }
  );
}

// ==========================================
// HELPERS
// ==========================================

function escapeHTML(value) {

  const div =
    document.createElement("div");

  div.textContent =
    value || "";

  return div.innerHTML;
}

function formatDate(date) {

  return new Date(date)
    .toLocaleString();
}
