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
              <li>Content you add (events, tasks, photos)</li>
              <li>Device and usage data to improve the app</li>
            </ul>
            <Separator className="my-4" />

            <h3>How We Use Data</h3>
            <ul>
              <li>Provide and improve app functionality</li>
              <li>Secure your account and prevent abuse</li>
              <li>Notify you about important updates</li>
            </ul>
            <Separator className="my-4" />

            <h3>Security</h3>
            <p>
              Your data is end-to-end encrypted and only visible to you and your family members you invite. We implement industry-standard security controls.
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
