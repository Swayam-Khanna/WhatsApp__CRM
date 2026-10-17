import test from "node:test";
import assert from "node:assert/strict";

// Import handlers directly for testing
import {
  GET as getAddresses,
  POST as postAddress,
  PATCH as patchAddress,
  DELETE as deleteAddress,
} from "../app/api/account/addresses/route.ts";

import {
  GET as getWishlist,
  POST as postWishlist,
  DELETE as deleteWishlist,
} from "../app/api/account/wishlist/route.ts";

import {
  GET as getNotifications,
  POST as postNotifications,
} from "../app/api/account/notifications/route.ts";

import {
  GET as getRecentlyViewed,
  POST as postRecentlyViewed,
  DELETE as deleteRecentlyViewed,
} from "../app/api/account/recently-viewed/route.ts";

test("Account pages APIs operate cleanly under DATA_PROVIDER", async (t) => {
  const testUserId = "fI2iZKDI6SWmIpfHgu1xfLpYPLA3"; // Migrated user in Neon profiles

  await t.test("Addresses: CRUD operates cleanly", async () => {
    // 1. Create Address
    const postReq = new Request("http://localhost:3000/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: testUserId,
        label: "Farm Office",
        full_name: "Swayam Khanna",
        phone: "+919876543210",
        line1: "123 Green Valley Road",
        line2: "Near Orchard",
        city: "Delhi",
        state: "Delhi",
        postal_code: "110001",
        country: "IN",
        is_default: true,
      }),
    });
    const postRes = await postAddress(postReq);
    assert.equal(postRes.status, 200);
    const postData = await postRes.json();
    assert.equal(postData.success, true);
    const createdId = postData.data.id;
    assert.ok(createdId);

    // 2. Fetch Addresses
    const getReq = new Request(`http://localhost:3000/api/account/addresses?userId=${testUserId}`);
    const getRes = await getAddresses(getReq);
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.ok(Array.isArray(getData.data));
    const found = getData.data.find((a) => a.id === createdId);
    assert.ok(found);
    assert.equal(found.label, "Farm Office");

    // 3. Set Default
    const patchReq = new Request("http://localhost:3000/api/account/addresses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: createdId, userId: testUserId }),
    });
    const patchRes = await patchAddress(patchReq);
    assert.equal(patchRes.status, 200);

    // 4. Delete Address
    const delReq = new Request(
      `http://localhost:3000/api/account/addresses?id=${createdId}&userId=${testUserId}`,
      { method: "DELETE" }
    );
    const delRes = await deleteAddress(delReq);
    assert.equal(delRes.status, 200);
  });

  await t.test("Notifications: GET and POST preferences", async () => {
    // 1. Save preferences
    const postReq = new Request("http://localhost:3000/api/account/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: testUserId,
        order_updates_email: true,
        order_updates_sms: false,
        promotions_email: false,
        promotions_sms: false,
        newsletter: true,
      }),
    });
    const postRes = await postNotifications(postReq);
    assert.equal(postRes.status, 200);

    // 2. Fetch preferences
    const getReq = new Request(`http://localhost:3000/api/account/notifications?userId=${testUserId}`);
    const getRes = await getNotifications(getReq);
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.equal(getData.data.order_updates_sms, false);
    assert.equal(getData.data.newsletter, true);
  });
});
