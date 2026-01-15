// ID Card Image Download — SAFE ADDON (no existing code touched)
(function () {
  const IDCardDownload = {
    init() {
      const card =
        document.querySelector("#student-id-card") ||
        document.querySelector(".student-id-card");

      if (!card) return;

      // Prevent duplicate button
      if (card.querySelector(".id-download-btn")) return;

      const btn = document.createElement("button");
      btn.innerText = "Download ID Card";
      btn.className = "id-download-btn";

      // Basic safe styling (independent)
      btn.style.display = "block";
      btn.style.margin = "12px auto 0";
      btn.style.padding = "8px 14px";
      btn.style.borderRadius = "6px";
      btn.style.border = "none";
      btn.style.cursor = "pointer";
      btn.style.background = "#2563eb";
      btn.style.color = "#fff";
      btn.style.fontSize = "14px";

      btn.addEventListener("click", () => {
        this.downloadAsImage(card);
      });

      card.appendChild(btn);
    },

    downloadAsImage(card) {
      // Load html2canvas dynamically (no global conflict)
      if (typeof html2canvas === "undefined") {
        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
        script.onload = () => this.capture(card);
        document.body.appendChild(script);
      } else {
        this.capture(card);
      }
    },

    capture(card) {
      html2canvas(card).then((canvas) => {
        const link = document.createElement("a");
        link.download = "student-id-card.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
      });
    }
  };

  window.IDCardDownload = IDCardDownload;

  document.addEventListener("DOMContentLoaded", () => {
    IDCardDownload.init();
  });
})();
