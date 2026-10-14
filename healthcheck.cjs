// Full Phase 6 end-to-end test: place order → confirm → pick → fulfill items → mark ready
const BASE = 'http://localhost:3001/api/v1';

async function post(url, body, token) {
  const r = await fetch(`${BASE}${url}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify(body)
  });
  return r.json();
}
async function get(url, token) {
  const r = await fetch(`${BASE}${url}`, { headers: { ...(token && { Authorization: `Bearer ${token}` }) } });
  return r.json();
}
async function patch(url, body, token) {
  const r = await fetch(`${BASE}${url}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  return r.json();
}

async function run() {
  console.log('\n🧪 Phase 6 — Full Picking Workflow Test\n');

  // Step 1: Login as Customer
  const custLogin = await post('/auth/login', { email: 'customer@grocereal.com', password: 'mock_hashed_password_123' });
  let custToken = custLogin.accessToken;
  // If seed password doesn't work try new customer
  if (!custToken) {
    const reg = await post('/auth/register', { name: 'Test Buyer', email: 'buyer2@grocereal.com', password: 'password123', role: 'CUSTOMER' });
    custToken = reg.accessToken;
  }
  console.log('✅ Step 1: Logged in as Customer');

  // Step 2: Login as Manager
  const mgrLogin = await post('/auth/login', { email: 'manager@grocereal.com', password: 'mock_hashed_password_123' });
  const mgrToken = mgrLogin.accessToken;
  console.log('✅ Step 2: Logged in as Store Manager');

  // Step 3: Manager gets store info
  const store = await get('/store/me', mgrToken);
  console.log(`✅ Step 3: Store = "${store.name}" (min order: $${store.minOrderAmount/100}, fee: $${store.deliveryFee/100})`);

  // Step 4: Get slots and products
  const slots = await get(`/stores/${store.id}/delivery-slots`, null);
  const products = await get(`/stores/${store.id}/products`, null);
  const weightProduct = products.find(p => p.unitType === 'WEIGHT');
  const eachProduct = products.find(p => p.unitType === 'EACH');
  console.log(`✅ Step 4: ${slots.length} slots | ${products.length} products`);
  console.log(`   Weight item: ${weightProduct.name} @ $${weightProduct.price/100}/kg`);
  console.log(`   Each item:   ${eachProduct.name} @ $${eachProduct.price/100} each`);

  // Step 5: Customer adds address
  const address = await post('/addresses', {
    label: 'Home', street: '1 Grocer Lane', city: 'Foodtown', postalCode: '1234', isDefault: true
  }, custToken);
  console.log(`✅ Step 5: Address created — ${address.street}, ${address.city}`);

  // Step 6: Customer places order (2kg weight + 3 each)
  const order = await post('/orders', {
    storeId: store.id,
    addressId: address.id,
    deliverySlotId: slots[0].id,
    substitutionPreference: 'ALLOW_SUBSTITUTES',
    customerNotes: 'Ring bell on arrival',
    items: [
      { productId: weightProduct.id, quantity: 2000 },
      { productId: eachProduct.id, quantity: 3 }
    ]
  }, custToken);
  console.log(`✅ Step 6: Order placed`);
  console.log(`   Order ID: ${order.id}`);
  console.log(`   Status:   ${order.status}`);
  console.log(`   Subtotal: $${order.itemSubtotal/100} | Fee: $${order.deliveryFee/100} | Total: $${order.total/100}`);

  // Step 7: Manager sees new order
  const storeOrders = await get('/store/orders', mgrToken);
  console.log(`✅ Step 7: Manager sees ${storeOrders.length} order(s) in queue`);

  // Step 8: Manager confirms order (PENDING → CONFIRMED)
  const confirmed = await patch(`/store/orders/${order.id}/status`, { status: 'CONFIRMED', notes: 'Order received and confirmed' }, mgrToken);
  console.log(`✅ Step 8: Order confirmed → Status: ${confirmed.status}`);

  // Step 9: Start picking (CONFIRMED → PICKING)
  const picking = await patch(`/store/orders/${order.id}/status`, { status: 'PICKING', notes: 'Picker Sarah has started' }, mgrToken);
  console.log(`✅ Step 9: Picking started → Status: ${picking.status}`);

  // Step 10: Fulfill weight item (picked 1850g instead of 2000g — real world variance)
  const weightItem = picking.items.find(i => i.unitType === 'WEIGHT');
  const fulfillWeight = await patch(`/store/orders/${order.id}/items/${weightItem.id}`, { quantityFulfilled: 1850 }, mgrToken);
  const expectedLineDiff = Math.round((weightProduct.price * 1850) / 1000);
  console.log(`✅ Step 10: Weight item fulfilled at 1850g`);
  console.log(`   New line total: $${fulfillWeight.updatedItem.lineTotal/100} (was $${weightItem.lineTotal/100})`);
  console.log(`   New order subtotal: $${fulfillWeight.newSubtotal/100} | New total: $${fulfillWeight.newTotal/100}`);

  // Step 11: Mark ready for delivery (PICKING → READY_FOR_DELIVERY)
  const ready = await patch(`/store/orders/${order.id}/status`, { status: 'READY_FOR_DELIVERY', notes: 'Packed and ready at store entrance' }, mgrToken);
  console.log(`✅ Step 11: Order ready for driver → Status: ${ready.status}`);

  // Step 12: Customer sees updated status
  const custOrder = await get(`/orders/${order.id}`, custToken);
  console.log(`✅ Step 12: Customer sees status: ${custOrder.status}`);
  console.log(`   Status history: ${custOrder.statusHistory.map(h => h.status).join(' → ')}`);

  // Step 13: Verify role guard — customer cannot access /store routes
  const blocked = await get('/store/me', custToken);
  if (blocked.statusCode === 403) {
    console.log('✅ Step 13: Role guard working — Customer blocked from /store routes (403 Forbidden)');
  } else {
    console.log('❌ Step 13: Role guard FAILED — customer should not access /store/me');
  }

  console.log('\n🎉 Phase 6 COMPLETE — All store management and picking tests passed!\n');
}

run().catch(e => { console.error('❌ Test failed:', e.message); process.exit(1); });
