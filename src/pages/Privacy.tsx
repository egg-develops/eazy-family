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
            <CardDescription>Last updated: {new Date().toLocaleDateString()}</CardDescription>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <h3>Overview</h3>
            <p>
              We care deeply about your privacy. This policy explains what data we collect, how we use it, and your rights.
            </p>
            <Separator className="my-4" />

            <h3>Data We Collect</h3>
            <ul>
              <li>Account information (name, email)</li>
              <li>Content you add (events, tasks, lists, messages)</li>
              <li>Children's names and ages, if you choose to add them</li>
              <li>Location (city-level, for local event discovery)</li>
            </ul>
            <Separator className="my-4" />

            <h3>How We Use Data</h3>
            <ul>
              <li>Provide and improve app functionality</li>
              <li>Secure your account and prevent abuse</li>
              <li>Notify you about important updates</li>
            </ul>

            <h3>Third-Party Services</h3>
            <p>To operate the app we use the following services, each of which may process your data only as needed for their function:</p>
            <ul>
              <li><strong>Supabase</strong> — database and authentication</li>
              <li><strong>Stripe</strong> — payment processing (we never see your card details)</li>
              <li><strong>Anthropic</strong> — AI assistant and voice shopping features</li>
              <li><strong>Google / Microsoft</strong> — optional calendar integrations, only if you connect them</li>
              <li><strong>Vercel</strong> — app hosting</li>
            </ul>
            <p>We do not use advertising networks, behavioural tracking tools, or sell your data to any third party.</p>
            <Separator className="my-4" />

            <h3>Security</h3>
            <p>
              Your family's data is only accessible to members you personally invite. All data is protected with TLS encryption in transit and strict access controls enforced at the database level. We do not sell your data, use it for advertising, or share it with third parties beyond the services required to operate the app (such as our database provider, payment processor, and AI assistant).
            </p>
            <Separator className="my-4" />

            <h3>Your Rights</h3>
            <ul>
              <li>Access, update, or delete your data</li>
              <li>Export a copy of your data</li>
              <li>Contact us for any privacy-related request</li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default Privacy;
