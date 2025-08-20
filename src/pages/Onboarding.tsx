import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, ArrowLeft, Heart, Users, Calendar, ShoppingCart, MapPin, Camera } from "lucide-react";

interface Child {
  initials: string;
  age: string;
}

interface OnboardingData {
  userInitials: string;
  children: Child[];
  location: string;
  language: string;
  features: string[];
}

const steps = [
  { id: 1, title: "Welcome!", description: "Let's get to know you" },
  { id: 2, title: "Your Children", description: "Tell us about your little ones" },
  { id: 3, title: "Location", description: "Where are you based?" },
  { id: 4, title: "Language", description: "Choose your preferred language" },
  { id: 5, title: "Features", description: "What excites you most?" },
];

const locations = [
  { value: "zurich", label: "Zurich" },
  { value: "geneva", label: "Geneva" },
  { value: "other", label: "Other" },
];

const languages = [
  { value: "en", label: "English" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "it", label: "Italian" },
];

const features = [
  { id: "calendar", label: "Synced Calendars", icon: Calendar },
  { id: "shopping", label: "Synced Shopping List", icon: ShoppingCart },
  { id: "events", label: "Finding family friendly events", icon: MapPin },
  { id: "playdates", label: "Playdates for their children", icon: Users },
  { id: "community", label: "Connecting with other parents", icon: Heart },
  { id: "marketplace", label: "Marketplace", icon: ShoppingCart },
  { id: "photos", label: "AI Photo Management", icon: Camera },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    userInitials: "",
    children: [{ initials: "", age: "" }],
    location: "",
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

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      localStorage.setItem('eazy-family-onboarding', JSON.stringify(data));
      navigate('/app');
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
        return data.userInitials.trim().length > 0;
      case 2:
        return data.children.some(child => child.initials.trim().length > 0 && child.age.trim().length > 0);
      case 3:
        return data.location.length > 0;
      case 4:
        return data.language.length > 0;
      case 5:
        return data.features.length > 0;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto gradient-primary rounded-full flex items-center justify-center">
                <Heart className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold">Welcome to Eazy.Family!</h2>
              <p className="text-muted-foreground">
                Your ultimate hub for simplifying family life and community engagement
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="initials">Your initials</Label>
              <Input
                id="initials"
                placeholder="e.g., JD"
                value={data.userInitials}
                onChange={(e) => setData(prev => ({ ...prev, userInitials: e.target.value }))}
                className="text-center text-lg font-medium"
                maxLength={4}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Tell us about your children</h2>
              <p className="text-muted-foreground">We'll customize the experience for their ages</p>
            </div>
            <div className="space-y-4">
              {data.children.map((child, index) => (
                <Card key={index} className="p-4">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Label>Child's initials</Label>
                      <Input
                        placeholder="e.g., SM"
                        value={child.initials}
                        onChange={(e) => updateChild(index, 'initials', e.target.value)}
                        maxLength={4}
                      />
                    </div>
                    <div className="flex-1">
                      <Label>Age</Label>
                      <Select value={child.age} onValueChange={(value) => updateChild(index, 'age', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select age" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 11 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>{i} years old</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {data.children.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeChild(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
              <Button variant="outline" onClick={addChild} className="w-full">
                Add another child
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Where are you located?</h2>
              <p className="text-muted-foreground">We'll show you local family-friendly events</p>
            </div>
            <Select value={data.location} onValueChange={(value) => setData(prev => ({ ...prev, location: value }))}>
              <SelectTrigger className="text-lg">
                <SelectValue placeholder="Choose your location" />
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

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Choose your language</h2>
              <p className="text-muted-foreground">We'll customize the app experience for you</p>
            </div>
            <Select value={data.language} onValueChange={(value) => setData(prev => ({ ...prev, language: value }))}>
              <SelectTrigger className="text-lg">
                <SelectValue placeholder="Select your language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((language) => (
                  <SelectItem key={language.value} value={language.value}>
                    {language.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">What features excite you most?</h2>
              <p className="text-muted-foreground">Select all that apply - we'll prioritize these for you</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card 
                    key={feature.id} 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      data.features.includes(feature.id) 
                        ? 'border-primary shadow-custom-md gradient-primary text-white' 
                        : ''
                    }`}
                    onClick={() => toggleFeature(feature.id)}
                  >
                    <CardContent className="flex items-center space-x-3 p-4">
                      <Checkbox
                        checked={data.features.includes(feature.id)}
                        className="data-[state=checked]:bg-white data-[state=checked]:text-primary"
                      />
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{feature.label}</span>
                    </CardContent>
                  </Card>
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Step {currentStep} of {steps.length}</span>
            <span className="text-sm text-muted-foreground">{Math.round((currentStep / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="gradient-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <Card className="shadow-custom-lg border-0 animate-fade-in">
          <CardContent className="p-6">
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex items-center gap-2 gradient-primary text-white border-0 hover:opacity-90"
          >
            {currentStep === steps.length ? 'Get Started' : 'Next'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;