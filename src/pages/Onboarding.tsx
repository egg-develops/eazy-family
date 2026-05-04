import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { cloudSet } from "@/lib/preferencesSync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowLeft } from "lucide-react";

interface OnboardingData {
  userName: string;
  location: string;
  customLocation: string;
  language: string;
}

const steps = [
  { id: 1, title: "Welcome!" },
  { id: 2, title: "Language" },
  { id: 3, title: "Your Name" },
  { id: 4, title: "Location" },
];

const locations = [
  { value: "zurich", label: "Zurich" },
  { value: "geneva", label: "Geneva" },
  { value: "basel", label: "Basel" },
  { value: "bern", label: "Bern" },
  { value: "lausanne", label: "Lausanne" },
  { value: "other", label: "Other" },
];

const languages = [
  { value: "en", label: "English" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "it", label: "Italian" },
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
    location: "",
    customLocation: "",
    language: "",
  });

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      const userInitials = data.userName
        .split(' ')
        .map(n => n.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2) || 'EF';

      const finalData = { ...data, userInitials, children: [], features: [] };
      localStorage.setItem('eazy-family-onboarding', JSON.stringify(finalData));
      navigate('/auth?signup=true');
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return true;
      case 2: return data.language.length > 0;
      case 3: return data.userName.trim().length > 0;
      case 4: return data.location.length > 0 && (data.location !== "other" || data.customLocation.trim().length > 0);
      default: return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 text-center py-4">
            <img
              src="/logo.png"
              alt="Eazy.Family"
              className="w-24 h-24 mx-auto object-contain drop-shadow-2xl"
              style={{ filter: "drop-shadow(0 0 28px hsl(270 88% 64% / 0.5))" }}
            />
            <div>
              <h2 className="text-2xl font-bold" style={{ color: "hsl(270 40% 96%)" }}>
                {t('onboarding.welcome.title')}
              </h2>
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
              <h2 className="text-2xl font-bold" style={{ color: "hsl(270 40% 96%)" }}>
                {t('onboarding.language.title')}
              </h2>
              <p className="text-sm" style={{ color: "hsl(270 40% 68%)" }}>
                {t('onboarding.language.description')}
              </p>
            </div>
            <Select
              value={data.language}
              onValueChange={(value) => {
                setData(prev => ({ ...prev, language: value }));
                i18n.changeLanguage(value);
                cloudSet('eazy-family-language', value);
              }}
            >
              <SelectTrigger
                className="h-12 rounded-xl border-0 text-base"
                style={{ background: "hsl(270 40% 18%)", color: "hsl(270 40% 96%)" }}
              >
                <SelectValue placeholder="Select your language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold" style={{ color: "hsl(270 40% 96%)" }}>
                {t('onboarding.name.title')}
              </h2>
              <p className="text-sm" style={{ color: "hsl(270 40% 68%)" }}>
                {t('onboarding.name.description')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name" style={{ color: "hsl(270 40% 80%)" }}>
                {t('onboarding.name.label')}
              </Label>
              <Input
                id="name"
                placeholder={t('onboarding.name.placeholder')}
                value={data.userName}
                onChange={(e) => setData(prev => ({ ...prev, userName: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && canProceed() && nextStep()}
                className="h-12 rounded-xl border-0 text-base"
                style={{ background: "hsl(270 40% 18%)", color: "hsl(270 40% 96%)" }}
                autoFocus
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold" style={{ color: "hsl(270 40% 96%)" }}>
                {t('onboarding.location.title')}
              </h2>
              <p className="text-sm" style={{ color: "hsl(270 40% 68%)" }}>
                {t('onboarding.location.description')}
              </p>
            </div>
            <Select
              value={data.location}
              onValueChange={(value) => setData(prev => ({ ...prev, location: value }))}
            >
              <SelectTrigger
                className="h-12 rounded-xl border-0 text-base"
                style={{ background: "hsl(270 40% 18%)", color: "hsl(270 40% 96%)" }}
              >
                <SelectValue placeholder={t('onboarding.location.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.value} value={loc.value}>{loc.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {data.location === "other" && (
              <Input
                value={data.customLocation}
                onChange={(e) => setData(prev => ({ ...prev, customLocation: e.target.value }))}
                placeholder="Enter your city"
                className="h-12 rounded-xl border-0 text-base"
                style={{ background: "hsl(270 40% 18%)", color: "hsl(270 40% 96%)" }}
                autoFocus
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, hsl(270 62% 7%), hsl(280 55% 11%))" }}
    >
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(270 88% 55%), transparent 70%)" }}
        />
      </div>

      <div className="relative max-w-md mx-auto w-full px-4 pt-10 pb-8 flex flex-col flex-1">

        {/* Logo + step counter */}
        <div className="flex items-center justify-between mb-6">
          <img src="/logo.png" alt="Eazy.Family" className="w-10 h-10 object-contain" />
          <span
            className="text-xs font-medium px-3 py-1 rounded-full"
            style={{ background: "hsl(270 50% 18%)", color: "hsl(262 80% 78%)" }}
          >
            {currentStep} / {steps.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="w-full rounded-full h-1.5" style={{ background: "hsl(270 40% 20%)" }}>
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${(currentStep / steps.length) * 100}%`,
                background: "linear-gradient(90deg, hsl(270 88% 58%), hsl(290 80% 62%))"
              }}
            />
          </div>
        </div>

        {/* Step content */}
        <div
          className="rounded-2xl p-6 flex-1 animate-fade-in"
          style={{
            background: "hsl(270 50% 12% / 0.9)",
            border: "1px solid hsl(270 40% 22%)",
            backdropFilter: "blur(8px)"
          }}
        >
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6 gap-3">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center gap-2 rounded-xl h-12 flex-1 border-0 hover:opacity-80"
            style={{ background: "hsl(270 40% 18%)", color: "hsl(270 40% 80%)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t('onboarding.back')}
          </Button>
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex items-center gap-2 rounded-xl h-12 flex-1 text-white font-semibold border-0 hover:opacity-90 transition-opacity disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, hsl(270 88% 58%), hsl(290 80% 62%))" }}
          >
            {currentStep === steps.length ? t('onboarding.getStarted') : t('onboarding.next')}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="text-sm hover:opacity-80 transition-opacity"
            style={{ color: "hsl(270 40% 60%)" }}
          >
            Already have an account?{" "}
            <span style={{ color: "hsl(262 80% 78%)" }} className="font-semibold">Sign in</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
