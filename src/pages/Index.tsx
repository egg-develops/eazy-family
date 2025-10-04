import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Calendar, Users, Camera, MapPin, ShoppingCart } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has completed onboarding
    const onboardingData = localStorage.getItem('eazy-family-onboarding');
    if (onboardingData) {
      navigate('/app');
    }
  }, [navigate]);

  const features = [
    { icon: Calendar, title: "Synced Calendars and To-Do Lists", description: "Keep everyone organized in one place" },
    { icon: MapPin, title: "Event Discovery", description: "Find family-friendly activities nearby" },
    { icon: Camera, title: "AI Photo Management", description: "Organize memories automatically" },
    { icon: Users, title: "Community", description: "Connect with parents, schedule playdates" },
    { icon: ShoppingCart, title: "Marketplace", description: "Buy & sell family items" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center space-y-6 mb-12">
          <div className="w-24 h-24 mx-auto gradient-primary rounded-3xl flex items-center justify-center shadow-custom-lg">
            <Heart className="w-12 h-12 text-white" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-bold font-poppins bg-background px-2 py-1 rounded-lg inline-block">
              Eazy.Family
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Sync your calendars, to-do's and shopping lists, plan events, connect with parents, and create memories.
            </p>
          </div>

          <div className="bg-muted rounded-2xl p-6 shadow-custom-lg">
            <p className="font-medium">
              The Perfect App to Make Your Family Life Eazy
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-6 mb-12">
          <h2 className="text-2xl font-bold text-center">Everything families need</h2>
          
          <div className="space-y-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="shadow-custom-md hover:shadow-custom-lg transition-all duration-300 animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 gradient-cool rounded-xl flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-4">
          <Button 
            onClick={() => navigate('/onboarding')} 
            className="w-full gradient-primary text-white border-0 hover:opacity-90 text-lg py-6 rounded-xl shadow-custom-lg"
          >
            Get Started - It's Free!
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
