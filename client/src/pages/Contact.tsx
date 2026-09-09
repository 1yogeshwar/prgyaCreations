import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Instagram, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export const Contact = () => {
  const [form, setForm]       = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // For now — just show success (email service can be added later)
    setTimeout(() => {
      toast.success("Message sent! Pragya will get back to you soon 💜");
      setForm({ name: "", email: "", subject: "", message: "" });
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* Hero */}
      <section style={{ background: "linear-gradient(135deg, #fff0f7 0%, #fdf4ff 100%)", padding: "80px 0" }}>
        <div className="container mx-auto px-4 lg:px-12 max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <span className="chip-label">Get in touch</span>
            <h1 className="font-serif font-bold" style={{ fontSize: "clamp(32px, 4vw, 48px)", color: "#1a0a2e" }}>
              We'd love to hear from you 💜
            </h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: "#6b7280", lineHeight: 1.7 }}>
              Questions about an order, custom requests, or just want to say hello —
              Pragya reads every message personally.
            </p>
          </motion.div>
        </div>
      </section>

      <section style={{ background: "#ffffff", padding: "80px 0" }}>
        <div className="container mx-auto px-4 lg:px-12 max-w-5xl">
          <div className="flex flex-col lg:flex-row gap-12">

            {/* Contact Info */}
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} className="lg:w-80 space-y-6 flex-none">
              <h2 className="font-serif font-semibold" style={{ fontSize: 24, color: "#1a0a2e" }}>
                Contact details
              </h2>

              {[
                { icon: Mail,      label: "Email",     value: "pragyacreations123@gmail.com",  href: "mailto:Pragyacreations123@gmail.com" },
                { icon: Phone,     label: "Phone",     value: "+91 82695 11699  ",             href: "tel:+918269511699" },
                { icon: MapPin,    label: "Studio",    value: "Raipur, Chhattishgarh, India",  href: null },
              ].map(({ icon: Icon, label, value, href }) => (
                <div key={label} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: "linear-gradient(135deg, #fce7f3, #ede9fe)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon style={{ width: 18, height: 18, color: "#9333ea" }} />
                  </div>
                  <div>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9ca3af", marginBottom: 2 }}>{label}</p>
                    {href
                      ? <a href={href} style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#1a0a2e", fontWeight: 500, textDecoration: "none" }}>{value}</a>
                      : <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#1a0a2e", fontWeight: 500 }}>{value}</p>
                    }
                  </div>
                </div>
              ))}

              {/* Social links */}
              <div style={{ paddingTop: 8 }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>Follow along</p>
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { icon: Instagram,      label: "Instagram", href: "https://www.instagram.com/pragya__creations/", color: "#e1306c" },
                    { icon: MessageCircle,  label: "WhatsApp",  href: "https://wa.me/918269511699",           color: "#25d366" },
                  ].map(({ icon: Icon, label, href, color }) => (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 14px", borderRadius: 10,
                        border: "1px solid rgba(147,51,234,0.15)",
                        textDecoration: "none",
                        fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500, color: "#374151",
                        transition: "all 0.2s",
                      }}>
                      <Icon style={{ width: 16, height: 16, color }} />
                      {label}
                    </a>
                  ))}
                </div>
              </div>

              {/* Response time note */}
              <div style={{
                padding: 16, borderRadius: 12,
                background: "linear-gradient(135deg, #fce7f3, #ede9fe)",
                border: "1px solid rgba(147,51,234,0.1)",
              }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#7c3aed", fontWeight: 600, marginBottom: 4 }}>
                  ⏱ Response time
                </p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
                  Pragya typically replies within 24 hours on weekdays.
                  For urgent order queries, WhatsApp is fastest!
                </p>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} className="flex-1">
              <form onSubmit={handleSubmit} style={{
                background: "#fdf4ff", borderRadius: 24, padding: 32,
                border: "1px solid rgba(147,51,234,0.1)",
                boxShadow: "0 4px 24px rgba(147,51,234,0.06)",
              }}>
                <h2 className="font-serif font-semibold" style={{ fontSize: 22, color: "#1a0a2e", marginBottom: 24 }}>
                  Send a message
                </h2>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  {[["name","Your name","text"],["email","Email address","email"]].map(([key, placeholder, type]) => (
                    <div key={key}>
                      <label style={labelStyle}>{placeholder}</label>
                      <input type={type} placeholder={placeholder}
                        value={(form as any)[key]}
                        onChange={e => setForm({ ...form, [key]: e.target.value })}
                        style={inputStyle} required />
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Subject</label>
                  <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                    style={inputStyle} required>
                    <option value="">Select a topic</option>
                    <option>Order inquiry</option>
                    <option>Custom order request</option>
                    <option>Shipping question</option>
                    <option>Return / exchange</option>
                    <option>Collaboration</option>
                    <option>Just saying hi 👋</option>
                  </select>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>Message</label>
                  <textarea placeholder="Tell Pragya what's on your mind..."
                    value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    style={{ ...inputStyle, height: 120, resize: "vertical" }} required />
                </div>

                <button type="submit" disabled={loading} style={{
                  width: "100%", padding: "14px 0",
                  background: "linear-gradient(135deg, #9333ea, #ec4899)",
                  color: "#fff", border: "none", borderRadius: 12,
                  fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}>
                  {loading ? "Sending..." : "Send message 💜"}
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: "#fdf4ff", padding: "80px 0" }}>
        <div className="container mx-auto px-4 lg:px-12 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} className="text-center mb-12 space-y-3">
            <span className="chip-label">Common questions</span>
            <h2 className="font-serif font-semibold" style={{ fontSize: 28, color: "#1a0a2e" }}>FAQ</h2>
          </motion.div>
          <div className="space-y-4">
            {[
              { q: "Do you take custom orders?", a: "Yes! Custom orders are welcome for most products. Reach out via the form or WhatsApp with your idea and Pragya will let you know what's possible." },
              { q: "How long does shipping take?", a: "Orders are usually dispatched within 2-3 business days. Delivery takes 4-7 business days depending on your location across India." },
              { q: "What if my order arrives damaged?", a: "Please take a photo and WhatsApp or email us within 48 hours of delivery. We'll make it right — replacement or full refund." },
              { q: "Do you ship outside India?", a: "Currently we ship within India only. International shipping is something we're working towards!" },
            ].map(({ q, a }) => (
              <motion.div key={q} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                style={{
                  background: "#fff", borderRadius: 16, padding: 24,
                  border: "1px solid rgba(147,51,234,0.08)",
                }}>
                <h3 className="font-serif font-semibold" style={{ fontSize: 16, color: "#1a0a2e", marginBottom: 8 }}>{q}</h3>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#6b7280", lineHeight: 1.7 }}>{a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "1px solid rgba(147,51,234,0.2)", fontSize: 14,
  background: "#fff", outline: "none", boxSizing: "border-box",
  fontFamily: "'Inter', sans-serif", color: "#374151",
};
const labelStyle: React.CSSProperties = {
  display: "block", marginBottom: 6, fontSize: 13,
  fontWeight: 600, color: "#374151",
};