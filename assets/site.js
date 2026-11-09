(() => {
  "use strict";

  const mainlandLink = document.getElementById("mainland-link");
  if (mainlandLink && new URL(mainlandLink.href).origin === location.origin) {
    mainlandLink.hidden = true;
  }

  const catalog = document.getElementById("catalog-data");
  if (catalog) {
    const items = JSON.parse(catalog.textContent);
    const cards = new Map(Array.from(document.querySelectorAll(".entry"), card => [card.dataset.id, card]));
    const tabs = Array.from(document.querySelectorAll("[data-kind]"));
    const search = document.getElementById("search");
    const game = document.getElementById("mc");
    const loader = document.getElementById("loader");
    const count = document.getElementById("result-count");
    const empty = document.getElementById("empty");
    let kind = "all";

    function readLocation() {
      const params = new URLSearchParams(location.search);
      const fromUrl = params.get("kind");
      kind = tabs.some(tab => tab.dataset.kind === fromUrl) ? fromUrl : "all";
      search.value = params.get("q") || "";
      for (const [select, key] of [[game, "mc"], [loader, "loader"]]) {
        const value = params.get(key) || "";
        select.value = Array.from(select.options).some(option => option.value === value) ? value : "";
      }
    }

    function writeLocation() {
      const url = new URL(location.href);
      for (const [key, value] of [["q", search.value.trim()], ["mc", game.value],
                                   ["loader", loader.value], ["kind", kind === "all" ? "" : kind]]) {
        if (value) url.searchParams.set(key, value);
        else url.searchParams.delete(key);
      }
      if (url.href !== location.href) {
        try { history.replaceState(null, "", url); } catch { /* Some local-file viewers disable URL edits. */ }
      }
    }

    function updateCard(item, card, builds) {
      const versions = [...new Set(builds.map(build => build.mc))];
      const loaders = [...new Set(builds.map(build => build.loader))].sort().join(" / ");
      card.querySelector(".platform").textContent = loaders + " · " +
        (versions.length === 1 ? versions[0] : versions.length + " 个游戏版本");
      const quick = card.querySelector(".quick");
      const single = builds.length === 1;
      const mark = document.createElement("i");
      mark.className = "ico " + (single ? "download-icon" : "next-icon");
      mark.setAttribute("aria-hidden", "true");
      quick.className = "button quick " + (single ? "direct" : "pick");
      if (single) {
        const file = builds[0];
        quick.href = file.url;
        quick.download = file.name;
        quick.setAttribute("aria-label", "下载" + item.name + " " + file.loader + " " + file.mc);
        quick.replaceChildren(mark, "下载");
      } else {
        quick.href = "mods/" + item.id + ".html";
        quick.removeAttribute("download");
        quick.setAttribute("aria-label", "为" + item.name + "选择版本");
        quick.replaceChildren("选择版本", mark);
      }
    }

    function render() {
      const terms = search.value.trim().toLowerCase().split(/\s+/u).filter(Boolean);
      let shown = 0;
      let total = 0;
      for (const tab of tabs) {
        if (tab.dataset.kind === kind) tab.setAttribute("aria-current", "true");
        else tab.removeAttribute("aria-current");
      }
      for (const item of items) {
        const card = cards.get(item.id);
        const common = [item.name, item.modId, item.category, item.summary].join(" ").toLowerCase();
        const builds = (kind === "all" || item.kind === kind) ? item.files.filter(file => {
          if (game.value && file.mc !== game.value || loader.value && file.loader !== loader.value) return false;
          const text = [common, file.mc, file.loader, file.version, file.name, file.note].join(" ").toLowerCase();
          return terms.every(term => text.includes(term));
        }) : [];
        card.hidden = builds.length === 0;
        if (!card.hidden) {
          shown++;
          total += builds.length;
          updateCard(item, card, builds);
        }
      }
      empty.hidden = shown !== 0;
      const dot = document.createElement("span");
      dot.className = "dot";
      count.replaceChildren(shown + " 项资源", dot, total + " 个文件");
      writeLocation();
    }

    tabs.forEach(tab => tab.addEventListener("click", event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      kind = tab.dataset.kind;
      render();
    }));
    search.addEventListener("input", render);
    game.addEventListener("change", render);
    loader.addEventListener("change", render);
    document.getElementById("reset").addEventListener("click", () => {
      kind = "all";
      search.value = game.value = loader.value = "";
      render();
      search.focus();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "/" && !event.altKey && !event.metaKey && !event.ctrlKey &&
          !event.target.closest("input,textarea,select,[contenteditable=true]")) {
        event.preventDefault();
        search.focus();
      }
    });
    window.addEventListener("popstate", () => { readLocation(); render(); });
    readLocation();
    render();
  }

  for (const button of document.querySelectorAll("[data-copy]")) {
    button.addEventListener("click", async () => {
      try {
        if (!navigator.clipboard) throw new Error("clipboard unavailable");
        await navigator.clipboard.writeText(button.dataset.copy);
        button.textContent = "已复制";
      } catch {
        const selection = getSelection();
        const range = document.createRange();
        range.selectNodeContents(button.parentElement.querySelector("code"));
        selection.removeAllRanges();
        selection.addRange(range);
        button.textContent = document.execCommand("copy") ? "已复制" : "请手动复制选中文本";
      }
    });
  }
})();
