// Record the real screen builders' text and actions; canvas art is deliberately inert.
type Child = RecordedNode | string | number | null | undefined | false | Child[];
export class RecordedNode {
  children: (RecordedNode | string)[] = [];
  attrs: Record<string, string> = {};
  style: Record<string, string> = {};
  disabled = false;
  parentElement: RecordedNode | null = null;
  classList = { add() {}, remove() {}, toggle() {}, contains: () => false };
  onclick?: () => unknown;
  width = 64;
  height = 64;
  clientWidth = 300;
  clientHeight = 150;
  constructor(
    public tag: string,
    props?: Record<string, unknown> | null,
  ) {
    for (const [key, value] of Object.entries(props ?? {})) {
      if (key === 'onclick') this.onclick = value as () => unknown;
      else if (value != null && value !== false) this.attrs[key] = String(value);
    }
  }
  append(...items: Child[]) {
    for (const item of items) {
      if (item == null || item === false) continue;
      if (Array.isArray(item)) this.append(...item);
      else {
        if (item instanceof RecordedNode) item.parentElement = this;
        this.children.push(item instanceof RecordedNode ? item : String(item));
      }
    }
  }
  replaceChildren(...items: Child[]) {
    this.children = [];
    this.append(...items);
  }
  setAttribute(key: string, value: string) {
    this.attrs[key] = value;
  }
  getAttribute(key: string) {
    return this.attrs[key];
  }
  get textContent(): string {
    return this.children.map((child) => (typeof child === 'string' ? child : child.textContent)).join(' ');
  }
  set textContent(value: string) {
    this.children = [value];
  }
  get innerText() {
    return this.textContent;
  }
  set className(value: string) {
    this.attrs.class = value;
  }
  get className() {
    return this.attrs.class ?? '';
  }
  querySelectorAll(selector: string): RecordedNode[] {
    const matches = (node: RecordedNode) =>
      selector.startsWith('.') ? (node.attrs.class ?? '').split(' ').includes(selector.slice(1)) : node.tag === selector;
    return this.children.flatMap((child) =>
      typeof child === 'string' ? [] : [...(matches(child) ? [child] : []), ...child.querySelectorAll(selector)],
    );
  }
  querySelector(selector: string) {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  addEventListener(event: string, callback: () => unknown) {
    if (event === 'click') this.onclick = callback;
  }
  click() {
    if (!this.disabled) return this.onclick?.();
  }
  remove() {
    if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
  }
  replaceWith(node: RecordedNode) {
    if (this.parentElement) this.parentElement.children = this.parentElement.children.map((child) => (child === this ? node : child));
  }
  getBoundingClientRect() {
    const offset = ((parseFloat(this.style.marginTop) || 0) - (parseFloat(this.style.marginBottom) || 0)) / 2;
    return { top: offset, bottom: offset + 44, left: 0, right: 120, width: 120, height: 44 };
  }
  getContext() {
    return canvasContext;
  }
  toDataURL() {
    return 'data:image/png;base64,';
  }
  focus() {}
}
const gradient = { addColorStop() {} };
const canvasContext = new Proxy(
  {},
  {
    get: (_target, key) =>
      key === 'createLinearGradient' || key === 'createRadialGradient'
        ? () => gradient
        : key === 'measureText'
          ? () => ({ width: 10 })
          : () => {},
  },
);
export const recordedDom = {
  h: (tag: string, props?: Record<string, unknown> | null, ...children: Child[]) => {
    const node = new RecordedNode(tag, props);
    node.append(...children);
    return node;
  },
  btn: (label: Child, cls: string, click: () => unknown) => {
    const node = new RecordedNode('button', { class: `btn ${cls}`, onclick: click });
    node.append(label);
    return node;
  },
  fmt: (value: number) => Math.floor(value).toLocaleString('en'),
  toast: () => {},
  modal: (_content: Child[], _options?: unknown) => ({ close() {}, el: new RecordedNode('div') }),
};

/** Closed details expose their summary, never the hidden stage names inside. */
export function visibleText(node: RecordedNode): string {
  if (node.attrs.hidden !== undefined || node.attrs['aria-hidden'] === 'true') return '';
  const children =
    node.tag === 'details' && node.attrs.open === undefined
      ? node.children.filter((child) => child instanceof RecordedNode && child.tag === 'summary')
      : node.children;
  return children.map((child) => (typeof child === 'string' ? child : visibleText(child))).join(' ');
}
