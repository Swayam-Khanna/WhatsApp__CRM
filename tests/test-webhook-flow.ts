import { GET, POST } from "../app/api/webhooks/whatsapp/route.ts";
import { GET as getMessages } from "../app/api/crm/messages/route.ts";
import { NextRequest } from "next/server.js";

async function test() {
  console.log("--- 1. Testing Meta Webhook Verification Handshake ---");
  const reqGet = new NextRequest(
    "http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=test_challenge_abc_123&hub.verify_token=prajnaa_whatsapp_verify_token"
  );
  const resGet = await GET(reqGet);
  const textGet = await resGet.text();
  console.log("Handshake status:", resGet.status, "Challenge returned:", textGet);
  if (textGet !== "test_challenge_abc_123") {
    throw new Error("Handshake verification failed");
  }

  console.log("--- 2. Testing Inbound Customer Message via Webhook ---");
  const testId = `wamid_test_${Date.now()}`;
  const mockPayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "1116143707469110",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "918091265690", phone_number_id: "1395630476965721" },
              contacts: [{ profile: { name: "Vikram Malhotra" }, wa_id: "919876501234" }],
              messages: [
                {
                  from: "919876501234",
                  id: testId,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: "Namaste ji, Prajnaa Honey ka price kya hai?" },
                  type: "text",
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };

  const reqPost = new NextRequest("http://localhost:3000/api/webhooks/whatsapp", {
    method: "POST",
    headers: { "x-crm-source": "internal-test", "Content-Type": "application/json" },
    body: JSON.stringify(mockPayload),
  });
  const resPost = await POST(reqPost);
  console.log("Inbound POST status:", resPost.status);

  console.log("--- 3. Verifying in /api/crm/messages ---");
  const reqMsg = new NextRequest("http://localhost:3000/api/crm/messages");
  const resMsg = await getMessages(reqMsg);
  const jsonMsg = await resMsg.json();
  const found = jsonMsg.messages?.find((m: any) => m.id === testId);
  console.log("Found inbound test message in CRM:", found ? { text: found.text, from: found.from, name: found.customerName } : "Not found");

  if (!found) {
    throw new Error("Message not found in CRM messages");
  }

  console.log("--- 4. Testing Admin Phone Outbound from WhatsApp Mobile App ---");
  const adminTestId = `wamid_admin_${Date.now()}`;
  const mockAdminPayload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "1116143707469110",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "918091265690", phone_number_id: "1395630476965721" },
              contacts: [{ profile: { name: "Customer Sunil" }, wa_id: "919811223344" }],
              messages: [
                {
                  from: "918091265690",
                  id: adminTestId,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  text: { body: "Haanji Sunil ji, aapka parcel dispatch kar diya hai" },
                  type: "text",
                  recipient_id: "919811223344",
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };

  const reqAdminPost = new NextRequest("http://localhost:3000/api/webhooks/whatsapp", {
    method: "POST",
    headers: { "x-crm-source": "internal-test", "Content-Type": "application/json" },
    body: JSON.stringify(mockAdminPayload),
  });
  const resAdminPost = await POST(reqAdminPost);
  console.log("Admin Outbound POST status:", resAdminPost.status);

  const resMsg2 = await getMessages(reqMsg);
  const jsonMsg2 = await resMsg2.json();
  const adminMsg = jsonMsg2.messages?.find((m: any) => m.id === adminTestId);
  console.log("Found admin phone message in CRM:", adminMsg ? { direction: adminMsg.direction, sender: adminMsg.sender, to: adminMsg.to, text: adminMsg.text } : "Not found");

  if (!adminMsg) {
    throw new Error("Admin phone outbound message not found in CRM messages");
  }

  console.log("--- 5. Testing Webhook Alias Endpoints ---");
  const { GET: getAlias1 } = await import("../app/api/whatsapp/webhook/route.ts");
  const { GET: getAlias2 } = await import("../app/api/webhook/whatsapp/route.ts");
  const { GET: getAlias3 } = await import("../app/api/webhook/route.ts");

  for (const [name, fn] of [
    ["/api/whatsapp/webhook", getAlias1],
    ["/api/webhook/whatsapp", getAlias2],
    ["/api/webhook", getAlias3],
  ] as const) {
    const r = new NextRequest(`http://localhost:3000${name}?hub.mode=subscribe&hub.challenge=alias_ok&hub.verify_token=prajnaa_whatsapp_verify_token`);
    const res = await fn(r);
    const body = await res.text();
    console.log(`Endpoint ${name}: status ${res.status}, challenge: ${body}`);
    if (body !== "alias_ok") throw new Error(`Alias failed for ${name}`);
  }

  console.log("\n>>> ALL TESTS PASSED! WEBHOOK & CRM PIPELINE FULLY OPERATIONAL! <<<");
  process.exit(0);
}

test().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
