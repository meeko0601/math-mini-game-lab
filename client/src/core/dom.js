export function el(tagName, options = {}, children = []) {
  const element = document.createElement(tagName);

  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.html !== undefined) element.innerHTML = options.html;
  if (options.type) element.type = options.type;
  if (options.src) element.src = options.src;
  if (options.alt !== undefined) element.alt = options.alt;
  if (options.loading) element.loading = options.loading;
  if (options.decoding) element.decoding = options.decoding;
  if (options.draggable !== undefined) element.draggable = options.draggable;
  if (options.ariaLabel) element.setAttribute("aria-label", options.ariaLabel);
  if (options.dataset) Object.assign(element.dataset, options.dataset);
  if (options.style) {
    for (const [property, value] of Object.entries(options.style)) {
      if (property.startsWith("--")) element.style.setProperty(property, value);
      else element.style[property] = value;
    }
  }
  if (options.onClick) element.addEventListener("click", options.onClick);

  for (const child of Array.isArray(children) ? children : [children]) {
    if (child) element.append(child);
  }
  return element;
}

/** 設定に画像があればPNGを、なければ従来の絵文字・記号を表示します。 */
export function visual(image, fallbackText, className) {
  if (image?.src) {
    return el("img", {
      className,
      src: image.src,
      alt: image.alt ?? "",
      loading: "eager",
      decoding: "async",
      draggable: false,
    });
  }
  return el("span", { className, text: fallbackText });
}

export function clear(element) {
  element.replaceChildren();
}

export function applyTheme(root, theme) {
  for (const [name, value] of Object.entries(theme)) {
    root.style.setProperty(`--game-${name}`, value);
  }
}
