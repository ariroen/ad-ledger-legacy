#!/usr/bin/env python3
import json
import sys
from urllib.parse import quote

from playwright.sync_api import sync_playwright


def username_from_url(u: str):
    try:
        from urllib.parse import urlparse

        if not u.startswith("http"):
            u = "https://" + u
        url = urlparse(u)
        if url.hostname and url.hostname.lower() != "t.me":
            return None
        parts = [p for p in (url.path or "").split("/") if p]
        if not parts:
            return None
        first = parts[0]
        if first.startswith("+") or first == "joinchat":
            return None
        if first == "s" and len(parts) > 1:
            return parts[1]
        return first
    except Exception:
        return None


def main() -> int:
    if len(sys.argv) != 4:
        print("usage: tg_screenshot_py.py <channelUrl> <code> <outPng>", file=sys.stderr)
        return 2

    channel_url, code, out_png = sys.argv[1:]
    username = username_from_url(channel_url)
    if not username:
        print(json.dumps({"ok": False, "status": "blocked", "reason": "non_public_or_invite_link", "channelUrl": channel_url}))
        return 0

    public_url = f"https://t.me/s/{username}"
    search_url = f"https://t.me/s/{username}?q={quote(code)}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        try:
            page.goto(search_url, wait_until="domcontentloaded", timeout=45_000)
            page.wait_for_timeout(1500)
            page.wait_for_selector(".tgme_widget_message_wrap", timeout=15_000)

            def find_match():
                return page.evaluate(
                    """(code) => {
                      const wraps = Array.from(document.querySelectorAll('.tgme_widget_message_wrap'));
                      let found = null;
                      for (const w of wraps) {
                        const html = w.innerHTML || '';
                        if (html.includes(`/go/${code}`) || html.includes(code)) { found = w; break; }
                      }
                      if (!found) return { found:false };
                      const link = found.querySelector('a.tgme_widget_message_date');
                      const postUrl = link ? link.href : null;
                      return { found:true, postUrl };
                    }""",
                    code,
                )

            match = find_match()
            for _ in range(30):
                if match.get("found"):
                    break
                page.mouse.wheel(0, 3000)
                page.wait_for_timeout(800)
                match = find_match()

            if not match.get("found"):
                page.goto(public_url, wait_until="domcontentloaded", timeout=45_000)
                page.wait_for_timeout(1200)
                page.wait_for_selector(".tgme_widget_message_wrap", timeout=15_000)
                match = find_match()
                for _ in range(40):
                    if match.get("found"):
                        break
                    page.mouse.wheel(0, 3500)
                    page.wait_for_timeout(800)
                    match = find_match()

            if not match.get("found"):
                page.screenshot(path=out_png, full_page=True)
                print(
                    json.dumps(
                        {
                            "ok": False,
                            "status": "missing",
                            "reason": "code_not_found_on_public_page",
                            "channelUrl": public_url,
                            "postUrl": None,
                            "screenshot": out_png,
                        },
                        ensure_ascii=False,
                    )
                )
                return 0

            used = None
            handle = page.query_selector(f'.tgme_widget_message_wrap a[href*="/go/{code}"]')
            if handle:
                wrap = handle.evaluate_handle("el => el.closest('.tgme_widget_message_wrap')")
                wrap.scroll_into_view_if_needed()
                page.wait_for_timeout(350)
                wrap.screenshot(path=out_png)
                used = "element_link_match"
            else:
                wrap = page.query_selector(f'.tgme_widget_message_wrap:has-text("{code}")')
                if wrap:
                    wrap.scroll_into_view_if_needed()
                    page.wait_for_timeout(350)
                    wrap.screenshot(path=out_png)
                    used = "element_has_text"
                else:
                    page.screenshot(path=out_png, full_page=True)
                    used = "fullpage_fallback"

            print(
                json.dumps(
                    {
                        "ok": True,
                        "status": "found",
                        "channelUrl": public_url,
                        "postUrl": match.get("postUrl"),
                        "screenshot": out_png,
                        "method": used,
                    },
                    ensure_ascii=False,
                )
            )
            return 0
        except Exception as e:
            try:
                page.screenshot(path=out_png, full_page=True)
            except Exception:
                pass
            print(
                json.dumps(
                    {
                        "ok": False,
                        "status": "blocked",
                        "reason": f"playwright_error:{e}",
                        "channelUrl": public_url,
                        "postUrl": None,
                        "screenshot": out_png,
                    },
                    ensure_ascii=False,
                )
            )
            return 0
        finally:
            browser.close()


if __name__ == "__main__":
    raise SystemExit(main())

