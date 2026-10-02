import asyncio, json, os
from playwright.async_api import async_playwright
async def main():
    m=json.load(open(os.path.expanduser("~/.cache/lovable-auth/session.json")))
    async with async_playwright() as p:
        b=await p.chromium.launch(headless=True); c=await b.new_context(viewport={"width":1280,"height":1800}); pg=await c.new_page()
        await pg.goto("http://localhost:8080")
        await pg.evaluate(f"localStorage.setItem({json.dumps(m['storage_key'])},{json.dumps(json.dumps(m['session']))})")
        await pg.goto("http://localhost:8080/dashboard"); await pg.wait_for_timeout(5000)
        for t in await pg.get_by_text("/ 1,000").all(): print(repr(await t.inner_text()))
        print(repr(await pg.get_by_text("Watch Hours").first.locator("xpath=../..").inner_text()))
        await b.close()
asyncio.run(main())
