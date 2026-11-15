// Automated verification script for Loop MVP backend
import http from 'node:http';

async function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Loop MVP Backend Verification ---');

  // Dynamically import the server (boots express + ws on port 5000)
  await import('./dist/index.js');
  await new Promise((r) => setTimeout(r, 1000));

  console.log('[1] Testing Alice Login...');
  const aliceLogin = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'alice@loop.app', password: 'password123' }
  );

  if (aliceLogin.status !== 200 || !aliceLogin.body.token) {
    throw new Error(`Alice login failed: status ${aliceLogin.status}`);
  }
  const aliceToken = aliceLogin.body.token;
  console.log('    ✓ Alice logged in successfully. User:', aliceLogin.body.user.display_name);

  console.log('[2] Testing Bob Login...');
  const bobLogin = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'bob@loop.app', password: 'password123' }
  );

  if (bobLogin.status !== 200 || !bobLogin.body.token) {
    throw new Error(`Bob login failed: status ${bobLogin.status}`);
  }
  const bobToken = bobLogin.body.token;
  console.log('    ✓ Bob logged in successfully. User:', bobLogin.body.user.display_name);

  console.log('[3] Fetching Alice Chats...');
  const aliceChats = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/chats',
    method: 'GET',
    headers: { Authorization: `Bearer ${aliceToken}` },
  });

  if (aliceChats.status !== 200 || !Array.isArray(aliceChats.body.chats)) {
    throw new Error(`Fetch chats failed: status ${aliceChats.status}`);
  }
  console.log(`    ✓ Alice has ${aliceChats.body.chats.length} active conversation(s).`);
  const activeChat = aliceChats.body.chats[0];

  console.log('[4] Fetching Message History for Chat:', activeChat.id);
  const messages = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: `/api/chats/${activeChat.id}/messages`,
    method: 'GET',
    headers: { Authorization: `Bearer ${aliceToken}` },
  });

  if (messages.status !== 200 || !Array.isArray(messages.body.messages)) {
    throw new Error(`Fetch messages failed: status ${messages.status}`);
  }
  console.log(`    ✓ Loaded ${messages.body.messages.length} message(s). Last message: "${messages.body.messages[0].content}"`);

  console.log('[5] Testing Bob Mark Chat As Read...');
  const markRead = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: `/api/chats/${activeChat.id}/read`,
    method: 'POST',
    headers: { Authorization: `Bearer ${bobToken}` },
  });

  if (markRead.status !== 200) {
    throw new Error(`Mark read failed: status ${markRead.status}`);
  }
  console.log('    ✓ Bob marked messages as READ. Read receipts updated.');

  console.log('[6] Testing User Search Endpoint...');
  const search = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/users/search?q=Bob',
    method: 'GET',
    headers: { Authorization: `Bearer ${aliceToken}` },
  });

  if (search.status !== 200 || !Array.isArray(search.body.users) || search.body.users.length === 0) {
    throw new Error(`Search failed: status ${search.status}`);
  }
  console.log(`    ✓ Search returned contact: ${search.body.users[0].display_name} (${search.body.users[0].email})`);

  console.log('[7] Testing Root SPA Serving...');
  const rootSpa = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/',
    method: 'GET',
  });

  if (rootSpa.status !== 200 || typeof rootSpa.body !== 'string' || !rootSpa.body.includes('Loop Messenger')) {
    throw new Error(`Root SPA check failed: status ${rootSpa.status}`);
  }
  console.log('    ✓ Static SPA served correctly with HTML title "Loop Messenger".');

  console.log('\n======================================================');
  console.log('  ALL MVP VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
