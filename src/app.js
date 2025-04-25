const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
app.use(express.json());

const PORT = 3000;

async function extractImages(url) {
    console.log("extractImages", url);
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();

        // Set viewport size
        await page.setViewport({ width: 1920, height: 1080 });

        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        // Add console listener
        page.on('console', message => console.log('Browser console:', message.text()));

        // Navigate to the URL with additional settings
        await page.goto(url, { 
            waitUntil: ['networkidle0', 'load', 'domcontentloaded'],
            timeout: 60000 
        });

        // Wait for body to be available
        await page.waitForSelector('body');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Extract images based on the website
        const images = await page.evaluate((url) => {
            console.log('evaluate');
            
            const imageUrls = new Set();

            if (url.includes('amazon')) {
                document.querySelectorAll('#imageBlock img').forEach(img => {
                    if (img.src.endsWith('gif') || img.src.includes('icon') || img.src.includes('thumbnail-icon') || img.src.includes('button')){
                        return;
                    }
                    if (img.src) imageUrls.add(img.src);
                });
            } 
            else if (url.includes('ebay')) {
                // eBay specific selectors
                document.querySelectorAll('#ux-image-grid-container img').forEach(img => {
                    if (img.src) imageUrls.add(img.src);
                });
            }

            else if (url.includes('tiktok')) {
                // eBay specific selectors
                document.querySelectorAll('#icImg, .img-wrapper img').forEach(img => {
                    if (img.src) imageUrls.add(img.src);
                });
            }

            else if (url.includes('alibaba')) {
                // eBay specific selectors
                document.querySelectorAll('.pdp-info-left img').forEach(img => {
                    if (img.src) imageUrls.add(img.src);
                });
            }

            else if (url.includes('etsy')) {
                // eBay specific selectors
                document.querySelectorAll('.image-wrapper img').forEach(img => {
                    if (img.src) imageUrls.add(img.src);
                });
            }
            else if (imageUrls.size === 0) {
                // Generic image extraction
                document.querySelectorAll('img').forEach(img => {
                    if (img.src && 
                        img.src.match(/\.(jpg|jpeg|png|webp)/i) && 
                        !img.src.includes('icon') && 
                        !img.src.endsWith('gif')) {
                        imageUrls.add(img.src);
                    }
                });
            }

            return Array.from(imageUrls);
        }, url);

        return images;
    } catch (error) {
        throw new Error(`Failed to extract images: ${error.message}`);
    } finally {
        await browser.close();
    }
}

app.post('/extract-images', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const images = await extractImages(url);
        res.json({ images });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});