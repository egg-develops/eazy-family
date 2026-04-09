import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, ArrowLeft, Heart, Users, Calendar, ShoppingCart, MapPin } from "lucide-react";

interface Child {
  initials: string;
  age: string;
}

interface OnboardingData {
  userName: string;
  children: Child[];
  location: string;
  customLocation: string;
  language: string;
  features: string[];
}

const steps = [
  { id: 1, title: "Welcome!", description: "Your daily app to stay organized" },
  { id: 2, title: "Language", description: "Choose your preferred language" },
  { id: 3, title: "About You", description: "Tell us your name" },
  { id: 4, title: "Your Children", description: "Tell us about your little ones" },
  { id: 5, title: "Location", description: "Where are you based?" },
  { id: 6, title: "Features", description: "What excites you most?" },
];

const locations = [
  { value: "zurich", label: "Zurich" },
  { value: "geneva", label: "Geneva" },
  { value: "kinderlager", label: "Kinderlager" },
  { value: "other", label: "Other" },
];

const languages = [
  { value: "en", label: "English" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "it", label: "Italian" },
];

const features = [
  { id: "calendar", label: "Shared Calendars & Lists", icon: Calendar },
  { id: "shopping", label: "Sync schedules, to-do's and shopping lists", icon: ShoppingCart },
  { id: "events", label: "Local Event Discovery", icon: MapPin },
  { id: "community", label: "Parent Community & Playdates", icon: Users },
  { id: "marketplace", label: "Family Marketplace", icon: ShoppingCart },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/app');
    }
  }, [user, authLoading, navigate]);
  const [data, setData] = useState<OnboardingData>({
    userName: "",
    children: [{ initials: "", age: "" }],
    location: "",
    customLocation: "",
    language: "",
    features: [],
  });

  const addChild = () => {
    setData(prev => ({
      ...prev,
      children: [...prev.children, { initials: "", age: "" }]
    }));
  };

  const removeChild = (index: number) => {
    setData(prev => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index)
    }));
  };

  const updateChild = (index: number, field: keyof Child, value: string) => {
    setData(prev => ({
      ...prev,
      children: prev.children.map((child, i) => 
        i === index ? { ...child, [field]: value } : child
      )
    }));
  };

  const toggleFeature = (featureId: string) => {
    setData(prev => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId]
    }));
  };

  const skipOnboarding = () => {
    const skipData = {
      userName: "User",
      children: [{ initials: "C", age: "5" }],
      location: "zurich",
      customLocation: "",
      language: "en",
      features: ["calendar"],
      userInitials: "U"
    };
    localStorage.setItem('eazy-family-onboarding', JSON.stringify(skipData));
    navigate('/splash');
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding - derive initials from name
      const userInitials = data.userName
        .split(' ')
        .map(n => n.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
      
      const finalData = { ...data, userInitials };
      localStorage.setItem('eazy-family-onboarding', JSON.stringify(finalData));
      navigate('/auth?signup=true');
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true; // Welcome screen
      case 2:
        return data.language.length > 0; // Language selection
      case 3:
        return data.userName.trim().length > 0; // Name
      case 4:
        return true; // Allow skipping children
      case 5:
        return data.location.length > 0 && (data.location !== "other" || data.customLocation.trim().length > 0);
      case 6:
        return true; // Features
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 text-center py-4">
            <img src="/logo.png" alt="Eazy.Family" className="w-24 h-24 mx-auto object-contain drop-shadow-2xl"
              style={{ filter: "drop-shadow(0 0 28px hsl(270 88% 64% / 0.5))" }} />
            <div>
              <h2 className="text-2xl font-bold" style={{ color: "hsl(270 40% 96%)" }}>{t('onboarding.welcome.title')}</h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "hsl(270 40% 68%)" }}>
                {t('onboarding.welcome.description')}
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold" style={{ color: "hsl(270 40% 96%)" }}>{t('onboarding.language.title')}</h2>
              <p className="text-sm" style={{ color: "hsl(270 40% 68%)" }}>{t('onboarding.language.description')}</p>
            </div>
            <Select value={data.language} onValueChange={(value) => {
              setData(prev => ({ ...prev, language: value }));
              i18n.changeLanguage(value);
              localStorage.setItem('eazy-family-language', value);
            }}>
              <SelectTrigger className="h-12 rounded-xl border-0 text-base"
                style={{ background: "hsl(270 40% 18%)", color: "hsl(270 40% 96%)" }}>
                <SelectValue placeholder="Select your language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((language) => (
                  <SelectItem key={language.value} value={language.value}>{language.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold" style={{ color: "hsl(270 40% 96%)" }}>{t('onboarding.name.title')}</h2>
              <p className="text-sm" style={{ color: "hsl(270 40% 68%)" }}>{t('onboarding.name.description')}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" style={{ color: "hsl(270 40% 80%)" }}>{t('onboarding.name.label')}</Label>
              <Input id="name" placeholder={t('onboarding.name.placeholder')}
                value={data.userName}
                onChange={(e) => setData(prev => ({ ...prev, userName: e.target.value }))}
                className="h-12 rounded-xl border-0 text-base"
                style={{ background: "hsl(270 40% 18%)", color: "hsl(270 40% 96%)" }} />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold" style={{ color: "hsl(270 40% 96%)" }}>{t('onboarding.children.title')}</h2>
              <p className="text-sm" style={{ color: "hsl(270 40% 68%)" }}>{t('onboarding.children.description')}</p>
            </div>
            <div className="space-y-3">
              {data.children.map((child, index) => (
                <div key={index} className="rounded-xl p-4 space-y-3"
                  style={{ background: "hsl(270 40% 16%)", border: "1px solid hsl(270 40% 24%)" }}>
                  <div className="flex gap-3 items-start">
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label htmlFor={`initials-${index}`} className="text-xs mb-1 block" style={{ color: "hsl(270 40% 72%)" }}>
                          {t('onboarding.children.initialsLabel')}
                        </Label>
                        <Input id={`initials-${index}`} placeholder={t('onboarding.children.initialsPlaceholder')}
                          value={child.initials} onChange={(e) => updateChild(index, 'initials', e.target.value)}
                          maxLength={3} className="h-10 rounded-lg border-0"
                          style={{ background: "hsl(270 40% 20%)", color: "hsl(270 40% 96%)" }} />
                      </div>
                      <div>
                        <Label htmlFor={`age-${index}`} className="text-xs mb-1 block" style={{ color: "hsl(270 40% 72%)" }}>
                          {t('onboarding.children.ageLabel')}
                        </Label>
                        <Input id={`age-${index}`} type="number" placeholder={t('onboarding.children.agePlaceholder')}
                          value={child.age} onChange={(e) => updateChild(index, 'age', e.target.value)}
                          min="0" max="18" className="h-10 rounded-lg border-0"
                          style={{ background: "hsl(270 40% 20%)", color: "hsl(270 40% 96%)" }} />
                      </div>
                    </div>
                    {data.children.length > 1 && (
                      <button onClick={() => removeChild(index)} className="mt-1 text-xs hover:opacity-80"
                        style={{ color: "hsl(0 70% 65%)" }}>
                        {t('onboarding.children.remove')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button onClick={addChild}
                className="w-full h-10 rounded-xl text-sm font-medium hover:opacity-80 transition-opacity border"
                style={{ borderColor: "hsl(270 40% 28%)", color: "hsl(262 80% 78%)" }}>
                + {t('onboarding.children.addAnother')}
              </button>
              <button onClick={() => { setData(prev => ({ ...prev, children: [{ initials: "", age: "" }] })); setCurrentStep(5); }}
                className="w-full text-sm hover:opacity-70 transition-opacity"
                style={{ color: "hsl(270 40% 55%)" }}>
                {t('onboarding.children.skipButton')}
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold" style={{ color: "hsl(270 40% 96%)" }}>{t('onboarding.location.title')}</h2>
              <p className="text-sm" style={{ color: "hsl(270 40% 68%)" }}>{t('onboarding.location.description')}</p>
            </div>
            <Select value={data.location} onValueChange={(value) => setData(prev => ({ ...prev, location: value }))}>
              <SelectTrigger className="h-12 rounded-xl border-0 text-base"
                style={{ background: "hsl(270 40% 18%)", color: "hsl(270 40% 96%)" }}>
                <SelectValue placeholder={t('onboarding.location.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.value} value={location.value}>
                    {location.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 6:
        return (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold" style={{ color: "hsl(270 40% 96%)" }}>{t('onboarding.features.title')}</h2>
              <p className="text-sm" style={{ color: "hsl(270 40% 68%)" }}>{t('onboarding.features.description')}</p>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {features.map((feature) => {
                const Icon = feature.icon;
                const selected = data.features.includes(feature.id);
                return (
                  <button key={feature.id} onClick={() => toggleFeature(feature.id)}
                    className="flex items-center gap-3 p-3.5 rounded-xl text-left transition-all"
                    style={{
                      background: selected ? "linear-gradient(135deg, hsl(270 88% 52%), hsl(290 80% 56%))" : "hsl(270 40% 16%)",
                      border: `1px solid ${selected ? "transparent" : "hsl(270 40% 24%)"}`,
                    }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: selected ? "hsl(270 88% 72% / 0.3)" : "hsl(270 40% 22%)" }}>
                      <Icon className="w-4 h-4" style={{ color: selected ? "white" : "hsl(262 80% 75%)" }} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: selected ? "white" : "hsl(270 40% 88%)" }}>
                      {feature.label}
                    </span>
                    {selected && <div className="ml-auto w-5 h-5 rounded-full bg-white/30 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>}
                  </button>
                );
              })}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, hsl(270 62% 7%), hsl(280 55% 11%))" }}>

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(270 88% 55%), transparent 70%)" }} />
      </div>

      <div className="relative max-w-md mx-auto w-full px-4 pt-10 pb-8 flex flex-col flex-1">

        {/* Logo + step info */}
        <div className="flex items-center justify-between mb-6">
          <img src="/logo.png" alt="Eazy.Family" className="w-10 h-10 object-contain" />
          <span className="text-xs font-medium px-3 py-1 rounded-full"
            style={{ background: "hsl(270 50% 18%)", color: "hsl(262 80% 78%)" }}>
            {currentStep} / {steps.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="w-full rounded-full h-1.5" style={{ background: "hsl(270 40% 20%)" }}>
            <div className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${(currentStep / steps.length) * 100}%`,
                background: "linear-gradient(90deg, hsl(270 88% 58%), hsl(290 80% 62%))"
              }} />
          </div>
        </div>

        {/* Step content card */}
        <div className="rounded-2xl p-6 flex-1 animate-fade-in"
          style={{ background: "hsl(270 50% 12% / 0.9)", border: "1px solid hsl(270 40% 22%)", backdropFilter: "blur(8px)" }}>
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6 gap-3">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}
            className="flex items-center gap-2 rounded-xl h-12 flex-1 border-0 hover:opacity-80"
            style={{ background: "hsl(270 40% 18%)", color: "hsl(270 40% 80%)" }}>
            <ArrowLeft className="w-4 h-4" />
            {t('onboarding.back')}
          </Button>
          <Button onClick={nextStep} disabled={!canProceed()}
            className="flex items-center gap-2 rounded-xl h-12 flex-1 text-white font-semibold border-0 hover:opacity-90 transition-opacity disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}>
            {currentStep === steps.length ? t('onboarding.getStarted') : t('onboarding.next')}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-center mt-4">
          <button type="button" onClick={() => navigate("/auth")}
            className="text-sm hover:opacity-80 transition-opacity"
            style={{ color: "hsl(270 40% 60%)" }}>
            Already have an account?{" "}
            <span style={{ color: "hsl(262 80% 78%)" }} className="font-semibold">Sign in</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;