function ContactForm() {
  if ($("#contact-formular").length === 0) {
    return;
  }

  const $form = $("#contactform");
  const $submit = $("#submit");
  const $message = $("#message");
  const $name = $("#name");
  const $email = $("#email");
  const $comments = $("#comments");
  const capSlot = document.getElementById("cap-slot");

  const showError = (message) => {
    $message.html(`<div class="error_message">${message}</div>`);
  };

  const clearMessage = () => {
    $message.empty();
  };

  const setSubmittingState = (isSubmitting) => {
    $submit.prop("disabled", isSubmitting);
    $submit.val(isSubmitting ? "Validation..." : "Envoyer");
  };

  const isValidEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value.trim());

  const patchCapWidgetConnectedCallback = () => {
    const CapWidget = window.customElements?.get("cap-widget");
    if (!CapWidget || CapWidget.__folioConnectedPatched !== true) {
      if (!CapWidget) {
        return;
      }

      const prototype = CapWidget.prototype;
      const originalConnectedCallback = prototype.connectedCallback;
      if (typeof originalConnectedCallback !== "function") {
        return;
      }

      prototype.connectedCallback = function connectedCallbackGuard(...args) {
        if (this.shadowRoot) {
          const fieldName =
            this.getAttribute("data-cap-hidden-field-name") || "cap-token";
          if (!this.querySelector(`input[name="${fieldName}"]`)) {
            this.insertAdjacentHTML(
              "beforeend",
              `<input type="hidden" name="${fieldName}" value="">`,
            );
          }
          return;
        }

        return originalConnectedCallback.apply(this, args);
      };

      CapWidget.__folioConnectedPatched = true;
    }
  };

  patchCapWidgetConnectedCallback();

  const ensureCapWidget = () => {
    if (!capSlot) {
      return null;
    }

    let capElement = capSlot.querySelector("#cap");
    if (capElement) {
      return capElement;
    }

    const apiEndpoint = capSlot.getAttribute("data-cap-api-endpoint");
    if (!apiEndpoint) {
      return null;
    }

    capElement = document.createElement("cap-widget");
    capElement.id = "cap";
    capElement.style.position = "relative";
    capElement.style.zIndex = "100";
    capElement.setAttribute("data-cap-api-endpoint", apiEndpoint);
    capElement.setAttribute(
      "data-cap-hidden-field-name",
      capSlot.getAttribute("data-cap-hidden-field-name") || "cap-token",
    );
    capSlot.replaceChildren(capElement);

    return capElement;
  };

  const capElement = ensureCapWidget();
  if (!capElement) {
    showError("Le widget captcha est indisponible pour le moment.");
  }

  const readCaptchaToken = () => {
    const activeCapElement = ensureCapWidget();
    if (!activeCapElement) {
      return "";
    }

    const tokenInput = activeCapElement.querySelector("input[name='cap-token']");
    const token = tokenInput?.value ?? "";
    return String(token).trim();
  };

  $form.off("submit.contact").on("submit.contact", async function (event) {
    event.preventDefault();
    clearMessage();

    const name = String($name.val() ?? "").trim();
    const email = String($email.val() ?? "").trim();
    const comments = String($comments.val() ?? "").trim();

    if (!name) {
      showError("Le prénom est requis.");
      return false;
    }

    if (!email || !isValidEmail(email)) {
      showError("Renseigne une adresse email valide.");
      return false;
    }

    if (!comments) {
      showError("Le message est requis.");
      return false;
    }

    const captchaToken = readCaptchaToken();
    if (!captchaToken) {
      showError("Valide le captcha avant d'envoyer le message.");
      return false;
    }

    setSubmittingState(true);

    try {
      const verificationResponse = await fetch("/api/captcha/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      });

      const payload = await verificationResponse.json().catch(() => ({}));
      if (!verificationResponse.ok || payload.success !== true) {
        showError(
          payload.message ||
            "La vérification captcha a échoué. Réessaie une nouvelle fois.",
        );
        return false;
      }

      const subject = `Nouvelle demande de contact de ${name}`;
      const body = `Nom: ${name}\nEmail: ${email}\n\nMessage:\n${comments}`;
      const mailto = `mailto:a_pinot@icloud.com?subject=${encodeURIComponent(
        subject,
      )}&body=${encodeURIComponent(body)}`;

      window.location.href = mailto;
      return false;
    } catch (_error) {
      showError(
        "Impossible de joindre le service captcha pour l'instant. Réessaie dans quelques instants.",
      );
      return false;
    } finally {
      setSubmittingState(false);
    }
  });
}
