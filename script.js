(() => {
  const root = document.documentElement;
  const body = document.body;
  const article = document.querySelector(".article");
  const theme = document.querySelector("#theme");
  const size = document.querySelector("#text-size");
  const font = document.querySelector("#text-font");
  const readerSettings = document.querySelector(".reader-settings");
  const progress = document.querySelector(".reading-progress");
  const footnoteDialog = document.querySelector("#footnote-dialog");
  const footnoteDialogTitle = document.querySelector("#footnote-dialog-title");
  const footnoteDialogBody = document.querySelector(".footnote-dialog-body");
  const tocLinks = [...document.querySelectorAll(".toc a")];
  const sections = tocLinks
    .map((link) => document.getElementById(link.getAttribute("href").slice(1)))
    .filter(Boolean);

  const saved = JSON.parse(localStorage.getItem("aid-reader") || "{}");
  root.dataset.theme = saved.theme || "dark";
  theme.value = root.dataset.theme;
  size.value = saved.size || "19";
  font.value = saved.font || "serif";

  const applyReader = () => {
    root.style.setProperty("--article-size", `${size.value}px`);
    root.style.setProperty(
      "--article-font",
      font.value === "sans"
        ? 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
        : font.value === "mono"
          ? '"Cascadia Code", "SFMono-Regular", Consolas, monospace'
          : '"Iowan Old Style", "Palatino Linotype", Georgia, serif',
    );
    localStorage.setItem(
      "aid-reader",
      JSON.stringify({ theme: root.dataset.theme, size: size.value, font: font.value }),
    );
  };

  theme.addEventListener("change", () => {
    root.dataset.theme = theme.value;
    applyReader();
  });
  size.addEventListener("change", applyReader);
  font.addEventListener("change", applyReader);
  applyReader();

  document.addEventListener("click", (event) => {
    if (readerSettings.open && !readerSettings.contains(event.target)) {
      readerSettings.removeAttribute("open");
    }
  });

  const updateProgress = () => {
    const rect = article.getBoundingClientRect();
    const travelled = Math.max(0, -rect.top + window.innerHeight * 0.35);
    const total = Math.max(1, article.offsetHeight - window.innerHeight * 0.65);
    progress.style.transform = `scaleX(${Math.min(1, travelled / total)})`;
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      tocLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`);
      });
    },
    { rootMargin: "-18% 0px -68% 0px", threshold: [0, 1] },
  );
  sections.forEach((section) => observer.observe(section));

  const closeDrawer = () => body.removeAttribute("data-drawer");
  document.querySelectorAll("[data-open-drawer]").forEach((button) => {
    button.addEventListener("click", () => {
      body.dataset.drawer = button.dataset.openDrawer;
    });
  });
  document.querySelector(".drawer-scrim").addEventListener("click", closeDrawer);
  tocLinks.forEach((link) => link.addEventListener("click", closeDrawer));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
      readerSettings.removeAttribute("open");
    }
  });

  document.querySelectorAll(".footnote-ref").forEach((button) => {
    button.addEventListener("click", () => {
      const source = document.querySelector(`#fn-${button.dataset.footnote}`);
      if (!source) return;
      const content = source.cloneNode(true);
      content.querySelector(".footnote-backref")?.remove();
      footnoteDialogTitle.textContent = `Сноска ${button.dataset.footnote}`;
      footnoteDialogBody.innerHTML = content.innerHTML;
      footnoteDialog.showModal();
    });
  });
  document.querySelector("[data-close-footnote]").addEventListener("click", () => footnoteDialog.close());
  footnoteDialog.addEventListener("click", (event) => {
    if (event.target === footnoteDialog) footnoteDialog.close();
  });

  const readingCopy = article.cloneNode(true);
  readingCopy.querySelector(".footnotes")?.remove();
  const words = readingCopy.textContent.trim().split(/\s+/).length;
  document.querySelector("#reading-time").textContent = `${Math.max(1, Math.round(words / 190))} мин`;
})();
