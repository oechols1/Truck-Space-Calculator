import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Trash2, Edit2, Plus, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const itemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unitsPerStack: z.coerce.number().min(1, "Must be at least 1"),
  stacksPerTruck: z.coerce.number().min(1, "Must be at least 1"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (e.g. #FF0000)"),
});

type ItemFormValues = z.infer<typeof itemSchema>;

export default function ItemsPage() {
  const { data: items = [], isLoading } = useListItems({ query: { queryKey: getListItemsQueryKey() } });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [editingId, setEditingId] = useState<number | null>(null);

  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: "",
      unitsPerStack: 10,
      stacksPerTruck: 30,
      color: "#FF5A00"
    }
  });

  const onSubmit = (data: ItemFormValues) => {
    if (editingId) {
      updateItem.mutate(
        { id: editingId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
            toast({ title: "Item updated successfully" });
            resetForm();
          },
          onError: () => toast({ title: "Failed to update item", variant: "destructive" })
        }
      );
    } else {
      createItem.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListItemsQueryKey() });
            toast({ title: "Item created successfully" });
            resetForm();
          },
          onError: () => toast({ title: "Failed to create item", variant: "destructive" })
        }
      );
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setValue("name", item.name);
    setValue("unitsPerStack", item.unitsPerStack);
    setValue("stacksPerTruck", item.stacksPerTruck);
    setValue("color", item.color);
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
          onError: () => toast({ title: "Failed to delete item", variant: "destructive" })
        }
      );
    }
  };

  const resetForm = () => {
    setEditingId(null);
    reset({
      name: "",
      unitsPerStack: 10,
      stacksPerTruck: 30,
      color: "#FF5A00"
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
              
              <div className="space-y-2">
                <Label htmlFor="stacksPerTruck">Stacks per Truck (Max)</Label>
                <Input id="stacksPerTruck" type="number" {...register("stacksPerTruck")} />
                {errors.stacksPerTruck && <p className="text-destructive text-sm">{errors.stacksPerTruck.message}</p>}
              </div>

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
                      <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                      <TableCell className="text-right font-mono">{item.unitsPerStack}</TableCell>
                      <TableCell className="text-right font-mono">{item.stacksPerTruck}</TableCell>
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
