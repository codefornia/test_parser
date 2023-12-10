const puppeteer = require('puppeteer-extra');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const DNS_URL = 'https://www.dns-shop.ru/catalog/17a8d26216404e77/vstraivaemye-xolodilniki/';

puppeteer.launch({ headless: true }).then(async browser => {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    const blockedResources = ['image', 'stylesheet', 'font', 'media'];
    page.on('request', request => {
        if (blockedResources.includes(request.resourceType())) {
            request.abort();
        } else {
            request.continue();
        }
    });
    await page.goto(DNS_URL)
    await page.waitForSelector('.catalog-products');

    let hasMore = true;

    while (hasMore) {
        try {
            await page.click('.pagination-widget__show-more-btn');
        } catch (e) {
            hasMore = false;
        }

        await new Promise(r => setTimeout(r, 1000));
    }

    const products = await page.$$eval('.catalog-product', productContainers => {
        return productContainers.map(el => ({
            name: el.querySelector('.catalog-product__name')?.innerText,
            price: el.querySelector('.product-buy__price')?.innerText.split(' ₽')[0]
        }))
    });

    const csvWriter = createCsvWriter({
        path: 'products.csv',
        header: [
            {id: 'name', title: 'NAME'},
            {id: 'price', title: 'PRICE'}
        ]
    });

    await csvWriter.writeRecords(products);

    await browser.close();
})