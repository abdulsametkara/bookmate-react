const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = 'http://localhost:5000/api';

// Test token (you'll need a real one from login)
let authToken = null;

async function testLogin() {
    try {
        console.log('🔐 Testing login...');
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@bookmate.com',
                password: 'test123'
            })
        });
        
        const data = await response.json();
        if (response.ok && data.token) {
            authToken = data.token;
            console.log('✅ Login successful, token obtained');
            return true;
        } else {
            console.log('❌ Login failed:', data.message);
            return false;
        }
    } catch (error) {
        console.error('❌ Login error:', error.message);
        return false;
    }
}

async function testUserSearch() {
    if (!authToken) {
        console.log('❌ No auth token available');
        return;
    }
    
    try {
        console.log('\n🔍 Testing user search...');
        const response = await fetch(`${API_BASE}/shared-reading/search-users?query=test`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        console.log(`📡 Response status: ${response.status}`);
        console.log('📄 Response data:', JSON.stringify(data, null, 2));
        
        if (response.ok) {
            console.log(`✅ User search successful, found ${data.length} users`);
        } else {
            console.log('❌ User search failed:', data.message);
        }
    } catch (error) {
        console.error('❌ User search error:', error.message);
    }
}

async function testFriends() {
    if (!authToken) {
        console.log('❌ No auth token available');
        return;
    }
    
    try {
        console.log('\n👥 Testing friends list...');
        const response = await fetch(`${API_BASE}/shared-reading/friends`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        console.log(`📡 Response status: ${response.status}`);
        console.log('📄 Response data:', JSON.stringify(data, null, 2));
        
        if (response.ok) {
            console.log(`✅ Friends list successful, found ${data.length} friends`);
        } else {
            console.log('❌ Friends list failed:', data.message);
        }
    } catch (error) {
        console.error('❌ Friends list error:', error.message);
    }
}

async function testFriendRequests() {
    if (!authToken) {
        console.log('❌ No auth token available');
        return;
    }
    
    try {
        console.log('\n📨 Testing friend requests...');
        const response = await fetch(`${API_BASE}/shared-reading/friend-requests/incoming`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        console.log(`📡 Response status: ${response.status}`);
        console.log('📄 Response data:', JSON.stringify(data, null, 2));
        
        if (response.ok) {
            console.log(`✅ Friend requests successful, found ${data.length} requests`);
        } else {
            console.log('❌ Friend requests failed:', data.message);
        }
    } catch (error) {
        console.error('❌ Friend requests error:', error.message);
    }
}

async function testBadges() {
    if (!authToken) {
        console.log('❌ No auth token available');
        return;
    }
    
    try {
        console.log('\n🏆 Testing badges...');
        const response = await fetch(`${API_BASE}/shared-reading/badges`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        console.log(`📡 Response status: ${response.status}`);
        console.log('📄 Response data:', JSON.stringify(data, null, 2));
        
        if (response.ok) {
            console.log(`✅ Badges successful, found ${data.length} badges`);
        } else {
            console.log('❌ Badges failed:', data.message);
        }
    } catch (error) {
        console.error('❌ Badges error:', error.message);
    }
}

async function runAllTests() {
    console.log('🚀 Starting Shared Reading API Tests...\n');
    
    const loginSuccess = await testLogin();
    if (!loginSuccess) {
        console.log('\n💥 Cannot continue without authentication');
        return;
    }
    
    await testUserSearch();
    await testFriends();
    await testFriendRequests();
    await testBadges();
    
    console.log('\n✨ All tests completed!');
}

// Run tests
runAllTests().catch(console.error); 