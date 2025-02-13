import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Card className="p-4 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Budget</h1>
          <ThemeToggle />
        </div>
      </Card>

      <main className="flex-1 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Budget Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Welcome to your budget tracker!</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
