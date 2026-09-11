import React, { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  motion,
  AnimatePresence,
} from "framer-motion";
import {
  Check,
  ShoppingBag,
  CreditCard,
} from "lucide-react";

import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const API =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const MINIMUM_ORDER_AMOUNT = 500;

const detailsSchema = z.object({
  firstName: z
    .string()
    .min(2, "First name is required"),

  lastName: z
    .string()
    .min(2, "Last name is required"),

  email: z
    .string()
    .email("Invalid email"),

  phone: z
    .string()
    .min(10, "Valid phone number required"),

  address: z
    .string()
    .min(5, "Address is required"),

  city: z
    .string()
    .min(2, "City is required"),

  state: z
    .string()
    .min(2, "State is required"),

  zip: z
    .string()
    .min(5, "ZIP is required"),
});

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const Checkout = () => {
  const [step, setStep] = useState(1);

  // Only online payment enabled for now
  const paymentMethod = "online";

  const [orderData, setOrderData] =
    useState<any>(null);

  const [placedOrder, setPlacedOrder] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(false);

  const {
    items,
    totalPrice,
    clearCart,
  } = useCart();

  const {
    user,
    token,
  } = useAuth();

  const [, setLocation] = useLocation();

  // Current pricing rules
  const shipping = 0;
  const tax = 0;
  const total = totalPrice;

  const isMinimumOrderMet =
    totalPrice >= MINIMUM_ORDER_AMOUNT;

  const remainingAmount = Math.max(
    0,
    MINIMUM_ORDER_AMOUNT - totalPrice
  );

  const form = useForm<
    z.infer<typeof detailsSchema>
  >({
    resolver: zodResolver(detailsSchema),

    defaultValues: {
      firstName:
        user?.name?.split(" ")[0] || "",

      lastName:
        user?.name?.split(" ")[1] || "",

      email:
        user?.email || "",

      phone: "",
      address: "",
      city: "",
      state: "",
      zip: "",
    },
  });

  const onSubmitDetails = (
    data: z.infer<typeof detailsSchema>
  ) => {
    if (!isMinimumOrderMet) {
      toast.error(
        `Minimum order value is ₹${MINIMUM_ORDER_AMOUNT}`
      );

      return;
    }

    setOrderData(data);
    setStep(2);
  };

  const handlePayment = async () => {
    if (!isMinimumOrderMet) {
      toast.error(
        `Minimum order value is ₹${MINIMUM_ORDER_AMOUNT}`
      );

      return;
    }

    if (!orderData) {
      toast.error(
        "Please enter your delivery details first"
      );

      setStep(1);
      return;
    }

    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (!window.Razorpay) {
      toast.error(
        "Payment service is still loading. Please try again."
      );

      return;
    }

    setLoading(true);

    try {
      /*
       * IMPORTANT:
       * We do NOT send total/amount.
       *
       * Backend calculates real total using
       * product prices from MongoDB.
       */
      const paymentRes = await fetch(
        `${API}/payment/create-order`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            items: items.map((item) => ({
              product: item.productId,
              quantity: item.quantity,

              // Preserve variant if present
              selectedColor:
                item.variant || "",

              selectedSize: "",
            })),
          }),
        }
      );

      const rzpOrder =
        await paymentRes.json();

      if (!paymentRes.ok) {
        throw new Error(
          rzpOrder.message ||
          "Could not create payment order"
        );
      }

      const options = {
        key: rzpOrder.key,

        amount: rzpOrder.amount,

        currency: rzpOrder.currency,

        name: "Pragya Creations",

        description:
          "Handcrafted with love",

        order_id:
          rzpOrder.orderId,

        prefill: {
          name:
            `${orderData.firstName} ${orderData.lastName}`,

          email:
            orderData.email,

          contact:
            orderData.phone,
        },

        handler: async (
          response: any
        ) => {
          setLoading(true);

          try {
            /*
             * Save customer order.
             *
             * Backend recalculates product prices,
             * minimum ₹500, tax and shipping.
             */
            const orderRes =
              await fetch(
                `${API}/orders`,
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json",

                    ...(token
                      ? {
                          Authorization:
                            `Bearer ${token}`,
                        }
                      : {}),
                  },

                  body:
                    JSON.stringify({
                      items:
                        items.map(
                          (item) => ({
                            product:
                              item.productId,

                            quantity:
                              item.quantity,

                            selectedColor:
                              item.variant ||
                              "",

                            selectedSize:
                              "",
                          })
                        ),

                      shippingAddress: {
                        firstName:
                          orderData.firstName,

                        lastName:
                          orderData.lastName,

                        address:
                          orderData.address,

                        city:
                          orderData.city,

                        state:
                          orderData.state,

                        zip:
                          orderData.zip,
                      },

                      guestEmail:
                        orderData.email,

                      phone:
                        orderData.phone,

                      paymentMethod:
                        "online",

                      razorpayOrderId:
                        rzpOrder.orderId,
                    }),
                }
              );

            const savedOrder =
              await orderRes.json();

            if (!orderRes.ok) {
              throw new Error(
                savedOrder.message ||
                "Could not save order"
              );
            }

            /*
             * Verify Razorpay signature
             * and mark order paid.
             */
            const verificationRes =
              await fetch(
                `${API}/payment/verify`,
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body:
                    JSON.stringify({
                      razorpay_order_id:
                        response.razorpay_order_id,

                      razorpay_payment_id:
                        response.razorpay_payment_id,

                      razorpay_signature:
                        response.razorpay_signature,

                      orderId:
                        savedOrder._id,
                    }),
                }
              );

            const verification =
              await verificationRes.json();

            if (
              !verificationRes.ok ||
              !verification.success
            ) {
              throw new Error(
                verification.message ||
                "Razorpay payment verification failed"
              );
            }

            setPlacedOrder({
              ...savedOrder,

              paymentStatus:
                "paid",

              paymentId:
                verification.paymentId,
            });

            clearCart();

            setStep(3);
          } catch (err: any) {
            toast.error(
              err.message ||
              "Failed to save order after payment"
            );
          } finally {
            setLoading(false);
          }
        },

        modal: {
          ondismiss: () => {
            setLoading(false);

            toast.error(
              "Payment cancelled"
            );
          },
        },

        theme: {
          color: "#7c3aed",
        },
      };

      const razorpay =
        new window.Razorpay(options);

      razorpay.open();
    } catch (err: any) {
      toast.error(
        err.message ||
        "Could not initiate payment"
      );

      setLoading(false);
    }
  };

  /*
   * Load Razorpay checkout script.
   */
  React.useEffect(() => {
    if (
      document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      )
    ) {
      return;
    }

    const script =
      document.createElement("script");

    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";

    script.async = true;

    document.head.appendChild(script);

    return () => {
      // Razorpay script can remain loaded globally.
    };
  }, []);

  /*
   * Empty cart protection.
   */
  if (
    items.length === 0 &&
    step !== 3
  ) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />

        <h2 className="text-2xl font-serif font-bold mb-3">
          Your cart is empty
        </h2>

        <p className="text-muted-foreground mb-6">
          Add products to your cart before checkout.
        </p>

        <Button
          onClick={() =>
            setLocation("/shop")
          }
        >
          Continue Shopping
        </Button>
      </div>
    );
  }

  /*
   * Step 3 — Success
   */
  if (step === 3) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{
            scale: 0,
          }}
          animate={{
            scale: 1,
          }}
          transition={{
            type: "spring",
            bounce: 0.5,
          }}
          className="h-24 w-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6"
        >
          <Check className="h-12 w-12" />
        </motion.div>

        <h2 className="text-4xl font-serif font-bold mb-4">
          Order Placed!
        </h2>

        <p className="text-muted-foreground mb-6 max-w-md">
          Thank you! Your payment was successful
          and your order has been received.
        </p>

        {placedOrder && (
          <div className="mb-8 p-6 bg-muted rounded-2xl text-sm space-y-3 w-full max-w-md text-left">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Order ID
              </span>

              <strong>
                #
                {placedOrder._id
                  ?.slice(-8)
                  .toUpperCase()}
              </strong>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Total
              </span>

              <strong>
                ₹
                {Number(
                  placedOrder.total
                ).toFixed(2)}
              </strong>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Payment
              </span>

              <strong>
                ✅ Paid Online
              </strong>
            </div>

            {!user &&
              placedOrder.trackingToken && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                  <p className="text-blue-800 font-semibold text-xs">
                    📦 Save Your Tracking Token
                  </p>

                  <p className="font-mono text-xs text-blue-700 break-all">
                    {
                      placedOrder.trackingToken
                    }
                  </p>

                  <p className="text-blue-600 text-xs">
                    You'll need this to
                    track your order later.
                  </p>
                </div>
              )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
          {placedOrder?.trackingToken && (
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={() =>
                setLocation(
                  `/track/${placedOrder.trackingToken}`
                )
              }
            >
              Track My Order
            </Button>
          )}

          {user && (
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={() =>
                setLocation(
                  "/account/orders"
                )
              }
            >
              View My Orders
            </Button>
          )}

          <Button
            size="lg"
            className="flex-1"
            onClick={() =>
              setLocation("/")
            }
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      {/* Step indicator */}
      <div className="mb-12">
        <div className="flex items-center justify-center gap-4">
          {[
            "Details",
            "Payment",
          ].map(
            (label, index) => (
              <React.Fragment
                key={label}
              >
                {index > 0 && (
                  <div className="h-[2px] w-12 bg-border" />
                )}

                <div
                  className={cn(
                    "flex items-center gap-2",

                    step >=
                      index + 1
                      ? "text-primary font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm",

                      step >=
                        index + 1
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {index + 1}
                  </span>

                  <span className="hidden sm:inline">
                    {label}
                  </span>
                </div>
              </React.Fragment>
            )
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {/* Step 1 */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{
                  opacity: 0,
                  x: -20,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                exit={{
                  opacity: 0,
                  x: -20,
                }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-serif font-semibold">
                  Your Details
                </h2>

                {!isMinimumOrderMet && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm text-amber-700">
                      Minimum order value
                      is ₹500. Add ₹
                      {remainingAmount.toFixed(
                        2
                      )}{" "}
                      more to continue.
                    </p>
                  </div>
                )}

                {!user && (
                  <div className="p-4 bg-muted rounded-xl text-sm flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Have an account?
                      Save your order
                      history.
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setLocation(
                          "/login"
                        )
                      }
                    >
                      Login
                    </Button>
                  </div>
                )}

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(
                      onSubmitDetails
                    )}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={
                          form.control
                        }
                        name="firstName"
                        render={({
                          field,
                        }) => (
                          <FormItem>
                            <FormLabel>
                              First Name
                            </FormLabel>

                            <FormControl>
                              <Input
                                placeholder="Jane"
                                {...field}
                              />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={
                          form.control
                        }
                        name="lastName"
                        render={({
                          field,
                        }) => (
                          <FormItem>
                            <FormLabel>
                              Last Name
                            </FormLabel>

                            <FormControl>
                              <Input
                                placeholder="Doe"
                                {...field}
                              />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={
                        form.control
                      }
                      name="email"
                      render={({
                        field,
                      }) => (
                        <FormItem>
                          <FormLabel>
                            Email
                          </FormLabel>

                          <FormControl>
                            <Input
                              type="email"
                              placeholder="jane@example.com"
                              {...field}
                            />
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={
                        form.control
                      }
                      name="phone"
                      render={({
                        field,
                      }) => (
                        <FormItem>
                          <FormLabel>
                            Phone
                          </FormLabel>

                          <FormControl>
                            <Input
                              type="tel"
                              placeholder="+91 9999999999"
                              {...field}
                            />
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={
                        form.control
                      }
                      name="address"
                      render={({
                        field,
                      }) => (
                        <FormItem>
                          <FormLabel>
                            Street Address
                          </FormLabel>

                          <FormControl>
                            <Input
                              placeholder="123 Artisan Way"
                              {...field}
                            />
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <FormField
                        control={
                          form.control
                        }
                        name="city"
                        render={({
                          field,
                        }) => (
                          <FormItem>
                            <FormLabel>
                              City
                            </FormLabel>

                            <FormControl>
                              <Input
                                {...field}
                              />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={
                          form.control
                        }
                        name="state"
                        render={({
                          field,
                        }) => (
                          <FormItem>
                            <FormLabel>
                              State
                            </FormLabel>

                            <FormControl>
                              <Input
                                {...field}
                              />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={
                          form.control
                        }
                        name="zip"
                        render={({
                          field,
                        }) => (
                          <FormItem>
                            <FormLabel>
                              ZIP
                            </FormLabel>

                            <FormControl>
                              <Input
                                {...field}
                              />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={
                        !isMinimumOrderMet
                      }
                    >
                      Continue to Payment
                    </Button>
                  </form>
                </Form>
              </motion.div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{
                  opacity: 0,
                  x: 20,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                exit={{
                  opacity: 0,
                  x: 20,
                }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-serif font-semibold">
                    Payment Method
                  </h2>

                  <Button
                    variant="ghost"
                    onClick={() =>
                      setStep(1)
                    }
                  >
                    Back
                  </Button>
                </div>

                {/* Only online payment visible */}
                <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-primary bg-primary/5">
                  <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                    <CreditCard className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="font-medium">
                      Pay Online
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Card, UPI,
                      Netbanking via
                      Razorpay
                    </p>
                  </div>

                  <div className="ml-auto h-4 w-4 rounded-full border-2 border-primary bg-primary" />
                </div>

                {/* COD intentionally hidden for now.
                    Later we can enable it here. */}

                <Button
                  size="lg"
                  className="w-full h-14 text-lg"
                  onClick={
                    handlePayment
                  }
                  disabled={
                    loading ||
                    !isMinimumOrderMet
                  }
                >
                  {loading
                    ? "Processing..."
                    : `Pay Online • ₹${total.toFixed(
                        2
                      )}`}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-[380px]">
          <div className="p-6 rounded-xl border border-border bg-card sticky top-24">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Order Summary
            </h3>

            <div className="space-y-4 max-h-[300px] overflow-auto pr-2 mb-6">
              {items.map(
                (item) => (
                  <div
                    key={`${item.productId}-${item.variant || "default"}`}
                    className="flex gap-4"
                  >
                    <img
                      src={
                        item.image
                      }
                      alt={
                        item.name
                      }
                      className="h-16 w-16 rounded-md object-cover bg-muted"
                    />

                    <div className="flex-1">
                      <p className="text-sm font-medium line-clamp-1">
                        {
                          item.name
                        }
                      </p>

                      <p className="text-xs text-muted-foreground">
                        Qty:{" "}
                        {
                          item.quantity
                        }
                      </p>
                    </div>

                    <p className="text-sm font-semibold">
                      ₹
                      {(
                        item.price *
                        item.quantity
                      ).toFixed(
                        2
                      )}
                    </p>
                  </div>
                )
              )}
            </div>

            <Separator className="my-4" />

            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Subtotal
                </span>

                <span>
                  ₹
                  {totalPrice.toFixed(
                    2
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Shipping
                </span>

                <span>
                  ₹
                  {shipping.toFixed(
                    2
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Tax
                </span>

                <span>
                  ₹
                  {tax.toFixed(
                    2
                  )}
                </span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between font-semibold text-lg">
              <span>
                Total
              </span>

              <span>
                ₹
                {total.toFixed(
                  2
                )}
              </span>
            </div>

            {!isMinimumOrderMet && (
              <p className="mt-4 text-sm text-amber-700">
                Minimum order
                value is ₹500.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function cn(
  ...classes: (
    | string
    | undefined
    | null
    | false
  )[]
) {
  return classes
    .filter(Boolean)
    .join(" ");
}