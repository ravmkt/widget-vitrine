console.log("Widget Vitrine carregado com sucesso!");

(function () {
  const box = document.createElement("div");

  box.innerHTML = "Widget funcionando!";
  box.style.position = "fixed";
  box.style.bottom = "20px";
  box.style.right = "20px";
  box.style.background = "#111827";
  box.style.color = "#ffffff";
  box.style.padding = "14px 18px";
  box.style.borderRadius = "10px";
  box.style.fontFamily = "Arial, sans-serif";
  box.style.fontSize = "14px";
  box.style.zIndex = "999999";
  box.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";

  document.body.appendChild(box);
})();

