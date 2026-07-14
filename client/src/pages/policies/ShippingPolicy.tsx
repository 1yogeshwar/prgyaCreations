import React from "react";

export const ShippingPolicy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-20 max-w-5xl">
        <h1 className="font-serif text-4xl font-bold mb-6">Shipping Policy</h1>
        <p className="text-muted-foreground mb-8">
          Learn how we package and ship your order, plus delivery expectations and shipping costs.
        </p>

        <section className="mb-8">
          <h2 className="font-semibold text-2xl mb-3">Processing Time</h2>
          <p className="mb-4">
            Most orders are processed within 1-3 business days. Custom orders may take longer depending on the design and materials.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-semibold text-2xl mb-3">Delivery Time</h2>
          <p className="mb-4">
            Standard delivery within India generally takes 3-7 business days after dispatch. International delivery times vary by destination.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-2xl mb-3">Shipping Costs</h2>
          <p>
            Shipping fees are calculated at checkout based on weight, delivery address, and shipping method.
          </p>
        </section>
      </div>
    </div>
  );
};