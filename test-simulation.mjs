import { chromium } from 'playwright';

async function testSimulation() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Collect console messages
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  try {
    console.log('Loading page...');
    await page.goto('http://localhost:5174/weimar-web/', { waitUntil: 'networkidle' });

    // Wait for loading to finish
    await page.waitForSelector('#loading.hidden', { timeout: 10000 }).catch(() => {
      console.log('Loading screen still visible or not found');
    });

    // Give it a moment to initialize
    await page.waitForTimeout(1000);

    // Print console logs
    console.log('\n=== Console Output ===');
    consoleLogs.forEach(log => console.log(log));

    // Get initial agent count
    const initialAgents = await page.$eval('#stat-agents', el => el.textContent);
    console.log(`\nInitial agents: ${initialAgents}`);

    // Click Play button
    console.log('\nClicking Play...');
    await page.click('#btn-play');

    // Wait a bit for agents to spawn
    await page.waitForTimeout(3000);

    // Get agent count after play
    const agentsAfterPlay = await page.$eval('#stat-agents', el => el.textContent);
    console.log(`Agents after 3 seconds: ${agentsAfterPlay}`);

    // Get trips count
    const trips = await page.$eval('#stat-trips', el => el.textContent);
    console.log(`Total trips: ${trips}`);

    // Print any new console logs
    console.log('\n=== Additional Console Output ===');
    consoleLogs.slice(consoleLogs.length - 10).forEach(log => console.log(log));

    if (parseInt(agentsAfterPlay) > 0) {
      console.log('\n✓ SUCCESS: Agents are spawning!');
    } else {
      console.log('\n✗ ISSUE: No agents spawned after pressing Play');
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n=== All Console Logs ===');
    consoleLogs.forEach(log => console.log(log));
  } finally {
    await browser.close();
  }
}

testSimulation();
