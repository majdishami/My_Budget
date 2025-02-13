import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LeftSidebar } from "@/components/LeftSidebar";
import { useState } from "react";

export default function HomePage() {
  // Temporary mock data until we integrate with backend
  const [incomes] = useState([]);
  const [bills] = useState([]);

  return (
    <div className="min-h-screen flex bg-background">
      <LeftSidebar 
        incomes={incomes}
        bills={bills}
        onEditTransaction={() => {}}
        onDeleteTransaction={() => {}}
        onAddIncome={() => {}}
        onAddBill={() => {}}
        onReset={() => {}}
      />

      <div className="flex-1 flex flex-col">
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
              <p className="text-foreground">Welcome to your budget tracker!</p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}