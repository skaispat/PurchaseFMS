"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckCircle,
  Hourglass,
  Truck,
  FileText,
  Archive,
  RefreshCw,
  X,
  Calendar,
  List,
  Filter,
  Package,
  Clock,
  CheckCircle2,
  Search,
  Building2,
  Users,
  BarChart3,
  TrendingUp,
  Activity,
  Zap,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// --- Constants ---
const SHEET_ID = "19Za1BvjKvHT01rzDOPLS_MErnuEJd6__l7C_4lUgLlg";
const PO_SHEET = "PO";
const DELIVERY_SHEET = "DELIVERY";

// Enhanced color palette with more sophisticated colors
const THEME_COLORS = {
  primary: "#0f172a",
  secondary: "#334155",
  accent: "#3b82f6",
  success: "#059669",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#06b6d4",
  purple: "#8b5cf6",
  indigo: "#6366f1",
  pink: "#ec4899",
  emerald: "#10b981",
  rose: "#f43f5e",
  amber: "#f59e0b",
  slate: "#64748b",
};

const PIE_COLORS = [
  "#10b981", // Emerald for Complete
  "#f59e0b", // Amber for Pending
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
];

// --- Helper Functions ---
const parseGvizResponse = (text) => {
  if (!text) return null;

  // Try to extract JSON from Google Visualization API response
  const jsonString = text.match(
    /google\.visualization\.Query\.setResponse\((.*)\);/s
  );

  if (jsonString && jsonString[1]) {
    try {
      return JSON.parse(jsonString[1]);
    } catch (e) {
      console.error("Failed to parse JSONP response:", e);
      console.error("Response text:", text.substring(0, 500) + "...");
      return null;
    }
  }

  // If the above doesn't work, try alternative parsing methods
  try {
    // Sometimes the response might be direct JSON
    if (text.trim().startsWith("{")) {
      return JSON.parse(text);
    }

    // Try to find JSON within the response
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonPart = text.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonPart);
    }
  } catch (e) {
    console.error("Alternative parsing failed:", e);
  }

  console.error(
    "No valid JSON found in response. Response format may have changed."
  );
  console.error("Response preview:", text.substring(0, 200) + "...");
  return null;
};

const parseDateFromSheet = (dateValue) => {
  if (!dateValue) return null;
  if (dateValue instanceof Date) {
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
    const parts = dateValue.match(/\d+/g);
    if (parts && parts.length >= 3) {
      return new Date(
        Number.parseInt(parts[0]),
        Number.parseInt(parts[1]),
        Number.parseInt(parts[2])
      );
    }
  }

  if (typeof dateValue === "number") {
    // Excel date serial number (days since 1900)
    const date = new Date(1899, 11, 30); // Excel epoch
    date.setDate(date.getDate() + dateValue);
    return date;
  }
  const d = new Date(dateValue);
  return isNaN(d.getTime()) ? null : d;
};

const getStatusBadge = (status) => {
  const statusConfig = {
    Pending: {
      variant: "secondary",
      icon: Clock,
      color:
        "text-amber-700 bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200/50",
      glow: "shadow-lg shadow-amber-100/50",
    },
    Complete: {
      variant: "default",
      icon: CheckCircle2,
      color:
        "text-emerald-700 bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200/50",
      glow: "shadow-lg shadow-emerald-100/50",
    },
    Completed: {
      variant: "default",
      icon: CheckCircle2,
      color:
        "text-emerald-700 bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200/50",
      glow: "shadow-lg shadow-emerald-100/50",
    },
    "In-Transit": {
      variant: "default",
      icon: Truck,
      color:
        "text-blue-700 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200/50",
      glow: "shadow-lg shadow-blue-100/50",
    },
  };

  const config = statusConfig[status] || {
    variant: "secondary",
    icon: Clock,
    color:
      "text-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200/50",
    glow: "shadow-lg shadow-slate-100/50",
  };
  const Icon = config.icon;

  return (
    <Badge
      className={`${config.color} ${config.glow} transition-all duration-300 hover:scale-110 hover:shadow-xl font-medium px-3 py-1.5`}
    >
      <Icon className="w-3 h-3 mr-1.5" />
      {status}
    </Badge>
  );
};

