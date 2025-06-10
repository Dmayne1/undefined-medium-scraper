const Apify = require('apify');
const { PuppeteerCrawler } = require('crawlee');

Apify.main(async () => {
    const input = await Apify.getInput();
    const { searchQuery = '', maxArticles = 50, proxyConfiguration } = input;

    console.log('Starting Medium scraper...');
    const proxyConfig = await Apify.createProxyConfiguration(proxyConfiguration);
    
    const crawler = new PuppeteerCrawler({
        proxyConfiguration: proxyConfig,
        requestHandler: async ({ page, request }) => {
            await page.waitForSelector('article', { timeout: 30000 });
            
            const articles = await page.evaluate((maxArticles) => {
                const articleElements = document.querySelectorAll('article');
                const results = [];
                
                for (let i = 0; i < Math.min(articleElements.length, maxArticles); i++) {
                    const article = articleElements[i];
                    const titleElement = article.querySelector('h2, h3');
                    const authorElement = article.querySelector('[data-testid="authorName"]');
                    
                    results.push({
                        title: titleElement?.textContent?.trim() || '',
                        author: authorElement?.textContent?.trim() || '',
                        scraped_at: new Date().toISOString()
                    });
                }
                
                return results;
            }, maxArticles);
            
            await Apify.pushData(articles);
        }
    });

    const mediumUrl = searchQuery ? `https://medium.com/search?q=${encodeURIComponent(searchQuery)}` : 'https://medium.com/';
    await crawler.addRequests([{ url: mediumUrl }]);
    await crawler.run();
});