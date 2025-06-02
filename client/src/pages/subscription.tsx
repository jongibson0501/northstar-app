import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Welcome to Northstar Premium!",
      });
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full bg-accent hover:bg-accent/90 text-white py-4 rounded-lg font-medium"
      >
        {isProcessing ? "Processing..." : "Start Premium Trial"}
      </Button>
    </form>
  );
};

export default function Subscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("annual");
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (showPayment) {
      // Create subscription when user decides to subscribe
      apiRequest("POST", "/api/get-or-create-subscription")
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch((error) => {
          toast({
            title: "Error",
            description: "Failed to setup subscription. Please try again.",
            variant: "destructive",
          });
          setShowPayment(false);
        });
    }
  }, [showPayment, toast]);

  if (user?.subscriptionStatus === "active") {
    return (
      <div className="min-h-screen bg-background text-secondary pb-20">
        <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen">
          <section className="p-4">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-2xl font-medium text-gray-800 mb-2">You're Premium!</h2>
              <p className="text-gray-600">Enjoy unlimited access to all features</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (showPayment && clientSecret) {
    return (
      <div className="min-h-screen bg-background text-secondary pb-20">
        <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen">
          <section className="p-4">
            <div className="mb-6">
              <h2 className="text-xl font-medium text-gray-800 mb-2">Complete Your Subscription</h2>
              <p className="text-gray-600">Secure payment powered by Stripe</p>
            </div>

            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <SubscribeForm />
            </Elements>

            <Button 
              variant="outline"
              onClick={() => setShowPayment(false)}
              className="w-full mt-4"
            >
              Back to Plans
            </Button>
          </section>
        </div>
      </div>
    );
  }

  if (showPayment && !clientSecret) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-secondary pb-20">
      <div className="max-w-md mx-auto bg-white shadow-xl min-h-screen">
        <section className="p-4">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-2xl font-medium text-gray-800 mb-2">Unlock Your Potential</h2>
            <p className="text-gray-600">Get unlimited goals and advanced features</p>
          </div>

          {/* Pricing Cards */}
          <div className="space-y-4 mb-8">
            <Card 
              className={`cursor-pointer transition-all ${
                selectedPlan === "annual" 
                  ? "border-2 border-accent bg-accent/5" 
                  : "border-2 border-gray-200"
              }`}
              onClick={() => setSelectedPlan("annual")}
            >
              <CardContent className="p-6 relative">
                {selectedPlan === "annual" && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-accent text-white px-4 py-1 rounded-full text-sm font-medium">
                    Best Value
                  </div>
                )}
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-800">Annual Plan</h3>
                  <div className="my-4">
                    <span className="text-3xl font-bold text-gray-800">$4</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Billed annually at $48</p>
                  <div className="bg-success/10 text-success text-sm font-medium px-3 py-1 rounded-full inline-block">
                    Save 20%
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${
                selectedPlan === "monthly" 
                  ? "border-2 border-accent bg-accent/5" 
                  : "border-2 border-gray-200"
              }`}
              onClick={() => setSelectedPlan("monthly")}
            >
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-800">Monthly Plan</h3>
                  <div className="my-4">
                    <span className="text-3xl font-bold text-gray-800">$5</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <p className="text-sm text-gray-600">Billed monthly</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features List */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="font-medium text-gray-800 mb-4">Premium Features</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-success" />
                  <span className="text-gray-700">Unlimited goals and roadmaps</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-success" />
                  <span className="text-gray-700">Advanced AI-powered prompts</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-success" />
                  <span className="text-gray-700">Export roadmaps as PDF</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-success" />
                  <span className="text-gray-700">Priority customer support</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-success" />
                  <span className="text-gray-700">Custom milestone templates</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={() => setShowPayment(true)}
            className="w-full bg-accent hover:bg-accent/90 text-white py-4 rounded-lg font-medium mb-4"
          >
            Start Premium Trial
            <span className="text-sm opacity-90 block mt-1">
              7 days free, then ${selectedPlan === "annual" ? "4" : "5"}/month
            </span>
          </Button>

          <p className="text-xs text-gray-500 text-center">
            Cancel anytime. No hidden fees. Secure payment by Stripe.
          </p>
        </section>
      </div>
    </div>
  );
}
