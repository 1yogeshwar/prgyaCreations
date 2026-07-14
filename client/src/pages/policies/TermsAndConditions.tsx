import React from "react";

export const TermsAndConditions = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-20 max-w-5xl">
        <h1 className="font-serif text-4xl font-bold mb-6">Terms & Conditions</h1>
        <p className="text-muted-foreground mb-8">
          Please read our terms carefully to understand your rights and responsibilities when using our site.
        </p>

        <section className="mb-8">
          <h2 className="font-semibold text-2xl mb-3">Use of the Site</h2>
          <p className="mb-4">
            By using this website, you agree to comply with our terms, provide accurate information, and accept the policies described here.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-semibold text-2xl mb-3">Order Acceptance</h2>
          <p className="mb-4">
            All orders are subject to acceptance and availability. We reserve the right to refuse or cancel any order at our discretion.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-2xl mb-3">Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the site after changes indicates your acceptance of the revised terms.
          </p>
        </section>
      </div>
    </div>
  );
};