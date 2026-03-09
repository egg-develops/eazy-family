import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, Calendar, MapPin, Camera, Users, ShoppingCart, ChevronRight } from "lucide-react";

const features = [
  { icon: Calendar, title: "Shared Calendars & Lists", description: "Sync schedules, to-do's and shopping lists" },
  { icon: MapPin, title: "Local Event Discovery", description: "Find family-friendly activities happening near you" },
  { icon: Camera, title: "AI Photo Organizer", description: "Automatically sort and tag your memories" },
  { icon: Users, title: "Parent Community", description: "Connect with nearby parents and arrange playdates" },
  { icon: ShoppingCart, title: "Family Marketplace", description: "Buy and sell pre-loved kids' items" },
];

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/app');
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(240,20%,96%)] via-[hsl(240,15%,97%)] to-[hsl(0,0%,100%)]">
      <div className="max-w-md mx-auto px-5 py-10">

        {/* Hero */}
        <div className="text-center space-y-5 mb-14">
          <div className="w-[88px] h-[88px] mx-auto rounded-[22px] flex items-center justify-center shadow-lg"
            style={{ background: "var(--gradient-primary)" }}>
            <Heart className="w-11 h-11 text-white" strokeWidth={1.8} />
          </div>

          <h1 className="text-[2.25rem] font-bold tracking-tight leading-tight font-poppins text-foreground">
            Eazy.Family
          </h1>

          <p className="text-base text-muted-foreground leading-relaxed max-w-[320px] mx-auto">
            The all-in-one app that keeps your family organized, connected, and making memories.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="flex items-center gap-4 bg-card rounded-2xl p-4 shadow-sm border border-border/40 animate-fade-in"
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                <div className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--gradient-cool)" }}>
                  <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground leading-snug">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate('/onboarding')}
            className="w-full text-white border-0 hover:opacity-90 text-base py-6 rounded-xl shadow-lg font-semibold"
            style={{ background: "var(--gradient-primary)" }}
          >
            Get Started — It's Free
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate('/auth')}
            className="w-full text-sm text-muted-foreground hover:text-foreground py-5 rounded-xl"
          >
            Already have an account? <span className="font-semibold text-primary ml-1">Sign in</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
