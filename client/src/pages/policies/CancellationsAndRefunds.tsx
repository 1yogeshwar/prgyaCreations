import React from "react";

export const CancellationsAndRefunds = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-20 max-w-5xl">
        <h1 className="font-serif text-4xl font-bold mb-6">Cancellations & Refunds</h1>
        <p className="text-muted-foreground mb-8">
          We understand plans can change. Please review our cancellation and refund terms below.
        </p>

        <section className="mb-8">
          <h2 className="font-semibold text-2xl mb-3">Order Cancellations</h2>
          <p className="mb-4">
            Orders can be cancelled within 24 hours of purchase. After this period, the order may already be in production and may not be cancellable.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-semibold text-2xl mb-3">Refund Eligibility</h2>
          <p className="mb-4">
            Refunds are issued for damaged items, incorrect shipments, or if we are unable to fulfill your order. Custom and personalized products may be subject to special terms.
          </p>
          <p>
            If you believe your order qualifies for a refund, please contact us within 7 days of delivery.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-2xl mb-3">How Refunds Work</h2>
          <p>
            Approved refunds are returned to the original payment method and may take 5-10 business days to appear in your account.
          </p>
        </section>
      </div>
    </div>
  );
};