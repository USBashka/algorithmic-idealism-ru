(() => {
  const root = document.documentElement;
  const body = document.body;
  const article = document.querySelector(".article");
  const theme = document.querySelector("#theme");
  const size = document.querySelector("#text-size");
  const font = document.querySelector("#text-font");
  const alignment = document.querySelector("#line-align");
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
  size.value = saved.version === 3 ? (saved.size || "17") : "17";
  font.value = saved.font || "serif";
  alignment.value = saved.align || "justify";

  const applyReader = () => {
    root.style.setProperty("--article-size", `${size.value}px`);
    root.dataset.align = alignment.value;
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
      JSON.stringify({
        version: 3,
        theme: root.dataset.theme,
        size: size.value,
        font: font.value,
        align: alignment.value,
      }),
    );
  };

  theme.addEventListener("change", () => {
    root.dataset.theme = theme.value;
    applyReader();
  });
  size.addEventListener("change", applyReader);
  font.addEventListener("change", applyReader);
  alignment.addEventListener("change", applyReader);
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

  const rightScroller = document.querySelector(".rail-right .rail-inner");
  const rightScrollbar = document.querySelector(".overlay-scrollbar");
  const rightThumb = rightScrollbar?.querySelector("span");
  const updateRightScrollbar = () => {
    if (!rightScroller || !rightScrollbar || !rightThumb) return;
    const trackHeight = rightScrollbar.clientHeight;
    const maxScroll = rightScroller.scrollHeight - rightScroller.clientHeight;
    const thumbHeight = Math.max(28, trackHeight * (rightScroller.clientHeight / rightScroller.scrollHeight));
    const travel = Math.max(0, trackHeight - thumbHeight);
    const offset = maxScroll > 0 ? (rightScroller.scrollTop / maxScroll) * travel : 0;
    rightScrollbar.hidden = maxScroll <= 1;
    rightThumb.style.height = `${thumbHeight}px`;
    rightThumb.style.transform = `translateY(${offset}px)`;
  };
  rightScroller?.addEventListener("scroll", updateRightScrollbar, { passive: true });
  rightScroller?.querySelectorAll("details").forEach((details) => {
    details.addEventListener("toggle", () => requestAnimationFrame(updateRightScrollbar));
  });
  window.addEventListener("resize", updateRightScrollbar, { passive: true });
  if ("ResizeObserver" in window && rightScroller) {
    new ResizeObserver(updateRightScrollbar).observe(rightScroller);
  }
  requestAnimationFrame(updateRightScrollbar);

  const closeDrawer = () => body.removeAttribute("data-drawer");
  document.querySelectorAll("[data-open-drawer]").forEach((button) => {
    button.addEventListener("click", () => {
      body.dataset.drawer = button.dataset.openDrawer;
      requestAnimationFrame(updateRightScrollbar);
    });
  });
  document.querySelector(".drawer-scrim").addEventListener("click", closeDrawer);
  tocLinks.forEach((link) => link.addEventListener("click", closeDrawer));
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || !link.hash) return;

    const id = decodeURIComponent(link.hash.slice(1));
    const target = document.getElementById(id);
    if (!target) return;

    event.preventDefault();
    const method = window.location.hash === link.hash ? "replaceState" : "pushState";
    window.history[method](null, "", link.hash);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
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
