import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Privacy = () => {
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
            <CardTitle>Privacy Policy</CardTitle>
            <CardDescription>Last updated: 25 May 2025</CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <h3>Overview</h3>
            <p>
              Eazy Family ("we", "us", "our") is a family organiser app. We care deeply about your privacy. This policy explains what data we collect, how we use it, and your rights regarding that data.
            </p>
            <Separator className="my-4" />

            <h3>Data We Collect</h3>
            <ul>
              <li>Account information (name, email address)</li>
              <li>Content you create in the app (events, tasks, shopping lists, family messages)</li>
              <li>Calendar event data from Google Calendar or Microsoft Outlook, only if you choose to connect those services</li>
            </ul>
            <Separator className="my-4" />

            <h3>How We Use Your Data</h3>
            <ul>
              <li>Provide and improve app functionality</li>
              <li>Secure your account and prevent abuse</li>
              <li>Display your family's shared calendar, tasks, and lists</li>
              <li>Notify you about important updates</li>
            </ul>
            <Separator className="my-4" />

            <h3>Google API Services — Limited Use Disclosure</h3>
            <p>
              Eazy Family's use of information received from Google APIs adheres to the{' '}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
            <p>
              If you connect your Google Calendar, we request read-only access to your calendar events (<code>calendar.events.readonly</code>). Specifically:
            </p>
            <ul>
              <li><strong>What we access:</strong> Event titles, start and end times, dates, locations, and all-day flags from your primary Google Calendar.</li>
              <li><strong>Why we access it:</strong> Solely to display your upcoming events inside the Eazy Family app, alongside your family's shared events and tasks.</li>
              <li><strong>How we store it:</strong> Events are cached temporarily in your account to render the calendar view. We do not store your Google Calendar data permanently on our servers beyond your active session.</li>
              <li><strong>We do not:</strong> use your Google Calendar data for advertising, share it with third parties, transfer it to any other service, or use it for any purpose other than displaying it to you within the app.</li>
              <li><strong>AI / machine learning:</strong> We do not use your Google Workspace API data, including your Google Calendar data, to develop, improve, or train generalized or non-personalized artificial-intelligence or machine-learning models. Calendar data is used only to render your own calendar view within the app and is never used to train any model.</li>
              <li><strong>Revoking access:</strong> You can disconnect Google Calendar at any time from the Calendar settings inside the app, or by visiting your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Google Account permissions</a> and removing Eazy Family.</li>
            </ul>
            <Separator className="my-4" />

            <h3>Third-Party Services</h3>
            <p>To operate the app we use the following services. Each processes your data only as needed for its stated function:</p>
            <ul>
              <li><strong>Supabase</strong> — database and authentication (Switzerland/EU region)</li>
              <li><strong>Stripe</strong> — payment processing (we never see your card details)</li>
              <li><strong>Anthropic</strong> — AI assistant and voice features</li>
              <li><strong>Google Calendar API</strong> — optional calendar sync, only if you connect it</li>
              <li><strong>Microsoft Graph API</strong> — optional Outlook calendar sync, only if you connect it</li>
              <li><strong>Vercel</strong> — app hosting</li>
            </ul>
            <p>We do not use advertising networks, behavioural tracking tools, or sell your data to any third party.</p>
            <Separator className="my-4" />

            <h3>Data Retention</h3>
            <p>
              Your account data is retained for as long as your account is active. If you delete your account, all personal data is permanently deleted within 30 days. Cached Google Calendar events are not retained after your session ends.
            </p>
            <Separator className="my-4" />

            <h3>Security</h3>
            <p>
              Your family's data is only accessible to members you personally invite. All data is protected with TLS encryption in transit and strict row-level access controls enforced at the database level.
            </p>
            <Separator className="my-4" />

            <h3>Your Rights</h3>
            <ul>
              <li>Access, update, or delete your personal data</li>
              <li>Export a copy of your data</li>
              <li>Withdraw consent for any optional integration (Google Calendar, Outlook) at any time</li>
              <li>Contact us for any privacy-related request at <a href="mailto:privacy@eazy.family">privacy@eazy.family</a></li>
            </ul>
            <Separator className="my-4" />

            <h3>Contact</h3>
            <p>
              For privacy-related questions or requests, email us at{' '}
              <a href="mailto:privacy@eazy.family">privacy@eazy.family</a>.
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default Privacy;
