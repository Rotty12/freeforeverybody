const cards = document.querySelectorAll(".program-card");
const grantForm = document.querySelector("#grantForm");
const formResult = document.querySelector("#formResult");

cards.forEach((card) => {
  card.addEventListener("click", () => {
    cards.forEach((item) => item.classList.remove("active"));
    card.classList.add("active");
    document.querySelector("#apply").scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

if (cards.length) {
  const activeCard = document.querySelector(".program-card.active") || cards[0];
  activeCard.classList.add("active");
}

grantForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (window.location.protocol === "file:") {
    formResult.textContent = "Please open the site at http://localhost:3001 before submitting.";
    return;
  }

  formResult.textContent = "Submitting application...";

  const formData = {
    fullName: document.querySelector("#fullName").value.trim(),
    email: document.querySelector("#email").value.trim(),
    phone: document.querySelector("#phone").value.trim(),
    homeAddress: document.querySelector("#homeAddress").value.trim()
  };

  try {
    const response = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error || "Submission failed.");
    }

    window.location.href = "success.html";
  } catch (error) {
    console.error(error);
    formResult.textContent = error.message || "Submission failed. Please try again later.";
  }
});
