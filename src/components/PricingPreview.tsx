import { useNavigate } from "react-router-dom";
import { Check, Sparkles, Zap, Building2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

const PricingPreview = () => {
  const navigate = useNavigate();

  const tiers = [
    {
      name: "Free",
      icon: Zap,
      price: "$0",
      period: "/month",
      description: "10 analyses/month",
      highlighted: false,
    },
    {
      name: "Pro",
      icon: Sparkles,
      price: "$20",
      period: "/month",
      description: "Unlimited analyses",
      highlighted: true,
      badge: "Most Popular",
    },
    {
      name: "Enterprise",
      icon: Building2,
      price: "Custom",
      period: "",
      description: "For teams",
      highlighted: false,
    },
  ];

  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Start free, upgrade when you need more
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative transition-all duration-300 hover:translate-y-[-4px] ${
                tier.highlighted
                  ? "border-primary glow-primary bg-gradient-to-b from-primary/10 to-card"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              {tier.highlighted && tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3">
                    {tier.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pt-8 pb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mx-auto mb-3">
                  <tier.icon className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-xl font-bold text-foreground">{tier.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-foreground">{tier.price}</span>
                  <span className="text-muted-foreground">{tier.period}</span>
                </div>
              </CardHeader>

              <CardContent className="text-center pb-6">
                <p className="text-muted-foreground">{tier.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button
            variant="link"
            onClick={() => navigate("/pricing")}
            className="text-primary hover:text-primary/80"
          >
            View full pricing details →
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PricingPreview;