// Enhanced Custom Tooltip Component for Charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-lg p-4 rounded-xl shadow-2xl border border-slate-200/50 ring-1 ring-black/5">
        <p className="font-semibold text-slate-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <p className="text-sm font-medium text-slate-700">
              {`${entry.dataKey}: ${entry.value.toLocaleString()}`}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allPoData, setAllPoData] = useState([]);
  const [allDeliveryData, setAllDeliveryData] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [purchaseSubTab, setPurchaseSubTab] = useState("pending");

  // --- Filter States ---
  const [dateRange, setDateRange] = useState({
    from: undefined,
    to: undefined,
  });
  const [filters, setFilters] = useState({
    partyName: "all",
    materialName: "all",
    poStatus: "all",
    erpPoNumber: "",
  });

  const [datePickerOpen, setDatePickerOpen] = useState({
    main: false,
    inTransit: false,
    received: false,
  });

  const [purchaseDateRange, setPurchaseDateRange] = useState({
    inTransit: { from: undefined, to: undefined },
    received: { from: undefined, to: undefined },
  });

  // --- Fetch and Process Data ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const timestamp = new Date().getTime();
      const poUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        PO_SHEET
      )}&headers=1&tq=SELECT%20*&t=${timestamp}`;
      const deliveryUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        DELIVERY_SHEET
      )}&headers=1&tq=SELECT%20*&t=${timestamp}`;

      const [poRes, deliveryRes] = await Promise.all([
        fetch(poUrl),
        fetch(deliveryUrl),
      ]);

      if (!poRes.ok)
        throw new Error(
          `Failed to fetch PO sheet: ${poRes.status} ${poRes.statusText}`
        );
      if (!deliveryRes.ok)
        throw new Error(
          `Failed to fetch DELIVERY sheet: ${deliveryRes.status} ${deliveryRes.statusText}`
        );

      const poText = await poRes.text();
      const deliveryText = await deliveryRes.text();

      const poData = parseGvizResponse(poText);
      const deliveryData = parseGvizResponse(deliveryText);

      // Process PO data (starting from row 5, which is index 4)
      const processedPoData = poData.table.rows
        .slice(4)
        .map((row, index) => {
          if (!row.c) return null;
          return {
            id: `po-${index}`,
            date: parseDateFromSheet(row.c[0]?.v), // Column A: Date
            erpPoNumber: row.c[1]?.v, // Column B: ERP PO Number
            materialName: row.c[3]?.v, // Column D: Material Name
            partyName: row.c[5]?.v, // Column F: Party Name
            qty: Number.parseFloat(row.c[6]?.v) || 0, // Column G: Qty
            rate: Number.parseFloat(row.c[7]?.v) || 0, // Column H: Rate
            leadTimeToLift: row.c[8]?.v, // Column I: Lead Time To Lift Total Qty
            totalLifted: Number.parseFloat(row.c[13]?.v) || 0, // Column N: Total Lifted
            totalReceived: Number.parseFloat(row.c[14]?.v) || 0, // Column O: Total Received
            returnedQty: Number.parseFloat(row.c[15]?.v) || 0, // Column P: Returned Qty
            pendingQty: Number.parseFloat(row.c[16]?.v) || 0, // Column Q: Pending Qty
            orderCancelQty: Number.parseFloat(row.c[17]?.v) || 0, // Column R: Order Cancel Qty
            poStatus: row.c[18]?.v, // Column S: PO Status
          };
        })
        .filter((p) => p && p.erpPoNumber);

      setAllPoData(processedPoData);

      // Process DELIVERY data (starting from row 5, which is index 4)
      const processedDeliveryData = deliveryData.table.rows
        .slice(4)
        .map((row, index) => {
          if (!row.c) return null;
          return {
            id: `delivery-${index}`,
            erpPoNumber: row.c[2]?.v, // Column C: ERP PO Number
            materialName: row.c[6]?.v, // Column G: Material Name
            partyName: row.c[5]?.v, // Column F: Party Name
            qty: Number.parseFloat(row.c[7]?.v) || 0, // Column H: Qty
            truckNumber: row.c[9]?.v, // Column J: Truck Number
            timestamp: parseDateFromSheet(row.c[0]?.v), // Column A: Timestamp (for In-Transit)
            actual1: parseDateFromSheet(row.c[16]?.v), // Column Q: Actual 1 (for Received)
            columnP: row.c[15]?.v, // Column P (index 15)
            columnQ: row.c[16]?.v, // Column Q (index 16)
            billImage: row.c[11]?.v, // Column L: Bill Image URL (NEW)
          };
        })
        .filter((d) => d && d.erpPoNumber);

      setAllDeliveryData(processedDeliveryData);
    } catch (e) {
      setError(e.message);
      console.error("Failed to fetch dashboard data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePurchaseDateChange = (tab, range) => {
    setPurchaseDateRange((prev) => ({
      ...prev,
      [tab]: range,
    }));
  };

  // --- Filter Logic and Memoized Data ---
  const { partyNameOptions, materialNameOptions } = useMemo(() => {
    // **Updated**: Fetch party names only from PO sheet Column F
    const partyNames = new Set();
    const materialNames = new Set();

    // Only use PO data for party names (Column F)
    allPoData.forEach((d) => {
      if (d.partyName) partyNames.add(d.partyName);
      if (d.materialName) materialNames.add(d.materialName);
    });

    allDeliveryData.forEach((d) => {
      if (d.materialName) materialNames.add(d.materialName);
    });

    return {
      partyNameOptions: Array.from(partyNames).sort(),
      materialNameOptions: Array.from(materialNames).sort(),
    };
  }, [allPoData, allDeliveryData]);

  // Status options for filter dropdown
  const poStatusOptions = ["Pending", "Complete", "Completed"];

  const filteredPoData = useMemo(() => {
    return allPoData.filter((po) => {
      if (dateRange?.from || dateRange?.to) {
        if (!po.date) return false; // Exclude items without dates if filtering by date

        const poDate = new Date(po.date);
        poDate.setHours(12, 0, 0, 0); // Normalize time to noon to avoid timezone issues

        if (dateRange.from) {
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          if (poDate < fromDate) return false;
        }

        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (poDate > toDate) return false;
        }
      }
      if (
        filters.erpPoNumber &&
        !po.erpPoNumber
          ?.toLowerCase()
          .includes(filters.erpPoNumber.toLowerCase())
      )
        return false;
      if (filters.partyName !== "all" && po.partyName !== filters.partyName)
        return false;
      if (
        filters.materialName !== "all" &&
        po.materialName !== filters.materialName
      )
        return false;
      if (filters.poStatus !== "all" && po.poStatus !== filters.poStatus)
        return false;
      return true;
    });
  }, [allPoData, dateRange, filters]);

  const filteredDeliveryData = useMemo(() => {
    return allDeliveryData.filter((delivery) => {
      if (
        filters.erpPoNumber &&
        !delivery.erpPoNumber
          ?.toLowerCase()
          .includes(filters.erpPoNumber.toLowerCase())
      )
        return false;
      if (
        filters.partyName !== "all" &&
        delivery.partyName !== filters.partyName
      )
        return false;
      if (
        filters.materialName !== "all" &&
        delivery.materialName !== filters.materialName
      )
        return false;
      return true;
    });
  }, [allDeliveryData, filters]);

  // --- Enhanced Data for Overview Tab with Updated KPI Calculations ---
  const overviewData = useMemo(() => {
    const kpis = {
      totalPOs: 0,
      pendingPOs: 0,
      completedPOs: 0,
      totalPoQuantity: 0,
      totalPendingQuantity: 0,
      totalReceivedQuantity: 0,
    };

    const partyNameCounts = {};
    const materialNameQuantities = {};
    const partyNameQuantities = {};
    const poQuantityByStatus = { Complete: 0, Pending: 0 };

    // Count total POs from column B7:B (count non-empty ERP PO Numbers)
    kpis.totalPOs = filteredPoData.filter(
      (po) => po.erpPoNumber && po.erpPoNumber.toString().trim() !== ""
    ).length;

    filteredPoData.forEach((po) => {
      // --- KPI Calculations based on PO Status Column S ---
      if (po.poStatus === "Pending") {
        kpis.pendingPOs += 1;
        poQuantityByStatus["Pending"] += po.qty;
      } else if (po.poStatus === "Complete" || po.poStatus === "Completed") {
        kpis.completedPOs += 1;
        poQuantityByStatus["Complete"] += po.qty;
      }

      // **Updated**: Total Pending Quantity from Column Q (Pending Qty)
      kpis.totalPendingQuantity += po.pendingQty;

      // **Updated**: Total Received Quantity from Column O (Total Received)
      kpis.totalReceivedQuantity += po.totalReceived;

      // Total PO Quantity from column G7:G
      kpis.totalPoQuantity += po.qty;

      // --- Data for charts/tables from Column F (Party Name) ---
      if (po.partyName) {
        partyNameCounts[po.partyName] =
          (partyNameCounts[po.partyName] || 0) + 1;
      }

      // --- Data for Top Materials from Column D (Material Name) and sum from Column G (Qty) ---
      if (po.materialName && po.qty) {
        materialNameQuantities[po.materialName] =
          (materialNameQuantities[po.materialName] || 0) + po.qty;
      }

      // --- Data for Top Vendors by Quantity from Column F and sum from Column G ---
      if (po.partyName && po.qty) {
        partyNameQuantities[po.partyName] =
          (partyNameQuantities[po.partyName] || 0) + po.qty;
      }
    });

    const top10Materials = Object.entries(materialNameQuantities)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const top10Vendors = Object.entries(partyNameQuantities)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const finalPoQuantityByStatusData = [];
    if (poQuantityByStatus["Complete"] > 0) {
      finalPoQuantityByStatusData.push({
        name: "Complete",
        value: poQuantityByStatus["Complete"],
      });
    }
    if (poQuantityByStatus["Pending"] > 0) {
      finalPoQuantityByStatusData.push({
        name: "Pending",
        value: poQuantityByStatus["Pending"],
      });
    }

    return {
      kpis,
      barData: Object.entries(partyNameCounts)
        .map(([name, value]) => ({ name, POs: value }))
        .sort((a, b) => b.POs - a.POs)
        .slice(0, 6),
      poQuantityByStatusData: finalPoQuantityByStatusData,
      top10Materials,
      top10Vendors,
    };
  }, [filteredPoData]);

  useEffect(() => {
    if (allPoData.length > 0) {
      console.log(
        "Sample PO dates:",
        allPoData.slice(0, 5).map((po) => ({
          raw: po.date,
          parsed: parseDateFromSheet(po.date),
          formatted: po.date
            ? format(parseDateFromSheet(po.date), "yyyy-MM-dd")
            : null,
        }))
      );
    }
  }, [allPoData]);
  // --- Data for Purchase Tab Tables ---
  const purchaseTabTables = useMemo(() => {
    // Pending tab: PO sheet data where PO Status is 'Pending'
    const pending = filteredPoData.filter((po) => po.poStatus === "Pending");

    // In-transit tab: DELIVERY sheet data where column P is not null and column Q is null
    const inTransit = filteredDeliveryData
      .filter((delivery) => delivery.columnP && !delivery.columnQ)
      .map((delivery) => ({
        ...delivery,
        truckNumber: delivery.truckNumber, // Add truck number from column J
      }));

    // Received tab: DELIVERY sheet data where both column P and column Q are not null
    const received = filteredDeliveryData
      .filter((delivery) => delivery.columnP && delivery.columnQ)
      .map((delivery) => ({
        ...delivery,
        truckNumber: delivery.truckNumber, // Add truck number from column J
      }));

    return { pending, inTransit, received };
  }, [filteredPoData, filteredDeliveryData]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      partyName: "all",
      materialName: "all",
      poStatus: "all",
      erpPoNumber: "",
    });
    setDateRange({ from: undefined, to: undefined });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 flex items-center justify-center">
        <div className="text-center space-y-8 p-8">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-slate-200/60 rounded-full animate-spin border-t-blue-600 mx-auto shadow-lg"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent rounded-full animate-ping border-t-blue-400/60 mx-auto opacity-30"></div>
            <div className="absolute inset-2 w-16 h-16 border-2 border-transparent rounded-full animate-pulse border-t-indigo-500/40 mx-auto"></div>
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Loading Dashboard
            </h3>
            <p className="text-slate-500 font-medium">
              Fetching latest data from sheets...
            </p>
            <div className="flex justify-center space-x-1 mt-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50/30 to-rose-100/40 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
          <CardContent className="text-center p-8 space-y-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto shadow-lg ring-4 ring-red-50">
              <Archive className="h-10 w-10 text-red-600" />
            </div>
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-slate-800">
                Connection Failed
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">{error}</p>
            </div>
            <Button
              onClick={fetchData}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-100/30">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-100/40 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-indigo-100/40 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 relative">
        {/* Enhanced Filters */}
        <div className="flex w-full justify-center">
          <Card className="mb-10 border-0 shadow-2xl bg-white/60 backdrop-blur-lg ring-1 ring-white/20 w-[80%]">

            <div className="flex flex-col justify-center w-full">

              <CardHeader className="border-b border-slate-100/50 bg-gradient-to-r from-slate-50/80 to-white/80 backdrop-blur-sm rounded-t-lg">
                <CardTitle className="text-xl flex items-center gap-3 text-slate-800">
                  <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg">
                    <Filter className="h-5 w-5 text-blue-700" />
                  </div>
                  Smart Filters
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Refine your data view with advanced filtering options
                </CardDescription>
              </CardHeader>

              <CardContent className="p-8">
                <div className="flex  justify-between flex-wrap gap-2">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      Date Range
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={
                          dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : ""
                        }
                        onChange={(e) => {
                          const fromDate = e.target.value
                            ? new Date(e.target.value)
                            : undefined;
                          setDateRange((prev) => ({ ...prev, from: fromDate }));
                        }}
                        className="border-slate-200 bg-white/80 backdrop-blur-sm"
                      />
                      <span className="self-center text-slate-500">to</span>
                      <Input
                        type="date"
                        value={
                          dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : ""
                        }
                        onChange={(e) => {
                          const toDate = e.target.value
                            ? new Date(e.target.value)
                            : undefined;
                          setDateRange((prev) => ({ ...prev, to: toDate }));
                        }}
                        className="border-slate-200 bg-white/80 backdrop-blur-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-500" />
                      Party Name
                    </Label>
                    <Select
                      value={filters.partyName}
                      onValueChange={(v) => handleFilterChange("partyName", v)}
                    >
                      <SelectTrigger className="border-slate-200 bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200">
                        <SelectValue placeholder="All Party Names" />
                      </SelectTrigger>
                      <SelectContent className="border-0 shadow-2xl bg-white/95 backdrop-blur-lg">
                        <SelectItem value="all">All Party Names</SelectItem>
                        {partyNameOptions.map((v) => (
                          <SelectItem key={v} value={v}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Package className="h-4 w-4 text-slate-500" />
                      Material Name
                    </Label>
                    <Select
                      value={filters.materialName}
                      onValueChange={(v) =>
                        handleFilterChange("materialName", v)
                      }
                    >
                      <SelectTrigger className="border-slate-200 bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200">
                        <SelectValue placeholder="All Materials" />
                      </SelectTrigger>
                      <SelectContent className="border-0 shadow-2xl bg-white/95 backdrop-blur-lg">
                        <SelectItem value="all">All Materials</SelectItem>
                        {materialNameOptions.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-slate-500" />
                      PO Status
                    </Label>
                    <Select
                      value={filters.poStatus}
                      onValueChange={(v) => handleFilterChange("poStatus", v)}
                    >
                      <SelectTrigger className="border-slate-200 bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200">
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent className="border-0 shadow-2xl bg-white/95 backdrop-blur-lg">
                        <SelectItem value="all">All Statuses</SelectItem>
                        {poStatusOptions.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* <div className="space-y-3">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Search className="h-4 w-4 text-slate-500" />
                  Search
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search ERP PO..."
                    value={filters.erpPoNumber}
                    onChange={(e) =>
                      handleFilterChange("erpPoNumber", e.target.value)
                    }
                    className="pl-10 border-slate-200 bg-white/80 backdrop-blur-sm hover:shadow-md transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div> */}

                  <div className="flex gap-3 col-span-full xl:col-span-5 mt-6">
                    <Button
                      onClick={clearFilters}
                      variant="outline"
                      size="sm"
                      className="border-2 border-slate-200 hover:border-red-300 hover:bg-red-50 transition-all duration-300 hover:shadow-lg"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>

        {/* Enhanced Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-10 bg-white/80 backdrop-blur-lg border-0 shadow-xl ring-1 ring-white/20 p-2">
            <TabsTrigger
              value="overview"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg"
            >
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="purchase"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-blue-700 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg"
            >
              <List className="h-4 w-4" />
              Purchase Data
            </TabsTrigger>
          </TabsList>

          {/* Enhanced Overview Tab */}
          <TabsContent value="overview" className="space-y-10">
            {/* Enhanced KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-0 shadow-2xl bg-gradient-to-br from-blue-50 via-blue-100/80 to-blue-200/60 hover:shadow-3xl transition-all duration-500 transform hover:scale-105 ring-1 ring-blue-200/50">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-blue-700 mb-2 uppercase tracking-wide">
                        Total Purchase Orders
                      </p>
                      <p className="text-4xl font-black text-blue-900 mb-1">
                        {overviewData.kpis.totalPOs}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <TrendingUp className="h-3 w-3" />
                        <span>Active Orders</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-blue-200 to-blue-300 rounded-2xl shadow-lg ring-4 ring-blue-100/50">
                      <FileText className="h-8 w-8 text-blue-800" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-2xl bg-gradient-to-br from-amber-50 via-amber-100/80 to-amber-200/60 hover:shadow-3xl transition-all duration-500 transform hover:scale-105 ring-1 ring-amber-200/50">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-amber-700 mb-2 uppercase tracking-wide">
                        Pending PO's
                      </p>
                      <p className="text-4xl font-black text-amber-900 mb-1">
                        {overviewData.kpis.pendingPOs}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <Clock className="h-3 w-3" />
                        <span>Awaiting Action</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-amber-200 to-amber-300 rounded-2xl shadow-lg ring-4 ring-amber-100/50">
                      <Hourglass className="h-8 w-8 text-amber-800" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-2xl bg-gradient-to-br from-emerald-50 via-emerald-100/80 to-emerald-200/60 hover:shadow-3xl transition-all duration-500 transform hover:scale-105 ring-1 ring-emerald-200/50">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-emerald-700 mb-2 uppercase tracking-wide">
                        Completed PO's
                      </p>
                      <p className="text-4xl font-black text-emerald-900 mb-1">
                        {overviewData.kpis.completedPOs}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle className="h-3 w-3" />
                        <span>Completed</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-emerald-200 to-emerald-300 rounded-2xl shadow-lg ring-4 ring-emerald-100/50">
                      <CheckCircle className="h-8 w-8 text-emerald-800" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Quantity Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm ring-1 ring-slate-200/50 hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ring-4 ring-blue-50">
                    <Package className="h-8 w-8 text-blue-700" />
                  </div>
                  <p className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">
                    Total PO Quantity
                  </p>
                  <p className="text-3xl font-black text-slate-900 mb-1">
                    {overviewData.kpis.totalPoQuantity.toLocaleString()}
                  </p>
                  <div className="text-xs text-slate-500 flex items-center justify-center gap-1">
                    <Zap className="h-3 w-3" />
                    <span>Total Units</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm ring-1 ring-slate-200/50 hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ring-4 ring-amber-50">
                    <Hourglass className="h-8 w-8 text-amber-700" />
                  </div>
                  <p className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">
                    Total Pending PO's
                  </p>
                  <p className="text-3xl font-black text-slate-900 mb-1">
                    {overviewData.kpis.totalPendingQuantity.toLocaleString()}
                  </p>
                  <div className="text-xs text-slate-500 flex items-center justify-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Awaiting</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm ring-1 ring-slate-200/50 hover:shadow-2xl transition-all duration-300">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg ring-4 ring-emerald-50">
                    <CheckCircle2 className="h-8 w-8 text-emerald-700" />
                  </div>
                  <p className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">
                    Total Completed PO's
                  </p>
                  <p className="text-3xl font-black text-slate-900 mb-1">
                    {overviewData.kpis.totalReceivedQuantity.toLocaleString()}
                  </p>
                  <div className="text-xs text-slate-500 flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Delivered</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm ring-1 ring-slate-200/50">
                <CardHeader className="border-b border-slate-100/50 bg-gradient-to-r from-slate-50/80 to-white/80">
                  <CardTitle className="text-xl flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg">
                      <Package className="h-5 w-5 text-purple-700" />
                    </div>
                    PO Quantity by Status
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Distribution of quantities across order statuses
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Tooltip content={<CustomTooltip />} />
                        <Pie
                          data={overviewData.poQuantityByStatusData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          innerRadius={50}
                          paddingAngle={3}
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(0)}%`
                          }
                          strokeWidth={2}
                          stroke="#fff"
                        >
                          {overviewData.poQuantityByStatusData.map(
                            (entry, index) => (
                              <Cell
                                key={`cell-qty-status-${index}`}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            )
                          )}
                        </Pie>
                        <Legend />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm ring-1 ring-slate-200/50">
                <CardHeader className="border-b border-slate-100/50 bg-gradient-to-r from-slate-50/80 to-white/80">
                  <CardTitle className="text-xl flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg">
                      <Users className="h-5 w-5 text-blue-700" />
                    </div>
                    Top Vendors
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Leading suppliers by order count
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={overviewData.barData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          stroke="#64748b"
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={130}
                          tick={{ fontSize: 12, fill: "#64748b" }}
                          stroke="#64748b"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                          dataKey="POs"
                          fill="#3b82f6"
                          radius={[0, 6, 6, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Top Materials and Vendors Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm ring-1 ring-slate-200/50">
                <CardHeader className="border-b border-slate-100/50 bg-gradient-to-r from-slate-50/80 to-white/80">
                  <CardTitle className="text-xl flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-green-100 to-green-200 rounded-lg">
                      <Package className="h-5 w-5 text-green-700" />
                    </div>
                    Top Materials
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Most ordered materials by quantity
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-100 bg-slate-50/50">
                        <TableHead className="font-bold text-slate-700">
                          Rank
                        </TableHead>
                        <TableHead className="font-bold text-slate-700">
                          Material
                        </TableHead>
                        <TableHead className="text-right font-bold text-slate-700">
                          Quantity
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overviewData.top10Materials.length > 0 ? (
                        overviewData.top10Materials.map((item, index) => (
                          <TableRow
                            key={item.name}
                            className="border-b border-slate-50 hover:bg-green-50/50 transition-colors duration-200"
                          >
                            <TableCell>
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md ${index === 0
                                  ? "bg-gradient-to-br from-yellow-400 to-yellow-600"
                                  : index === 1
                                    ? "bg-gradient-to-br from-gray-400 to-gray-600"
                                    : index === 2
                                      ? "bg-gradient-to-br from-amber-600 to-amber-800"
                                      : "bg-gradient-to-br from-blue-500 to-blue-700"
                                  }`}
                              >
                                {index + 1}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium max-w-xs">
                              <div className="truncate" title={item.name}>
                                {item.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-900">
                              {item.quantity.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-center h-40 text-slate-500"
                          >
                            <div className="flex flex-col items-center justify-center space-y-3">
                              <Package className="h-12 w-12 text-slate-300" />
                              <p className="font-semibold">
                                No material data available
                              </p>
                              <p className="text-sm">
                                Data will appear here once orders are processed
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm ring-1 ring-slate-200/50">
                <CardHeader className="border-b border-slate-100/50 bg-gradient-to-r from-slate-50/80 to-white/80">
                  <CardTitle className="text-xl flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg">
                      <Building2 className="h-5 w-5 text-purple-700" />
                    </div>
                    Top Vendors by Quantity
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    Leading suppliers by total quantity
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-100 bg-slate-50/50">
                        <TableHead className="font-bold text-slate-700">
                          Rank
                        </TableHead>
                        <TableHead className="font-bold text-slate-700">
                          Vendor
                        </TableHead>
                        <TableHead className="text-right font-bold text-slate-700">
                          Quantity
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overviewData.top10Vendors.length > 0 ? (
                        overviewData.top10Vendors.map((item, index) => (
                          <TableRow
                            key={item.name}
                            className="border-b border-slate-50 hover:bg-purple-50/50 transition-colors duration-200"
                          >
                            <TableCell>
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md ${index === 0
                                  ? "bg-gradient-to-br from-yellow-400 to-yellow-600"
                                  : index === 1
                                    ? "bg-gradient-to-br from-gray-400 to-gray-600"
                                    : index === 2
                                      ? "bg-gradient-to-br from-amber-600 to-amber-800"
                                      : "bg-gradient-to-br from-purple-500 to-purple-700"
                                  }`}
                              >
                                {index + 1}
                              </div>
                            </TableCell>
                            <TableCell className="font-medium max-w-xs">
                              <div className="truncate" title={item.name}>
                                {item.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-900">
                              {item.quantity.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-center h-40 text-slate-500"
                          >
                            <div className="flex flex-col items-center justify-center space-y-3">
                              <Building2 className="h-12 w-12 text-slate-300" />
                              <p className="font-semibold">
                                No vendor data available
                              </p>
                              <p className="text-sm">
                                Data will appear here once orders are processed
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Enhanced Purchase Data Tab */}
          <TabsContent value="purchase" className="space-y-10">
            <Tabs value={purchaseSubTab} onValueChange={setPurchaseSubTab}>
              <TabsList className="grid w-full grid-cols-3 max-w-3xl mx-auto bg-white/80 backdrop-blur-lg border-0 shadow-xl ring-1 ring-white/20 p-2">
                <TabsTrigger
                  value="pending"
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg"
                >
                  <Hourglass className="h-4 w-4" />
                  Pending
                </TabsTrigger>
                <TabsTrigger
                  value="in-transit"
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg"
                >
                  <Truck className="h-4 w-4" />
                  In-Transit
                </TabsTrigger>
                <TabsTrigger
                  value="received"
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Received
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-8">
                <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm ring-1 ring-slate-200/50">
                  <CardHeader className="bg-gradient-to-r from-amber-50 via-amber-100/50 to-orange-50 border-b border-amber-100/50">
                    <CardTitle className="text-xl flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-amber-200 to-amber-300 rounded-xl shadow-lg">
                        <Hourglass className="h-6 w-6 text-amber-800" />
                      </div>
                      Pending Orders from PO Sheet
                      <Badge className="bg-amber-100 text-amber-800 border border-amber-200 ml-auto">
                        {purchaseTabTables.pending.length} Orders
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-amber-700">
                      Orders awaiting processing and issuance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                            <TableHead className="font-bold text-slate-700">ERP PO Number</TableHead>
                            <TableHead className="font-bold text-slate-700">Material Name</TableHead>
                            <TableHead className="font-bold text-slate-700">Party Name</TableHead>
                            <TableHead className="text-right font-bold text-slate-700">Quantity</TableHead>
                            <TableHead className="text-right font-bold text-slate-700">Rate</TableHead>
                            <TableHead className="text-right font-bold text-slate-700">Pending Qty</TableHead>
                            <TableHead className="text-right font-bold text-slate-700">Total Lifted</TableHead>
                            <TableHead className="text-right font-bold text-slate-700">Total Received</TableHead>
                            <TableHead className="text-right font-bold text-slate-700">Returned Qty</TableHead>
                            <TableHead className="text-right font-bold text-slate-700">Order Cancel Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseTabTables.pending.length > 0 ? (
                            purchaseTabTables.pending.map((po) => (
                              <TableRow
                                key={po.id}
                                className="hover:bg-amber-50/50 border-b border-slate-100 transition-colors duration-200"
                              >
                                <TableCell className="font-bold text-blue-600">
                                  {po.erpPoNumber}
                                </TableCell>
                                <TableCell className="max-w-xs">
                                  <div
                                    className="truncate font-medium"
                                    title={po.materialName}
                                  >
                                    {po.materialName}
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium text-slate-700">
                                  {po.partyName}
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-900">
                                  {po.qty.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-900">
                                  {po.rate.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-900">
                                  {po.pendingQty.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-900">
                                  {po.totalLifted.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-900">
                                  {po.totalReceived.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-900">
                                  {po.returnedQty.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-900">
                                  {po.orderCancelQty.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={10}
                                className="text-center h-40 text-slate-500"
                              >
                                <div className="flex flex-col items-center justify-center space-y-4">
                                  <div className="p-4 bg-gradient-to-br from-green-100 to-green-200 rounded-full">
                                    <CheckCircle className="h-16 w-16 text-green-600" />
                                  </div>
                                  <div className="text-center">
                                    <p className="font-bold text-lg text-slate-700">
                                      All Clear!
                                    </p>
                                    <p className="text-sm text-slate-500">
                                      No pending orders found in PO sheet
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Enhanced In-Transit Tab */}
              <TabsContent value="in-transit" className="space-y-8">
                <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm ring-1 ring-slate-200/50">
                  <CardHeader className="bg-gradient-to-r from-blue-50 via-blue-100/50 to-indigo-50 border-b border-blue-100/50">
                    <CardTitle className="text-xl flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-blue-200 to-blue-300 rounded-xl shadow-lg">
                        <Truck className="h-6 w-6 text-blue-800" />
                      </div>
                      Materials In-Transit
                      {/* Date Filter - Moved to CardContent */}
                      <CardContent className="border-b border-slate-100/50 bg-slate-50/30 justify-end w-full hidden md:flex">
                        <div className="flex items-center gap-4 flex-wrap">

                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Input
                                type="date"
                                value={
                                  purchaseDateRange.inTransit.from
                                    ? format(
                                      purchaseDateRange.inTransit.from,
                                      "yyyy-MM-dd"
                                    )
                                    : ""
                                }
                                onChange={(e) => {
                                  const fromDate = e.target.value
                                    ? new Date(e.target.value)
                                    : undefined;
                                  handlePurchaseDateChange("inTransit", {
                                    ...purchaseDateRange.inTransit,
                                    from: fromDate,
                                  });
                                }}
                                className="border-slate-200 bg-white/80"
                                size="sm"
                              />
                              <span className="self-center text-slate-500">
                                to
                              </span>
                              <Input
                                type="date"
                                value={
                                  purchaseDateRange.inTransit.to
                                    ? format(
                                      purchaseDateRange.inTransit.to,
                                      "yyyy-MM-dd"
                                    )
                                    : ""
                                }
                                onChange={(e) => {
                                  const toDate = e.target.value
                                    ? new Date(e.target.value)
                                    : undefined;
                                  handlePurchaseDateChange("inTransit", {
                                    ...purchaseDateRange.inTransit,
                                    to: toDate,
                                  });
                                }}
                                className="border-slate-200 bg-white/80"
                                size="sm"
                              />
                            </div>
                          </div>

                          {(purchaseDateRange.inTransit.from ||
                            purchaseDateRange.inTransit.to) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handlePurchaseDateChange("inTransit", {
                                    from: undefined,
                                    to: undefined,
                                  })
                                }
                                className="hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Clear
                              </Button>
                            )}
                        </div>
                      </CardContent>

                      <Badge className="bg-blue-100 text-blue-800 border border-blue-200 ml-auto">
                        {
                          purchaseTabTables.inTransit.filter((delivery) => {
                            if (
                              !purchaseDateRange.inTransit?.from &&
                              !purchaseDateRange.inTransit?.to
                            )
                              return true;
                            if (!delivery.timestamp) return false;

                            const deliveryDate = new Date(delivery.timestamp);
                            deliveryDate.setHours(12, 0, 0, 0);

                            if (purchaseDateRange.inTransit.from) {
                              const fromDate = new Date(
                                purchaseDateRange.inTransit.from
                              );
                              fromDate.setHours(0, 0, 0, 0);
                              if (deliveryDate < fromDate) return false;
                            }

                            if (purchaseDateRange.inTransit.to) {
                              const toDate = new Date(
                                purchaseDateRange.inTransit.to
                              );
                              toDate.setHours(23, 59, 59, 999);
                              if (deliveryDate > toDate) return false;
                            }

                            return true;
                          }).length
                        }{" "}
                        Items
                      </Badge>

                    </CardTitle>

                    <CardDescription className="text-blue-700">
                      Materials currently being delivered
                    </CardDescription>


                    <CardContent className="border-b border-slate-100/50 bg-slate-50/30 flex justify-start w-full md:hidden">
                      <div className="flex items-center md:gap-4 flex-wrap">

                        <div className="md:space-y-2">
                          <div className="md:flex md:gap-2">
                            <Input
                              type="date"
                              value={
                                purchaseDateRange.inTransit.from
                                  ? format(
                                    purchaseDateRange.inTransit.from,
                                    "yyyy-MM-dd"
                                  )
                                  : ""
                              }
                              onChange={(e) => {
                                const fromDate = e.target.value
                                  ? new Date(e.target.value)
                                  : undefined;
                                handlePurchaseDateChange("inTransit", {
                                  ...purchaseDateRange.inTransit,
                                  from: fromDate,
                                });
                              }}
                              className="border-slate-200 bg-white/80 w-36 md:w-full text-[0.8rem]"
                              size="sm"
                            />
                            <span className="self-center text-slate-500">
                              to
                            </span>
                            <Input
                              type="date"
                              value={
                                purchaseDateRange.inTransit.to
                                  ? format(
                                    purchaseDateRange.inTransit.to,
                                    "yyyy-MM-dd"
                                  )
                                  : ""
                              }
                              onChange={(e) => {
                                const toDate = e.target.value
                                  ? new Date(e.target.value)
                                  : undefined;
                                handlePurchaseDateChange("inTransit", {
                                  ...purchaseDateRange.inTransit,
                                  to: toDate,
                                });
                              }}
                              className="border-slate-200 bg-white/80 w-36 md:w-full text-[0.8rem]"
                            // size="sm"
                            />
                          </div>
                        </div>

                        {(purchaseDateRange.inTransit.from ||
                          purchaseDateRange.inTransit.to) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handlePurchaseDateChange("inTransit", {
                                  from: undefined,
                                  to: undefined,
                                })
                              }
                              className="hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Clear
                            </Button>
                          )}
                      </div>
                    </CardContent>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                            <TableHead className="font-bold text-slate-700">
                              ERP PO Number
                            </TableHead>
                            <TableHead className="font-bold text-slate-700">
                              Material Name
                            </TableHead>
                            <TableHead className="font-bold text-slate-700">
                              Party Name
                            </TableHead>
                            <TableHead className="font-bold text-slate-700">
                              Truck No.
                            </TableHead>
                            <TableHead className="font-bold text-slate-700">
                              Date
                            </TableHead>
                            <TableHead className="text-right font-bold text-slate-700">
                              Quantity
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseTabTables.inTransit
                            .filter((delivery) => {
                              if (
                                !purchaseDateRange.inTransit?.from &&
                                !purchaseDateRange.inTransit?.to
                              )
                                return true;
                              if (!delivery.timestamp) return false;

                              const deliveryDate = new Date(delivery.timestamp);
                              deliveryDate.setHours(12, 0, 0, 0);

                              if (purchaseDateRange.inTransit.from) {
                                const fromDate = new Date(
                                  purchaseDateRange.inTransit.from
                                );
                                fromDate.setHours(0, 0, 0, 0);
                                if (deliveryDate < fromDate) return false;
                              }

                              if (purchaseDateRange.inTransit.to) {
                                const toDate = new Date(
                                  purchaseDateRange.inTransit.to
                                );
                                toDate.setHours(23, 59, 59, 999);
                                if (deliveryDate > toDate) return false;
                              }

                              return true;
                            })
                            .slice()
                            .sort(
                              (a, b) =>
                                new Date(b.timestamp) - new Date(a.timestamp)
                            )
                            .map((delivery) => (
                              <TableRow
                                key={delivery.id}
                                className="hover:bg-blue-50/50 border-b border-slate-100 transition-colors duration-200"
                              >
                                <TableCell className="font-bold text-blue-600">
                                  {delivery.erpPoNumber}
                                </TableCell>
                                <TableCell className="max-w-xs">
                                  <div
                                    className="truncate font-medium"
                                    title={delivery.materialName}
                                  >
                                    {delivery.materialName}
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium text-slate-700">
                                  {delivery.partyName}
                                </TableCell>
                                <TableCell className="font-medium text-slate-700">
                                  {delivery.truckNumber || "-"}
                                </TableCell>
                                <TableCell className="font-medium text-slate-700">
                                  {delivery.timestamp
                                    ? format(delivery.timestamp, "dd/MM/yyyy")
                                    : "-"}
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-900">
                                  {delivery.qty.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Enhanced Received Tab */}

              <TabsContent value="received" className="space-y-8">
                <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm ring-1 ring-slate-200/50">
                  <CardHeader className="bg-gradient-to-r from-emerald-50 via-emerald-100/50 to-green-50 border-b border-emerald-100/50">
                    <CardTitle className="text-xl flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-emerald-200 to-emerald-300 rounded-xl shadow-lg">
                        <CheckCircle2 className="h-6 w-6 text-emerald-800" />
                      </div>
                      Received Materials
                      {/* Date Filter - Moved to CardContent */}
                      <CardContent className="border-b border-slate-100/50 bg-slate-50/30 justify-end w-full hidden md:flex">
                        <div className="flex items-center gap-4">
                          <div className="md:space-y-2">
                            <div className="md:flex md:gap-2">
                              <Input
                                type="date"
                                value={
                                  purchaseDateRange.received.from
                                    ? format(
                                      purchaseDateRange.received.from,
                                      "yyyy-MM-dd"
                                    )
                                    : ""
                                }
                                onChange={(e) => {
                                  const fromDate = e.target.value
                                    ? new Date(e.target.value)
                                    : undefined;
                                  handlePurchaseDateChange("received", {
                                    ...purchaseDateRange.received,
                                    from: fromDate,
                                  });
                                }}
                                className="border-slate-200 bg-white/80"
                                size="sm"
                              />
                              <span className="self-center text-slate-500">
                                to
                              </span>
                              <Input
                                type="date"
                                value={
                                  purchaseDateRange.received.to
                                    ? format(
                                      purchaseDateRange.received.to,
                                      "yyyy-MM-dd"
                                    )
                                    : ""
                                }
                                onChange={(e) => {
                                  const toDate = e.target.value
                                    ? new Date(e.target.value)
                                    : undefined;
                                  handlePurchaseDateChange("received", {
                                    ...purchaseDateRange.received,
                                    to: toDate,
                                  });
                                }}
                                className="border-slate-200 bg-white/80"
                                size="sm"
                              />
                            </div>
                          </div>
                          {(purchaseDateRange.received.from ||
                            purchaseDateRange.received.to) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handlePurchaseDateChange("received", {
                                    from: undefined,
                                    to: undefined,
                                  })
                                }
                                className="hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Clear
                              </Button>
                            )}
                        </div>
                      </CardContent>

                      <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 ml-auto">
                        {
                          purchaseTabTables.received.filter((delivery) => {
                            if (
                              !purchaseDateRange.received?.from &&
                              !purchaseDateRange.received?.to
                            )
                              return true;
                            if (!delivery.actual1) return false;

                            const deliveryDate = new Date(delivery.actual1);
                            deliveryDate.setHours(12, 0, 0, 0);

                            if (purchaseDateRange.received.from) {
                              const fromDate = new Date(
                                purchaseDateRange.received.from
                              );
                              fromDate.setHours(0, 0, 0, 0);
                              if (deliveryDate < fromDate) return false;
                            }

                            if (purchaseDateRange.received.to) {
                              const toDate = new Date(
                                purchaseDateRange.received.to
                              );
                              toDate.setHours(23, 59, 59, 999);
                              if (deliveryDate > toDate) return false;
                            }

                            return true;
                          }).length
                        }{" "}
                        Items
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-emerald-700">
                      Successfully delivered and received materials
                    </CardDescription>



                    {/* Date Filter - Moved to CardContent */}
                    <CardContent className="border-b border-slate-100/50 bg-slate-50/30 justify-start md:justify-end w-full md:hidden flex">
                      <div className="flex items-center md:gap-4">
                        <div className="md:space-y-2">
                          <div className="md:flex md:gap-2">
                            <Input
                              type="date"
                              value={
                                purchaseDateRange.received.from
                                  ? format(
                                    purchaseDateRange.received.from,
                                    "yyyy-MM-dd"
                                  )
                                  : ""
                              }
                              onChange={(e) => {
                                const fromDate = e.target.value
                                  ? new Date(e.target.value)
                                  : undefined;
                                handlePurchaseDateChange("received", {
                                  ...purchaseDateRange.received,
                                  from: fromDate,
                                });
                              }}
                              className="border-slate-200 bg-white/80"
                              size="sm"
                            />
                            <span className="self-center text-slate-500">
                              to
                            </span>
                            <Input
                              type="date"
                              value={
                                purchaseDateRange.received.to
                                  ? format(
                                    purchaseDateRange.received.to,
                                    "yyyy-MM-dd"
                                  )
                                  : ""
                              }
                              onChange={(e) => {
                                const toDate = e.target.value
                                  ? new Date(e.target.value)
                                  : undefined;
                                handlePurchaseDateChange("received", {
                                  ...purchaseDateRange.received,
                                  to: toDate,
                                });
                              }}
                              className="border-slate-200 bg-white/80"
                              size="sm"
                            />
                          </div>
                        </div>
                        {(purchaseDateRange.received.from ||
                          purchaseDateRange.received.to) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handlePurchaseDateChange("received", {
                                  from: undefined,
                                  to: undefined,
                                })
                              }
                              className="hover:bg-red-50 hover:text-red-600 transition-colors duration-200"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Clear
                            </Button>
                          )}
                      </div>
                    </CardContent>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                            <TableHead className="font-bold text-slate-700">
                              ERP PO Number
                            </TableHead>
                            <TableHead className="font-bold text-slate-700">
                              Material Name
                            </TableHead>
                            <TableHead className="font-bold text-slate-700">
                              Party Name
                            </TableHead>
                            <TableHead className="text-right font-bold text-slate-700">
                              Bill Image
                            </TableHead>
                            <TableHead className="font-bold text-slate-700">
                              Truck No.
                            </TableHead>
                            <TableHead className="font-bold text-slate-700">
                              Date
                            </TableHead>
                            <TableHead className="text-right font-bold text-slate-700">
                              Quantity
                            </TableHead>

                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchaseTabTables.received
                            .filter((delivery) => {
                              if (
                                !purchaseDateRange.received?.from &&
                                !purchaseDateRange.received?.to
                              )
                                return true;
                              if (!delivery.actual1) return false;

                              const deliveryDate = new Date(delivery.actual1);
                              deliveryDate.setHours(12, 0, 0, 0);

                              if (purchaseDateRange.received.from) {
                                const fromDate = new Date(
                                  purchaseDateRange.received.from
                                );
                                fromDate.setHours(0, 0, 0, 0);
                                if (deliveryDate < fromDate) return false;
                              }

                              if (purchaseDateRange.received.to) {
                                const toDate = new Date(
                                  purchaseDateRange.received.to
                                );
                                toDate.setHours(23, 59, 59, 999);
                                if (deliveryDate > toDate) return false;
                              }

                              return true;
                            })
                            .slice()
                            .sort(
                              (a, b) =>
                                new Date(b.actual1) - new Date(a.actual1)
                            )
                            .map((delivery) => (
                              <TableRow
                                key={delivery.id}
                                className="hover:bg-emerald-50/50 border-b border-slate-100 transition-colors duration-200"
                              >
                                <TableCell className="font-bold text-blue-600">
                                  {delivery.erpPoNumber}
                                </TableCell>
                                <TableCell className="max-w-xs">
                                  <div
                                    className="truncate font-medium"
                                    title={delivery.materialName}
                                  >
                                    {delivery.materialName}
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium text-slate-700">
                                  {delivery.partyName}
                                </TableCell>
                                <TableCell className="text-center"> {/* NEW CELL */}
                                  {delivery.billImage ? (
                                    <a
                                      href={delivery.billImage}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 hover:bg-blue-200 rounded-full transition-colors duration-200"
                                      title="View Bill Image"
                                    >
                                      <FileText className="h-4 w-4 text-blue-600" />
                                    </a>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium text-slate-700">
                                  {delivery.truckNumber || "-"}
                                </TableCell>
                                <TableCell className="font-medium text-slate-700">
                                  {delivery.actual1
                                    ? format(delivery.actual1, "dd/MM/yyyy")
                                    : "-"}
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-900">
                                  {delivery.qty.toLocaleString()}
                                </TableCell>

                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
