import React from "react";

export const ContactUs = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-20 max-w-5xl">
        <h1 className="font-serif text-4xl font-bold mb-6">Contact Us</h1>
        <p className="text-muted-foreground mb-8">
          Have a question or need help? Reach out and we’ll get back to you as soon as possible.
        </p>

        <section className="mb-8">
          <h2 className="font-semibold text-2xl mb-3">Customer Support</h2>
          <p className="mb-4">
            Email: <a className="text-primary underline" href="mailto:support@craftworld.com">support@craftworld.com</a>
          </p>
          <p className="mb-4">
            Phone: <a className="text-primary underline" href="tel:+911234567890">+91 12345 67890</a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-semibold text-2xl mb-3">Business Hours</h2>
          <p>Monday to Friday: 9:00 AM – 6:00 PM</p>
          <p>Saturday: 10:00 AM – 4:00 PM</p>
          <p>Sunday: Closed</p>
        </section>

        <section>
          <h2 className="font-semibold text-2xl mb-3">Support Topics</h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>Order status and tracking</li>
            <li>Returns, cancellations, and refunds</li>
            <li>Product care and materials</li>
            <li>Custom order inquiries</li>
          </ul>
        </section>
      </div>
    </div>
  );
};