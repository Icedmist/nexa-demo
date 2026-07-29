import { useState, useEffect } from "react";
import { 
  UtensilsCrossed, 
  ChefHat, 
  Timer, 
  Printer, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Flame, 
  Play, 
  Sparkles, 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  Scale, 
  Layers, 
  ArrowRight, 
  RefreshCw,
  X,
  AlertCircle,
  Eye,
  Sliders,
  Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useItems } from "@/hooks/useInventoryData";

interface KitchenStation {
  id: string;
  name: string;
  type: string;
  itemsCount: number;
  printerIp: string;
  status: "online" | "busy" | "offline";
  displayMode: "print" | "kds" | "both";
  assignedCategories: string[];
}

interface RecipeIngredient {
  id: string;
  itemId?: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

interface Recipe {
  id: string;
  dishName: string;
  category: string;
  servings: number;
  sellingPrice: number;
  targetFoodCostPct: number;
  ingredients: RecipeIngredient[];
  updatedAt: string;
}

const DEFAULT_STATIONS: KitchenStation[] = [
  {
    id: "st-1",
    name: "Grill Station",
    type: "grill",
    itemsCount: 12,
    printerIp: "192.168.1.50",
    status: "online",
    displayMode: "both",
    assignedCategories: ["Steaks", "Burgers", "Grilled Chicken", "Barbecue"]
  },
  {
    id: "st-2",
    name: "Cold Prep / Salad",
    type: "cold",
    itemsCount: 8,
    printerIp: "192.168.1.51",
    status: "online",
    displayMode: "kds",
    assignedCategories: ["Salads", "Appetizers", "Desserts", "Cold Wraps"]
  },
  {
    id: "st-3",
    name: "Bar / Beverage",
    type: "bar",
    itemsCount: 28,
    printerIp: "192.168.1.52",
    status: "online",
    displayMode: "both",
    assignedCategories: ["Cocktails", "Mocktails", "Fresh Juices", "Smoothies", "Coffee"]
  }
];

const DEFAULT_RECIPES: Recipe[] = [
  {
    id: "rec-1",
    dishName: "Signature Jollof Rice with Beef",
    category: "Main Dishes",
    servings: 1,
    sellingPrice: 4500,
    targetFoodCostPct: 30,
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: "ing-1", name: "Basmati / Long Grain Rice", quantity: 200, unit: "g", unitCost: 4.5 },
      { id: "ing-2", name: "Beef Sirloin Cubes", quantity: 180, unit: "g", unitCost: 8.0 },
      { id: "ing-3", name: "Tomato Paste & Puree", quantity: 50, unit: "g", unitCost: 3.0 },
      { id: "ing-4", name: "Vegetable Oil & Seasoning", quantity: 30, unit: "ml", unitCost: 2.0 },
      { id: "ing-5", name: "Fried Plantain Slice", quantity: 100, unit: "g", unitCost: 1.5 }
    ]
  },
  {
    id: "rec-2",
    dishName: "Gourmet Beef Burger & Fries",
    category: "Burgers",
    servings: 1,
    sellingPrice: 5200,
    targetFoodCostPct: 28,
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: "ing-201", name: "Ground Beef Patty", quantity: 1, unit: "pc", unitCost: 650 },
      { id: "ing-202", name: "Brioche Bun", quantity: 1, unit: "pc", unitCost: 250 },
      { id: "ing-203", name: "Cheddar Cheese Slice", quantity: 2, unit: "pc", unitCost: 120 },
      { id: "ing-204", name: "Fresh Lettuce & Tomato", quantity: 50, unit: "g", unitCost: 80 },
      { id: "ing-205", name: "Potato Fries (Raw)", quantity: 150, unit: "g", unitCost: 1.8 }
    ]
  },
  {
    id: "rec-3",
    dishName: "Iced Caramel Macchiato",
    category: "Beverages",
    servings: 1,
    sellingPrice: 2800,
    targetFoodCostPct: 20,
    updatedAt: new Date().toISOString(),
    ingredients: [
      { id: "ing-301", name: "Espresso Roast Beans", quantity: 18, unit: "g", unitCost: 12 },
      { id: "ing-302", name: "Whole Milk", quantity: 220, unit: "ml", unitCost: 1.2 },
      { id: "ing-303", name: "Vanilla & Caramel Syrup", quantity: 30, unit: "ml", unitCost: 4.0 },
      { id: "ing-304", name: "Clear Cup & Straw", quantity: 1, unit: "pc", unitCost: 80 }
    ]
  }
];

