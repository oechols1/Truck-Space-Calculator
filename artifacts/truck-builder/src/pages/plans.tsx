import { useState } from "react";
import { useLocation } from "wouter";
import {
  useListPlans,
  getListPlansQueryKey,
  useDeletePlan,
} from "@workspace/api-client-react";
import type { Plan } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardList,
  Trash2,
  FolderOpen,
  Plus,
  PackageOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PlansPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: plans = [], isLoading } = useListPlans({
    query: { queryKey: getListPlansQueryKey() },
  });

  const deletePlan = useDeletePlan();

  const handleOpen = (plan: Plan) => {
    navigate(`/?plan=${plan.id}`);
  };

  const handleDelete = (plan: Plan) => {
    setDeletingId(plan.id);
    deletePlan.mutate(
      { id: plan.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
          toast({ title: "Plan deleted", description: `"${plan.name}" removed.` });
          setDeletingId(null);
        },
        onError: () => {
          toast({
            title: "Delete failed",
            description: "Could not delete the plan.",
            variant: "destructive",
          });
          setDeletingId(null);
        },
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-primary" />
            Saved Plans
          </h1>
          <p className="text-muted-foreground mt-1">
            Reopen, edit, or share previously saved load plans.
          </p>
        </div>
        <Button onClick={() => navigate("/")}>
          <Plus className="h-4 w-4 mr-2" />
          New Plan
        </Button>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="bg-muted/30 border-b pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <PackageOpen className="h-5 w-5 text-primary" />
            All Plans
          </CardTitle>
          <CardDescription>
            {plans.length === 0
              ? "No plans saved yet"
              : `${plans.length} plan${plans.length === 1 ? "" : "s"} saved`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading plans...
            </div>
          ) : plans.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center gap-3 text-muted-foreground">
              <ClipboardList className="h-12 w-12 opacity-20" />
              <p className="font-bold uppercase tracking-widest text-sm">
                No saved plans
              </p>
              <p className="text-sm opacity-70">
                Use the calculator and save a plan to see it here.
              </p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => navigate("/")}
              >
                Go to Calculator
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Name / Order Ref</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">
                    Items
                  </TableHead>
                  <TableHead className="text-right hidden md:table-cell">
                    Last Updated
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow
                    key={plan.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => handleOpen(plan)}
                  >
                    <TableCell className="font-bold">{plan.name}</TableCell>
                    <TableCell className="text-right font-mono hidden sm:table-cell">
                      {plan.lines.length} item
                      {plan.lines.length === 1 ? "" : "s"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm hidden md:table-cell">
                      {formatDate(plan.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpen(plan)}
                        >
                          <FolderOpen className="h-3.5 w-3.5 mr-1" />
                          Open
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn(
                            "text-destructive hover:text-destructive hover:bg-destructive/10"
                          )}
                          disabled={deletingId === plan.id}
                          onClick={() => handleDelete(plan)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
