import { useState, useEffect, useMemo, useRef } from "react";
import { 
  useListItems, 
  getListItemsQueryKey, 
  useCalculateLoad 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  ArrowRight,
  PackageOpen,
  Plus,
  Minus
} from "lucide-react";
import { cn } from "@/lib/utils";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function CalculatorPage() {
  const { data: items = [], isLoading: itemsLoading } = useListItems({ 
    query: { queryKey: getListItemsQueryKey() } 
  });
  
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const debouncedQuantities = useDebounce(quantities, 300);
  
  const calculateLoad = useCalculateLoad();
  
  // Keep track of the last result to avoid flashing empty state
  const lastResultRef = useRef<any>(null);

  useEffect(() => {
    // Only calculate if we have some quantities entered
    const hasItems = Object.values(debouncedQuantities).some(q => q > 0);
    
    if (hasItems) {
      const lines = Object.entries(debouncedQuantities)
        .filter(([_, q]) => q > 0)
        .map(([id, q]) => ({ itemId: Number(id), quantity: q }));
        
      calculateLoad.mutate(
        { data: { lines } },
        {
          onSuccess: (data) => {
            lastResultRef.current = data;
          }
        }
      );
    } else {
      lastResultRef.current = null;
    }
  }, [debouncedQuantities]);

  const handleQuantityChange = (id: number, val: string) => {
    const num = parseInt(val, 10);
    setQuantities(prev => ({
      ...prev,
      [id]: isNaN(num) ? 0 : Math.max(0, num)
    }));
  };

  const handleIncrement = (id: number, amount: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + amount
    }));
  };

  const result = calculateLoad.isPending ? lastResultRef.current : (lastResultRef.current || null);
  const isCalculating = calculateLoad.isPending;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-20">
      {/* LEFT COLUMN: Data Entry */}
      <div className="xl:col-span-4 space-y-6">
        <Card className="border-border shadow-sm sticky top-24">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <PackageOpen className="h-5 w-5 text-primary" />
              Load Quantities
            </CardTitle>
            <CardDescription>
              Enter units needed. Calculates live.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {itemsLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading items...</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No items configured. Go to Item Types to add some.
              </div>
            ) : (
              <div className="divide-y">
                {items.map(item => {
                  const qty = quantities[item.id] || 0;
                  return (
                    <div key={item.id} className="p-4 hover:bg-muted/10 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-sm border" 
                            style={{ backgroundColor: item.color }} 
                          />
                          <span className="font-bold text-foreground">{item.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {item.unitsPerStack} / stack
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleIncrement(item.id, -1)}
                          disabled={qty <= 0}
                          className="h-12 w-12 shrink-0 rounded-l-md"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Input
                          type="number"
                          value={qty || ""}
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                          className="h-12 text-center text-xl font-mono font-bold bg-background shadow-inner"
                          placeholder="0"
                        />
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => handleIncrement(item.id, 1)}
                          className="h-12 w-12 shrink-0 rounded-r-md"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="p-4 bg-muted/30 border-t">
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground"
                onClick={() => setQuantities({})}
              >
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: Results & Visualization */}
      <div className="xl:col-span-8 space-y-6">
        {!result ? (
          <Card className="h-full min-h-[500px] flex flex-col items-center justify-center text-center border-dashed border-2 bg-transparent shadow-none">
            <Truck className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
            <h2 className="text-2xl font-bold text-muted-foreground opacity-50">Ready for Load Plan</h2>
            <p className="text-muted-foreground opacity-50 mt-2 max-w-sm">
              Enter quantities on the left to instantly calculate truck fit, stacks required, and remaining space.
            </p>
          </Card>
        ) : (
          <>
            {/* BIG VERDICT BANNER */}
            <div className={cn(
              "rounded-xl border-2 p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-colors shadow-sm relative overflow-hidden",
              result.fits 
                ? "bg-green-500/10 border-green-500/30 text-green-900 dark:text-green-400" 
                : "bg-destructive/10 border-destructive/30 text-destructive-foreground dark:text-red-400"
            )}>
              {/* Status Indicator */}
              <div className="flex items-center gap-4 z-10">
                {result.fits ? (
                  <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-500 shrink-0" />
                ) : (
                  <AlertTriangle className="h-12 w-12 text-destructive shrink-0" />
                )}
                <div>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase">
                    {result.fits ? "Fits" : "Doesn't Fit"}
                  </h1>
                  <p className="text-lg font-medium opacity-80 uppercase tracking-widest mt-1">
                    {result.trucksNeeded === 1 
                      ? "In 1 standard 53' trailer" 
                      : `Requires ${result.trucksNeeded} trailers`}
                  </p>
                </div>
              </div>

              {/* Big Capacity Number */}
              <div className="text-right z-10 bg-background/50 backdrop-blur-sm rounded-lg p-4 border shadow-sm min-w-[200px]">
                <div className="text-sm font-bold uppercase tracking-wider opacity-70 mb-1">Capacity Used</div>
                <div className={cn(
                  "text-5xl font-black font-mono tracking-tighter",
                  result.capacityUsedPct > 100 ? "text-destructive" : ""
                )}>
                  {result.capacityUsedPct.toFixed(1)}<span className="text-3xl">%</span>
                </div>
              </div>

              {/* Loading State Overlay */}
              {isCalculating && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-20 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                </div>
              )}
            </div>

            {/* VISUAL DIAGRAM */}
            <Card className="overflow-hidden border-border shadow-sm">
              <CardHeader className="bg-muted/30 border-b py-4">
                <CardTitle className="text-lg">Trailer Visualization</CardTitle>
              </CardHeader>
              <CardContent className="p-6 bg-[#f8f9fa] dark:bg-[#0a0a0a]">
                <TruckDiagram result={result} items={items} />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LINE ITEMS BREAKDOWN */}
              <Card className="border-border shadow-sm">
                <CardHeader className="py-4 border-b">
                  <CardTitle className="text-lg">Load Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Units</TableHead>
                        <TableHead className="text-right">Stacks</TableHead>
                        <TableHead className="text-right">Space</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.lines.map((line: any) => (
                        <TableRow key={line.itemId}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: line.color }} />
                              <span className="font-bold">{line.itemName}</span>
                              {line.roundedUp && (
                                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500 ml-1 uppercase" title={`Rounded up to ${line.roundedUpTo} units to make full stacks`}>
                                  Rounded UP
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {line.quantity}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {line.stacksNeeded}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {line.capacityFractionPct.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* REMAINING ROOM */}
              <Card className="border-border shadow-sm">
                <CardHeader className="py-4 border-b">
                  <CardTitle className="text-lg">Remaining Room</CardTitle>
                  <CardDescription>What else fits in the final truck</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {result.remainingRoom.length > 0 ? (
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="text-right">Max Extra Stacks</TableHead>
                          <TableHead className="text-right">Extra Units</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.remainingRoom.map((room: any) => (
                          <TableRow key={room.itemId}>
                            <TableCell className="font-bold">{room.itemName}</TableCell>
                            <TableCell className="text-right font-mono text-green-600 dark:text-green-400 font-bold">
                              +{room.stacks}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              +{room.units}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                      <CheckCircle2 className="h-8 w-8 mb-2 opacity-20" />
                      <p className="font-bold uppercase tracking-widest text-sm">Truck is 100% Full</p>
                      <p className="text-sm opacity-70">No additional full stacks can fit.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Visual diagram of the truck(s)
function TruckDiagram({ result, items }: { result: any, items: any[] }) {
  if (!result || !result.lines) return null;

  // Render one truck box for each truck needed
  const trucks = Array.from({ length: result.trucksNeeded }).map((_, i) => i);
  
  // Flatten all stacks into an array so we can place them sequentially
  const allStacks: { itemId: number, color: string, name: string }[] = [];
  result.lines.forEach((line: any) => {
    for (let i = 0; i < line.stacksNeeded; i++) {
      allStacks.push({
        itemId: line.itemId,
        color: line.color,
        name: line.itemName
      });
    }
  });

  return (
    <div className="space-y-8">
      {trucks.map(truckIndex => {
        // Find which stacks go into this truck
        // A stack takes exactly (1 / stacksPerTruck) of a truck.
        // We will just slice the stacks. Wait, different items have different stack sizes.
        // It's easier to just represent the capacity sequentially.
        // Let's calculate the cumulative capacity to determine truck breaks.
        
        let currentTruckStacks: typeof allStacks = [];
        let capSoFar = 0;
        let truckStartCap = truckIndex * 100;
        let truckEndCap = (truckIndex + 1) * 100;
        
        let localCap = 0; // capacity within this truck

        // Because we don't have the exact bin-packing algorithm, we'll approximate the visuals 
        // by grouping stacks and sizing them by their fraction.
        // Actually, let's just render the lines mapped to width percentages.
        
        return (
          <div key={truckIndex} className="relative">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              <span>Front</span>
              <span>Trailer {truckIndex + 1} of {result.trucksNeeded}</span>
              <span>Rear doors</span>
            </div>
            
            {/* The Truck Box */}
            <div className="h-32 border-4 border-slate-800 dark:border-slate-300 rounded-r-lg relative overflow-hidden bg-white dark:bg-black shadow-inner">
              {/* Cab indicator */}
              <div className="absolute -left-4 top-0 bottom-0 w-4 bg-slate-800 dark:bg-slate-300" />
              
              <div className="absolute inset-0 flex">
                {/* Render the sections for this specific truck */}
                <TruckContents 
                  result={result} 
                  truckIndex={truckIndex} 
                  items={items} 
                />
              </div>

              {/* Grid lines (10% marks) */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="absolute h-full w-px bg-slate-500" style={{ left: `${i * 10}%` }} />
                ))}
              </div>
            </div>
            
            {/* Wheels */}
            <div className="flex justify-end gap-2 pr-12 mt-1">
              <div className="w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-300 border-2 border-background" />
              <div className="w-8 h-8 rounded-full bg-slate-800 dark:bg-slate-300 border-2 border-background" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TruckContents({ result, truckIndex, items }: { result: any, truckIndex: number, items: any[] }) {
  // To draw the contents accurately across multiple trucks without a real 2D bin packer,
  // we treat capacity as a continuous linear strip from 0 to capacityUsedPct.
  // Then for truckIndex N, we only render the portion of the strip that falls between N*100 and (N+1)*100.
  
  const blocks: React.ReactNode[] = [];
  let currentPos = 0; // 0 to capacityUsedPct
  
  const truckStart = truckIndex * 100;
  const truckEnd = (truckIndex + 1) * 100;

  result.lines.forEach((line: any) => {
    const itemDef = items.find((i: any) => i.id === line.itemId);
    if (!itemDef) return;
    
    // Size of one stack in percentage of one truck
    const stackPct = (1 / itemDef.stacksPerTruck) * 100;
    
    for (let i = 0; i < line.stacksNeeded; i++) {
      const stackStart = currentPos;
      const stackEnd = currentPos + stackPct;
      
      // Check if this stack overlaps with this truck
      if (stackEnd > truckStart && stackStart < truckEnd) {
        // It's in this truck!
        // Calculate its left and width relative to THIS truck (0 to 100)
        const leftInTruck = Math.max(0, stackStart - truckStart);
        const rightInTruck = Math.min(100, stackEnd - truckStart);
        const widthInTruck = rightInTruck - leftInTruck;
        
        blocks.push(
          <div 
            key={`${line.itemId}-${i}`}
            className="absolute top-0 bottom-0 border-r border-background/20 hover:opacity-90 transition-opacity flex items-center justify-center group"
            style={{ 
              left: `${leftInTruck}%`, 
              width: `${widthInTruck}%`,
              backgroundColor: line.color 
            }}
            title={`${line.itemName} (Stack ${i+1})`}
          >
            {/* Tooltip on hover is handled natively via title for simplicity, but we can add an inner visual */}
            {widthInTruck > 2 && (
              <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-white bg-black/50 px-1 rounded truncate pointer-events-none">
                {line.itemName}
              </span>
            )}
          </div>
        );
      }
      
      currentPos += stackPct;
    }
  });

  return <>{blocks}</>;
}
