import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { signInTestUser } from './helpers/auth';
import { measureAndAssertLatency, PerformanceMetrics } from './helpers/metrics';
import { cleanupTestRoom, generateTestRoomCode } from './helpers/cleanup';
import { TEST_USER_1, TEST_USER_2 } from './fixtures/test-users';

// Shared state for multi-device tests
let context1: BrowserContext;
let context2: BrowserContext;
let page1: Page;
let page2: Page;
let roomCode: string;
let metrics: PerformanceMetrics;

test.describe('Multi-Device Synchronization', () => {
  test.beforeAll(async ({ browser }) => {
    // Create two separate browser contexts (simulating two devices)
    context1 = await browser.newContext();
    context2 = await browser.newContext();
    page1 = await context1.newPage();
    page2 = await context2.newPage();
    
    metrics = new PerformanceMetrics();
  });

  test.afterAll(async () => {
    // Print performance metrics summary
    console.log('\n' + metrics.getSummary());
    
    // Close contexts
    await context1.close();
    await context2.close();
  });

  // Room Join Synchronization Tests
  test('two users can join the same room and see each other', async () => {
    // Generate unique room code for this test
    roomCode = generateTestRoomCode();
    
    // User 1 signs in and creates room
    await signInTestUser(page1, TEST_USER_1.email, TEST_USER_1.password);
    
    // Wait for lobby to load
    await page1.waitForSelector('input[placeholder="Enter your name"]', { timeout: 10000 });
    
    // Fill in name and room code
    await page1.fill('input[placeholder="Enter your name"]', TEST_USER_1.name);
    await page1.fill('input[placeholder*="Room Code"]', roomCode);
    
    // Create/Join room
    await page1.click('button:has-text("Create / Join Room")');
    
    // Wait for room to load - check for room code display
    await page1.waitForSelector(`text=/Room:.*${roomCode}/`, { timeout: 10000 });
    
    // Verify User 1 is in the room
    await expect(page1.locator('h1')).toContainText(TEST_USER_1.name);
    
    // User 2 signs in and joins the same room
    await signInTestUser(page2, TEST_USER_2.email, TEST_USER_2.password);
    
    // Wait for lobby
    await page2.waitForSelector('input[placeholder="Enter your name"]', { timeout: 10000 });
    
    // Fill in name and same room code
    await page2.fill('input[placeholder="Enter your name"]', TEST_USER_2.name);
    await page2.fill('input[placeholder*="Room Code"]', roomCode);
    
    // Measure latency of join operation
    const joinLatency = await measureAndAssertLatency(
      async () => {
        await page2.click('button:has-text("Create / Join Room")');
      },
      async () => {
        // Wait for User 2 to see the room
        await page2.waitForSelector(`text=/Room:.*${roomCode}/`, { timeout: 5000 });
      },
      2000, // Target: 2s for join operation
      'Room join'
    );
    
    metrics.record('Room join', joinLatency, 2000);
    
    // Verify User 2 is in the room
    await expect(page2.locator('h1')).toContainText(TEST_USER_2.name);
    
    // Verify both users see each other in participant list
    // User 1 should see User 2
    await expect(page1.locator('.bg-white.dark\\:bg-slate-800.rounded-lg.shadow-md').filter({ hasText: 'Team' }))
      .toContainText(TEST_USER_2.name, { timeout: 5000 });
    
    // User 2 should see User 1
    await expect(page2.locator('.bg-white.dark\\:bg-slate-800.rounded-lg.shadow-md').filter({ hasText: 'Team' }))
      .toContainText(TEST_USER_1.name);
    
    // Verify participant count
    await expect(page1.locator('h2:has-text("Team")')).toContainText('(2)');
    await expect(page2.locator('h2:has-text("Team")')).toContainText('(2)');
  });

  test('presence list updates within 250ms when user joins', async () => {
    // Use a fresh room code to ensure clean state
    const newRoomCode = generateTestRoomCode();
    
    // User 1 creates a new room
    await page1.goto('/');
    await page1.waitForSelector('input[placeholder="Enter your name"]', { timeout: 10000 });
    await page1.fill('input[placeholder="Enter your name"]', TEST_USER_1.name);
    await page1.fill('input[placeholder*="Room Code"]', newRoomCode);
    await page1.click('button:has-text("Create / Join Room")');
    await page1.waitForSelector(`text=/Room:.*${newRoomCode}/`, { timeout: 10000 });
    
    // User 2 joins and we measure how quickly User 1 sees the update
    await page2.goto('/');
    await page2.waitForSelector('input[placeholder="Enter your name"]', { timeout: 10000 });
    await page2.fill('input[placeholder="Enter your name"]', TEST_USER_2.name);
    await page2.fill('input[placeholder*="Room Code"]', newRoomCode);
    
    // Measure presence update latency
    const presenceLatency = await measureAndAssertLatency(
      async () => {
        await page2.click('button:has-text("Create / Join Room")');
      },
      async () => {
        // User 1 should see User 2 in the participant list
        await page1.waitForSelector(`text=${TEST_USER_2.name}`, { timeout: 500 });
      },
      250, // Target: 250ms for presence sync
      'Presence list update'
    );
    
    metrics.record('Presence list update', presenceLatency, 250);
    
    // Verify both users are visible
    await expect(page1.locator('.bg-white.dark\\:bg-slate-800.rounded-lg.shadow-md').filter({ hasText: 'Team' }))
      .toContainText(TEST_USER_2.name);
  });

  test('participant display names and roles are shown correctly', async () => {
    // User 1 should be the facilitator (creator)
    const facilitatorBadge = page1.locator('text=Facilitator').first();
    await expect(facilitatorBadge).toBeVisible();
    
    // Verify crown icon is shown for facilitator
    const crownIcon = page1.locator('.bg-white.dark\\:bg-slate-800.rounded-lg.shadow-md')
      .filter({ hasText: TEST_USER_1.name })
      .locator('svg'); // Crown icon
    await expect(crownIcon).toBeVisible();
    
    // User 2 should see User 1 as facilitator
    const user2ViewOfFacilitator = page2.locator('.bg-white.dark\\:bg-slate-800.rounded-lg.shadow-md')
      .filter({ hasText: TEST_USER_1.name });
    await expect(user2ViewOfFacilitator.locator('text=Facilitator')).toBeVisible();
    
    // User 2 should NOT have facilitator badge
    const user2Badge = page2.locator('.bg-white.dark\\:bg-slate-800.rounded-lg.shadow-md')
      .filter({ hasText: TEST_USER_2.name })
      .locator('text=Facilitator');
    await expect(user2Badge).not.toBeVisible();
    
    // Verify avatars are displayed
    const user1Avatar = page1.locator('img[alt*="' + TEST_USER_1.name + '"]').first();
    await expect(user1Avatar).toBeVisible();
    
    const user2Avatar = page2.locator('img[alt*="' + TEST_USER_2.name + '"]').first();
    await expect(user2Avatar).toBeVisible();
  });

  // Story Creation Synchronization Tests
  test('story creation syncs to other users within 250ms', async () => {
    const storyTitle = `Test Story ${Date.now()}`;
    
    // User 1 (facilitator) creates a story
    const storyInput = page1.locator('input[placeholder="Add a new story..."]');
    await expect(storyInput).toBeVisible({ timeout: 5000 });
    
    // Measure story creation sync latency
    const storyLatency = await measureAndAssertLatency(
      async () => {
        await storyInput.fill(storyTitle);
        await page1.click('button:has-text("Add")');
      },
      async () => {
        // User 2 should see the story
        await page2.waitForSelector(`text=${storyTitle}`, { timeout: 500 });
      },
      250, // Target: 250ms for story sync
      'Story creation sync'
    );
    
    metrics.record('Story creation sync', storyLatency, 250);
    
    // Verify story is visible to both users
    await expect(page1.locator('.bg-white.dark\\:bg-slate-800.rounded-lg.shadow-md').filter({ hasText: 'Stories' }))
      .toContainText(storyTitle);
    await expect(page2.locator('.bg-white.dark\\:bg-slate-800.rounded-lg.shadow-md').filter({ hasText: 'Stories' }))
      .toContainText(storyTitle);
  });

  test('story list updates across devices', async () => {
    const story1Title = `Story A ${Date.now()}`;
    const story2Title = `Story B ${Date.now()}`;
    
    // User 1 creates first story
    await page1.locator('input[placeholder="Add a new story..."]').fill(story1Title);
    await page1.click('button:has-text("Add")');
    await page1.waitForSelector(`text=${story1Title}`, { timeout: 2000 });
    
    // User 1 creates second story
    await page1.locator('input[placeholder="Add a new story..."]').fill(story2Title);
    await page1.click('button:has-text("Add")');
    await page1.waitForSelector(`text=${story2Title}`, { timeout: 2000 });
    
    // User 2 should see both stories
    await expect(page2.locator('.bg-white.dark\\:bg-slate-800.rounded-lg.shadow-md').filter({ hasText: 'Stories' }))
      .toContainText(story1Title, { timeout: 3000 });
    await expect(page2.locator('.bg-white.dark\\:bg-slate-800.rounded-lg.shadow-md').filter({ hasText: 'Stories' }))
      .toContainText(story2Title);
    
    // Verify story order is consistent
    const user1Stories = await page1.locator('.bg-white.dark\\:bg-slate-800.rounded-lg.shadow-md')
      .filter({ hasText: 'Stories' })
      .locator('.p-3.rounded-md')
      .allTextContents();
    
    const user2Stories = await page2.locator('.bg-white.dark\\:bg-slate-800.rounded-lg.shadow-md')
      .filter({ hasText: 'Stories' })
      .locator('.p-3.rounded-md')
      .allTextContents();
    
    // Both users should see stories in the same order
    expect(user1Stories.filter(s => s.includes(story1Title) || s.includes(story2Title)))
      .toEqual(user2Stories.filter(s => s.includes(story1Title) || s.includes(story2Title)));
  });

  test('story metadata (title) syncs correctly when edited', async () => {
    const originalTitle = `Original Story ${Date.now()}`;
    const updatedTitle = `Updated Story ${Date.now()}`;
    
    // User 1 creates a story
    await page1.locator('input[placeholder="Add a new story..."]').fill(originalTitle);
    await page1.click('button:has-text("Add")');
    await page1.waitForSelector(`text=${originalTitle}`, { timeout: 2000 });
    
    // User 2 should see the original title
    await expect(page2.locator('.bg-white.dark\\:bg-slate-800.rounded-lg.shadow-md').filter({ hasText: 'Stories' }))
      .toContainText(originalTitle, { timeout: 3000 });
    
    // User 1 edits the story title
    const storyCard = page1.locator('.p-3.rounded-md').filter({ hasText: originalTitle });
    
    // Hover to show edit button
    await storyCard.hover();
    
    // Click edit button (pencil icon)
    await storyCard.locator('button').first().click();
    
    // Update the title
    const editInput = page1.locator('input[type="text"]').first();
    await editInput.fill(updatedTitle);
    await editInput.press('Enter');
    
    // Measure update sync latency
    const updateLatency = await measureAndAssertLatency(
      async () => {
        // Wait a moment for the update to propagate
        await page1.waitForTimeout(100);
      },
      async () => {
        // User 2 should see the updated title
        await page2.waitForSelector(`text=${updatedTitle}`, { timeout: 500 });
      },
      250, // Target: 250ms for update sync
      'Story update sync'
    );
    
    metrics.record('Story update sync', updateLatency, 250);
    
    // Verify both users see the updated title
    await expect(page1.locator('.bg-white.dark\\:bg-slate-800.rounded-lg.shadow-md').filter({ hasText: 'Stories' }))
      .toContainText(updatedTitle);
    await expect(page2.locator('.bg-white.dark\\:bg-slate-800.rounded-lg.shadow-md').filter({ hasText: 'Stories' }))
      .toContainText(updatedTitle);
    
    // Verify original title is no longer visible
    await expect(page1.locator('.bg-white.dark\\:bg-slate-800.rounded-lg.shadow-md').filter({ hasText: 'Stories' }))
      .not.toContainText(originalTitle);
    await expect(page2.locator('.bg-white.dark\\:bg-slate-800.rounded-lg.shadow-md').filter({ hasText: 'Stories' }))
      .not.toContainText(originalTitle);
  });

  // Voting Flow Synchronization Tests
  test('vote casting updates vote count within 2s', async () => {
    // Create a test story for voting
    const testStoryTitle = `Voting Test Story ${Date.now()}`;
    const storyInput = page1.locator('input[placeholder="Add a new story..."]');
    await storyInput.fill(testStoryTitle);
    await page1.click('button:has-text("Add")');
    await page1.waitForSelector(`text=${testStoryTitle}`, { timeout: 2000 });
    
    // Select the story
    await page1.click(`text=${testStoryTitle}`);
    await page1.waitForSelector('text=Story for Estimation', { timeout: 2000 });
    
    // User 1 (facilitator) starts voting
    const startVotingButton = page1.locator('button:has-text("Start Voting")');
    if (await startVotingButton.isVisible().catch(() => false)) {
      await startVotingButton.click();
    }
    
    // Wait for voting to be active
    await page1.waitForSelector('text=Cast your vote!', { timeout: 2000 });
    await page2.waitForSelector('text=Cast your vote!', { timeout: 2000 });
    
    // User 1 casts a vote
    const vote1Button = page1.locator('button').filter({ hasText: /^5$/ }).first();
    await vote1Button.click();
    
    // Verify User 1 sees "Waiting for others..."
    await expect(page1.locator('text=Waiting for others...')).toBeVisible({ timeout: 2000 });
    
    // Measure vote count update latency
    const voteCountLatency = await measureAndAssertLatency(
      async () => {
        // User 2 casts a vote
        const vote2Button = page2.locator('button').filter({ hasText: /^8$/ }).first();
        await vote2Button.click();
      },
      async () => {
        // User 1 should see vote count update to 2/2
        await page1.waitForSelector('text=/Reveal Votes \\(2\\/2\\)/', { timeout: 2500 });
      },
      2000, // Target: 2s for vote tally update
      'Vote count update'
    );
    
    metrics.record('Vote count update', voteCountLatency, 2000);
    
    // Verify both users see they've voted
    await expect(page1.locator('text=Waiting for others...')).toBeVisible();
    await expect(page2.locator('text=Waiting for others...')).toBeVisible();
  });

  test('vote reveal syncs within 250ms', async () => {
    // Create and select a story
    const testStoryTitle = `Reveal Test Story ${Date.now()}`;
    await page1.locator('input[placeholder="Add a new story..."]').fill(testStoryTitle);
    await page1.click('button:has-text("Add")');
    await page1.waitForSelector(`text=${testStoryTitle}`, { timeout: 2000 });
    await page1.click(`text=${testStoryTitle}`);
    await page1.waitForSelector('text=Story for Estimation', { timeout: 2000 });
    
    // Start voting
    const startVotingButton = page1.locator('button:has-text("Start Voting")');
    if (await startVotingButton.isVisible().catch(() => false)) {
      await startVotingButton.click();
      await page1.waitForSelector('text=Cast your vote!', { timeout: 2000 });
    }
    
    // Both users cast votes
    await page1.locator('button').filter({ hasText: /^8$/ }).first().click();
    await page2.locator('button').filter({ hasText: /^13$/ }).first().click();
    
    // Wait for all votes to be cast
    await page1.waitForSelector('text=/Reveal Votes \\(2\\/2\\)/', { timeout: 3000 });
    
    // Measure vote reveal sync latency
    const revealLatency = await measureAndAssertLatency(
      async () => {
        // User 1 (facilitator) reveals votes
        await page1.click('button:has-text("Reveal Votes")');
      },
      async () => {
        // User 2 should see the results
        await page2.waitForSelector('text=Voting Results', { timeout: 500 });
      },
      250, // Target: 250ms for reveal sync
      'Vote reveal sync'
    );
    
    metrics.record('Vote reveal sync', revealLatency, 250);
    
    // Verify both users see the results
    await expect(page1.locator('text=Voting Results')).toBeVisible();
    await expect(page2.locator('text=Voting Results')).toBeVisible();
  });

  test('revealed vote values displayed correctly', async () => {
    // Create and select a story
    const testStoryTitle = `Display Test Story ${Date.now()}`;
    await page1.locator('input[placeholder="Add a new story..."]').fill(testStoryTitle);
    await page1.click('button:has-text("Add")');
    await page1.waitForSelector(`text=${testStoryTitle}`, { timeout: 2000 });
    await page1.click(`text=${testStoryTitle}`);
    await page1.waitForSelector('text=Story for Estimation', { timeout: 2000 });
    
    // Start voting
    const startVotingButton = page1.locator('button:has-text("Start Voting")');
    if (await startVotingButton.isVisible().catch(() => false)) {
      await startVotingButton.click();
      await page1.waitForSelector('text=Cast your vote!', { timeout: 2000 });
    }
    
    // User 1 votes 5
    await page1.locator('button').filter({ hasText: /^5$/ }).first().click();
    
    // User 2 votes 8
    await page2.locator('button').filter({ hasText: /^8$/ }).first().click();
    
    // Wait for all votes
    await page1.waitForSelector('text=/Reveal Votes \\(2\\/2\\)/', { timeout: 3000 });
    
    // Reveal votes
    await page1.click('button:has-text("Reveal Votes")');
    
    // Wait for results to appear
    await page1.waitForSelector('text=Voting Results', { timeout: 2000 });
    await page2.waitForSelector('text=Voting Results', { timeout: 2000 });
    
    // Verify vote values are displayed in the results
    const resultsSection1 = page1.locator('.bg-white.dark\\:bg-slate-800.rounded-lg.shadow-md').filter({ hasText: 'Voting Results' });
    const resultsSection2 = page2.locator('.bg-white.dark\\:bg-slate-800.rounded-lg.shadow-md').filter({ hasText: 'Voting Results' });
    
    // Both users should see both vote values (5 and 8)
    await expect(resultsSection1).toContainText('5');
    await expect(resultsSection1).toContainText('8');
    await expect(resultsSection2).toContainText('5');
    await expect(resultsSection2).toContainText('8');
    
    // Verify vote counts are shown
    await expect(resultsSection1.locator('text=/1/')).toBeVisible(); // Each vote appears once
    await expect(resultsSection2.locator('text=/1/')).toBeVisible();
    
    // Verify agreed estimate is calculated (should be median: 5 or 8)
    const agreedEstimate1 = resultsSection1.locator('text=Agreed Estimate').locator('..').locator('.text-4xl');
    const agreedEstimate2 = resultsSection2.locator('text=Agreed Estimate').locator('..').locator('.text-4xl');
    
    await expect(agreedEstimate1).toBeVisible({ timeout: 2000 });
    await expect(agreedEstimate2).toBeVisible({ timeout: 2000 });
    
    // The estimate should be either 5 or 8 (closest to median 6.5)
    const estimate1Text = await agreedEstimate1.textContent();
    const estimate2Text = await agreedEstimate2.textContent();
    
    expect(['5', '8']).toContain(estimate1Text?.trim());
    expect(['5', '8']).toContain(estimate2Text?.trim());
    expect(estimate1Text).toBe(estimate2Text); // Both should see the same estimate
  });
});
