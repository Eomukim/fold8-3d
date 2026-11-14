import argparse, json, time, sys
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

LIVE = 'https://fold8-3d.onrender.com/'
OUT = '/workspace/downloads/fold8-3d'
CHROME_ARGS = [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--no-sandbox',
]


def settle(page, timeout=90):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            op = page.evaluate("getComputedStyle(document.querySelector('.loader')).opacity")
            if op == '0':
                page.evaluate("document.querySelector('.loader').style.display='none'")
                return True
        except Exception:
            pass
        page.wait_for_timeout(700)
    return False


def fold_val(page):
    return page.locator('.fold-value b').inner_text()


def wait_fold(page, target, timeout=90):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            txt = fold_val(page)
            if abs(int(''.join(c for c in txt if c.isdigit())) - target) <= 1:
                return txt
        except Exception:
            pass
        page.wait_for_timeout(600)
    return fold_val(page)


def shot(page, path, settle_extra=6):
    page.wait_for_timeout(settle_extra * 1000)
    t0 = time.time()
    page.screenshot(path=path, timeout=180000)
    page.wait_for_timeout(2500)
    page.screenshot(path=path, timeout=180000)
    im = np.asarray(Image.open(path).convert('RGB')).astype(float)
    print(f'  saved {path} {im.shape[1]}x{im.shape[0]} mean={im.mean():.1f} in {time.time()-t0:.0f}s')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--group', default='desktop')
    args = ap.parse_args()
    logs = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=CHROME_ARGS)
        if args.group == 'desktop':
            ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
            page = ctx.new_page()
            page.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error', 'warning') else None)
            page.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
            page.goto(LIVE, wait_until='domcontentloaded', timeout=90000)
            page.wait_for_timeout(6000)
            print('loader settled:', settle(page))
            page.wait_for_timeout(3000)
            info = page.evaluate("""() => {
              const c = document.querySelector('canvas');
              const gl = c && (c.getContext('webgl2') || c.getContext('webgl'));
              return {canvas: c ? [c.width, c.height] : null, renderer: gl ? gl.getParameter(gl.VERSION) : null};
            }""")
            print('canvas:', json.dumps(info))
            shot(page, f'{OUT}/open.png')

            page.get_by_role('button', name='플렉스').first.click()
            print('flex angle:', wait_fold(page, 115))
            shot(page, f'{OUT}/flex.png')

            page.get_by_role('button', name='접기').first.click()
            print('closed angle:', wait_fold(page, 0))
            shot(page, f'{OUT}/closed.png')
            ctx.close()
        elif args.group == 'mobile':
            m = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
            mp = m.new_page()
            mp.on('pageerror', lambda e: logs.append(f'[m:pageerror] {e}'))
            mp.on('console', lambda msg: logs.append(f'[m:{msg.type}] {msg.text}') if msg.type == 'error' else None)
            mp.goto(LIVE, wait_until='domcontentloaded', timeout=90000)
            mp.wait_for_timeout(6000)
            print('loader settled:', settle(mp))
            mp.wait_for_timeout(3000)
            dims = mp.evaluate("""() => ({
              docScrollW: document.documentElement.scrollWidth,
              docClientW: document.documentElement.clientWidth,
              bodyScrollW: document.body.scrollWidth,
              innerW: window.innerWidth,
              hud: document.querySelector('.hud').getBoundingClientRect().toJSON(),
              dock: document.querySelector('.dock').getBoundingClientRect().toJSON(),
            })""")
            print('mobile dims:', json.dumps(dims))
            shot(mp, f'{OUT}/mobile.png')
            mp.get_by_role('button', name='플렉스').first.click()
            print('mobile flex:', wait_fold(mp, 115))
            shot(mp, f'{OUT}/mobile_flex.png')
            m.close()
        browser.close()
    print('--- console ---')
    for line in logs[-25:]:
        print(line)


if __name__ == '__main__':
    main()
