"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Package, FileText, Loader2, History, FileCheck, AlertTriangle, ExternalLink, X, Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"

// Shadcn UI components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Constants
const SHEET_ID = "19Za1BvjKvHT01rzDOPLS_MErnuEJd6__l7C_4lUgLlg"
const DELIVERY_SHEET = "DELIVERY"
const API_URL =
  "https://script.google.com/macros/s/AKfycbx3_COAFa1T6tCTjJT8Ip0ep7Qy83wA7ZpJteErgfzZ-gQG0Zf8Yxw6iTspQ5oGy6Q/exec"

// Column metadata for pending table
const PENDING_COLUMNS_META = [
  { header: "Action", dataKey: "actionColumn", toggleable: false, alwaysVisible: true },
  { header: "Lift No.", dataKey: "liftNo", toggleable: true, alwaysVisible: true },
  { header: "ERP Po Number", dataKey: "erpPoNumber", toggleable: true },
  { header: "Indent Number", dataKey: "indentNumber", toggleable: true },
  { header: "Broker Name", dataKey: "brokerName", toggleable: true },
  { header: "Party Name", dataKey: "partyName", toggleable: true },
  { header: "Material Name", dataKey: "materialName", toggleable: true },
  { header: "Bill Qty", dataKey: "qty", toggleable: true },
  { header: "Bill Number", dataKey: "billNumber", toggleable: true },
  { header: "Truck Number", dataKey: "truckNumber", toggleable: true },
  { header: "Driver Number", dataKey: "driverNumber", toggleable: true },
  { header: "Bill Image", dataKey: "billImage", toggleable: true },
  { header: "Transporter Name", dataKey: "transporterName", toggleable: true },
  { header: "Physical Condition", dataKey: "physicalCondition", toggleable: true },
  { header: "Received Qty", dataKey: "qtyDifference", toggleable: true },
  { header: "Physical Image", dataKey: "physicalImageOfProduct", toggleable: true },
  { header: "Weight Slip Image", dataKey: "imageOfWeightSlip", toggleable: true },
  { header: "Out Time", dataKey: "outTime", toggleable: true },
  { header: "Vehicle Out Date", dataKey: "vehicleOutDate", toggleable: true },
  { header: "Planned", dataKey: "planned", toggleable: true },
]

// Column metadata for history table
const HISTORY_COLUMNS_META = [
  { header: "Lift No.", dataKey: "liftNo", toggleable: true, alwaysVisible: true },
  { header: "ERP Po Number", dataKey: "erpPoNumber", toggleable: true },
  { header: "Broker Name", dataKey: "brokerName", toggleable: true },
  { header: "Party Name", dataKey: "partyName", toggleable: true },
  { header: "Material Name", dataKey: "materialName", toggleable: true },
  { header: "Qty", dataKey: "qty", toggleable: true },
  { header: "Physical Condition", dataKey: "physicalCondition", toggleable: true },
  { header: "Out Time", dataKey: "outTime", toggleable: true },
  { header: "Vehicle Out Date", dataKey: "vehicleOutDate", toggleable: true },
  { header: "Completed On", dataKey: "timestamp", toggleable: true },
  { header: "Status", dataKey: "status", toggleable: true },
  { header: "Remarks", dataKey: "remarks", toggleable: true },
]

// Helper functions
const parseGoogleSheetsDate = (dateValue) => {
  if (!dateValue || typeof dateValue !== "string") return null

  // Check if the dateValue is in the format "Date(YYYY, MM, DD, ...)"
  const gvizMatch = dateValue.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?/)
  if (gvizMatch) {
    const [, year, month, day, hours, minutes, seconds] = gvizMatch.map(Number)
    return new Date(year, month, day, hours || 0, minutes || 0, seconds || 0)
  }

  // Try parsing as regular date string
  const date = new Date(dateValue)
  return isNaN(date.getTime()) ? null : date
}

