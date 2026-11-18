import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

// Runs entirely against the local HTML and its in-memory fixtures.
const browser = await chromium.launch(process.env.SOTA_BROWSER_PATH
  ? { executablePath: process.env.SOTA_BROWSER_PATH }
  : { channel: 'msedge' });
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [];
  const http = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/^https?:/, route => { http.push(route.request().url()); return route.abort(); });
  await page.goto(new URL('./index.html', import.meta.url).href);
  const click = name => page.getByRole('button', { name, exact: true }).click();
  const nav = name => page.getByRole('navigation').getByRole('button', {name,exact:true}).click();
  const login = async role => {
    await page.locator('[name=role]').selectOption(role);
    await click('Tiếp tục');
    if (role !== 'normal_user') await click('Mở không gian quản trị');
  };
  await login('normal_user');
  assert.match(await page.getByRole('alert').innerText(), /không có quyền/);
  await login('admin_user');
  for (const width of [360,768,1366]) {
    await page.setViewportSize({width,height:900});
    for (const name of ['Tổng quan','Hiện vật','Thống kê']) {
      await nav(name);
      assert.equal(await page.locator('h1').innerText(),name);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow at '+width+' on '+name);
    }
  }
  await nav('Hiện vật');
  await click('Thêm hiện vật');
  await page.getByLabel('Tên',{exact:true}).fill('Tác phẩm thử');
  await page.getByLabel('Mã danh mục').fill('TEST-01');
  await click('Lưu');
  assert.ok(await page.getByRole('heading',{name:'Tác phẩm thử'}).isVisible());
  for(let i=0;i<2;i++){await click('Nhập mẫu Smithsonian');await click('Nhập mẫu');}
  assert.match(await page.locator('#notice').innerText(),/Đã nhập 0 · Bỏ qua 2/);
  await nav('Triển lãm');
  await click('Chi tiết');
  await page.getByLabel('Bình men lam').uncheck();
  await click('Lưu');
  assert.match(await page.locator('.row p').innerText(),/0 hiện vật/);
  await nav('Soát vé');
  for(let i=0;i<2;i++){await click('Nhập mã vé');await page.getByLabel('Mã vào cửa').fill('SOTA-101');await click('Xác nhận vào cửa');}
  assert.match(await page.locator('#form-error').innerText(),/đã sử dụng/);
  await click('Đóng');
  await nav('Đơn hàng');
  await click('Chi tiết');
  await click('Chuyển sang Đang giao');
  await click('Xác nhận');
  assert.equal(await page.locator('.row .pill').innerText(),'Đang giao');
  await nav('Thư viện media');
  await click('Thêm tệp');
  await page.locator('input[type=file]').setInputFiles({ name:'sample.png', mimeType:'image/png', buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfAAAAABJRU5ErkJggg==','base64') });
  await page.locator('dialog').getByRole('button',{name:'Thêm tệp',exact:true}).click();
  await click('Xem tệp');await click('Xóa tệp');await click('Xóa tệp');
  assert.match(await page.locator('.empty').innerText(),/đang trống/);
  await click('Đăng xuất');
  await login('super_admin');
  await page.locator('#museum-switch').selectOption('m2');
  await nav('Hiện vật');
  assert.equal(await page.locator('.row h3').allTextContents().then(x=>x.join(',')),'Ấn triện');
  await nav('Bảo tàng');await click('Thêm bảo tàng');
  await page.getByLabel('Tên',{exact:true}).fill('Bảo tàng thử');
  await page.getByLabel('Slug').fill('bao-tang-thu');
  await click('Lưu');
  assert.equal(await page.locator('#museum-switch option:checked').innerText(),'Bảo tàng thử');
  assert.deepEqual(errors,[]);
  assert.deepEqual(http,[]);
  console.log('Passed local browser mock: role and museum selection, 3 viewport widths, catalog editing, import, exhibition links, redemption, fulfillment, media, museum creation and zero HTTP requests.');
} finally {
  await browser.close();
}
