import argparse, functools, http.server, json, os, socketserver, threading, time

from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
OUT = '/workspace/downloads/fold8-3d'

CHROME_ARGS = [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--no-sandbox',
]


def serve(port):
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DIST)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(('127.0.0.1', port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def fold_value(page):
    txt = page.locator('.fold-value b').inner_text()
    return int(''.join(ch for ch in txt if ch.isdigit()) or 0)


def settle(page, timeout=45):
    t0 = time.time()
    while time.time() - t0 < timeout:
        op = page.evaluate("getComputedStyle(document.querySelector('.loader')).opacity")
        if op == '0':
            return True
        page.wait_for_timeout(500)
    page.evaluate("document.querySelector('.loader').style.display='none'")
    return False


def wait_fold(page, target, timeout=90):
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            if abs(fold_value(page) - target) <= 1:
                return True
        except Exception:
            pass
        page.wait_for_timeout(700)
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, default=8141)
    ap.add_argument('--only', default='desktop')
    ap.add_argument('--shots', default='overview,flex,closed')
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    httpd = serve(args.port)
    time.sleep(0.4)
    url = f'http://127.0.0.1:{args.port}/'
    logs = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=CHROME_ARGS)

        if args.only in ('desktop', 'all'):
            ctx = browser.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
            page = ctx.new_page()
            page.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
            page.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
            page.goto(url, wait_until='domcontentloaded')
            page.wait_for_timeout(4000)
            settle(page)
            page.evaluate("document.querySelector('.loader').style.display='none'")
            page.wait_for_timeout(2500)
            want = args.shots.split(',')

            if 'overview' in want:
                page.screenshot(path=f'{OUT}/_d1_overview.png', timeout=150000)
                print('overview', fold_value(page))
            if 'flex' in want:
                page.get_by_role('button', name='플렉스').first.click()
                wait_fold(page, 115)
                page.screenshot(path=f'{OUT}/_d2_flex.png', timeout=150000)
                print('flex @', fold_value(page))
            if 'closed' in want:
                page.get_by_role('button', name='접기').first.click()
                wait_fold(page, 0)
                page.screenshot(path=f'{OUT}/_d3_closed.png', timeout=150000)
                print('closed @', fold_value(page))
            if 'camera' in want:
                page.get_by_role('button', name='카메라').first.click()
                page.wait_for_timeout(8000)
                page.screenshot(path=f'{OUT}/_d4_camera.png', timeout=150000)
                print('camera done')
            if 'hinge' in want:
                page.get_by_role('button', name='힌지').first.click()
                page.wait_for_timeout(8000)
                page.screenshot(path=f'{OUT}/_d5_hinge.png', timeout=150000)
                print('hinge done')
            if 'navy' in want:
                page.get_by_role('button', name='딥 네이비').click()
                page.get_by_role('button', name='개요').first.click()
                page.wait_for_timeout(8000)
                page.screenshot(path=f'{OUT}/_d6_navy.png', timeout=150000)
                print('navy done')
            ctx.close()

        if args.only in ('mobile', 'all'):
            m = browser.new_context(
                viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True
            )
            mp = m.new_page()
            mp.on('console', lambda msg: logs.append(f'[m:{msg.type}] {msg.text}'))
            mp.on('pageerror', lambda e: logs.append(f'[m:pageerror] {e}'))
            mp.goto(url, wait_until='domcontentloaded')
            mp.wait_for_timeout(7000)
            info = mp.evaluate(
                "() => ({scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, bodyW: document.body.scrollWidth})"
            )
            print('mobile overflow check', json.dumps(info))
            mp.screenshot(path=f'{OUT}/_m1_overview.png', timeout=150000)
            mp.get_by_role('button', name='플렉스').first.click()
            wait_fold(mp, 115)
            mp.screenshot(path=f'{OUT}/_m2_flex.png', timeout=150000)
            m.close()

        browser.close()

    httpd.shutdown()
    print('--- console ---')
    for line in logs[-40:]:
        print(line)


if __name__ == '__main__':
    main()
