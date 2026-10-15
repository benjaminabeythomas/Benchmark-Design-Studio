import { test,expect } from '@playwright/test';

test('architectural scene renders, all edit controls persist, and camera views work',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const response=await page.goto('./');expect(response?.status()).toBe(200);
 await expect(page.locator('main')).toHaveAttribute('data-version','atelier-02');
 await expect(page.locator('#scene')).toHaveAttribute('data-ready','true');
 await expect(page.locator('#scene canvas')).toBeVisible();
 await page.waitForTimeout(4000);
 await page.screenshot({path:'test-results/studio-preview.png',fullPage:true});
 await page.locator('#prompt').fill('walnut cabinets');await page.getByRole('button',{name:'Apply to 3D scene'}).click();await expect(page.locator('#message')).toContainText('walnut');
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.locator('#finishName')).toHaveText('Oak');
 await page.getByRole('button',{name:'Model',exact:true}).click();await page.waitForTimeout(1800);await expect(page.locator('#scene')).toHaveAttribute('data-mode','orbit');
 await page.screenshot({path:'test-results/model-view.png'});
 await page.getByRole('button',{name:'Plan',exact:true}).click();await expect(page.locator('#scene')).toHaveAttribute('data-mode','plan');
 await page.getByRole('button',{name:'Walk',exact:true}).click();await page.keyboard.press('w');await expect(page.locator('#scene')).toHaveAttribute('data-mode','walk');
 await page.getByRole('button',{name:'Interior',exact:true}).click();
 await page.getByRole('button',{name:'Bathroom',exact:true}).click();await expect(page.locator('#roomTitle')).toContainText('slower');await page.waitForTimeout(2200);await page.screenshot({path:'test-results/bathroom-preview.png'});
 await page.getByRole('button',{name:'Evening',exact:true}).click();await page.waitForTimeout(1500);await page.screenshot({path:'test-results/evening-preview.png'});
 await page.getByRole('button',{name:'Toggle tap'}).click();await expect(page.locator('#message')).toContainText('Tap');
 await page.locator('summary').filter({hasText:'Design versions'}).click();await page.getByRole('button',{name:'Save locally',exact:true}).click();await expect(page.locator('#message')).toContainText('Saved');
 await page.locator('#optionName').fill('Spa option');await page.getByRole('button',{name:'Save current as option'}).click();await expect(page.locator('#savedVariants')).toContainText('Spa option');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON'}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe('benchmark-design-scene.json');
 await page.reload();await expect(page.locator('#scene')).toHaveAttribute('data-ready','true');await page.locator('summary').filter({hasText:'Design versions'}).click();await page.getByRole('button',{name:'Load saved'}).click();await expect(page.locator('#roomTitle')).toContainText('slower');
 await page.getByRole('button',{name:'Present',exact:true}).click();await expect(page.locator('aside')).toBeHidden();
 expect(errors).toEqual([]);
});

test('mobile layout is usable without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('./');await expect(page.locator('#scene')).toHaveAttribute('data-ready','true');await page.waitForTimeout(2000);await page.screenshot({path:'test-results/mobile-preview.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
 await page.getByRole('button',{name:'Bathroom',exact:true}).click();await expect(page.locator('#roomTitle')).toContainText('slower');
});