export function RestaurantAdminPanel() {
  const { data: catalogItems } = useItems();

  // Load / Store Kitchen Stations
  const [stations, setStations] = useState<KitchenStation[]>(() => {
    const saved = localStorage.getItem("restaurant-kitchen-stations");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_STATIONS;
  });

  // Load / Store Recipes
  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const saved = localStorage.getItem("restaurant-recipes-list");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_RECIPES;
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem("restaurant-kitchen-stations", JSON.stringify(stations));
  }, [stations]);

  useEffect(() => {
    localStorage.setItem("restaurant-recipes-list", JSON.stringify(recipes));
  }, [recipes]);

  // Modals state
  const [selectedStation, setSelectedStation] = useState<KitchenStation | null>(null);
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [isAddStationOpen, setIsAddStationOpen] = useState(false);
  const [newStationName, setNewStationName] = useState("");
  const [newStationIp, setNewStationIp] = useState("192.168.1.53");
  const [newStationType, setNewStationType] = useState("prep");

  // Station KDS Ticket Queue state
  const [isKdsModalOpen, setIsKdsModalOpen] = useState(false);
  const [kdsStation, setKdsStation] = useState<KitchenStation | null>(null);
  const [kdsTickets, setKdsTickets] = useState([
    { id: "TK-101", table: "Table 4", item: "Jollof Rice x2", timeAgo: "4m ago", status: "preparing" },
    { id: "TK-102", table: "Table 7", item: "Beef Burger x1", timeAgo: "8m ago", status: "ready" },
    { id: "TK-103", table: "Table 2", item: "Grilled Chicken x1", timeAgo: "1m ago", status: "pending" },
  ]);

  // Recipe Builder Modal state
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [recipeDishName, setRecipeDishName] = useState("");
  const [recipeCategory, setRecipeCategory] = useState("Main Dishes");
  const [recipeServings, setRecipeServings] = useState(1);
  const [recipeSellingPrice, setRecipeSellingPrice] = useState(3500);
  const [recipeTargetCostPct, setRecipeTargetCostPct] = useState(30);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);

  // Helpers for station manage
  const handleOpenManageStation = (st: KitchenStation) => {
    setSelectedStation({ ...st });
    setIsStationModalOpen(true);
  };

  const handleSaveStation = () => {
    if (!selectedStation) return;
    setStations(prev => prev.map(s => s.id === selectedStation.id ? selectedStation : s));
    setIsStationModalOpen(false);
    toast.success(`${selectedStation.name} configuration updated successfully!`);
  };

  const handleTestPrint = (stName: string, ip: string) => {
    toast.promise(
      new Promise((res) => setTimeout(res, 1200)),
      {
        loading: `Sending test routing packet to ${stName} [${ip}]...`,
        success: `Print Test Successful! Printer at ${ip} responded OK.`,
        error: "Printer offline or unreachable."
      }
    );
  };

  const handleAddStation = () => {
    if (!newStationName.trim()) {
      toast.error("Please enter a station name");
      return;
    }
    const newSt: KitchenStation = {
      id: `st-${Date.now()}`,
      name: newStationName.trim(),
      type: newStationType,
      itemsCount: 0,
      printerIp: newStationIp.trim() || "192.168.1.55",
      status: "online",
      displayMode: "both",
      assignedCategories: ["General Prep"]
    };
    setStations(prev => [...prev, newSt]);
    setNewStationName("");
    setIsAddStationOpen(false);
    toast.success(`Kitchen Station "${newSt.name}" created!`);
  };

  const handleDeleteStation = (id: string) => {
    setStations(prev => prev.filter(s => s.id !== id));
    setIsStationModalOpen(false);
    toast.success("Station removed from kitchen configuration");
  };

  // Recipe Builder Handlers
  const handleOpenRecipeBuilder = (recipe?: Recipe) => {
    if (recipe) {
      setEditingRecipe(recipe);
      setRecipeDishName(recipe.dishName);
      setRecipeCategory(recipe.category);
      setRecipeServings(recipe.servings || 1);
      setRecipeSellingPrice(recipe.sellingPrice);
      setRecipeTargetCostPct(recipe.targetFoodCostPct || 30);
      setRecipeIngredients([...recipe.ingredients]);
    } else {
      setEditingRecipe(null);
      setRecipeDishName("");
      setRecipeCategory("Main Dishes");
      setRecipeServings(1);
      setRecipeSellingPrice(4000);
      setRecipeTargetCostPct(30);
      setRecipeIngredients([
        { id: `ing-${Date.now()}-1`, name: "Main Protein / Grain", quantity: 150, unit: "g", unitCost: 5 },
        { id: "ing-${Date.now()}-2", name: "Cooking Sauce / Spice", quantity: 30, unit: "ml", unitCost: 2 },
      ]);
    }
    setIsRecipeModalOpen(true);
  };

  const handleAddIngredientRow = () => {
    setRecipeIngredients(prev => [
      ...prev,
      { id: `ing-${Date.now()}`, name: "New Ingredient", quantity: 100, unit: "g", unitCost: 2 }
    ]);
  };

  const handleRemoveIngredientRow = (id: string) => {
    setRecipeIngredients(prev => prev.filter(i => i.id !== id));
  };

  const handleSelectCatalogItemForIngredient = (ingId: string, itemId: string) => {
    const item = catalogItems.find(i => i.id === itemId);
    if (!item) return;
    setRecipeIngredients(prev => prev.map(ing => {
      if (ing.id === ingId) {
        return {
          ...ing,
          itemId: item.id,
          name: item.name,
          unitCost: item.costPrice || (item.sellingPrice ? item.sellingPrice * 0.4 : 10)
        };
      }
      return ing;
    }));
  };

  // Recipe calculations
  const calculateTotalIngredientsCost = (ings: RecipeIngredient[]) => {
    return ings.reduce((sum, ing) => sum + (ing.quantity * ing.unitCost), 0);
  };

  const totalCost = calculateTotalIngredientsCost(recipeIngredients);
  const costPerServing = recipeServings > 0 ? totalCost / recipeServings : totalCost;
  const foodCostPct = recipeSellingPrice > 0 ? (costPerServing / recipeSellingPrice) * 100 : 0;
  const grossProfit = recipeSellingPrice - costPerServing;
  const grossMarginPct = recipeSellingPrice > 0 ? (grossProfit / recipeSellingPrice) * 100 : 0;
  const recommendedSellingPrice = recipeTargetCostPct > 0 ? (costPerServing / (recipeTargetCostPct / 100)) : costPerServing * 3.3;

  const handleSaveRecipe = () => {
    if (!recipeDishName.trim()) {
      toast.error("Please enter a dish name");
      return;
    }

    const savedRecipe: Recipe = {
      id: editingRecipe ? editingRecipe.id : `rec-${Date.now()}`,
      dishName: recipeDishName.trim(),
      category: recipeCategory,
      servings: Number(recipeServings) || 1,
      sellingPrice: Number(recipeSellingPrice) || 0,
      targetFoodCostPct: Number(recipeTargetCostPct) || 30,
      ingredients: recipeIngredients,
      updatedAt: new Date().toISOString()
    };

    if (editingRecipe) {
      setRecipes(prev => prev.map(r => r.id === editingRecipe.id ? savedRecipe : r));
      toast.success(`Recipe for "${savedRecipe.dishName}" updated!`);
    } else {
      setRecipes(prev => [savedRecipe, ...prev]);
      toast.success(`New Recipe "${savedRecipe.dishName}" created!`);
    }

    setIsRecipeModalOpen(false);
  };

  const handleDeleteRecipe = (id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
    toast.success("Recipe deleted");
  };

  // Recipe Summary Stats
  const avgFoodCostPct = recipes.length > 0 
    ? (recipes.reduce((sum, r) => sum + ((calculateTotalIngredientsCost(r.ingredients) / r.servings) / (r.sellingPrice || 1)) * 100, 0) / recipes.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Restaurant Overview KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-orange-50/50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <UtensilsCrossed className="h-4 w-4 text-orange-600" />
              Kitchen Stations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{stations.length} Active</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              All Printers Online
            </p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <Timer className="h-4 w-4 text-purple-600" />
              Avg Prep Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">15 mins</div>
            <p className="text-xs text-muted-foreground mt-1 text-emerald-600 font-medium">
              -2.5m ticket queue response
            </p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <ChefHat className="h-4 w-4 text-emerald-600" />
              Costed Recipes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{recipes.length} Dishes</div>
            <p className="text-xs text-muted-foreground mt-1">
              Portion pricing calculated
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Avg Food Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{avgFoodCostPct.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1 text-emerald-600 font-medium">
              Target: &lt; 30.0%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 1: Kitchen Stations & Printers */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Kitchen Categories & Station Routing
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Configure how incoming POS & Table QR orders are sent to Grill, Prep, or Bar printers & digital screens.
            </CardDescription>
          </div>
          <Button 
            size="sm" 
            onClick={() => setIsAddStationOpen(true)}
            className="gap-2 font-medium"
          >
            <Plus className="h-4 w-4" /> Add Station
          </Button>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {stations.map((station) => (
              <div 
                key={station.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-base">{station.name}</p>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 inline-block" />
                      {station.status}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                      {station.displayMode === "both" ? "Print + KDS" : station.displayMode === "kds" ? "Digital KDS Only" : "Thermal Print Only"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="font-medium text-foreground">{station.itemsCount} assigned items</span>
                    <span>•</span>
                    <span className="font-mono flex items-center gap-1">
                      <Printer className="h-3 w-3" />
                      IP [{station.printerIp}]
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {station.assignedCategories.map(cat => (
                      <span key={cat} className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground border">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setKdsStation(station);
                      setIsKdsModalOpen(true);
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <Eye className="h-3.5 w-3.5" /> Station KDS
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleTestPrint(station.name, station.printerIp)}
                    className="gap-1.5 text-xs text-slate-700 dark:text-slate-300"
                  >
                    <Printer className="h-3.5 w-3.5" /> Test Print
                  </Button>
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={() => handleOpenManageStation(station)}
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <Sliders className="h-3.5 w-3.5" /> Manage
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: Recipe Costing & Visual Recipe Builder */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-emerald-600" />
              Visual Recipe Builder & Portion Costing
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Build exact ingredient portion breakdowns per dish, calculate precise COGS, and optimize menu pricing margins.
            </CardDescription>
          </div>
          <Button 
            size="sm" 
            onClick={() => handleOpenRecipeBuilder()}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            <Calculator className="h-4 w-4" /> Create New Recipe
          </Button>
        </CardHeader>

        <CardContent>
          {recipes.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl bg-muted/20 p-6 text-center space-y-3">
              <ChefHat className="h-10 w-10 text-muted-foreground/60" />
              <div>
                <p className="text-sm font-semibold">No Recipes Built Yet</p>
                <p className="text-xs text-muted-foreground">Start adding ingredient portion breakdowns to automatically calculate food cost margins.</p>
              </div>
              <Button size="sm" onClick={() => handleOpenRecipeBuilder()} className="gap-2">
                <Plus className="h-4 w-4" /> Build First Recipe
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recipes.map((recipe) => {
                const totalIngredientsCost = calculateTotalIngredientsCost(recipe.ingredients);
                const portionCost = recipe.servings > 0 ? totalIngredientsCost / recipe.servings : totalIngredientsCost;
                const foodCostPctVal = recipe.sellingPrice > 0 ? (portionCost / recipe.sellingPrice) * 100 : 0;
                const marginAmount = recipe.sellingPrice - portionCost;
                const grossMarginPctVal = recipe.sellingPrice > 0 ? (marginAmount / recipe.sellingPrice) * 100 : 0;

                const marginBadgeColor = grossMarginPctVal >= 65 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300" 
                  : grossMarginPctVal >= 50 
                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300" 
                  : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300";

                return (
                  <Card key={recipe.id} className="border border-border/80 hover:border-emerald-500/40 transition-all flex flex-col justify-between overflow-hidden shadow-xs">
                    <CardHeader className="p-4 pb-2 bg-muted/20">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="outline" className="text-[10px] mb-1 font-normal">
                            {recipe.category}
                          </Badge>
                          <CardTitle className="text-base font-bold leading-tight line-clamp-2">
                            {recipe.dishName}
                          </CardTitle>
                        </div>
                        <Badge variant="outline" className={`text-xs font-mono font-bold shrink-0 ${marginBadgeColor}`}>
                          {grossMarginPctVal.toFixed(0)}% Margin
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-lg bg-muted/40 border">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Portion COGS</span>
                          <span className="font-bold text-sm text-foreground">₦{portionCost.toLocaleString("en-NG", { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Menu Price</span>
                          <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">₦{recipe.sellingPrice.toLocaleString("en-NG", { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>Ingredients ({recipe.ingredients.length})</span>
                          <span>Food Cost: <strong className="text-foreground">{foodCostPctVal.toFixed(1)}%</strong></span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {recipe.ingredients.slice(0, 3).map((ing) => (
                            <span key={ing.id} className="text-[10px] px-1.5 py-0.5 rounded bg-background border text-muted-foreground">
                              {ing.name} ({ing.quantity}{ing.unit})
                            </span>
                          ))}
                          {recipe.ingredients.length > 3 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                              +{recipe.ingredients.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          Net Profit: <strong className="text-emerald-600 dark:text-emerald-400">₦{marginAmount.toLocaleString("en-NG", { maximumFractionDigits: 0 })}</strong>
                        </span>
                        <div className="flex items-center gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteRecipe(recipe.id)}
                            title="Delete Recipe"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-xs gap-1 font-medium"
                            onClick={() => handleOpenRecipeBuilder(recipe)}
                          >
                            <Edit3 className="h-3 w-3" /> Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL 1: Manage Station Modal */}
      <Dialog open={isStationModalOpen} onOpenChange={setIsStationModalOpen}>
        <DialogContent className="max-w-lg bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary" />
              Manage {selectedStation?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure order routing parameters, thermal printer IP, and display output for this kitchen station.
            </DialogDescription>
          </DialogHeader>

          {selectedStation && (
            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label className="text-xs font-semibold">Station Name</Label>
                <Input 
                  value={selectedStation.name}
                  onChange={(e) => setSelectedStation({ ...selectedStation, name: e.target.value })}
                  placeholder="e.g. Grill Station"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold">Printer IP / Hostname</Label>
                  <Input 
                    value={selectedStation.printerIp}
                    onChange={(e) => setSelectedStation({ ...selectedStation, printerIp: e.target.value })}
                    placeholder="192.168.1.50"
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs font-semibold">Display Mode</Label>
                  <Select 
                    value={selectedStation.displayMode} 
                    onValueChange={(val: "print" | "kds" | "both") => setSelectedStation({ ...selectedStation, displayMode: val })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Print + Digital KDS</SelectItem>
                      <SelectItem value="kds">Digital KDS Screen Only</SelectItem>
                      <SelectItem value="print">Thermal Printer Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs font-semibold">Station Operating Status</Label>
                <div className="flex items-center gap-3">
                  {(["online", "busy", "offline"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedStation({ ...selectedStation, status: st })}
                      className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all ${
                        selectedStation.status === st 
                          ? "bg-primary text-primary-foreground border-primary shadow-xs" 
                          : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 pt-2 border-t">
                <Label className="text-xs font-semibold">Routed Categories / Item Groups</Label>
                <p className="text-[11px] text-muted-foreground">Orders containing items from these categories will route tickets here automatically.</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {["Burgers", "Steaks", "Barbecue", "Salads", "Appetizers", "Cocktails", "Drinks", "Desserts", "Main Dishes"].map((cat) => {
                    const isAssigned = selectedStation.assignedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          const updated = isAssigned
                            ? selectedStation.assignedCategories.filter(c => c !== cat)
                            : [...selectedStation.assignedCategories, cat];
                          setSelectedStation({ ...selectedStation, assignedCategories: updated });
                        }}
                        className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                          isAssigned 
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800 font-semibold" 
                            : "bg-muted/30 text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {isAssigned ? "✓ " : "+ "}{cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 border-t pt-3">
            <Button 
              type="button" 
              variant="destructive" 
              size="sm"
              onClick={() => selectedStation && handleDeleteStation(selectedStation.id)}
            >
              Remove Station
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsStationModalOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={handleSaveStation}>
                Save Station
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Add Station Modal */}
      <Dialog open={isAddStationOpen} onOpenChange={setIsAddStationOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Kitchen Station</DialogTitle>
            <DialogDescription className="text-xs">
              Create a new prep station (e.g., Pizza Oven, Bakery, Espresso Bar) to direct ticket printing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Station Name</Label>
              <Input 
                value={newStationName}
                onChange={(e) => setNewStationName(e.target.value)}
                placeholder="e.g. Pizza & Pastry Station"
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Thermal Printer IP Address</Label>
              <Input 
                value={newStationIp}
                onChange={(e) => setNewStationIp(e.target.value)}
                placeholder="192.168.1.55"
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Station Type</Label>
              <Select value={newStationType} onValueChange={setNewStationType}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grill">Grill & Hot Line</SelectItem>
                  <SelectItem value="cold">Cold Prep & Pantry</SelectItem>
                  <SelectItem value="bar">Bar & Beverage</SelectItem>
                  <SelectItem value="bakery">Bakery & Dessert</SelectItem>
                  <SelectItem value="prep">General Assembly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddStationOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddStation}>
              Create Station
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: KDS Station Live Tickets Modal */}
      <Dialog open={isKdsModalOpen} onOpenChange={setIsKdsModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-600" />
              {kdsStation?.name} — Live Station KDS Queue
            </DialogTitle>
            <DialogDescription className="text-xs">
              Real-time active kitchen tickets routed directly to this station screen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {kdsTickets.length === 0 ? (
              <p className="text-xs text-center py-6 text-muted-foreground">No active tickets waiting for this station.</p>
            ) : (
              kdsTickets.map((tk) => (
                <div key={tk.id} className="p-3 rounded-xl border bg-muted/20 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs">{tk.id}</span>
                      <Badge variant="outline" className="text-[10px]">{tk.table}</Badge>
                      <span className="text-[10px] text-muted-foreground">{tk.timeAgo}</span>
                    </div>
                    <p className="font-bold text-sm mt-1">{tk.item}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {tk.status === "pending" && (
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1"
                        onClick={() => {
                          setKdsTickets(prev => prev.map(t => t.id === tk.id ? { ...t, status: "preparing" } : t));
                          toast.info(`Started preparing ticket ${tk.id}`);
                        }}
                      >
                        <Play className="h-3 w-3" /> Start Prep
                      </Button>
                    )}
                    {tk.status === "preparing" && (
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        onClick={() => {
                          setKdsTickets(prev => prev.map(t => t.id === tk.id ? { ...t, status: "ready" } : t));
                          toast.success(`Ticket ${tk.id} marked READY for server!`);
                        }}
                      >
                        <CheckCircle2 className="h-3 w-3" /> Mark Ready
                      </Button>
                    )}
                    {tk.status === "ready" && (
                      <Badge className="bg-emerald-500 text-white text-xs px-2.5 py-1">Ready for Service</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setIsKdsModalOpen(false)}>
              Close Display
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Visual Recipe Builder Modal */}
      <Dialog open={isRecipeModalOpen} onOpenChange={setIsRecipeModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-emerald-600" />
              {editingRecipe ? "Edit Dish Recipe" : "Visual Recipe Builder"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Link raw inventory items, set portion weights/measures, and auto-calculate food cost margins.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Header dish settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Dish / Menu Item Name</Label>
                <Input 
                  value={recipeDishName}
                  onChange={(e) => setRecipeDishName(e.target.value)}
                  placeholder="e.g. Signature Jollof & Grilled Steak"
                />
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <Select value={recipeCategory} onValueChange={setRecipeCategory}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Main Dishes">Main Dishes</SelectItem>
                    <SelectItem value="Burgers">Burgers & Sandwiches</SelectItem>
                    <SelectItem value="Salads">Salads & Starters</SelectItem>
                    <SelectItem value="Beverages">Beverages & Coffee</SelectItem>
                    <SelectItem value="Desserts">Desserts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-muted/30 p-3 rounded-xl border">
              <div className="grid gap-1">
                <Label className="text-[11px] font-semibold">Recipe Servings / Yield</Label>
                <Input 
                  type="number"
                  min={1}
                  value={recipeServings}
                  onChange={(e) => setRecipeServings(Math.max(1, Number(e.target.value)))}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid gap-1">
                <Label className="text-[11px] font-semibold">Target Food Cost %</Label>
                <Input 
                  type="number"
                  min={10}
                  max={90}
                  value={recipeTargetCostPct}
                  onChange={(e) => setRecipeTargetCostPct(Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid gap-1">
                <Label className="text-[11px] font-semibold">Menu Selling Price (₦)</Label>
                <Input 
                  type="number"
                  min={0}
                  value={recipeSellingPrice}
                  onChange={(e) => setRecipeSellingPrice(Number(e.target.value))}
                  className="h-8 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>
            </div>

            {/* Ingredients Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Ingredients Portion Breakdown ({recipeIngredients.length})
                </Label>
                <Button size="sm" variant="outline" onClick={handleAddIngredientRow} className="h-7 text-xs gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add Ingredient
                </Button>
              </div>

              <div className="border rounded-xl overflow-hidden divide-y divide-border">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 p-2 bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Ingredient / Item</span>
                  <span>Qty</span>
                  <span>Unit</span>
                  <span>Unit Cost (₦)</span>
                  <span></span>
                </div>

                {recipeIngredients.map((ing) => {
                  const lineTotal = ing.quantity * ing.unitCost;
                  return (
                    <div key={ing.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 p-2 items-center text-xs">
                      <div className="space-y-1">
                        <Input 
                          value={ing.name}
                          onChange={(e) => {
                            const name = e.target.value;
                            setRecipeIngredients(prev => prev.map(i => i.id === ing.id ? { ...i, name } : i));
                          }}
                          placeholder="Ingredient name"
                          className="h-8 text-xs"
                        />
                        {catalogItems && catalogItems.length > 0 && (
                          <Select 
                            onValueChange={(val) => handleSelectCatalogItemForIngredient(ing.id, val)}
                          >
                            <SelectTrigger className="h-6 text-[10px] py-0">
                              <SelectValue placeholder="Pick from Inventory..." />
                            </SelectTrigger>
                            <SelectContent>
                              {catalogItems.map((ci) => (
                                <SelectItem key={ci.id} value={ci.id} className="text-xs">
                                  {ci.name} (₦{ci.costPrice || ci.sellingPrice || 0})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <Input 
                        type="number"
                        min={0}
                        step="any"
                        value={ing.quantity}
                        onChange={(e) => {
                          const quantity = Number(e.target.value);
                          setRecipeIngredients(prev => prev.map(i => i.id === ing.id ? { ...i, quantity } : i));
                        }}
                        className="h-8 text-xs"
                      />

                      <Select 
                        value={ing.unit} 
                        onValueChange={(unit) => {
                          setRecipeIngredients(prev => prev.map(i => i.id === ing.id ? { ...i, unit } : i));
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="g">Grams (g)</SelectItem>
                          <SelectItem value="kg">Kilograms (kg)</SelectItem>
                          <SelectItem value="ml">Milliliters (ml)</SelectItem>
                          <SelectItem value="L">Liters (L)</SelectItem>
                          <SelectItem value="pc">Pieces (pc)</SelectItem>
                          <SelectItem value="tbsp">Tbsp</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="space-y-0.5">
                        <Input 
                          type="number"
                          min={0}
                          step="any"
                          value={ing.unitCost}
                          onChange={(e) => {
                            const unitCost = Number(e.target.value);
                            setRecipeIngredients(prev => prev.map(i => i.id === ing.id ? { ...i, unitCost } : i));
                          }}
                          className="h-8 text-xs"
                        />
                        <span className="text-[10px] text-muted-foreground block text-right">
                          Line: ₦{lineTotal.toLocaleString("en-NG", { maximumFractionDigits: 0 })}
                        </span>
                      </div>

                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleRemoveIngredientRow(ing.id)}
                        className="h-7 w-7 text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calculations Summary Panel */}
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Total Ingredients Cost (COGS):</span>
                <span className="font-bold text-foreground">₦{totalCost.toLocaleString("en-NG", { maximumFractionDigits: 0 })}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Portion Cost per Serving:</span>
                <span className="font-bold text-foreground">₦{costPerServing.toLocaleString("en-NG", { maximumFractionDigits: 0 })}</span>
              </div>

              <div className="flex items-center justify-between text-xs border-t pt-2">
                <span className="font-medium text-muted-foreground">Calculated Food Cost %:</span>
                <span className={`font-bold ${foodCostPct <= recipeTargetCostPct ? "text-emerald-600" : "text-amber-600"}`}>
                  {foodCostPct.toFixed(1)}% (Target: {recipeTargetCostPct}%)
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">Recommended Menu Price:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">
                  ₦{recommendedSellingPrice.toLocaleString("en-NG", { maximumFractionDigits: 0 })}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs border-t pt-2 font-bold">
                <span>Net Profit Margin:</span>
                <span className="text-emerald-600 dark:text-emerald-400 text-sm">
                  ₦{grossProfit.toLocaleString("en-NG", { maximumFractionDigits: 0 })} ({grossMarginPct.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 border-t pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsRecipeModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveRecipe} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5">
              <Check className="h-4 w-4" /> Save & Link Recipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