const formatTimestamp = (dateValue) => {
  if (!dateValue || typeof dateValue !== "string") return ""

  // Check if the dateValue is in the format "Date(YYYY, MM, DD, ...)"
  const gvizMatch = dateValue.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?/)
  if (gvizMatch) {
    const [, year, month, day, hours, minutes, seconds] = gvizMatch.map(Number)
    const date = new Date(year, month, day, hours || 0, minutes || 0, seconds || 0)

    const dayStr = date.getDate().toString().padStart(2, "0")
    const monthStr = (date.getMonth() + 1).toString().padStart(2, "0")
    const yearStr = date.getFullYear()
    const hoursStr = date.getHours().toString().padStart(2, "0")
    const minutesStr = date.getMinutes().toString().padStart(2, "0")
    const secondsStr = date.getSeconds().toString().padStart(2, "0")

    return `${dayStr}/${monthStr}/${yearStr} ${hoursStr}:${minutesStr}:${secondsStr}`
  }

  // Handle DD/MM/YYYY hh:mm:ss format (already in correct format)
  if (dateValue.match(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/)) {
    return dateValue
  }

  // Try parsing as regular date string
  const date = new Date(dateValue)
  if (!isNaN(date.getTime())) {
    const dayStr = date.getDate().toString().padStart(2, "0")
    const monthStr = (date.getMonth() + 1).toString().padStart(2, "0")
    const yearStr = date.getFullYear()
    const hoursStr = date.getHours().toString().padStart(2, "0")
    const minutesStr = date.getMinutes().toString().padStart(2, "0")
    const secondsStr = date.getSeconds().toString().padStart(2, "0")

    return `${dayStr}/${monthStr}/${yearStr} ${hoursStr}:${minutesStr}:${secondsStr}`
  }

  return dateValue
}

const formatDateToDDMMYYYY = (dateString) => {
  if (!dateString) return ""

  // Handle HTML date input format (YYYY-MM-DD)
  if (dateString.includes("-") && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split("-")
    return `${day}/${month}/${year}`
  }

  // Handle Google Sheets Date format
  const date = parseGoogleSheetsDate(dateString)
  if (date && !isNaN(date.getTime())) {
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Try parsing as regular date string
  const regularDate = new Date(dateString)
  if (!isNaN(regularDate.getTime())) {
    const day = regularDate.getDate().toString().padStart(2, "0")
    const month = (regularDate.getMonth() + 1).toString().padStart(2, "0")
    const year = regularDate.getFullYear()
    return `${day}/${month}/${year}`
  }

  return dateString
}

const formatTimeTo12Hour = (timeString) => {
  if (!timeString) return ""

  // First try to parse as Google Sheets Date format
  const date = parseGoogleSheetsDate(timeString)
  if (date) {
    let hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, "0")
    const ampm = hours >= 12 ? "PM" : "AM"

    if (hours === 0) hours = 12
    else if (hours > 12) hours = hours - 12

    return `${hours}:${minutes} ${ampm}`
  }

  // Handle time in HH:MM format
  const timeMatch = String(timeString).match(/^(\d{1,2}):(\d{2})/)
  if (timeMatch) {
    let hours = Number.parseInt(timeMatch[1])
    const minutes = timeMatch[2]
    const ampm = hours >= 12 ? "PM" : "AM"

    if (hours === 0) hours = 12
    else if (hours > 12) hours = hours - 12

    return `${hours}:${minutes} ${ampm}`
  }

  return timeString
}

