import React, { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ShoppingBag, CreditCard, Phone, Truck } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const detailsSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName:  z.string().min(2, "Last name is required"),
  email:     z.string().email("Invalid email"),
  phone:     z.string().min(10, "Valid phone number required"),
  address:   z.string().min(5, "Address is required"),
  city:      z.string().min(2, "City is required"),
  state:     z.string().min(2, "State is required"),
  zip:       z.string().min(5, "ZIP is required"),
});

declare global {
  interface Window { Razorpay: any; }
}

export const Checkout = () => {
  const [step, setStep] = useState(1); // 1=details, 2=payment, 3=success
  const [paymentMethod, setPaymentMethod] = useState<"online"|"cod"|"phone_confirm">("online");
  const [orderData, setOrderData] = useState<any>(null);
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { items, totalPrice, clearCart } = useCart();
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();

  const shipping = totalPrice > 500 ? 0 : 99;
  const tax      = Math.round(totalPrice * 0.08);
  const total    = totalPrice + shipping + tax;

  const form = useForm<z.infer<typeof detailsSchema>>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      firstName: user?.name?.split(" ")[0] || "",
      lastName:  user?.name?.split(" ")[1] || "",
      email:     user?.email || "",
      phone: "", address: "", city: "", state: "", zip: "",
    },
  });

  const onSubmitDetails = (data: z.infer<typeof detailsSchema>) => {
    setOrderData(data);
    setStep(2);
  };

 const placeOrder = async (razorpayOrderId?: string) => {
  setLoading(true);
  try {
    const res = await fetch(`${API}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        items: items.map(i => ({
          product:  i.productId,
          name:     i.name,
          image:    i.image,
          price:    i.price,
          quantity: i.quantity,
        })),
        shippingAddress: {
          firstName: orderData.firstName,
          lastName:  orderData.lastName,
          address:   orderData.address,
          city:      orderData.city,
          state:     orderData.state,
          zip:       orderData.zip,
        },
        guestEmail:      orderData.email,
        phone:           orderData.phone,
        subtotal:        totalPrice,
        tax, shipping, total,
        paymentMethod,
        razorpayOrderId: razorpayOrderId || "",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    setPlacedOrder(data);
    clearCart();
    setStep(3);
  } catch (err: any) {
    toast.error(err.message || "Failed to place order");
  } finally {
    setLoading(false);
  }
};

  const handlePayment = async () => {
  if (paymentMethod !== "online") {
    await placeOrder();
    return;
  }

  setLoading(true);
  try {
    const res = await fetch(`${API}/payment/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: total }),
    });
    const rzpOrder = await res.json();

    const options = {
      key:         rzpOrder.key,
      amount:      rzpOrder.amount,
      currency:    rzpOrder.currency,
      name:        "Pragya Creation",
      description: "Handcrafted with love",
      order_id:    rzpOrder.orderId,
      prefill: {
        name:    `${orderData.firstName} ${orderData.lastName}`,
        email:   orderData.email,
        contact: orderData.phone,
      },
      handler: async (response: any) => {
        setLoading(true);
        try {
          // Step 1 — Save order to DB, get back the order with _id
          const orderRes = await fetch(`${API}/orders`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              items: items.map(i => ({
                product:  i.productId,
                name:     i.name,
                image:    i.image,
                price:    i.price,
                quantity: i.quantity,
              })),
              shippingAddress: {
                firstName: orderData.firstName,
                lastName:  orderData.lastName,
                address:   orderData.address,
                city:      orderData.city,
                state:     orderData.state,
                zip:       orderData.zip,
              },
              guestEmail:      orderData.email,
              phone:           orderData.phone,
              subtotal:        totalPrice,
              tax, shipping, total,
              paymentMethod:   "online",
              razorpayOrderId: rzpOrder.orderId,
            }),
          });
          const savedOrder = await orderRes.json(); // ✅ use directly, not from state
          if (!orderRes.ok) throw new Error(savedOrder.message);

          // Step 2 — Verify payment using savedOrder._id directly
          const verificationRes = await fetch(`${API}/payment/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              orderId:             savedOrder._id, // ✅ from local var, not state
            }),
          });
          const verification = await verificationRes.json();
          if (!verificationRes.ok || !verification.success) {
            throw new Error(verification.message || "Razorpay payment verification failed");
          }

          // Step 3 — Update UI
          setPlacedOrder({ ...savedOrder, paymentStatus: "paid", paymentId: verification.paymentId });
          clearCart();
          setStep(3);
        } catch (err: any) {
          toast.error(err.message || "Failed to save order after payment");
        } finally {
          setLoading(false);
        }
      },
      modal: {
        ondismiss: () => {
          setLoading(false);
          toast.error("Payment cancelled");
        }
      },
      theme: { color: "#7c3aed" },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch {
    toast.error("Could not initiate payment");
    setLoading(false);
  }
};

  // Add Razorpay script to head
  React.useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    document.head.appendChild(script);
  }, []);

  // Step 3 — Success
  // Step 3 — Success
  if (step === 3) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}
          className="h-24 w-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <Check className="h-12 w-12" />
        </motion.div>

        <h2 className="text-4xl font-serif font-bold mb-4">Order Placed!</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Thank you! Your order has been received and is being processed.
        </p>

        {placedOrder && (
          <div className="mb-8 p-6 bg-muted rounded-2xl text-sm space-y-3 w-full max-w-md text-left">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order ID</span>
              <strong>#{placedOrder._id?.slice(-8).toUpperCase()}</strong>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <strong>₹{placedOrder.total}</strong>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <strong className="capitalize">
                {paymentMethod === "cod"           && "💵 Cash on Delivery"}
                {paymentMethod === "phone_confirm" && "📞 Phone Confirmation"}
                {paymentMethod === "online"        && "✅ Paid Online"}
              </strong>
            </div>

            {paymentMethod !== "online" && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs">
                {paymentMethod === "cod"
                  ? "💵 Please keep exact change ready at time of delivery."
                  : "📞 Our team will call you within 24 hours to confirm your order and arrange payment."}
              </div>
            )}

            {/* Tracking token — important for guests */}
            {!user && placedOrder.trackingToken && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                <p className="text-blue-800 font-semibold text-xs">📦 Save Your Tracking Token</p>
                <p className="font-mono text-xs text-blue-700 break-all">{placedOrder.trackingToken}</p>
                <p className="text-blue-600 text-xs">You'll need this to track your order later.</p>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
          {/* Track order button — goes directly with token */}
          {placedOrder?.trackingToken && (
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={() => setLocation(`/track/${placedOrder.trackingToken}`)}
            >
              Track My Order
            </Button>
          )}

          {/* Logged-in users go to account orders */}
          {user && (
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={() => setLocation("/account/orders")}
            >
              View My Orders
            </Button>
          )}

          <Button size="lg" className="flex-1" onClick={() => setLocation("/")}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      {/* Steps indicator */}
      <div className="mb-12">
        <div className="flex items-center justify-center gap-4">
          {["Details", "Payment"].map((label, i) => (
            <React.Fragment key={label}>
              {i > 0 && <div className="h-[2px] w-12 bg-border" />}
              <div className={cn("flex items-center gap-2", step >= i + 1 ? "text-primary font-medium" : "text-muted-foreground")}>
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm", step >= i + 1 ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  {i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1">
          <AnimatePresence mode="wait">

            {/* Step 1 — Details */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h2 className="text-2xl font-serif font-semibold">Your Details</h2>

                {/* Login nudge for guests */}
                {!user && (
                  <div className="p-4 bg-muted rounded-xl text-sm flex items-center justify-between">
                    <span className="text-muted-foreground">Have an account? Save your order history.</span>
                    <Button variant="outline" size="sm" onClick={() => setLocation("/login")}>Login</Button>
                  </div>
                )}

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitDetails)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="firstName" render={({ field }) => (
                        <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="Jane" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="lastName" render={({ field }) => (
                        <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="jane@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" placeholder="+91 9999999999" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem><FormLabel>Street Address</FormLabel><FormControl><Input placeholder="123 Artisan Way" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-3 gap-4">
                      <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="state" render={({ field }) => (
                        <FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="zip" render={({ field }) => (
                        <FormItem><FormLabel>ZIP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </div>
                    <Button type="submit" size="lg" className="w-full">Continue to Payment</Button>
                  </form>
                </Form>
              </motion.div>
            )}

            {/* Step 2 — Payment */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-serif font-semibold">Payment Method</h2>
                  <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                </div>

                <div className="space-y-3">
                  {[
                    { value: "online",        label: "Pay Online",          sub: "Card, UPI, Netbanking via Razorpay", icon: <CreditCard className="h-5 w-5" /> },
                    { value: "cod",           label: "Cash on Delivery",    sub: "Pay when your order arrives",       icon: <Truck className="h-5 w-5" /> },
                    { value: "phone_confirm", label: "Phone Confirmation",  sub: "We'll call you to arrange payment", icon: <Phone className="h-5 w-5" /> },
                  ].map(({ value, label, sub, icon }) => (
                    <div key={value}
                      onClick={() => setPaymentMethod(value as any)}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                        paymentMethod === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      )}>
                      <div className={cn("p-2 rounded-lg", paymentMethod === value ? "bg-primary text-primary-foreground" : "bg-muted")}>
                        {icon}
                      </div>
                      <div>
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-muted-foreground">{sub}</p>
                      </div>
                      <div className={cn("ml-auto h-4 w-4 rounded-full border-2", paymentMethod === value ? "border-primary bg-primary" : "border-muted-foreground")} />
                    </div>
                  ))}
                </div>

                <Button size="lg" className="w-full h-14 text-lg" onClick={handlePayment} disabled={loading}>
                  {loading ? "Processing..." : `Place Order • ₹${total.toFixed(0)}`}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-[380px]">
          <div className="p-6 rounded-xl border border-border bg-card sticky top-24">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" /> Order Summary
            </h3>
            <div className="space-y-4 max-h-[300px] overflow-auto pr-2 mb-6">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variant}`} className="flex gap-4">
                  <img src={item.image} alt={item.name} className="h-16 w-16 rounded-md object-cover bg-muted" />
                  <div className="flex-1">
                    <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold">₹{(item.price * item.quantity).toFixed(0)}</p>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{totalPrice.toFixed(0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? "Free" : `₹${shipping}`}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax (8%)</span><span>₹{tax}</span></div>
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span><span>₹{total.toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
