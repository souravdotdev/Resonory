import { injectable } from "inversify";
import type { PageHead } from "@/domain/entities/PageHead";
import type { IPageHeadParser } from "@/domain/providers/IPageHeadParser";
import { htmlHeadOf, parsePageHead } from "@/infrastructure/http/parsePageHead";

/**
 * `IPageHeadParser` over `parsePageHead`: turns an already-captured page's
 * full HTML into its head tags, the same way `SafeUrlFetcher` turns a live
 * fetch's capped body into one (`htmlHeadOf` is the one place "what counts
 * as the head" is decided, shared by both).
 */
@injectable()
export class HtmlPageParser implements IPageHeadParser {
  parseHead(html: string, pageUrl: string): PageHead {
    return parsePageHead(htmlHeadOf(html), pageUrl);
  }
}
