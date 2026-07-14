import React from "react";

export const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-20 max-w-5xl">
        <h1 className="font-serif text-4xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">
          We are committed to protecting your privacy and handling your data responsibly.
        </p>

        <section className="mb-8">
          <h2 className="font-semibold text-2xl mb-3">Information We Collect</h2>
          <p className="mb-4">
            We collect information needed to process orders, handle customer support, and improve our services. This may include your name, email, shipping address, and payment details.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-semibold text-2xl mb-3">How We Use Your Data</h2>
          <p className="mb-4">
            We use your information to fulfill orders, communicate about your purchases, and send marketing messages if you opt in.
          </p>
          <p>
            We do not sell your personal data to third parties.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-2xl mb-3">Security</h2>
          <p>
            We take reasonable measures to protect your information and maintain secure systems, but no online transmission can be guaranteed to be completely secure.
          </p>
        </section>
      </div>
    </div>
  );
};