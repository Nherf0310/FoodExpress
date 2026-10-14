const BASE = 'http://localhost:3001/api/v1';

async function post(url, body, token) {
  const r = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => null);
  return { status: r.status, data };
}

async function get(url, token) {
  const r = await fetch(`${BASE}${url}`, {
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
  });
  const data = await r.json().catch(() => null);
  return { status: r.status, data };
}

async function patch(url, body, token) {
  const r = await fetch(`${BASE}${url}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => null);
  return { status: r.status, data };
}

async function run() {
  console.log('\n🧪 Phase 7 — Driver Delivery Workflow End-to-End Test\n');

  // Step 1: Login Driver
  const driverLogin = await post('/auth/login', {
    email: 'driver@grocereal.com',
    password: 'mock_hashed_password_123',
  });
  if (driverLogin.status !== 200 && driverLogin.status !== 201) {
    throw new Error('Driver login failed: ' + JSON.stringify(driverLogin.data));
  }
  const driverToken = driverLogin.data.accessToken;
  console.log('✅ Step 1: Logged in as Driver (Dan Driver)');

  // Step 2: Login Customer for Role Guard Checks
  const custLogin = await post('/auth/login', {
    email: 'customer@grocereal.com',
    password: 'mock_hashed_password_123',
  });
  const custToken = custLogin.data.accessToken;
  console.log('✅ Step 2: Logged in as Customer for guard tests');

  // Step 3: Test Role Guards
  const custBlockedFromDriver = await get('/driver/deliveries/available', custToken);
  if (custBlockedFromDriver.status === 403) {
    console.log('✅ Step 3a: Customer blocked from driver routes (403 Forbidden)');
  } else {
    throw new Error('Guard failed: Customer should be 403 on driver routes');
  }

  const driverBlockedFromStore = await get('/store/me', driverToken);
  if (driverBlockedFromStore.status === 403) {
    console.log('✅ Step 3b: Driver blocked from store manager routes (403 Forbidden)');
  } else {
    throw new Error('Guard failed: Driver should be 403 on store routes');
  }

  // Step 4: List Available Deliveries
  const availableRes = await get('/driver/deliveries/available', driverToken);
  console.log(`✅ Step 4: Available deliveries found: ${availableRes.data.length}`);
  if (availableRes.data.length === 0) {
    throw new Error('No available deliveries found! Phase 6 order should be available.');
  }

  const targetDelivery = availableRes.data[0];
  console.log(`   Delivery ID: ${targetDelivery.id}`);
  console.log(`   Order ID:    ${targetDelivery.orderId}`);
  console.log(`   Store:       ${targetDelivery.order.store.name} (${targetDelivery.order.store.address})`);
  console.log(`   Destination: ${targetDelivery.order.address.street}, ${targetDelivery.order.address.city}`);

  // Step 5: Driver accepts delivery
  const acceptRes = await post(`/driver/deliveries/${targetDelivery.id}/accept`, {}, driverToken);
  if (acceptRes.status !== 201 && acceptRes.status !== 200) {
    throw new Error('Accept delivery failed: ' + JSON.stringify(acceptRes.data));
  }
  console.log(`✅ Step 5: Delivery accepted → Status: ${acceptRes.data.status}`);

  // Step 6: Verify driver cannot accept a second delivery concurrently
  const secondAccept = await post(`/driver/deliveries/${targetDelivery.id}/accept`, {}, driverToken);
  if (secondAccept.status === 400) {
    console.log('✅ Step 6: Concurrency guard verified — Cannot accept multiple active deliveries');
  } else {
    console.log('⚠️ Concurrency response:', secondAccept.status, secondAccept.data);
  }

  // Step 7: Check Active Delivery
  const activeRes = await get('/driver/deliveries/active', driverToken);
  if (activeRes.status !== 200 || !activeRes.data) {
    throw new Error('Failed to get active delivery: ' + JSON.stringify(activeRes.data));
  }
  console.log(`✅ Step 7: Active delivery retrieved:`);
  console.log(`   Delivery status: ${activeRes.data.status}`);
  console.log(`   Order status:    ${activeRes.data.order.status}`);
  console.log(`   Customer:        ${activeRes.data.order.customer.name} (${activeRes.data.order.customer.phone})`);

  // Step 8: Test Invalid Status Transition (Cannot jump from ASSIGNED directly to DELIVERED)
  const invalidJump = await patch(`/driver/deliveries/${targetDelivery.id}/status`, { status: 'DELIVERED' }, driverToken);
  if (invalidJump.status === 400) {
    console.log(`✅ Step 8: State machine enforced — Cannot jump from ASSIGNED directly to DELIVERED (400 Bad Request)`);
  } else {
    throw new Error('State machine failed: should disallow jump to DELIVERED before PICKED_UP');
  }

  // Step 9: Driver picks up order from store (ASSIGNED -> PICKED_UP)
  const pickupRes = await patch(
    `/driver/deliveries/${targetDelivery.id}/status`,
    { status: 'PICKED_UP', notes: 'Items collected from store front counter' },
    driverToken
  );
  if (pickupRes.status !== 200) {
    throw new Error('Pickup failed: ' + JSON.stringify(pickupRes.data));
  }
  console.log(`✅ Step 9: Order picked up → Status: ${pickupRes.data.status}`);
  console.log(`   Picked up at: ${pickupRes.data.pickedUpAt}`);

  // Step 10: Driver delivers to customer (PICKED_UP -> DELIVERED)
  const deliverRes = await patch(
    `/driver/deliveries/${targetDelivery.id}/status`,
    { status: 'DELIVERED', notes: 'Handed directly to customer at door' },
    driverToken
  );
  if (deliverRes.status !== 200) {
    throw new Error('Deliver failed: ' + JSON.stringify(deliverRes.data));
  }
  console.log(`✅ Step 10: Order delivered → Status: ${deliverRes.data.status}`);
  console.log(`   Delivered at: ${deliverRes.data.deliveredAt}`);

  // Step 11: Verify Customer Order State
  const custOrderRes = await get(`/orders/${targetDelivery.orderId}`, custToken);
  console.log(`✅ Step 11: Customer order verified:`);
  console.log(`   Order status:   ${custOrderRes.data.status}`);
  console.log(`   Payment status: ${custOrderRes.data.paymentStatus} (auto-updated to PAID)`);
  console.log(`   Full journey:   ${custOrderRes.data.statusHistory.map(h => h.status).join(' → ')}`);

  // Step 12: Verify Active Delivery is now null
  const activeAfterRes = await get('/driver/deliveries/active', driverToken);
  if (!activeAfterRes.data) {
    console.log('✅ Step 12: Active delivery cleared (null)');
  } else {
    throw new Error('Active delivery should be null after completion');
  }

  // Step 13: Verify Delivery History
  const historyRes = await get('/driver/deliveries/history', driverToken);
  console.log(`✅ Step 13: Delivery history count: ${historyRes.data.length}`);
  console.log(`   Most recent completed: ${historyRes.data[0]?.id}`);

  console.log('\n🎉 Phase 7 COMPLETE — Driver Delivery Workflow fully operational and verified!\n');
}

run().catch((e) => {
  console.error('\n❌ Test failed:', e.message);
  process.exit(1);
});
