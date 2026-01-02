import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HeartHandshake, QrCode } from 'lucide-react';

const KeepMeAlive = () => {
  const userType = (localStorage.getItem('userType') as 'collector' | 'employee') || 'collector';

  // NOTE: Replace the placeholder text and QR block below with your actual
  // payment QR image / UPI link details when available.

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole={userType} />
      <main className="lg:ml-64 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-gradient-eco rounded-lg p-6 text-white flex flex-col gap-2">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <HeartHandshake className="h-6 w-6" />
              Keep Ecowaste Rewards Alive
            </h1>
            <p className="text-white/90 text-sm md:text-base">
              Support the platform that turns your eco-actions into real rewards. Your
              contribution helps us maintain servers, verify reports, and keep the
              reward system active for every eco-warrior.
            </p>
          </div>

          <Card className="animate-slide-up">
            <CardHeader className="text-center">
              <CardTitle className="text-xl md:text-2xl flex items-center justify-center gap-2">
                <QrCode className="h-6 w-6 text-eco-forest-primary" />
                Scan & Support
              </CardTitle>
              <CardDescription>
                Scan the QR code below to send your contribution directly to the EcoWaste
                management team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-6">
                <div className="w-full max-w-xs aspect-square bg-muted flex items-center justify-center rounded-xl border border-eco-forest-primary/60 shadow-elevation overflow-hidden">
                  {/* Real payment QR code image. Place the QR file in frontend/public as keep-me-alive-qr.png */}
                  <img
                    src="/keep-me-alive-qr.png"
                    alt="Scan to support EcoWaste rewards"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="space-y-1 text-center text-sm md:text-base">
                  <p className="font-medium">Purpose of Payment</p>
                  <p className="text-muted-foreground">
                    "To keep EcoWaste reward system live and to support eco-warrior incentives"
                  </p>
                </div>

                <div className="w-full max-w-md bg-muted/60 rounded-lg p-4 text-xs md:text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Transparency Note</p>
                  <p>
                    This contribution helps cover server costs, verification operations, and
                    reward payouts. Please confirm official payment details with your
                    institution/management before making any large payments.
                  </p>
                </div>

                <Button variant="eco" className="mt-2" disabled>
                  Payment details managed by admin
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default KeepMeAlive;
