import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Terms = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <section className="max-w-3xl mx-auto px-4 py-10">
        <Card className="shadow-custom-md relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10"
            onClick={() => navigate(-1)}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardHeader>
            <CardTitle>Terms of Service</CardTitle>
            <CardDescription>Last updated: April 29, 2026</CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <h3>1. Acceptance of Terms</h3>
            <p>
              By creating an account or using Eazy.Family, you agree to these Terms of Service. If you do not agree, please do not use the app.
            </p>
            <Separator className="my-4" />

            <h3>2. Description of Service</h3>
            <p>
              Eazy.Family is a family organisation app that provides shared calendars, task lists, shopping lists, messaging, and related features to help families stay coordinated.
            </p>
            <Separator className="my-4" />

            <h3>3. Accounts</h3>
            <ul>
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must be at least 13 years old to create an account.</li>
              <li>You may not share your account with others outside your family group.</li>
            </ul>
            <Separator className="my-4" />

            <h3>4. Acceptable Use</h3>
            <p>You agree not to:</p>
            <ul>
              <li>Use the app for any unlawful purpose</li>
              <li>Upload harmful, offensive, or abusive content</li>
              <li>Attempt to gain unauthorised access to other users' data</li>
              <li>Reverse-engineer or scrape the service</li>
            </ul>
            <Separator className="my-4" />

            <h3>5. Privacy</h3>
            <p>
              Your use of Eazy.Family is also governed by our <a href="/privacy" className="underline text-primary">Privacy Policy</a>, which is incorporated into these terms by reference.
            </p>
            <Separator className="my-4" />

            <h3>6. Google Calendar Integration</h3>
            <p>
              If you connect your Google Calendar, Eazy.Family will access your calendar events in read-only mode solely to display them within the app. We do not store your Google credentials, and you can disconnect at any time from Settings.
            </p>
            <Separator className="my-4" />

            <h3>7. Subscriptions and Billing</h3>
            <ul>
              <li>Some features require a paid subscription, billed through Stripe.</li>
              <li>You may cancel your subscription at any time; access continues until the end of the billing period.</li>
              <li>We do not store your payment card details.</li>
            </ul>
            <Separator className="my-4" />

            <h3>8. Intellectual Property</h3>
            <p>
              The Eazy.Family name, logo, and app are owned by us. Content you create (tasks, events, messages) remains yours. You grant us a limited licence to store and display it to your family members as part of providing the service.
            </p>
            <Separator className="my-4" />

            <h3>9. Disclaimers and Limitation of Liability</h3>
            <p>
              The service is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of Eazy.Family.
            </p>
            <Separator className="my-4" />

            <h3>10. Changes to These Terms</h3>
            <p>
              We may update these terms from time to time. Continued use of the app after changes constitutes acceptance of the updated terms.
            </p>
            <Separator className="my-4" />

            <h3>11. Contact</h3>
            <p>
              For any questions about these terms, please contact us at <a href="mailto:support@eazy.family" className="underline text-primary">support@eazy.family</a>.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default Terms;
