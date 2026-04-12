import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, MapPin, Users, ShoppingCart, MessageCircle, ChevronRight, Lock } from "lucide-react";

const features = [
  { icon: Lock,           title: "Secure & Private",               description: "Only accessible by your family, protected with TLS encryption and strict access controls" },
  { icon: Calendar,       title: "Shared Calendars & Lists",       description: "Sync schedules, to-do's and shopping lists" },
  { icon: MapPin,         title: "Local Event Discovery",           description: "Find family-friendly activities near you" },
  { icon: Users,          title: "Parent Community",                description: "Connect with nearby parents and arrange playdates" },
  { icon: ShoppingCart,   title: "Family Marketplace",              description: "Give away or sell pre-loved kids' items" },
  { icon: MessageCircle,  title: "Family Messaging",                description: "Stay connected with your family members" },
];

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate('/app');
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "hsl(var(--background))" }}>
      {/* Purple glow background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full opacity-25"
          style={{ background: "radial-gradient(circle, hsl(270 88% 55%), transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(290 80% 55%), transparent 70%)" }} />
        <div className="absolute bottom-20 right-0 w-[200px] h-[200px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(260 80% 65%), transparent 70%)" }} />
      </div>

      <div className="relative max-w-md mx-auto px-5 py-10 flex-1 flex flex-col">

        {/* Hero */}
        <div className="text-center space-y-5 mb-12">
          {/* Logo */}
          <div className="flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Eazy.Family"
              className="w-28 h-28 drop-shadow-2xl"
              style={{ filter: "drop-shadow(0 0 32px hsl(270 88% 64% / 0.6))" }}
            />
          </div>

          <div>
            <h1 className="text-[2.4rem] font-bold tracking-tight leading-tight"
              style={{ color: "hsl(var(--foreground))" }}>
              Eazy.Family
            </h1>
            <p className="text-sm mt-1 font-medium" style={{ color: "hsl(262 80% 78%)" }}>
              Your Daily Family App
            </p>
          </div>

          <p className="text-sm leading-relaxed max-w-[300px] mx-auto" style={{ color: "hsl(270 40% 72%)" }}>
            The all-in-one safe space that keeps your family organized, connected, and close.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-2.5 mb-10 flex-1">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="flex items-center gap-4 rounded-2xl p-4 animate-fade-in"
                style={{
                  animationDelay: `${index * 0.07}s`,
                  background: "hsl(270 50% 12% / 0.8)",
                  border: "1px solid hsl(270 40% 22%)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
                  <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold leading-snug" style={{ color: "hsl(270 40% 96%)" }}>
                    {feature.title}
                  </h3>
                  <p className="text-xs leading-snug mt-0.5" style={{ color: "hsl(270 40% 68%)" }}>
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTAs */}
        <div className="space-y-3 pb-8">
          <Button
            onClick={() => navigate('/onboarding')}
            className="w-full text-white border-0 text-base py-6 rounded-2xl font-semibold shadow-xl hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}
          >
            Get Started — It's Free
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate('/auth')}
            className="w-full text-sm py-5 rounded-2xl hover:bg-white/5 transition-colors"
            style={{ color: "hsl(270 40% 68%)" }}
          >
            Already have an account?{" "}
            <span className="font-semibold ml-1" style={{ color: "hsl(262 80% 78%)" }}>Sign in</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
