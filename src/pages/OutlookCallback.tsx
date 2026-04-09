import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Azure redirects here after OAuth. Forward the code+state to the Calendar page.
const OutlookCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/app/calendar" + window.location.search, { replace: true });
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );
};

export default OutlookCallback;
