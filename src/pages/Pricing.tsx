import { useState } from "react";
import { Check, X, Zap, Building2, Star, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Pricing = () => {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);

  const tiers = [
    {
      name: "Free",
      icon: Zap,
      price: { monthly: 0, yearly: 0 },
      badge: "Perfect for students",
      badgeVariant: "secondary" as const,
      highlighted: false,
      features: [
        { name: "10 repository analyses per month", included: true },
        { name: "Basic AI insights", included: true },
        { name: "Architecture detection", included: true },
        { name: "Code health scoring", included: true },
        { name: "Community support", included: true },
        { name: "Public repositories only", included: true },
      ],
      button: { text: "Get Started", variant: "default" as const },
    },
    {
      name: "Pro",
      icon: Star,
      price: { monthly: 20, yearly: 16 },
      badge: "Most Popular",
      badgeVariant: "default" as const,
      highlighted: true,
      features: [
        { name: "Unlimited repository analyses", included: true },
        { name: "Advanced AI insights with GPT-4", included: true },
        { name: "Chat with codebase (RAG)", included: true },
        { name: "Private repository support", included: true },
        { name: "Export to PDF/Markdown", included: true },
        { name: "Shareable analysis links", included: true },
        { name: "Priority support", included: true },
        { name: "Architecture diagrams", included: true },
        { name: "Design pattern detection", included: true },
        { name: "Security vulnerability scanning", included: true },
      ],
      button: { text: "Upgrade to Pro", variant: "hero" as const },
    },
    {
      name: "Enterprise",
      icon: Building2,
      price: { monthly: null, yearly: null },
      badge: "For teams",
      badgeVariant: "secondary" as const,
      highlighted: false,
      features: [
        { name: "Everything in Pro", included: true },
        { name: "Team collaboration", included: true },
        { name: "SSO & Advanced security", included: true },
        { name: "Custom integrations", included: true },
        { name: "Dedicated support", included: true },
        { name: "SLA guarantees", included: true },
        { name: "On-premise deployment", included: true },
        { name: "API access", included: true },
        { name: "Custom AI models", included: true },
      ],
      button: { text: "Contact Sales", variant: "secondary" as const },
    },
  ];

  const comparisonFeatures = [
    { name: "Repository analyses", free: "10/month", pro: "Unlimited", enterprise: "Unlimited" },
    { name: "AI insights", free: "Basic", pro: "Advanced (GPT-4)", enterprise: "Custom models" },
    { name: "Chat with codebase", free: false, pro: true, enterprise: true },
    { name: "Private repositories", free: false, pro: true, enterprise: true },
    { name: "Export to PDF/Markdown", free: false, pro: true, enterprise: true },
    { name: "Shareable links", free: false, pro: true, enterprise: true },
    { name: "Architecture diagrams", free: false, pro: true, enterprise: true },
    { name: "Design pattern detection", free: false, pro: true, enterprise: true },
    { name: "Security scanning", free: false, pro: true, enterprise: true },
    { name: "Team collaboration", free: false, pro: false, enterprise: true },
    { name: "SSO", free: false, pro: false, enterprise: true },
    { name: "Custom integrations", free: false, pro: false, enterprise: true },
    { name: "API access", free: false, pro: false, enterprise: true },
    { name: "SLA guarantees", free: false, pro: false, enterprise: true },
    { name: "Support", free: "Community", pro: "Priority", enterprise: "Dedicated" },
  ];

  const faqs = [
    {
      question: "Can I cancel anytime?",
      answer: "Yes, no commitments. Cancel anytime from your account settings. Your subscription will remain active until the end of your billing period.",
    },
    {
      question: "What payment methods do you accept?",
      answer: "Credit cards, debit cards, and PayPal via Stripe. All payments are processed securely.",
    },
    {
      question: "Is there a student discount?",
      answer: "Yes! Email us with your .edu address for 50% off Pro. We believe in supporting the next generation of developers.",
    },
    {
      question: "Can I upgrade or downgrade later?",
      answer: "Yes, changes take effect immediately with prorated billing. Upgrades give you instant access to new features.",
    },
    {
      question: "What happens to my data if I downgrade?",
      answer: "Your analyses are preserved, but you'll be limited to Free tier features. You can always upgrade again to regain access.",
    },
  ];

  const renderCell = (value: boolean | string) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className="w-5 h-5 text-primary mx-auto" />
      ) : (
        <X className="w-5 h-5 text-muted-foreground/50 mx-auto" />
      );
    }
    return <span className="text-foreground">{value}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Choose your plan
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Get started with CodeSight for free, or unlock advanced features with Pro
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}>
              Monthly
            </span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={`text-sm ${isYearly ? "text-foreground" : "text-muted-foreground"}`}>
              Yearly
            </span>
            {isYearly && (
              <Badge variant="default" className="bg-primary/20 text-primary border-0">
                Save 20%
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {tiers.map((tier) => (
              <Card
                key={tier.name}
                className={`relative flex flex-col transition-all duration-300 hover:translate-y-[-4px] ${
                  tier.highlighted
                    ? "border-primary glow-primary bg-gradient-to-b from-primary/10 to-card"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {tier.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pt-8">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <tier.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-foreground">{tier.name}</CardTitle>
                  {!tier.highlighted && (
                    <Badge variant={tier.badgeVariant} className="w-fit mx-auto mt-2">
                      {tier.badge}
                    </Badge>
                  )}
                  <div className="mt-4">
                    {tier.price.monthly !== null ? (
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl md:text-5xl font-bold text-foreground">
                          ${isYearly ? tier.price.yearly : tier.price.monthly}
                        </span>
                        <span className="text-muted-foreground">/ month</span>
                      </div>
                    ) : (
                      <span className="text-4xl md:text-5xl font-bold text-foreground">Custom</span>
                    )}
                    {isYearly && tier.price.yearly !== null && tier.price.monthly !== null && tier.price.monthly > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Billed ${tier.price.yearly * 12}/year
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature.name} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{feature.name}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-4">
                  <Button
                    variant={tier.button.variant}
                    size={tier.highlighted ? "lg" : "default"}
                    className="w-full"
                    onClick={() => navigate("/auth")}
                  >
                    {tier.button.text}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="pb-24 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Compare plans
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 text-foreground font-semibold">Features</th>
                  <th className="text-center py-4 px-4 text-foreground font-semibold">Free</th>
                  <th className="text-center py-4 px-4 text-primary font-semibold">Pro</th>
                  <th className="text-center py-4 px-4 text-foreground font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, idx) => (
                  <tr
                    key={feature.name}
                    className={`border-b border-border/50 ${idx % 2 === 0 ? "bg-muted/20" : ""}`}
                  >
                    <td className="py-4 px-4 text-foreground">{feature.name}</td>
                    <td className="py-4 px-4 text-center">{renderCell(feature.free)}</td>
                    <td className="py-4 px-4 text-center bg-primary/5">{renderCell(feature.pro)}</td>
                    <td className="py-4 px-4 text-center">{renderCell(feature.enterprise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="pb-24 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Frequently asked questions
          </h2>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, idx) => (
              <AccordionItem key={idx} value={`item-${idx}`} className="border-border">
                <AccordionTrigger className="text-foreground hover:text-primary text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="border-primary/50 bg-gradient-to-br from-primary/10 via-card to-primary/5 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.15),transparent_50%)]" />
            <CardContent className="py-16 px-8 text-center relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Ready to level up your code?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Start analyzing repositories in seconds
              </p>
              <Button variant="hero" size="xl" onClick={() => navigate("/auth")}>
                Get Started Free
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Pricing;
