import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useListItems, 
  getListItemsQueryKey, 
  useCreateItem, 
  useUpdateItem, 
  useDeleteItem 
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit2, Plus, Package, Link2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const itemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unitsPerStack: z.coerce.number().min(1, "Must be at least 1"),
  stacksPerTruck: z.coerce.number().min(1, "Must be at least 1").optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g. #FF0000)"),
  equivalences: z.array(z.object({
    baseItemId: z.coerce.number().min(1, "Pick an item"),
    baseUnits: z.coerce.number().min(1, "Must be at least 1"),
  })),
});

type ItemFormValues = z.infer<typeof itemSchema>;

export default function ItemsPage() {
  const { data: items = [], isLoading } = useListItems({ query: { queryKey: getListItemsQueryKey() } });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [mode, setMode] = useState<"direct" | "relationship">("direct");

  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: "",
      unitsPerStack: 10,
      stacksPerTruck: 30,
      color: "#FF5A00",
      equivalences: [],
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "equivalences" });

  // Items that can serve as a base: direct-capacity items (no equivalences), not the item being edited
  const baseCandidates = items.filter(
    (i) => i.equivalences.length === 0 && i.id !== editingId
  );

  const onError = (verb: string) => (err: any) =>
    toast({
      title: `Failed to ${verb} item`,
      description: err?.data?.error ?? err?.message,
      variant: "destructive",
    });

  const onSubmit = (data: ItemFormValues) => {
    const payload =
      mode === "relationship"
        ? { name: data.name, unitsPerStack: data.unitsPerStack, color: data.color, equivalences: data.equivalences }
        : { name: data.name, unitsPerStack: data.unitsPerStack, stacksPerTruck: data.stacksPerTruck, color: data.color, equivalences: [] };

    if (mode === "relationship" && data.equivalences.length === 0) {
      toast({ title: "Add at least one relationship", variant: "destructive" });
      return;
    }
    if (mode === "direct" && !data.stacksPerTruck) {
      toast({ title: "Stacks per truck is required", variant: "destructive" });
      return;
    }

    if (editingId) {
      updateItem.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
            toast({ title: "Item updated successfully" });
            resetForm();
          },
          onError: onError("update"),
        }
      );
    } else {
      createItem.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
            toast({ title: "Item created successfully" });
            resetForm();
          },
          onError: onError("create"),
        }
      );
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setMode(item.equivalences.length > 0 ? "relationship" : "direct");
    setValue("name", item.name);
    setValue("unitsPerStack", item.unitsPerStack);
    setValue("stacksPerTruck", item.stacksPerTruck);
    setValue("color", item.color);
    setValue(
      "equivalences",
      item.equivalences.map((e: any) => ({ baseItemId: e.baseItemId, baseUnits: e.baseUnits }))
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteItem.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
            toast({ title: "Item deleted successfully" });
          },
          onError: onError("delete"),
        }
      );
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setMode("direct");
    reset({
      name: "",
      unitsPerStack: 10,
      stacksPerTruck: 30,
      color: "#FF5A00",
      equivalences: [],
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card className="sticky top-24 border-border shadow-sm">
          <CardHeader>
            <CardTitle>{editingId ? "Edit Item Type" : "Add Item Type"}</CardTitle>
            <CardDescription>
              Configure how this item stacks and its visual color in the calculator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name</Label>
                <Input id="name" placeholder="e.g. Half Pack" {...register("name")} />
                {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="unitsPerStack">Units per Stack</Label>
                <Input id="unitsPerStack" type="number" {...register("unitsPerStack")} />
                {errors.unitsPerStack && <p className="text-destructive text-sm">{errors.unitsPerStack.message}</p>}
              </div>

              {/* Capacity mode toggle */}
              <div className="space-y-2">
                <Label>Truck Capacity</Label>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-muted">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("direct");
                      setValue("equivalences", []);
                    }}
                    className={cn(
                      "px-2 py-1.5 rounded text-sm font-bold transition-colors",
                      mode === "direct" ? "bg-background shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    Direct
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("relationship")}
                    className={cn(
                      "px-2 py-1.5 rounded text-sm font-bold transition-colors flex items-center justify-center gap-1.5",
                      mode === "relationship" ? "bg-background shadow-sm" : "text-muted-foreground"
                    )}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Relationship
                  </button>
                </div>
              </div>

              {mode === "direct" ? (
                <div className="space-y-2">
                  <Label htmlFor="stacksPerTruck">Stacks per Truck (Max)</Label>
                  <Input id="stacksPerTruck" type="number" {...register("stacksPerTruck")} />
                  {errors.stacksPerTruck && <p className="text-destructive text-sm">{errors.stacksPerTruck.message}</p>}
                </div>
              ) : (
                <div className="space-y-3 rounded-md border p-3 bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    Define 1 unit of this item in terms of existing items. Capacity
                    is derived automatically from the first relationship.
                  </p>
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <span className="text-sm font-mono shrink-0">1 =</span>
                      <Input
                        type="number"
                        className="w-20 h-9 font-mono"
                        {...register(`equivalences.${index}.baseUnits`)}
                      />
                      <select
                        className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
                        {...register(`equivalences.${index}.baseItemId`)}
                      >
                        <option value="">Select item...</option>
                        {baseCandidates.map((i) => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {errors.equivalences && (
                    <p className="text-destructive text-sm">Each relationship needs an item and units.</p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => append({ baseItemId: 0, baseUnits: 1 })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add relationship
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="color">Diagram Color (Hex)</Label>
                <div className="flex gap-3">
                  <div className="w-16 h-10 rounded-md border" style={{ backgroundColor: watch("color") || "#cccccc" }} />
                  <Input type="text" id="color" className="flex-1 uppercase font-mono" placeholder="#FF5A00" {...register("color")} />
                </div>
                {errors.color && <p className="text-destructive text-sm">{errors.color.message}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 font-bold">
                  {editingId ? "Update Item" : "Add Item"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
            <div>
              <CardTitle>Configured Items</CardTitle>
              <CardDescription>All available items for the load calculator.</CardDescription>
            </div>
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-md text-sm font-bold flex items-center gap-2">
              <Package className="h-4 w-4" />
              {items.length} Items
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground">
                Loading items...
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-foreground">No items configured</h3>
                <p className="text-muted-foreground mt-1">Add your first item type on the left.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Color</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Units / Stack</TableHead>
                    <TableHead className="text-right">Max Stacks / Truck</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div 
                          className="w-6 h-6 rounded-md shadow-sm border"
                          style={{ backgroundColor: item.color }} 
                          title={item.color}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{item.name}</div>
                        {item.equivalences.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Link2 className="h-3 w-3 shrink-0" />
                            <span className="font-mono">
                              1 = {item.equivalences.map((e) => `${e.baseUnits} ${e.baseItemName}`).join(" = ")}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">{item.unitsPerStack}</TableCell>
                      <TableCell className="text-right font-mono">
                        {item.stacksPerTruck}
                        {item.equivalences.length > 0 && (
                          <span className="text-xs text-muted-foreground ml-1" title="Derived from relationship">
                            (derived)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEdit(item)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(item.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
