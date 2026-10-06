const loginForm =
  document.getElementById("loginForm");

const loginStatus =
  document.getElementById("loginStatus");


function identifierToEmail(identifier) {

  const value =
    identifier.trim().toLowerCase();

  // Teachers use their school email.
  if (value.includes("@")) {
    return value;
  }

  // Students using LRN.
  return `${value}@students.sinhs.local`;
}


loginForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    loginStatus.textContent =
      "Logging in...";


    const identifier =
      document.getElementById(
        "identifier"
      ).value;


    const password =
      document.getElementById(
        "password"
      ).value;


    const { error } =
      await supabaseClient.auth.signInWithPassword({

        email:
          identifierToEmail(identifier),

        password:
          password

      });


    if (error) {

      loginStatus.textContent =
        error.message;

      return;
    }


    window.location.href =
      "dashboard.html";

  }
);
