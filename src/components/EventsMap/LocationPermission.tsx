import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, AlertCircle } from "lucide-react";
import { useState } from "react";

interface LocationPermissionProps {
  onPermissionGranted?: (coords: { latitude: number; longitude: number }) => void;
  onPermissionDenied?: () => void;
  isLoading?: boolean;
}

export const LocationPermission = ({
  onPermissionGranted,
  onPermissionDenied,
  isLoading = false,
}: LocationPermissionProps) => {
  const [error, setError] = useState<string>("");
  const [permissionStatus, setPermissionStatus] = useState<"idle" | "granted" | "denied">("idle");

  const handleRequestPermission = () => {
    setError("");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setPermissionStatus("denied");
      onPermissionDenied?.();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setPermissionStatus("granted");
        onPermissionGranted?.({ latitude, longitude });
      },
      (error) => {
        setError(error.message || "Failed to get your location");
        setPermissionStatus("denied");
        onPermissionDenied?.();
      }
    );
  };

  if (permissionStatus === "granted") {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800">
              Location permission granted. Map is ready!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          Location Permission
        </CardTitle>
        <CardDescription>
          We need your location to show nearby events on the map
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-3 text-sm text-gray-600">
          <p>We use your location to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Show events near you on the map</li>
            <li>Calculate distances to events</li>
            <li>Provide accurate directions</li>
          </ul>
        </div>

        <Button
          onClick={handleRequestPermission}
          disabled={isLoading || permissionStatus === "denied"}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? "Requesting..." : "Allow Location Access"}
        </Button>

        <p className="text-xs text-gray-500">
          You can change this in your browser settings at any time.
        </p>
      </CardContent>
    </Card>
  );
};
