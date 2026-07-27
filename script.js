(() => {
  const root = document.documentElement;
  const body = document.body;
  const article = document.querySelector(".article");
  const theme = document.querySelector("#theme");
  const size = document.querySelector("#text-size");
  const font = document.querySelector("#text-font");
  const progress = document.querySelector(".reading-progress");
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
    if (event.key === "Escape") closeDrawer();
  });

  const words = article.textContent.trim().split(/\s+/).length;
  document.querySelector("#reading-time").textContent = `${Math.max(1, Math.round(words / 190))} мин`;
})();
