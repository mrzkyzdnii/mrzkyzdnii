require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const { chromium } = require('playwright-core');
const chromiumPack = require('@sparticuz/chromium');
const path = require('path');
const os = require('os');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('common'));

async function fetchCount() {
  try {
    return (await axios.get("https://api.counterapi.dev/v1/aqul/brat/up")).data?.count || 0;
  } catch {
    return 0;
  }
}

app.use('*', async (req, res) => {
  const text = req.query.text;
  const background = req.query.background;
  const color = req.query.color;
  const hit = fetchCount();

  if (!text) {
    return res.status(200).json({
      author: 'zennn08 (aqul)',
      repository: {
        github: 'https://github.com/zennn08/brat-api/'
      },
      hit: await hit,
      message: "Parameter `text` diperlukan",
      runtime: {
        os: os.type(),
        platform: os.platform(),
        architecture: os.arch(),
        cpuCount: os.cpus().length,
        uptime: `${os.uptime()} seconds`,
        memoryUsage: `${Math.round((os.totalmem() - os.freemem()) / 1024 / 1024)} MB used of ${Math.round(os.totalmem() / 1024 / 1024)} MB`
      }
    });
  }

  let browser;
  try {
    browser = await chromium.launch({
      args: chromiumPack.args,
      executablePath: await chromiumPack.executablePath(),
      headless: true,
    });

    const context = await browser.newContext({
      viewport: {
        width: 1536,
        height: 695
      }
    });
    const page = await context.newPage();

    const filePath = path.join(__dirname, './site/index.html');
    await page.goto(`file://${filePath}`);

    await page.click('#toggleButtonWhite');
    await page.click('#textOverlay');
    await page.click('#textInput');
    await page.fill('#textInput', text);

    await page.evaluate((data) => {
      if (data.background) {
        $('.node__content.clearfix').css('background-color', data.background);
      }
      if (data.color) {
        $('.textFitted').css('color', data.color);
      }
    }, { background, color });

    const element = await page.$('#textOverlay');
    const box = await element.boundingBox();

    res.set('Content-Type', 'image/png');
    res.end(await page.screenshot({
      clip: {
        x: box.x,
        y: box.y,
        width: 500,
        height: 500
      }
    }));

    await context.close();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Untuk local development
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app; // penting buat Vercel
