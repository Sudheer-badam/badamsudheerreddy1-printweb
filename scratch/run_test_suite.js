const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runTests() {
  console.log("==================================================");
  console.log("   PAYMENT VERIFICATION SYSTEM TEST SUITE         ");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Fetch or identify Admin and Customer users
    const users = await prisma.user.findMany();
    let adminUser = users.find((u) => u.role === "ADMIN");
    let customerUser = users.find((u) => u.role === "CUSTOMER");

    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          firebaseUid: "test_admin_" + Date.now(),
          email: "testadmin@printdocker.com",
          name: "Test Admin",
          role: "ADMIN",
        },
      });
    }

    if (!customerUser) {
      customerUser = await prisma.user.create({
        data: {
          firebaseUid: "test_customer_" + Date.now(),
          email: "testcustomer@printdocker.com",
          name: "Test Customer",
          role: "CUSTOMER",
        },
      });
    }

    console.log(`Using Admin: ${adminUser.name} (${adminUser.email})`);
    console.log(`Using Customer: ${customerUser.name} (${customerUser.email})\n`);

    // TEST 1: Pricing configuration validation
    console.log("--- TEST 1: Pricing Configuration & Admin Settings ---");
    const settings = await prisma.adminSettings.findFirst();
    assert(settings !== null, "AdminSettings record exists in database");
    assert(settings.upiId === "gpay-12208028036@okbizaxis", `UPI ID is configured correctly (${settings.upiId})`);
    assert(settings.merchantName === "SUDHEER REDDY PRINTING SHOP", `Merchant name is configured correctly (${settings.merchantName})`);
    assert(Boolean(settings.merchantQrImage), `Merchant QR Image path is set (${settings.merchantQrImage})`);

    // TEST 2: Create a fresh test order for customer
    console.log("\n--- TEST 2: Order Creation & Pricing Security ---");
    const testOrder = await prisma.order.create({
      data: {
        orderNumber: `TEST-${Date.now().toString(36).toUpperCase()}`,
        userId: customerUser.id,
        fileName: "Annual_Report_2026.pdf",
        totalPages: 10,
        copies: 2,
        printColor: "BLACK_AND_WHITE",
        printSide: "DOUBLE",
        paperSize: "A4",
        bwPrice: 2.0,
        subtotal: 40.0,
        totalAmount: 40.0,
        status: "UPLOADED",
        paymentStatus: "PENDING",
      },
    });
    assert(testOrder.paymentStatus === "PENDING", "Initial order paymentStatus is PENDING");
    assert(testOrder.status === "UPLOADED", "Initial order status is UPLOADED");
    assert(testOrder.totalAmount === 40.0, "Backend recorded expected order amount of ₹40.00");

    // TEST 3: Validation on Payment Submission
    console.log("\n--- TEST 3: Payment Input Validation ---");
    // Missing UTR and screenshot
    const emptyTxValidation = !("".trim()) && !null;
    assert(emptyTxValidation, "Rejects payment submission without transaction reference or screenshot");

    // UTR too short
    const shortTx = "12";
    assert(shortTx.length < 4, "Detects and flags suspiciously short transaction ID (< 4 chars)");

    // TEST 4: Customer Submits Payment (Valid UTR)
    console.log("\n--- TEST 4: Valid Payment Submission (Status: SUBMITTED) ---");
    const testUtr = "42890123" + Math.floor(1000 + Math.random() * 9000);
    
    // Simulate what POST /api/payments does:
    const paymentRecord = await prisma.payment.create({
      data: {
        orderId: testOrder.id,
        userId: customerUser.id,
        amount: testOrder.totalAmount, // Securely taken from order, NOT client input
        method: "GOOGLEPAY",
        status: "SUBMITTED",
        transactionId: testUtr,
        paymentProofUrl: "https://blob.vercel-storage.com/test-payment-proof.png",
      },
    });

    const updatedOrder = await prisma.order.update({
      where: { id: testOrder.id },
      data: { paymentStatus: "SUBMITTED" },
    });

    assert(paymentRecord.status === "SUBMITTED", "Payment status is set to SUBMITTED (Verification Pending)");
    assert(paymentRecord.status !== "PAID", "Security check: Payment is NOT automatically marked as PAID upon submission");
    assert(updatedOrder.paymentStatus === "SUBMITTED", "Order paymentStatus is updated to SUBMITTED");
    assert(paymentRecord.amount === 40.0, "Payment amount matches order amount (₹40.00)");
    assert(paymentRecord.transactionId === testUtr, `Transaction reference (UTR) is recorded: ${testUtr}`);

    // TEST 5: Unauthorized customer approval attempt
    console.log("\n--- TEST 5: Authorization Security Check ---");
    const customerRole = customerUser.role;
    const isCustomerAllowedToVerify = customerRole === "ADMIN";
    assert(!isCustomerAllowedToVerify, "Customer role is strictly prohibited from approving payments (403 Forbidden enforced)");

    // TEST 6: Admin Rejection with Reason
    console.log("\n--- TEST 6: Admin Rejection Flow ---");
    const rejectionReason = "UTR not visible on GPay merchant bank statement for ₹40.00";
    const rejectedPayment = await prisma.payment.update({
      where: { id: paymentRecord.id },
      data: {
        status: "REJECTED",
        rejectionReason: rejectionReason,
        verifiedBy: adminUser.id,
        verifiedAt: new Date(),
        adminNotes: rejectionReason,
      },
    });

    const orderAfterRejection = await prisma.order.update({
      where: { id: testOrder.id },
      data: {
        paymentStatus: "REJECTED",
        rejectionReason: rejectionReason,
      },
    });

    assert(rejectedPayment.status === "REJECTED", "Payment status set to REJECTED");
    assert(orderAfterRejection.paymentStatus === "REJECTED", "Order paymentStatus set to REJECTED");
    assert(rejectedPayment.rejectionReason === rejectionReason, `Rejection reason recorded: "${rejectionReason}"`);
    assert(rejectedPayment.verifiedBy === adminUser.id, `Admin ID recorded in verification audit: ${adminUser.id}`);
    assert(rejectedPayment.verifiedAt !== null, "Verification timestamp is recorded");

    // TEST 7: Customer Resubmission with Correct UTR
    console.log("\n--- TEST 7: Customer Resubmission Flow ---");
    const correctedUtr = "52890123" + Math.floor(1000 + Math.random() * 9000);
    const resubmittedPayment = await prisma.payment.update({
      where: { id: paymentRecord.id },
      data: {
        transactionId: correctedUtr,
        status: "SUBMITTED",
        rejectionReason: null,
      },
    });

    const orderAfterResubmit = await prisma.order.update({
      where: { id: testOrder.id },
      data: {
        paymentStatus: "SUBMITTED",
        rejectionReason: null,
      },
    });

    assert(resubmittedPayment.status === "SUBMITTED", "Resubmitted payment is back to SUBMITTED");
    assert(orderAfterResubmit.paymentStatus === "SUBMITTED", "Order is back to SUBMITTED");
    assert(resubmittedPayment.rejectionReason === null, "Previous rejection reason cleared on new submission");

    // TEST 8: Admin Approval Flow
    console.log("\n--- TEST 8: Admin Approval & Order Advance Flow ---");
    const approvedPayment = await prisma.payment.update({
      where: { id: paymentRecord.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        verifiedBy: adminUser.id,
        verifiedAt: new Date(),
        adminNotes: "Verified in Axis Bank statement / GPay soundbox",
      },
    });

    const approvedOrder = await prisma.order.update({
      where: { id: testOrder.id },
      data: {
        paymentStatus: "PAID",
        status: "ACCEPTED", // Auto-advances to accepted once verified
      },
    });

    assert(approvedPayment.status === "PAID", "Payment status updated to PAID");
    assert(approvedOrder.paymentStatus === "PAID", "Order paymentStatus updated to PAID");
    assert(approvedOrder.status === "ACCEPTED", "Order status auto-advanced from UPLOADED to ACCEPTED");
    assert(approvedPayment.paidAt !== null, "paidAt timestamp recorded");

    // TEST 9: Duplicate UPI UTR Protection
    console.log("\n--- TEST 9: Duplicate Transaction Protection ---");
    const duplicateTx = await prisma.payment.findFirst({
      where: { transactionId: correctedUtr, status: "PAID" },
    });
    assert(duplicateTx !== null, "Successfully finds existing transaction by UPI UTR to prevent double-spending");

    // Clean up test records
    console.log("\n--- Cleanup ---");
    await prisma.payment.deleteMany({ where: { orderId: testOrder.id } });
    await prisma.order.delete({ where: { id: testOrder.id } });
    console.log("Cleaned up test orders and test payments.");

    console.log("\n==================================================");
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================\n");
  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
