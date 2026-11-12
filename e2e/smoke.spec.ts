import { expect, test } from '@playwright/test';

const BAR = {
  status: 1,
  product: {
    code: '4000000000017',
    product_name: 'Crunchy Protein Bar',
    brands: 'Test Brand',
    serving_quantity: 50,
    product_quantity: 50,
    ingredients_text:
      'Milk chocolate coating (sugar, cocoa butter, whole milk powder, emulsifier: soy lecithin), glucose syrup, protein blend (soy protein isolate, collagen hydrolysate), sugar, palm fat, glycine, taurine, flavouring, colour: E129',
    nutriments: { 'energy-kcal_100g': 420, proteins_100g: 10, carbohydrates_100g: 60, sugars_100g: 35, fat_100g: 15, 'saturated-fat_100g': 8, salt_100g: 0.6 },
    allergens_tags: ['en:milk', 'en:soybeans'],
  },
};

test('look up a barcode, see an explained verdict, and find it in history', async ({ page }) => {
  await page.route('https://world.openfoodfacts.org/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(BAR) }),
  );
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Scan a barcode/ })).toBeVisible();

  await page.getByLabel('Barcode number').first().fill('4000000000017');
  await page.getByRole('button', { name: 'Look up' }).first().click();

  await expect(page.getByRole('heading', { name: 'Crunchy Protein Bar' })).toBeVisible();
  await expect(page.getByRole('img', { name: /grade E/ })).toBeVisible();
  const flags = page.locator('section', { has: page.getByRole('heading', { name: 'Red flags' }) });
  await expect(flags.getByRole('listitem')).toHaveCount(3);
  await expect(flags).toContainText('Marketed as a protein product');

  // Tap a highlighted additive for its explanation.
  await page.getByRole('button', { name: /^E129: Additive/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Allura red');
  await page.getByRole('button', { name: 'Close' }).click();

  // "Why this score?" shows every sub-score.
  await page.getByRole('link', { name: 'Why this score?' }).click();
  await expect(page.getByRole('rowheader', { name: /Protein density/ })).toBeVisible();

  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.getByText('Crunchy Protein Bar')).toBeVisible();
});

test('analyse a product entered by hand', async ({ page }) => {
  await page.goto('/#/add?mode=manual');
  await page.getByLabel('Product name').fill('Plain Skyr');
  await page.getByLabel('Ingredient list').fill('Skimmed milk, live cultures');
  await page.getByLabel('Energy (kcal)').fill('63');
  await page.getByLabel('Protein (g)').fill('11');
  await page.getByLabel('of which sugars (g)').fill('4');
  await page.getByRole('button', { name: 'Analyse' }).click();
  await expect(page.getByRole('heading', { name: 'Plain Skyr' })).toBeVisible();
  await expect(page.getByRole('img', { name: /grade A/ })).toBeVisible();
});
