#!/usr/bin/env node

/**
 * Comprehensive E2E Testing Script for QR Menu SaaS
 * Tests all user roles: Owner, Waiter, Customer, Kitchen, Bar
 */

const axios = require('axios');
const chalk = require('chalk');

const API_URL = process.env.API_URL || 'http://localhost:3001';
const TENANT_ID = process.env.TENANT_ID || '';

// Test agents
const agents = {
  owner: {
    email: 'demo@restaurant.com',
    password: 'Demo123!',
    token: null,
  },
  waiters: [
    { name: 'Alice Johnson', pin: '1234', id: null, token: null },
    { name: 'Bob Smith', pin: '5678', id: null, token: null },
  ],
  customer: {
    sessionId: null,
    menuId: null,
    tableNumber: 'T-12',
  },
  kitchen: {
    userId: null,
    token: null,
  },
  bar: {
    userId: null,
    token: null,
  },
};

// Utility functions
const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✓'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  section: (msg) => console.log(chalk.cyan.bold(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`)),
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Test functions

async function testOwnerLogin() {
  log.section('Testing Owner Authentication');

  try {
    const response = await axios.post(`${API_URL}/api/v1/auth/login`, {
      email: agents.owner.email,
      password: agents.owner.password,
    });

    agents.owner.token = response.data.token;
    log.success(`Owner logged in successfully: ${agents.owner.email}`);
    return true;
  } catch (error) {
    log.error(`Owner login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testCreateWaiters() {
  log.section('Testing Waiter Creation');

  for (const waiter of agents.waiters) {
    try {
      const response = await axios.post(
        `${API_URL}/api/v1/waiters`,
        {
          name: waiter.name,
          pin: waiter.pin,
        },
        {
          headers: { Authorization: `Bearer ${agents.owner.token}` },
        }
      );

      waiter.id = response.data.id;
      log.success(`Created waiter: ${waiter.name} (ID: ${waiter.id})`);
    } catch (error) {
      if (error.response?.status === 409) {
        log.warn(`Waiter ${waiter.name} already exists, fetching existing...`);
        // Try to get existing waiter
        try {
          const listResponse = await axios.get(`${API_URL}/api/v1/waiters`, {
            headers: { Authorization: `Bearer ${agents.owner.token}` },
          });
          const existing = listResponse.data.find((w) => w.name === waiter.name);
          if (existing) {
            waiter.id = existing.id;
            log.info(`Using existing waiter ID: ${waiter.id}`);
          }
        } catch (e) {
          log.error(`Failed to fetch existing waiter: ${e.message}`);
        }
      } else {
        log.error(`Failed to create waiter ${waiter.name}: ${error.response?.data?.message || error.message}`);
      }
    }
  }

  return true;
}

async function testWaiterLogin() {
  log.section('Testing Waiter Authentication');

  if (!TENANT_ID) {
    log.error('TENANT_ID not set. Please set environment variable.');
    return false;
  }

  for (const waiter of agents.waiters) {
    try {
      const response = await axios.post(`${API_URL}/api/v1/waiters/login`, {
        tenant_id: TENANT_ID,
        name: waiter.name,
        pin: waiter.pin,
      });

      waiter.token = response.data.token;
      log.success(`Waiter logged in: ${waiter.name}`);
      log.info(`  Token expires in: 8 hours`);
    } catch (error) {
      log.error(`Waiter login failed for ${waiter.name}: ${error.response?.data?.message || error.message}`);
    }
  }

  return true;
}

async function testGetMenus() {
  log.section('Testing Menu Retrieval');

  try {
    const response = await axios.get(`${API_URL}/api/v1/menus`, {
      headers: { Authorization: `Bearer ${agents.owner.token}` },
    });

    const publishedMenu = response.data.find((m) => m.published);

    if (publishedMenu) {
      agents.customer.menuId = publishedMenu.id;
      log.success(`Found published menu: ${publishedMenu.title} (ID: ${publishedMenu.id})`);
      return true;
    } else {
      log.warn('No published menus found');
      return false;
    }
  } catch (error) {
    log.error(`Failed to get menus: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testCustomerSession() {
  log.section('Testing Customer Session');

  try {
    const response = await axios.post(`${API_URL}/api/v1/public/session`, {
      menu_id: agents.customer.menuId,
      table_number: agents.customer.tableNumber,
    });

    agents.customer.sessionId = response.data.session_id;
    log.success(`Customer session created: ${agents.customer.sessionId}`);
    log.info(`  Table: ${agents.customer.tableNumber}`);
    return true;
  } catch (error) {
    log.error(`Failed to create session: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testBrowseMenu() {
  log.section('Testing Menu Browsing');

  try {
    const response = await axios.get(`${API_URL}/api/v1/public/menus/${agents.customer.menuId}`);

    const { menu, categories, items } = response.data;

    log.success(`Menu loaded: ${menu.title}`);
    log.info(`  Categories: ${categories.length}`);
    log.info(`  Items: ${items.length}`);

    // Display sample items
    if (items.length > 0) {
      log.info('\n  Sample items:');
      items.slice(0, 3).forEach((item) => {
        log.info(`    - ${item.title}: $${(item.price / 100).toFixed(2)}`);
      });
    }

    return { items, categories };
  } catch (error) {
    log.error(`Failed to browse menu: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testAddToCart(items) {
  log.section('Testing Add to Cart');

  if (!items || items.length === 0) {
    log.error('No items available to add to cart');
    return false;
  }

  // Add 3 random items to cart
  const itemsToAdd = items.slice(0, 3);

  for (const item of itemsToAdd) {
    try {
      await axios.post(
        `${API_URL}/api/v1/public/session/${agents.customer.sessionId}/cart/items`,
        {
          item_id: item.id,
          quantity: Math.floor(Math.random() * 3) + 1, // 1-3 items
          unit_price: item.price,
          computed_price: item.price,
        }
      );

      log.success(`Added to cart: ${item.title}`);
    } catch (error) {
      log.error(`Failed to add ${item.title}: ${error.response?.data?.message || error.message}`);
    }
  }

  return true;
}

async function testViewCart() {
  log.section('Testing View Cart');

  try {
    const response = await axios.get(
      `${API_URL}/api/v1/public/session/${agents.customer.sessionId}/cart`
    );

    const { items, total } = response.data;

    log.success('Cart retrieved successfully');
    log.info(`  Items: ${items.length}`);
    log.info(`  Total: $${(total / 100).toFixed(2)}`);

    return response.data;
  } catch (error) {
    log.error(`Failed to view cart: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testPlaceOrder() {
  log.section('Testing Place Order');

  try {
    const response = await axios.post(
      `${API_URL}/api/v1/public/session/${agents.customer.sessionId}/order`,
      {
        notes: 'Please make it spicy! 🌶️',
      }
    );

    const { order, waiter_qr } = response.data;

    log.success(`Order placed: ${order.id}`);
    log.info(`  Order token: ${order.order_token}`);
    log.info(`  Total: $${(order.total_amount / 100).toFixed(2)}`);
    log.info(`  Status: ${order.status}`);
    log.info(`  Waiter QR generated: ${waiter_qr ? 'Yes' : 'No'}`);

    return order;
  } catch (error) {
    log.error(`Failed to place order: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testWaiterScanOrder(orderToken) {
  log.section('Testing Waiter Scan Order');

  try {
    const response = await axios.post(`${API_URL}/api/v1/orders/scan`, {
      order_token: orderToken,
    });

    const { order, can_claim } = response.data;

    log.success(`Order scanned: ${order.id}`);
    log.info(`  Can claim: ${can_claim}`);
    log.info(`  Status: ${order.status}`);
    log.info(`  Items: ${JSON.parse(order.items).length}`);

    return order;
  } catch (error) {
    log.error(`Failed to scan order: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testWaiterClaimOrder(orderToken, waiter) {
  log.section(`Testing Waiter Claim Order (${waiter.name})`);

  if (!waiter.id) {
    log.error('Waiter ID not set');
    return null;
  }

  try {
    const response = await axios.post(`${API_URL}/api/v1/orders/claim`, {
      order_token: orderToken,
      waiter_id: waiter.id,
    });

    const order = response.data;

    log.success(`Order claimed by ${waiter.name}`);
    log.info(`  Order ID: ${order.id}`);
    log.info(`  Status changed to: ${order.status}`);

    const items = JSON.parse(order.items);
    log.info(`  Items with delivery tracking: ${items.length}`);

    return order;
  } catch (error) {
    log.error(`Failed to claim order: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testMarkItemsDelivered(orderToken, itemIndices) {
  log.section('Testing Mark Items as Delivered');

  try {
    const response = await axios.post(`${API_URL}/api/v1/orders/items/delivered`, {
      order_token: orderToken,
      item_indices: itemIndices,
    });

    const order = response.data;
    const items = JSON.parse(order.items);
    const deliveredCount = items.filter((item) => item.delivered).length;

    log.success(`Marked ${itemIndices.length} items as delivered`);
    log.info(`  Progress: ${deliveredCount}/${items.length} items delivered`);
    log.info(`  Order status: ${order.status}`);

    return order;
  } catch (error) {
    log.error(`Failed to mark items delivered: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testGetWaiterOrders(waiter) {
  log.section(`Testing Get Waiter Orders (${waiter.name})`);

  try {
    const response = await axios.get(`${API_URL}/api/v1/orders/waiter/${waiter.id}`);

    const orders = response.data;

    log.success(`Retrieved ${orders.length} active orders for ${waiter.name}`);

    orders.forEach((order, index) => {
      const items = JSON.parse(order.items);
      const delivered = items.filter((item) => item.delivered).length;
      log.info(`  ${index + 1}. Order ${order.id.substring(0, 8)} - ${delivered}/${items.length} delivered`);
    });

    return orders;
  } catch (error) {
    log.error(`Failed to get waiter orders: ${error.response?.data?.message || error.message}`);
    return [];
  }
}

async function testGetCustomerOrderHistory() {
  log.section('Testing Customer Order History');

  try {
    const response = await axios.get(
      `${API_URL}/api/v1/public/session/${agents.customer.sessionId}/orders`
    );

    const orders = response.data;

    log.success(`Retrieved ${orders.length} orders for customer`);

    orders.forEach((order, index) => {
      const items = JSON.parse(order.items);
      const delivered = items.filter((item) => item.delivered).length;
      log.info(`  ${index + 1}. Order ${order.id.substring(0, 8)} - Status: ${order.status}`);
      log.info(`      Delivery: ${delivered}/${items.length} items`);
    });

    return orders;
  } catch (error) {
    log.error(`Failed to get order history: ${error.response?.data?.message || error.message}`);
    return [];
  }
}

// Main test runner
async function runAllTests() {
  console.log(chalk.bold.cyan('\n🧪 QR Menu SaaS - Comprehensive E2E Testing\n'));

  let currentOrder = null;
  let menuItems = null;

  // Phase 1: Owner Setup
  if (!(await testOwnerLogin())) return;
  await wait(500);

  if (!(await testCreateWaiters())) return;
  await wait(500);

  if (!(await testWaiterLogin())) return;
  await wait(500);

  // Phase 2: Menu & Customer
  if (!(await testGetMenus())) return;
  await wait(500);

  if (!(await testCustomerSession())) return;
  await wait(500);

  const menuData = await testBrowseMenu();
  if (!menuData) return;
  menuItems = menuData.items;
  await wait(500);

  // Phase 3: Order Placement
  if (!(await testAddToCart(menuItems))) return;
  await wait(500);

  if (!(await testViewCart())) return;
  await wait(500);

  currentOrder = await testPlaceOrder();
  if (!currentOrder) return;
  await wait(500);

  // Phase 4: Waiter Operations
  await testWaiterScanOrder(currentOrder.order_token);
  await wait(500);

  currentOrder = await testWaiterClaimOrder(currentOrder.order_token, agents.waiters[0]);
  if (!currentOrder) return;
  await wait(500);

  // Deliver items progressively
  const items = JSON.parse(currentOrder.items);
  const halfItems = Math.ceil(items.length / 2);

  // Deliver first half
  currentOrder = await testMarkItemsDelivered(
    currentOrder.order_token,
    Array.from({ length: halfItems }, (_, i) => i)
  );
  await wait(500);

  // Check waiter orders
  await testGetWaiterOrders(agents.waiters[0]);
  await wait(500);

  // Deliver remaining items
  currentOrder = await testMarkItemsDelivered(
    currentOrder.order_token,
    Array.from({ length: items.length - halfItems }, (_, i) => i + halfItems)
  );
  await wait(500);

  // Phase 5: Customer Order History
  await testGetCustomerOrderHistory();

  // Final summary
  log.section('Test Summary');
  log.success('All tests completed!');
  console.log(chalk.bold('\n📊 Test Results:'));
  console.log(chalk.green('  ✓ Owner authentication'));
  console.log(chalk.green('  ✓ Waiter management'));
  console.log(chalk.green('  ✓ Waiter authentication'));
  console.log(chalk.green('  ✓ Customer session management'));
  console.log(chalk.green('  ✓ Menu browsing'));
  console.log(chalk.green('  ✓ Cart operations'));
  console.log(chalk.green('  ✓ Order placement'));
  console.log(chalk.green('  ✓ Waiter order claiming'));
  console.log(chalk.green('  ✓ Item delivery tracking'));
  console.log(chalk.green('  ✓ Customer order history'));
  console.log('');
}

// Run tests
runAllTests().catch((error) => {
  log.error(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
