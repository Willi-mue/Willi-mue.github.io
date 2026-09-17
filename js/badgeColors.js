window.BadgeUtils = (() => {
  const languageIconKeys = {
    Python: "code",
    JavaScript: "brackets-curly",
    TypeScript: "brackets-curly",
    Java: "coffee",
    "C++": "code-block",
    "C#": "code-block",
    Go: "code",
    Rust: "gear",
    HTML: "file-html",
    CSS: "file-css",
    SCSS: "file-css",
    Shell: "terminal-window",
    Bash: "terminal-window",
    PHP: "code",
    Ruby: "code",
    Swift: "code",
    Kotlin: "code",
    Docker: "cube",
    Linux: "linux-logo",
    OpenVPN: "lock-key",
    RAID: "hard-drives",
    Performance: "gauge",
    GDScript: "game-controller",
    Makefile: "wrench",
    Batchfile: "terminal-window",
    "Event Management": "calendar",
    Automation: "robot",
    Vue: "file-vue",
    SQLite: "database",
    Nginx: "globe",
    Git: "git-branch",
    MySQL: "database",
    Firewall: "shield-check",
  };

  const languageColors = {
    Python: "#3572A5",
    JavaScript: "#bea909",
    TypeScript: "#3178c6",
    Java: "#ec8611",
    "C++": "#f34b7d",
    "C#": "#178600",
    Go: "#00ADD8",
    Rust: "#e7864e",
    HTML: "#e34c26",
    CSS: "#563d7c",
    SCSS: "#c69",
    Shell: "#5fc022",
    Bash: "#5fc022",
    PHP: "#4F5D95",
    Ruby: "#701516",
    Swift: "#ffac45",
    Kotlin: "#F18E33",
    Docker: "#2496ED",
    Linux: "#FCC624",
    OpenVPN: "#0066CC",
    RAID: "#FF8800",
    Performance: "#00CC66",
    GDScript: "#478CBF",
    Makefile: "#346e04",
    Batchfile: "#45a306",
    "Event Management": "#FFAA33",
    Automation: "#66CCFF",
    Vue: "#42b883",
    SQLite: "#003B57",
    Nginx: "#009639",
    Git: "#F1502F",
    MySQL: "#00758F",
    Firewall: "#e0521a",
  };

  function iconKeyFor(label) {
    return languageIconKeys[label] || "code";
  }

  function colorFor(label) {
    return languageColors[label] || "#7a8699";
  }

  function applyBadgeStyles(root = document) {
    const badges = root.querySelectorAll(".badge");
    badges.forEach((badge) => {
      if (badge.dataset.styled === "true") return;

      const label = badge.textContent.trim();
      const color = colorFor(label);

      badge.innerHTML = `
      <span class="icon">${window.Icons.svg(iconKeyFor(label))}</span>
      <span class="label">${label}</span>
    `;
      badge.style.setProperty("--tag-color", color);
      badge.dataset.styled = "true";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => applyBadgeStyles());
  } else {
    applyBadgeStyles();
  }

  return {
    applyBadgeStyles,
    getLanguageIconKey: iconKeyFor,
    colorFor,
  };
})();
