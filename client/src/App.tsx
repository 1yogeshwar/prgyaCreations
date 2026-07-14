import React from "react";
import { Route, Switch } from "wouter";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/sonner";
import { Home } from "@/pages/Home";
import { Shop } from "@/pages/Shop";
import { ProductDetails } from "@/pages/ProductDetails";
import { Cart } from "@/pages/Cart";
import { Checkout } from "@/pages/Checkout";
import { TrackOrder } from "@/pages/TrackOrder";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
import { AccountLayout } from "@/pages/account/AccountLayout";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import { About } from "@/pages/About";
import { Contact } from "@/pages/Contact";
import { CancellationsAndRefunds } from "@/pages/policies/CancellationsAndRefunds";
import { ContactUs } from "@/pages/policies/ContactUs";
import { PrivacyPolicy } from "@/pages/policies/PrivacyPolicy";
import { ShippingPolicy } from "@/pages/policies/ShippingPolicy";
import { TermsAndConditions } from "@/pages/policies/TermsAndConditions";
import { CustomOrderPage } from "@/pages/CustomOrders";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="craftly-theme">
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
              <Switch>
                <Route path="/admin" component={AdminLayout} />
                <Route path="/admin/:rest*" component={AdminLayout} />

                <Route>
                  <Navbar />
                  <main className="flex-1">
                    <Switch>
                      <Route path="/" component={Home} />
                      <Route path="/shop" component={Shop} />
                      <Route path="/shop/category/:slug/:subslug" component={Shop} />
                      <Route path="/shop/category/:slug" component={Shop} />
                      <Route path="/product/:slug" component={ProductDetails} />
                      <Route path="/cart" component={Cart} />
                      <Route path="/checkout" component={Checkout} />
                      <Route path="/track/:token" component={TrackOrder} />
                      <Route path="/track" component={TrackOrder} />
                      <Route path="/login" component={Login} />
                      <Route path="/register" component={Register} />
                      <Route path="/account" component={AccountLayout} />
                      <Route path="/account/:rest*" component={AccountLayout} />
                      <Route path="/about" component={About} />
                      <Route path="/contact" component={Contact} />
                      <Route path="/policies/cancellations-and-refunds" component={CancellationsAndRefunds} />
                      <Route path="/policies/contact-us" component={ContactUs} />
                      <Route path="/policies/privacy-policy" component={PrivacyPolicy} />
                      <Route path="/policies/shipping-policy" component={ShippingPolicy} />
                      <Route path="/policies/terms-and-conditions" component={TermsAndConditions} />
                      <Route path="/custom" component={CustomOrderPage} />
                      <Route component={() => (
                        <div className="p-20 text-center">
                          <p className="font-serif text-4xl text-foreground">404</p>
                          <p className="text-muted-foreground mt-2">Page not found</p>
                        </div>
                      )} />
                    </Switch>
                  </main>
                  <Footer />
                </Route>
              </Switch>
            </div>
            <Toaster position="bottom-center" />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
