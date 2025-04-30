const express = require("express");
const puppeteerExtra = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");

// Add the stealth plugin
puppeteerExtra.use(StealthPlugin());

const app = express();

// Add CORS headers middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

app.use(express.json());

const PORT = 3000;

async function extractImages(url) {
  console.log("extractImages", url);

  // Use puppeteerExtra.launch instead of puppeteer.launch
  const browser = await puppeteerExtra.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=1920,1080",
    ],
    ignoreHTTPSErrors: true,
  });

  try {
    const page = await browser.newPage();

    // Set viewport size
    await page.setViewport({ width: 1920, height: 1080 });

    // Set a more realistic user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36"
    );

    // Add cookies from a previous session if available
    try {
      if (fs.existsSync("./cookies.json") && url.includes("etsy")) {
        const cookiesString = fs.readFileSync("./cookies.json");
        const cookies = JSON.parse(cookiesString);
        await page.setCookie(...cookies);
      }
    } catch (e) {
      console.log("No cookies found");
    }

    // Add console listener
    page.on("console", (message) =>
      console.log("Browser console:", message.text())
    );

    // Navigate to the URL with additional settings
    await page.goto(url, {
      waitUntil: ["load", "domcontentloaded", "networkidle2"],
      timeout: 60000,
    });

    // Scroll down slowly to simulate human behavior
    await autoScroll(page);

    // Wait for body to be available
    await page.waitForSelector("body");

    // Add a longer wait time for Etsy specifically
    if (url.includes("etsy")) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
    } else {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // Extract images based on the website
    const images = await page.evaluate(async (url) => {
      console.log("evaluate");

      const imageUrls = new Set();
      if (url.includes("amazon")) {
        const element = document.querySelector("#imageBlock_feature_div");
        if (element) {
          // Extract image URLs from the HTML content with "large" format
          const htmlContent = element.innerHTML;
          const largeImageRegex =
            /"large":\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g;
          let match;
          while ((match = largeImageRegex.exec(htmlContent)) !== null) {
            const imageUrl = match[1];
            if (
              !imageUrl.endsWith("gif") &&
              !imageUrl.includes("icon") &&
              !imageUrl.includes("thumbnail-icon") &&
              !imageUrl.includes("button")
            ) {
              imageUrls.add(imageUrl);
            }
          }
        }

        // If no images found in imageBlock_feature_div, try to find them in the entire page
        if (imageUrls.size === 0) {
          const htmlContent = document.documentElement.innerHTML;
          const largeImageRegex =
            /"large":\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g;
          let match;
          while ((match = largeImageRegex.exec(htmlContent)) !== null) {
            const imageUrl = match[1];
            if (
              !imageUrl.endsWith("gif") &&
              !imageUrl.includes("icon") &&
              !imageUrl.includes("thumbnail-icon") &&
              !imageUrl.includes("button")
            ) {
              imageUrls.add(imageUrl);
            }
          }
        }
      } else if (url.includes("ebay")) {
        // eBay specific selectors
        document
          .querySelectorAll(".ux-image-grid-container img")
          .forEach((img) => {
            if (img.src) imageUrls.add(img.src);
          });
      } else if (url.includes("tiktok")) {
        document.querySelectorAll("img.lazy-img__onload").forEach((img) => {
          if (img.src) imageUrls.add(img.src);
        });
      } else if (url.includes("alibaba")) {
        const container = document.querySelector(
          "[data-section='SectionOverview']"
        );
        console.log("container", container);

        if (container) {
          container.querySelectorAll("img").forEach((img) => {
            console.log("img", img.src);
            if (img.src) imageUrls.add(img.src);
          });
        } else {
          // Fallback to generic image extraction for Alibaba
          document.querySelectorAll("img").forEach((img) => {
            if (
              img.src &&
              img.src.match(/\.(jpg|jpeg|png|webp)/i) &&
              !img.src.includes("icon") &&
              !img.src.endsWith("gif") &&
              img.width > 100 &&
              img.height > 100
            ) {
              imageUrls.add(img.src);
            }
          });
        }
      } else if (url.includes("etsy.com")) {
        console.log(
          "etsy",
          document.querySelectorAll("img.carousel-image").length
        );

        document.querySelectorAll("img.carousel-image").forEach((img) => {
          if (img.src) imageUrls.add(img.src);
        });

        // Fallback for Etsy if no carousel images found
        if (imageUrls.size === 0) {
          document.querySelectorAll("img.wt-max-width-full").forEach((img) => {
            if (img.src) imageUrls.add(img.src);
          });
        }
      } else if (imageUrls.size === 0) {
        // Generic image extraction
        document.querySelectorAll("img").forEach((img) => {
          if (
            img.src &&
            img.src.match(/\.(jpg|jpeg|png|webp)/i) &&
            !img.src.includes("icon") &&
            !img.src.endsWith("gif")
          ) {
            imageUrls.add(img.src);
          }
        });
      }

      return Array.from(imageUrls);
    }, url);

    // Save cookies after successful navigation for future use
    if (url.includes("etsy")) {
      const cookies = await page.cookies();
      fs.writeFileSync("./cookies.json", JSON.stringify(cookies, null, 2));
    }

    // If you need to save HTML content, do it here instead
    if (url.includes("amazon")) {
      const amazonHtml = await page.content();
      fs.writeFileSync("amazon-element.log", amazonHtml);
    }

    return images;
  } catch (error) {
    throw new Error(`Failed to extract images: ${error.message}`);
  } finally {
    await browser.close();
  }
}

app.post("/extract-images", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const images = await extractImages(url);
    res.json({ images });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app
  .listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  })
  .on("error", (err) => {
    console.error(err);
  });

// Add this function to simulate scrolling
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
