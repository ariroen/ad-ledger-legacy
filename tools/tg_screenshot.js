const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function usernameFromUrl(u){
  try{
    const url = new URL(u.startsWith('http') ? u : `https://${u}`);
    if (!/t\.me$/i.test(url.hostname)) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return null;
    const first = parts[0];
    if (first.startsWith('+') || first === 'joinchat') return null;
    if (first === 's' && parts[1]) return parts[1];
    return first;
  } catch { return null; }
}

async function main(){
  const [channelUrl, code, outPng] = process.argv.slice(2);
  if (!channelUrl || !code || !outPng) {
    console.error('usage: node tg_screenshot.js <channelUrl> <code> <outPng>');
    process.exit(2);
  }
  const username = usernameFromUrl(channelUrl);
  if (!username) {
    console.log(JSON.stringify({ ok:false, status:'blocked', reason:'non_public_or_invite_link', channelUrl }));
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const publicUrl = `https://t.me/s/${username}`;
  const searchUrl = `https://t.me/s/${username}?q=${encodeURIComponent(code)}`;
  try {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(1500);

    // Ensure some messages are loaded
    await page.waitForSelector('.tgme_widget_message_wrap', { timeout: 15000 });

    const findMatch = async () => {
      return page.evaluate((code) => {
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
      }, code);
    };

    let match = await findMatch();
    for (let i=0; i<30 && !match.found; i++){
      await page.mouse.wheel(0, 3000);
      await page.waitForTimeout(800);
      match = await findMatch();
    }

    if (!match.found) {
      await page.goto(publicUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(1200);
      await page.waitForSelector('.tgme_widget_message_wrap', { timeout: 15000 });
      match = await findMatch();
      for (let i=0; i<40 && !match.found; i++){
        await page.mouse.wheel(0, 3500);
        await page.waitForTimeout(800);
        match = await findMatch();
      }
    }

    if (!match.found) {
      await page.screenshot({ path: outPng, fullPage: true });
      console.log(JSON.stringify({ ok:false, status:'missing', reason:'code_not_found_on_public_page', channelUrl: publicUrl, postUrl: null, screenshot: outPng }));
      return;
    }

    let used = null;
    const handle2 = await page.$(`.tgme_widget_message_wrap a[href*="/go/${code}"]`);
    if (handle2) {
      const wrap = await handle2.evaluateHandle(el => el.closest('.tgme_widget_message_wrap'));
      await wrap.scrollIntoViewIfNeeded();
      await page.waitForTimeout(350);
      await wrap.screenshot({ path: outPng });
      used = 'element_link_match';
    } else {
      const wrap = await page.$(`.tgme_widget_message_wrap:has-text("${code}")`);
      if (wrap) {
        await wrap.scrollIntoViewIfNeeded();
        await page.waitForTimeout(350);
        await wrap.screenshot({ path: outPng });
        used = 'element_has_text';
      } else {
        await page.screenshot({ path: outPng, fullPage: true });
        used = 'fullpage_fallback';
      }
    }

    console.log(JSON.stringify({ ok:true, status:'found', channelUrl: publicUrl, postUrl: match.postUrl, screenshot: outPng, method: used }));
  } catch (e) {
    await page.screenshot({ path: outPng, fullPage: true }).catch(()=>{});
    console.log(JSON.stringify({ ok:false, status:'blocked', reason:`playwright_error:${e.message}`, channelUrl: publicUrl, postUrl: null, screenshot: outPng }));
  } finally {
    await browser.close();
  }
}

main().catch((e)=>{ console.error(e); process.exit(1); });