const formatPlannedDate = (dateValue) => {
  if (!dateValue || typeof dateValue !== "string") return ""

  // If it's already in DD/MM/YYYY format without time, return as is
  if (dateValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    return dateValue
  }

  // If it's in DD/MM/YYYY hh:mm:ss format, extract just the date part
  if (dateValue.match(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/)) {
    return dateValue.split(" ")[0]
  }

  // Handle Google Sheets Date format
  const date = parseGoogleSheetsDate(dateValue)
  if (date && !isNaN(date.getTime())) {
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Try parsing as regular date string
  const regularDate = new Date(dateValue)
  if (!isNaN(regularDate.getTime())) {
    const day = regularDate.getDate().toString().padStart(2, "0")
    const month = (regularDate.getMonth() + 1).toString().padStart(2, "0")
    const year = regularDate.getFullYear()
    return `${day}/${month}/${year}`
  }

  return dateValue
}

// Toast Notification Component
const Toast = ({ message, description, type, onClose }) => {
  const typeClasses = {
    success: { bg: "bg-green-500", icon: <FileCheck className="h-5 w-5 text-white" /> },
    error: { bg: "bg-red-500", icon: <AlertTriangle className="h-5 w-5 text-white" /> },
    info: { bg: "bg-blue-500", icon: <Package className="h-5 w-5 text-white" /> },
  }
  const currentType = typeClasses[type] || typeClasses.info

  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className={`fixed top-5 right-5 p-4 rounded-md shadow-lg text-white ${currentType.bg} z-[100] flex items-start space-x-2 max-w-sm`}
    >
      {currentType.icon}
      <div>
        <p className="font-semibold">{message}</p>
        {description && <p className="text-sm">{description}</p>}
      </div>
      <button
        onClick={onClose}
        className="ml-auto -mx-1.5 -my-1.5 bg-transparent text-white hover:bg-white/20 rounded-lg focus:ring-2 focus:ring-white/50 p-1.5 inline-flex h-8 w-8"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}

export default function DeliveryManagement() {
  const [pendingDeliveries, setPendingDeliveries] = useState([])
  const [historyDeliveries, setHistoryDeliveries] = useState([])
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [loadingPending, setLoadingPending] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Column visibility states
  const [visiblePendingColumns, setVisiblePendingColumns] = useState({})
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState({})

  // Dropdown visibility states
  const [isPendingColumnDropdownOpen, setIsPendingColumnDropdownOpen] = useState(false)
  const [isHistoryColumnDropdownOpen, setIsHistoryColumnDropdownOpen] = useState(false)

  // Refs for dropdown elements
  const pendingDropdownRef = useRef(null)
  const historyDropdownRef = useRef(null)

  const [formData, setFormData] = useState({
    liftNo: "",
    erpPoNumber: "",
    brokerName: "",
    partyName: "",
    materialName: "",
    status: "",
    remarks: "",
  })
  const [formErrors, setFormErrors] = useState({})
  const [pendingScrollPosition, setPendingScrollPosition] = useState(0);
  const [historyScrollPosition, setHistoryScrollPosition] = useState(0);

  const [activeTab, setActiveTab] = useState("pending")
  const pendingTableRef = useRef(null);
  const historyTableRef = useRef(null);

  // Initialize column visibility
  useEffect(() => {
    const initializeVisibility = (columnsMeta) => {
      const visibility = {}
      columnsMeta.forEach((col) => {
        visibility[col.dataKey] = col.alwaysVisible || col.toggleable
      })
      return visibility
    }
    setVisiblePendingColumns(initializeVisibility(PENDING_COLUMNS_META))
    setVisibleHistoryColumns(initializeVisibility(HISTORY_COLUMNS_META))
  }, [])

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pendingDropdownRef.current && !pendingDropdownRef.current.contains(event.target)) {
        setIsPendingColumnDropdownOpen(false)
      }
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target)) {
        setIsHistoryColumnDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Column visibility handlers
  const togglePendingColumnVisibility = (column) => {
    setVisiblePendingColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }))
  }

  const toggleHistoryColumnVisibility = (column) => {
    setVisibleHistoryColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }))
  }

  const handleSelectAllPendingColumns = (checked) => {
    const newVisibility = {}
    PENDING_COLUMNS_META.forEach(col => {
      newVisibility[col.dataKey] = col.alwaysVisible ? true : checked
    })
    setVisiblePendingColumns(newVisibility)
  }

  const handleSelectAllHistoryColumns = (checked) => {
    const newVisibility = {}
    HISTORY_COLUMNS_META.forEach(col => {
      newVisibility[col.dataKey] = col.alwaysVisible ? true : checked
    })
    setVisibleHistoryColumns(newVisibility)
  }

  const handlePendingScroll = (direction) => {
    if (pendingTableRef.current) {
      const scrollAmount = direction === 'right' ? 300 : -300;
      pendingTableRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });

      setTimeout(() => {
        if (pendingTableRef.current) {
          setPendingScrollPosition(pendingTableRef.current.scrollLeft);
        }
      }, 300);
    }
  };

  const handleHistoryScroll = (direction) => {
    if (historyTableRef.current) {
      const scrollAmount = direction === 'right' ? 300 : -300;
      historyTableRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });

      setTimeout(() => {
        if (historyTableRef.current) {
          setHistoryScrollPosition(historyTableRef.current.scrollLeft);
        }
      }, 300);
    }
  };

  useEffect(() => {
    const pendingTable = pendingTableRef.current;
    const historyTable = historyTableRef.current;

    const handlePendingScroll = () => {
      if (pendingTable) {
        setPendingScrollPosition(pendingTable.scrollLeft);
      }
    };

    const handleHistoryScroll = () => {
      if (historyTable) {
        setHistoryScrollPosition(historyTable.scrollLeft);
      }
    };

    pendingTable?.addEventListener('scroll', handlePendingScroll);
    historyTable?.addEventListener('scroll', handleHistoryScroll);

    return () => {
      pendingTable?.removeEventListener('scroll', handlePendingScroll);
      historyTable?.removeEventListener('scroll', handleHistoryScroll);
    };
  }, []);

  const fetchDeliveryData = useCallback(async () => {
    setLoadingPending(true)
    setLoadingHistory(true)
    setError(null)

    try {
      const cacheBuster = new Date().getTime()
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(DELIVERY_SHEET)}&t=${cacheBuster}`

      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch delivery data: ${response.status}`)

      let text = await response.text()
      if (text.startsWith("google.visualization.Query.setResponse(")) {
        text = text.substring(text.indexOf("(") + 1, text.lastIndexOf(")"))
      } else {
        const jsonStart = text.indexOf("{")
        const jsonEnd = text.lastIndexOf("}")
        if (jsonStart === -1 || jsonEnd === -1) throw new Error("Invalid response format from Google Sheets.")
        text = text.substring(jsonStart, jsonEnd + 1)
      }

      const data = JSON.parse(text)
      if (!data.table || !data.table.rows) {
        setPendingDeliveries([])
        setHistoryDeliveries([])
        return
      }

      const processedRows = data.table.rows
        .map((row, index) => {
          if (!row || !row.c) return null

          const getCellValue = (cellIndex) => {
            const cell = row.c && row.c[cellIndex]
            if (!cell) return ""

            // Use formatted value if available, otherwise use raw value
            const value = cell.f !== undefined && cell.f !== null ? cell.f : cell.v
            return value !== null && value !== undefined ? String(value).trim() : ""
          }

          return {
            id: `delivery-${index + 7}`,
            rowIndex: index + 7,
            liftNo: getCellValue(1), // Column B
            erpPoNumber: getCellValue(2), // Column C
            indentNumber: getCellValue(3), // Column D
            brokerName: getCellValue(4), // Column E
            partyName: getCellValue(5), // Column F
            materialName: getCellValue(6), // Column G
            qty: getCellValue(7), // Column H
            billNumber: getCellValue(8), // Column I
            truckNumber: getCellValue(9), // Column J
            driverNumber: getCellValue(10), // Column K
            billImage: getCellValue(11), // Column L - Bill Image
            transporterName: getCellValue(12), // Column M
            physicalCondition: getCellValue(18), // Column S
            qtyDifference: getCellValue(19), // Column T
            physicalImageOfProduct: getCellValue(20), // Column U
            imageOfWeightSlip: getCellValue(21), // Column V
            outTime: getCellValue(25), // Column Z
            vehicleOutDate: getCellValue(26), // Column AA
            planned: getCellValue(28), // Column AC
            timestamp: getCellValue(29), // Column AD
            status: getCellValue(31), // Column AF
            remarks: getCellValue(32), // Column AG
            rawCells: row.c ? row.c.map((cell) => (cell ? (cell.f ?? cell.v) : "")) : [],
          }
        })
        .filter((row) => row !== null)

      // Filter for Pending: Column AC not null and Column AD null
      const pendingRows = processedRows.filter(
        (row) => row.planned && row.planned !== "" && (!row.timestamp || row.timestamp === ""),
      )

      // Filter for History: Column AC not null and Column AD not null
      const historyRows = processedRows.filter(
        (row) => row.planned && row.planned !== "" && row.timestamp && row.timestamp !== "",
      )

      setPendingDeliveries(pendingRows)
      setHistoryDeliveries(historyRows.reverse()) // Show latest first
    } catch (error) {
      console.error("Error fetching delivery data:", error)
      setError(`Failed to load delivery data: ${error.message}`)
      setPendingDeliveries([])
      setHistoryDeliveries([])
    } finally {
      setLoadingPending(false)
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    fetchDeliveryData()
  }, [fetchDeliveryData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchDeliveryData()
    setIsRefreshing(false)
    setToast({
      message: "Refreshed",
      description: "Data has been refreshed successfully.",
      type: "success",
    })
  }

  const filterData = (data) => {
    if (!searchQuery.trim()) return data

    const query = searchQuery.toLowerCase().trim()
    return data.filter((item) => {
      return (
        item.liftNo?.toLowerCase().includes(query) ||
        item.erpPoNumber?.toLowerCase().includes(query) ||
        item.indentNumber?.toLowerCase().includes(query) ||
        item.brokerName?.toLowerCase().includes(query) ||
        item.partyName?.toLowerCase().includes(query) ||
        item.materialName?.toLowerCase().includes(query) ||
        item.qty?.toLowerCase().includes(query) ||
        item.billNumber?.toLowerCase().includes(query) ||
        item.truckNumber?.toLowerCase().includes(query) ||
        item.driverNumber?.toLowerCase().includes(query) ||
        item.transporterName?.toLowerCase().includes(query) ||
        item.physicalCondition?.toLowerCase().includes(query) ||
        item.qtyDifference?.toLowerCase().includes(query) ||
        item.status?.toLowerCase().includes(query) ||
        item.remarks?.toLowerCase().includes(query)
      )
    })
  }

  const filteredPendingDeliveries = filterData(pendingDeliveries)
  const filteredHistoryDeliveries = filterData(historyDeliveries)

  const handleReceiptClick = (delivery) => {
    setSelectedDelivery(delivery)
    setFormData({
      liftNo: delivery.liftNo,
      erpPoNumber: delivery.erpPoNumber,
      brokerName: delivery.brokerName,
      partyName: delivery.partyName,
      materialName: delivery.materialName,
      status: "",
      remarks: "",
    })
    setFormErrors({})
    setShowPopup(true)
  }

  const handleClosePopup = () => {
    setShowPopup(false)
    setSelectedDelivery(null)
    setFormData({
      liftNo: "",
      erpPoNumber: "",
      brokerName: "",
      partyName: "",
      materialName: "",
      status: "",
      remarks: "",
    })
    setFormErrors({})
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null })
  }

  const handleSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value })
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null })
  }

  const validateForm = () => {
    const newErrors = {}
    const requiredFields = ["status", "remarks"]

    requiredFields.forEach((field) => {
      if (!formData[field] || String(formData[field]).trim() === "") {
        newErrors[field] = `${field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} is required.`
      }
    })

    setFormErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!selectedDelivery) {
      setToast({ message: "Error", description: "No delivery selected.", type: "error" })
      return
    }
    if (!validateForm()) {
      setToast({
        message: "Validation Error",
        description: "Please fill all required fields correctly.",
        type: "error",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const now = new Date()
      const timestamp = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`

      // Prepare update data for the existing row
      const updateRowData = [...selectedDelivery.rawCells]

      // Ensure array has enough elements
      while (updateRowData.length < 33) {
        updateRowData.push("")
      }

      // Update specific columns
      updateRowData[29] = timestamp // Column AD - Time stamp
      updateRowData[31] = formData.status // Column AF - Status
      updateRowData[32] = formData.remarks // Column AG - Remarks
      updateRowData[15] = ""; // Column P (16)
      updateRowData[28] = ""; // Column P (16)
      updateRowData[22] = ""; // Column P (16)
      updateRowData[30] = ""; // Column P (16)
      updateRowData[33] = ""; // Column P (16)



      const updateParams = new URLSearchParams({
        action: "update",
        sheetName: DELIVERY_SHEET,
        rowIndex: selectedDelivery.rowIndex,
        rowData: JSON.stringify(updateRowData),
      })

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: updateParams.toString(),
      })

      if (!response.ok) throw new Error(`Update failed: ${response.status}`)

      // For opaque responses, assume success
      if (response.type !== "opaque") {
        const result = await response.json()
        if (!result.success) throw new Error(result.message || "Failed to update delivery record")
      }

      // Refresh data
      await fetchDeliveryData()

      handleClosePopup()
      setToast({
        message: "Success",
        description: `Receipt recorded successfully for ${selectedDelivery.liftNo}.`,
        type: "success",
      })
    } catch (error) {
      console.error("Error submitting form:", error)
      setToast({
        message: "Submission Error",
        description: error.message,
        type: "error",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeToast = () => setToast(null)

  const renderCell = (value) => {
    return value || (value === 0 ? "0" : <span className="text-xs text-gray-400">N/A</span>)
  }

  const renderLinkCell = (value, linkText = "View") => {
    return value ? (
      <a
        href={String(value).startsWith("http") ? value : `https://${value}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center text-xs"
      >
        <ExternalLink className="h-3 w-3 mr-1" /> {linkText}
      </a>
    ) : (
      <span className="text-gray-400 text-xs">N/A</span>
    )
  }

  const renderPendingTable = (data) => (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            {PENDING_COLUMNS_META.filter(col => visiblePendingColumns[col.dataKey]).map((col) => (
              <TableHead key={col.dataKey} className="font-semibold">
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id} className="hover:bg-muted/30">
              {PENDING_COLUMNS_META.filter(col => visiblePendingColumns[col.dataKey]).map((column) => (
                <TableCell key={column.dataKey} className={column.dataKey === "liftNo" ? "font-medium text-primary" : ""}>
                  {column.dataKey === "actionColumn" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReceiptClick(item)}
                      className="h-8 px-3 py-1 text-xs"
                    >
                      Receipt
                    </Button>
                  ) : column.dataKey === "billImage" || column.dataKey === "physicalImageOfProduct" || column.dataKey === "imageOfWeightSlip" ? (
                    renderLinkCell(item[column.dataKey])
                  ) : column.dataKey === "outTime" ? (
                    renderCell(formatTimeTo12Hour(item[column.dataKey]))
                  ) : column.dataKey === "vehicleOutDate" ? (
                    renderCell(formatDateToDDMMYYYY(item[column.dataKey]))
                  ) : column.dataKey === "planned" ? (
                    renderCell(formatPlannedDate(item[column.dataKey]))
                  ) : (
                    renderCell(item[column.dataKey])
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  const renderHistoryTable = (data) => (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            {HISTORY_COLUMNS_META.filter(col => visibleHistoryColumns[col.dataKey]).map((col) => (
              <TableHead key={col.dataKey} className="font-semibold">
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id} className="hover:bg-muted/30">
              {HISTORY_COLUMNS_META.filter(col => visibleHistoryColumns[col.dataKey]).map((column) => (
                <TableCell key={column.dataKey} className={column.dataKey === "liftNo" ? "font-medium text-primary" : ""}>
                  {column.dataKey === "outTime" ? (
                    renderCell(formatTimeTo12Hour(item[column.dataKey]))
                  ) : column.dataKey === "vehicleOutDate" ? (
                    renderCell(formatDateToDDMMYYYY(item[column.dataKey]))
                  ) : column.dataKey === "timestamp" ? (
                    <div className="text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium">{renderCell(formatTimestamp(item[column.dataKey]))}</span>
                      </div>
                    </div>
                  ) : (
                    renderCell(item[column.dataKey])
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <div>
      {toast && (
        <Toast message={toast.message} description={toast.description} type={toast.type} onClose={closeToast} />
      )}

      <Card className="shadow-md border-none">
        <CardContent className="p-6">
          {/* Search Bar and Refresh Button */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search deliveries (Lift No, ERP Po, Broker, Party, Material, etc.)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4"
              />
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing || loadingPending || loadingHistory}
              variant="outline"
              className="flex items-center gap-2 min-w-[120px]"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {loadingPending && loadingHistory ? (
            <div className="flex flex-col justify-center items-center h-60">
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-3" />
              <p className="text-muted-foreground">Loading Data from Sheet "{DELIVERY_SHEET}"...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-60 text-center p-4 border-2 border-dashed border-destructive bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
              <h3 className="text-lg font-medium text-destructive">Error Loading Data</h3>
              <p className="text-sm text-muted-foreground max-w-md">{error}</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  Pending
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                    {filteredPendingDeliveries.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  History
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                    {filteredHistoryDeliveries.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-0">
                <Card>
                  <CardHeader className="py-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileCheck className="h-5 w-5 text-blue-600" />
                          Pending Deliveries ({filteredPendingDeliveries.length})
                          {searchQuery && (
                            <span className="text-sm font-normal text-muted-foreground">
                              of {pendingDeliveries.length} total
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Deliveries awaiting receipt confirmation
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePendingScroll('left')}
                          disabled={pendingScrollPosition <= 0}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePendingScroll('right')}
                          disabled={pendingScrollPosition >= (pendingTableRef.current?.scrollWidth - pendingTableRef.current?.clientWidth)}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <div className="relative" ref={pendingDropdownRef}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsPendingColumnDropdownOpen(!isPendingColumnDropdownOpen)}
                            className="flex items-center gap-2"
                          >
                            <span>Columns</span>
                            <svg
                              className={`ml-1 h-4 w-4 transition-transform ${isPendingColumnDropdownOpen ? 'rotate-180' : ''}`}
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </Button>

                          {isPendingColumnDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                              <div className="p-2">
                                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                                  <button
                                    onClick={() => handleSelectAllPendingColumns(true)}
                                    className="text-xs text-indigo-600 hover:text-indigo-800"
                                  >
                                    Select All
                                  </button>
                                  <span className="text-gray-300 mx-1">|</span>
                                  <button
                                    onClick={() => handleSelectAllPendingColumns(false)}
                                    className="text-xs text-indigo-600 hover:text-indigo-800"
                                  >
                                    Deselect All
                                  </button>
                                </div>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                  {PENDING_COLUMNS_META.map((column) => (
                                    <div
                                      key={column.dataKey}
                                      className="flex items-center px-3 py-2 hover:bg-gray-100 rounded cursor-pointer"
                                      onClick={() => !column.alwaysVisible && togglePendingColumnVisibility(column.dataKey)}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={visiblePendingColumns[column.dataKey]}
                                        readOnly
                                        className="mr-2 rounded text-indigo-600 focus:ring-indigo-500"
                                        disabled={column.alwaysVisible}
                                      />
                                      <span className="text-sm text-gray-700">
                                        {column.header}
                                        {column.alwaysVisible && <span className="text-gray-400 ml-1 text-xs">(Fixed)</span>}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {filteredPendingDeliveries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Package className="h-12 w-12 text-blue-500 mb-3" />
                        <h3 className="text-lg font-medium text-foreground">
                          {searchQuery ? 'No Results Found' : 'No Pending Deliveries'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {searchQuery
                            ? `No deliveries match "${searchQuery}". Try a different search term.`
                            : 'No deliveries currently pending receipt.'
                          }
                        </p>
                      </div>
                    ) : (
                      <div className="relative">
                        <div
                          className="p-6 overflow-x-auto w-full"
                          ref={pendingTableRef}
                        >
                          <div className="min-w-max">
                            {renderPendingTable(filteredPendingDeliveries)}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <Card>
                  <CardHeader className="py-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <History className="h-5 w-5 text-blue-600" />
                          Delivery History ({filteredHistoryDeliveries.length})
                          {searchQuery && (
                            <span className="text-sm font-normal text-muted-foreground">
                              of {historyDeliveries.length} total
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription>Completed delivery receipts</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleHistoryScroll('left')}
                          disabled={historyScrollPosition <= 0}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleHistoryScroll('right')}
                          disabled={historyScrollPosition >= (historyTableRef.current?.scrollWidth - historyTableRef.current?.clientWidth)}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <div className="relative" ref={historyDropdownRef}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsHistoryColumnDropdownOpen(!isHistoryColumnDropdownOpen)}
                            className="flex items-center gap-2"
                          >
                            <span>Columns</span>
                            <svg
                              className={`ml-1 h-4 w-4 transition-transform ${isHistoryColumnDropdownOpen ? 'rotate-180' : ''}`}
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </Button>

                          {isHistoryColumnDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                              <div className="p-2">
                                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                                  <button
                                    onClick={() => handleSelectAllHistoryColumns(true)}
                                    className="text-xs text-indigo-600 hover:text-indigo-800"
                                  >
                                    Select All
                                  </button>
                                  <span className="text-gray-300 mx-1">|</span>
                                  <button
                                    onClick={() => handleSelectAllHistoryColumns(false)}
                                    className="text-xs text-indigo-600 hover:text-indigo-800"
                                  >
                                    Deselect All
                                  </button>
                                </div>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                  {HISTORY_COLUMNS_META.map((column) => (
                                    <div
                                      key={column.dataKey}
                                      className="flex items-center px-3 py-2 hover:bg-gray-100 rounded cursor-pointer"
                                      onClick={() => !column.alwaysVisible && toggleHistoryColumnVisibility(column.dataKey)}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={visibleHistoryColumns[column.dataKey]}
                                        readOnly
                                        className="mr-2 rounded text-indigo-600 focus:ring-indigo-500"
                                        disabled={column.alwaysVisible}
                                      />
                                      <span className="text-sm text-gray-700">
                                        {column.header}
                                        {column.alwaysVisible && <span className="text-gray-400 ml-1 text-xs">(Fixed)</span>}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {filteredHistoryDeliveries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <History className="h-12 w-12 text-blue-500 mb-3" />
                        <h3 className="text-lg font-medium text-foreground">
                          {searchQuery ? 'No Results Found' : 'No Delivery History'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {searchQuery
                            ? `No deliveries match "${searchQuery}". Try a different search term.`
                            : 'No completed deliveries found.'
                          }
                        </p>
                      </div>
                    ) : (
                      <div className="relative">
                        <div
                          className="p-6 overflow-x-auto w-full"
                          ref={historyTableRef}
                        >
                          <div className="min-w-max">
                            {renderHistoryTable(filteredHistoryDeliveries)}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Receipt Form Modal */}
      {showPopup && selectedDelivery && (
        <Dialog open={showPopup} onOpenChange={setShowPopup}>
          <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b pb-4 mb-4">
              <DialogTitle className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <FileText className="h-6 w-6 text-blue-600 mr-3" />
                Record Receipt for Lift: <span className="font-bold text-blue-600 ml-1">{selectedDelivery.liftNo}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="px-0 py-2 sm:px-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {/* Pre-filled fields */}
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Lift No.</Label>
                    <Input value={formData.liftNo} readOnly className="bg-gray-100" />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">ERP Po Number</Label>
                    <Input value={formData.erpPoNumber} readOnly className="bg-gray-100" />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Broker Name</Label>
                    <Input value={formData.brokerName} readOnly className="bg-gray-100" />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Party Name</Label>
                    <Input value={formData.partyName} readOnly className="bg-gray-100" />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Material Name</Label>
                    <Input value={formData.materialName} readOnly className="bg-gray-100" />
                  </div>

                  {/* User input fields */}
                  <div className="md:col-span-2">
                    <Label className="block text-sm font-medium text-gray-700 mb-1">
                      Status <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      name="status"
                      value={formData.status}
                      onValueChange={(value) => handleSelectChange("status", value)}
                    >
                      <SelectTrigger className={formErrors.status ? "border-red-500" : "border-gray-300"}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Done">Done</SelectItem>
                        <SelectItem value="Not Match">Not Match</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.status && <p className="mt-1 text-xs text-red-600">{formErrors.status}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <Label className="block text-sm font-medium text-gray-700 mb-1">
                      Remarks <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      name="remarks"
                      value={formData.remarks}
                      onChange={handleInputChange}
                      className={formErrors.remarks ? "border-red-500" : "border-gray-300"}
                      placeholder="Enter remarks"
                      rows={3}
                    />
                    {formErrors.remarks && <p className="mt-1 text-xs text-red-600">{formErrors.remarks}</p>}
                  </div>
                </div>

                <div className="pt-6 flex justify-end gap-4 border-t border-gray-200 mt-6">
                  <Button type="button" variant="outline" onClick={handleClosePopup}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...
                      </>
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}