import React from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const MINIMUM_ORDER_AMOUNT = 500;

export const Cart = () => {
  const {
    items,
    removeItem,
    updateQuantity,
    totalPrice,
    totalItems,
  } = useCart();

  const [, setLocation] = useLocation();

  // Currently no tax / shipping charge
  const shipping = 0;
  const tax = 0;
  const finalTotal = totalPrice;

  const isMinimumOrderMet = totalPrice >= MINIMUM_ORDER_AMOUNT;
  const remainingAmount = Math.max(
    0,
    MINIMUM_ORDER_AMOUNT - totalPrice
  );

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
        <div className="h-24 w-24 bg-muted rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        </div>

        <h2 className="text-3xl font-serif font-bold mb-4">
          Your cart is empty
        </h2>

        <p className="text-muted-foreground mb-8 max-w-md">
          Looks like you haven't added any artisan treasures
          to your cart yet.
        </p>

        <Link href="/shop">
          <Button size="lg" className="h-12 px-8">
            Start Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-serif font-bold mb-8">
        Shopping Cart ({totalItems})
      </h1>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Cart Items */}
        <div className="flex-1 space-y-6">
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={`${item.productId}-${item.variant || "default"}`}
                layout
                initial={{
                  opacity: 0,
                  scale: 0.95,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                  transition: {
                    duration: 0.2,
                  },
                }}
                className="flex gap-6 p-4 rounded-xl border border-border bg-card"
              >
                <div className="h-24 w-24 sm:h-32 sm:w-32 shrink-0 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link
                        href={`/product/${item.productId}`}
                        className="font-medium text-lg hover:text-primary transition-colors"
                      >
                        {item.name}
                      </Link>

                      {item.variant && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Variant: {item.variant}
                        </p>
                      )}
                    </div>

                    <p className="font-semibold">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border border-input rounded-md h-9">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            Math.max(1, item.quantity - 1),
                            item.variant
                          )
                        }
                        className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        -
                      </button>

                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.quantity + 1,
                            item.variant
                          )
                        }
                        className="w-8 h-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        removeItem(item.productId, item.variant)
                      }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-96 shrink-0">
          <div className="p-6 rounded-xl border border-border bg-card sticky top-24">
            <h3 className="text-lg font-semibold mb-6">
              Order Summary
            </h3>

            <div className="space-y-4 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Subtotal
                </span>

                <span>
                  ₹{totalPrice.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Shipping
                </span>

                <span>
                  ₹{shipping.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Tax
                </span>

                <span>
                  ₹{tax.toFixed(2)}
                </span>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="flex justify-between font-semibold text-lg mb-4">
              <span>Total</span>

              <span>
                ₹{finalTotal.toFixed(2)}
              </span>
            </div>

            {!isMinimumOrderMet && (
              <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50">
                <p className="text-sm text-amber-700">
                  Minimum order amount is ₹500.
                  Add ₹{remainingAmount.toFixed(2)} more to checkout.
                </p>
              </div>
            )}

            <Button
              size="lg"
              className="w-full h-12"
              disabled={!isMinimumOrderMet}
              onClick={() => setLocation("/checkout")}
            >
              Proceed to Checkout
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <div className="mt-6">
              <p className="text-sm font-medium mb-2">
                Have a coupon code?
              </p>

              <div className="flex gap-2">
                <Input
                  placeholder="Enter code"
                  className="h-10"
                />

                <Button
                  variant="outline"
                  className="h-10"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};