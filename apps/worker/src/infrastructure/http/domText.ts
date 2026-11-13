/**
 * The part of a DOM node (linkedom's) that finding nodes in a captured page
 * and reading them as text needs; the worker has no DOM lib. A text node's
 * own fields are `nodeType` and `textContent`; the rest are an element's.
 */
export interface DomNode {
  nodeType: number;
  textContent: string | null;
  tagName?: string;
  childNodes: ArrayLike<DomNode>;
  getAttribute(name: string): string | null;
  querySelector(selectors: string): DomNode | null;
  querySelectorAll(selectors: string): ArrayLike<DomNode>;
}

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

/** How a node is read as text: a text node by its data, an element by its upper-case name. */
export interface TextRules {
  text(data: string): string;
  /** `children` reads the element's children under these same rules. */
  element(name: string, element: DomNode, children: () => string): string;
}

/** A node read as text under these rules; anything but an element or a text node (a comment) is nothing. */
export function textOf(node: DomNode, rules: TextRules): string {
  if (node.nodeType === TEXT_NODE) return rules.text(node.textContent ?? "");
  if (node.nodeType !== ELEMENT_NODE) return "";
  return rules.element(node.tagName?.toUpperCase() ?? "", node, () => childrenTextOf(node, rules));
}

/** A node's children read as text under these rules, one after another. */
export function childrenTextOf(node: DomNode, rules: TextRules): string {
  return Array.from(node.childNodes, (child) => textOf(child, rules)).join("");
}
