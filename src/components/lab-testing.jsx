"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { Truck, History, FileText, Loader2, AlertTriangle, Info, CheckCircle, XCircle, Search, RefreshCw } from "lucide-react"

// Constants
const SHEET_ID = "19Za1BvjKvHT01rzDOPLS_MErnuEJd6__l7C_4lUgLlg"
const DELIVERY_SHEET_NAME = "DELIVERY"
const LAB_SHEET_NAME = "LAB"
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbx3_COAFa1T6tCTjJT8Ip0ep7Qy83wA7ZpJteErgfzZ-gQG0Zf8Yxw6iTspQ5oGy6Q/exec"
const DATA_START_ROW = 7
const DRIVE_FOLDER_ID = "1N75bNbUqJGnraflyhIqDY2pzJH2zMium"

// Column indices (0-based, adjusted for gviz response)
const LIFT_NO_COL = 1 // B
const ERP_PO_NUMBER_COL = 2 // C
const INDENT_NUMBER_COL = 3 // D
const BROKER_NAME_COL = 4 // E
const PARTY_NAME_COL = 5 // F
const MATERIAL_NAME_COL = 6 // G
const QTY_COL = 7 // H
const BILL_NUMBER_COL = 8 // I
const TRUCK_NUMBER_COL = 9 // J
const DRIVER_NUMBER_COL = 10 // K
const TRANSPORTER_NAME_COL = 12 // M
const PHYSICAL_CONDITION_COL = 18 // S
const QTY_DIFFERENCE_COL = 19 // T
const PHYSICAL_IMAGE_COL = 20 // U
const WEIGHT_SLIP_IMAGE_COL = 21 // V
const OUT_TIME_COL = 25 // Z
const VEHICLE_OUT_DATE_COL = 26 // AA
const STATUS_COL = 27 // AB
const PLANNED_COL = 28 // AC
const AH_CONDITION_COL = 33 // AH
const AI_CONDITION_COL = 34 // AI
const TOTAL_TESTING_COL = 36 // AK
const NEED_MORE_TESTING_COL = 37 // AL

const PENDING_COLUMNS_META = [
  { header: "Action", dataKey: "actionColumn", toggleable: false, alwaysVisible: true },
  { header: "Lift No.", dataKey: "liftNo", toggleable: true, alwaysVisible: true },
  { header: "ERP Number", dataKey: "erpPoNumber", toggleable: true },
  { header: "Indent NO.", dataKey: "indentNumber", toggleable: true },
  { header: "Broker Name", dataKey: "brokerName", toggleable: true },
  { header: "Party Name", dataKey: "partyName", toggleable: true },
  { header: "Material Name", dataKey: "materialName", toggleable: true },
  { header: "Bill Qty", dataKey: "qty", toggleable: true },
  { header: "Bill Number", dataKey: "billNumber", toggleable: true },
  { header: "Truck No.", dataKey: "truckNumber", toggleable: true },
  { header: "Driver No.", dataKey: "driverNumber", toggleable: true },
  { header: "Transporter Name", dataKey: "transporterName", toggleable: true },
  { header: "Physical Condition", dataKey: "physicalCondition", toggleable: true },
  { header: "Received Qty", dataKey: "qtyDifference", toggleable: true },
  { header: "Physical Image", dataKey: "physicalImage", toggleable: true },
  { header: "Weight Slip Image", dataKey: "weightSlipImage", toggleable: true },
  { header: "Out Time", dataKey: "outTime", toggleable: true },
  { header: "Vehicle Out Date", dataKey: "vehicleOutDate", toggleable: true },
  { header: "Planned", dataKey: "planned", toggleable: true },
];

const HISTORY_COLUMNS_META = [
  { header: "Lift Number", dataKey: "liftNo", toggleable: true, alwaysVisible: true },
  { header: "Testing Number", dataKey: "testingNumber", toggleable: true },
  { header: "Need More Testing", dataKey: "needMoreTesting", toggleable: true },
  { header: "Fe (M)", dataKey: "feM", toggleable: true },
  { header: "Fe (T)", dataKey: "feT", toggleable: true },
  { header: "Mz%", dataKey: "mzPercent", toggleable: true },
  { header: "Fe (O)", dataKey: "feO", toggleable: true },
  { header: "C%", dataKey: "cPercent", toggleable: true },
  { header: "S%", dataKey: "sPercent", toggleable: true },
  { header: "N.M.%", dataKey: "nmPercent", toggleable: true },
  { header: "LAT", dataKey: "lat", toggleable: true },
  { header: "Fuse", dataKey: "fuse", toggleable: true },
  { header: "100 Mash", dataKey: "mesh100", toggleable: true },
  { header: "1 mm", dataKey: "mm1", toggleable: true },
  { header: "4 mm", dataKey: "mm4", toggleable: true },
  { header: "5 Kg Yield", dataKey: "kgYield5", toggleable: true },
  { header: "Ph%", dataKey: "phPercent", toggleable: true },
  { header: "SMN%", dataKey: "smnPercent", toggleable: true },
  { header: "Photo", dataKey: "photo", toggleable: true },
];

// Helper functions
const parseGvizResponse = (text, sheetNameForError) => {
  if (!text || !text.includes("google.visualization.Query.setResponse")) {
    console.error(
      `Invalid or empty gviz response for ${sheetNameForError}:`,
      text ? text.substring(0, 500) : "Response was null/empty",
    )
    throw new Error(
      `Invalid response format from Google Sheets for ${sheetNameForError}. Please ensure the sheet is publicly accessible and the sheet name is correct.`,
    )
  }

  try {
    const jsonStart = text.indexOf("{")
    const jsonEnd = text.lastIndexOf("}") + 1
    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error(`Could not find JSON data in response`)
    }

    const jsonString = text.substring(jsonStart, jsonEnd)
    const data = JSON.parse(jsonString)

    if (data.status === "error") {
      throw new Error(`Google Sheets API Error: ${data.errors?.[0]?.detailed_message || "Unknown error"}`)
    }

    if (!data.table) {
      console.warn(`No data.table in ${sheetNameForError}, treating as empty.`)
      return { cols: [], rows: [] }
    }

    if (!data.table.cols) {
      console.warn(`No data.table.cols in ${sheetNameForError}, treating as empty.`)
      return { cols: [], rows: [] }
    }

    if (!data.table.rows) {
      console.warn(`No data.table.rows in ${sheetNameForError}, treating as empty.`)
      data.table.rows = []
    }

    return data.table
  } catch (parseError) {
    console.error("JSON Parse Error:", parseError)
    throw new Error(`Failed to parse response from Google Sheets: ${parseError.message}`)
  }
}

const formatTime = (timeValue) => {
  if (!timeValue || typeof timeValue !== "string" || !timeValue.trim()) {
    return ""
  }

  // Handle Google Sheets Date format like "Date(1899,11,30,12,34,0)"
  const gvizDateMatch = timeValue.match(/^Date\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/)
  if (gvizDateMatch) {
    const [, year, month, day, hours, minutes, seconds] = gvizDateMatch.map(Number)
    const hour24 = hours
    const mins = minutes

    // Validate hour and minute ranges
    if (hour24 < 0 || hour24 > 23 || mins < 0 || mins > 59) {
      return timeValue // Return original if invalid
    }

    // Convert 24-hour to 12-hour format
    let hour12 = hour24
    let ampm = "AM"

    if (hour24 === 0) {
      hour12 = 12
      ampm = "AM"
    } else if (hour24 === 12) {
      hour12 = 12
      ampm = "PM"
    } else if (hour24 > 12) {
      hour12 = hour24 - 12
      ampm = "PM"
    } else {
      hour12 = hour24
      ampm = "AM"
    }

    // Format minutes with leading zero if needed
    const formattedMinutes = String(mins).padStart(2, '0')

    return `${hour12}:${formattedMinutes} ${ampm}`
  }

  // Handle standard time format like "14:32" or "14:32:00" or "14:32:00.000"
  const timeMatch = timeValue.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d{3}))?/)
  if (timeMatch) {
    const [, hours, minutes] = timeMatch
    const hour24 = Number.parseInt(hours, 10)
    const mins = Number.parseInt(minutes, 10)

    // Validate hour and minute ranges
    if (hour24 < 0 || hour24 > 23 || mins < 0 || mins > 59) {
      return timeValue // Return original if invalid
    }

    // Convert 24-hour to 12-hour format
    let hour12 = hour24
    let ampm = "AM"

    if (hour24 === 0) {
      hour12 = 12
      ampm = "AM"
    } else if (hour24 === 12) {
      hour12 = 12
      ampm = "PM"
    } else if (hour24 > 12) {
      hour12 = hour24 - 12
      ampm = "PM"
    } else {
      hour12 = hour24
      ampm = "AM"
    }

    // Format minutes with leading zero if needed
    const formattedMinutes = minutes.padStart(2, '0')

    return `${hour12}:${formattedMinutes} ${ampm}`
  }

  // Handle already formatted time (contains AM/PM)
  if (timeValue.includes("AM") || timeValue.includes("PM")) {
    return timeValue
  }

  // Handle Google Sheets time format "timeofday(14,32,0)" or similar
  const gsheetTimeMatch = timeValue.match(/timeofday\((\d+),(\d+)(?:,(\d+))?\)/)
  if (gsheetTimeMatch) {
    const [, hours, minutes] = gsheetTimeMatch
    const hour24 = Number.parseInt(hours, 10)
    const mins = Number.parseInt(minutes, 10)

    // Validate ranges
    if (hour24 < 0 || hour24 > 23 || mins < 0 || mins > 59) {
      return timeValue
    }

    // Convert to 12-hour format
    let hour12 = hour24
    let ampm = "AM"

    if (hour24 === 0) {
      hour12 = 12
      ampm = "AM"
    } else if (hour24 === 12) {
      hour12 = 12
      ampm = "PM"
    } else if (hour24 > 12) {
      hour12 = hour24 - 12
      ampm = "PM"
    }

    const formattedMinutes = String(mins).padStart(2, '0')
    return `${hour12}:${formattedMinutes} ${ampm}`
  }

  // Handle decimal time format (e.g., 0.6 = 14:24, where 0.6 * 24 hours = 14.4 hours)
  const decimalMatch = timeValue.match(/^0\.(\d+)$/)
  if (decimalMatch) {
    const decimal = parseFloat(timeValue)
    const totalMinutes = Math.round(decimal * 24 * 60)
    const hour24 = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60

    if (hour24 >= 0 && hour24 <= 23 && mins >= 0 && mins <= 59) {
      let hour12 = hour24
      let ampm = "AM"

      if (hour24 === 0) {
        hour12 = 12
        ampm = "AM"
      } else if (hour24 === 12) {
        hour12 = 12
        ampm = "PM"
      } else if (hour24 > 12) {
        hour12 = hour24 - 12
        ampm = "PM"
      }

      const formattedMinutes = String(mins).padStart(2, '0')
      return `${hour12}:${formattedMinutes} ${ampm}`
    }
  }

  // If none of the patterns match, return the original value
  return timeValue
}

const formatDate = (dateValue) => {
  if (!dateValue || typeof dateValue !== "string" || !dateValue.trim()) {
    return ""
  }

  // Check if the dateValue is in the format "Date(YYYY, MM, DD, ...)"
  const gvizMatch = dateValue.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?/)
  if (gvizMatch) {
    const [, year, month, day] = gvizMatch.map(Number)
    const parsedDate = new Date(year, month, day)
    if (!isNaN(parsedDate.getTime())) {
      return new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(parsedDate)
    }
  }

  // Handle DD/MM/YYYY HH:MM:SS format - extract only date part
  const dateTimeMatch = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (dateTimeMatch) {
    const [, day, month, year] = dateTimeMatch
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`
  }

  // Try parsing as standard date
  const dateObj = new Date(dateValue)
  if (!isNaN(dateObj.getTime())) {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(dateObj)
  }

  return dateValue
}

const formatDateForPlanned = (dateValue) => {
  if (!dateValue || typeof dateValue !== "string" || !dateValue.trim()) {
    return ""
  }

  // Handle DD/MM/YYYY HH:MM:SS format - extract only date part
  const dateTimeMatch = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (dateTimeMatch) {
    const [, day, month, year] = dateTimeMatch
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`
  }

  return formatDate(dateValue)
}

export default function DeliveryTracking() {
  const [allDeliveryData, setAllDeliveryData] = useState([])
  const [allLabData, setAllLabData] = useState([])
  const [selectedItemForReceipt, setSelectedItemForReceipt] = useState(null)
  const [loadingData, setLoadingData] = useState(true)
  const [errorData, setErrorData] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [activeTab, setActiveTab] = useState("pending")
  const [searchTerm, setSearchTerm] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [visiblePendingColumns, setVisiblePendingColumns] = useState(
    PENDING_COLUMNS_META.reduce((acc, col) => {
      acc[col.dataKey] = true;
      return acc;
    }, {})
  );
  const [isPendingColumnDropdownOpen, setIsPendingColumnDropdownOpen] = useState(false);
  const pendingDropdownRef = useRef(null);
  const initialFormData = {
    liftNo: "",
    erpPoNumber: "",
    brokerName: "",
    partyName: "",
    materialName: "",
    needMoreTesting: "Yes",
    feM: "",
    feT: "",
    mzPercent: "",
    feO: "",
    cPercent: "",
    sPercent: "",
    nmPercent: "",
    lat: "",
    fuse: "",
    mesh100: "",
    mm1: "",
    mm4: "",
    kgYield5: "",
    phPercent: "",
    smnPercent: "",
    photo: null,
  }

  const [formData, setFormData] = useState(initialFormData)
  const [formErrors, setFormErrors] = useState({})

  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState(
    HISTORY_COLUMNS_META.reduce((acc, col) => {
      acc[col.dataKey] = true;
      return acc;
    }, {})
  );
  const [isHistoryColumnDropdownOpen, setIsHistoryColumnDropdownOpen] = useState(false);
  const historyDropdownRef = useRef(null);

  // Update the existing useEffect for click outside handling
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pendingDropdownRef.current && !pendingDropdownRef.current.contains(event.target)) {
        setIsPendingColumnDropdownOpen(false);
      }
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target)) {
        setIsHistoryColumnDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true)
      setErrorData(null)
      try {
        // Fetch DELIVERY data
        const deliveryUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(DELIVERY_SHEET_NAME)}&range=A7:AL10000&t=${new Date().getTime()}`

        const deliveryResponse = await fetch(deliveryUrl)
        if (!deliveryResponse.ok) throw new Error(`Network response was not ok: ${deliveryResponse.statusText}`)

        const deliveryResponseText = await deliveryResponse.text()
        const deliveryDataTable = parseGvizResponse(deliveryResponseText, DELIVERY_SHEET_NAME)

        const processedDeliveryData = deliveryDataTable.rows
          .map((row, gvizRowIndex) => {
            const getStringValue = (colIndex) => {
              if (!row.c || !row.c[colIndex]) return ""
              const cellValue = row.c[colIndex].v
              if (cellValue === null || cellValue === undefined) return ""
              return String(cellValue).trim()
            }

            // Get AH and AI values for filtering
            const ahValue = getStringValue(AH_CONDITION_COL)
            const aiValue = getStringValue(AI_CONDITION_COL)

            // Skip rows where both AH and AI are empty (these are likely empty rows or headers)
            if (!ahValue && !aiValue) {
              return null
            }

            // Skip rows that contain header text or "ACTUAL" text
            const liftNoValue = getStringValue(LIFT_NO_COL)
            if (
              !liftNoValue ||
              liftNoValue.toLowerCase().includes("lift") ||
              liftNoValue.toLowerCase().includes("actual") ||
              liftNoValue.toLowerCase().includes("no.")
            ) {
              return null
            }

            return {
              _id: Math.random().toString(36).substring(2, 15) + (liftNoValue || gvizRowIndex),
              _rowIndex: gvizRowIndex + DATA_START_ROW,
              rawCells: row.c ? row.c.map((cell) => (cell ? (cell.f ?? cell.v) : null)) : [],
              liftNo: liftNoValue,
              erpPoNumber: getStringValue(ERP_PO_NUMBER_COL),
              indentNumber: getStringValue(INDENT_NUMBER_COL),
              brokerName: getStringValue(BROKER_NAME_COL),
              partyName: getStringValue(PARTY_NAME_COL),
              materialName: getStringValue(MATERIAL_NAME_COL),
              qty: getStringValue(QTY_COL),
              billNumber: getStringValue(BILL_NUMBER_COL),
              truckNumber: getStringValue(TRUCK_NUMBER_COL),
              driverNumber: getStringValue(DRIVER_NUMBER_COL),
              transporterName: getStringValue(TRANSPORTER_NAME_COL),
              physicalCondition: getStringValue(PHYSICAL_CONDITION_COL),
              qtyDifference: getStringValue(QTY_DIFFERENCE_COL),
              physicalImage: getStringValue(PHYSICAL_IMAGE_COL),
              weightSlipImage: getStringValue(WEIGHT_SLIP_IMAGE_COL),
              outTime: formatTime(getStringValue(OUT_TIME_COL)),
              vehicleOutDate: formatDate(getStringValue(VEHICLE_OUT_DATE_COL)),
              status: getStringValue(STATUS_COL),
              planned: formatDateForPlanned(getStringValue(PLANNED_COL)),
              ahCondition: ahValue,
              aiCondition: aiValue,
              totalTesting: getStringValue(TOTAL_TESTING_COL),
              needMoreTesting: getStringValue(NEED_MORE_TESTING_COL),
            }
          })
          .filter((item) => item !== null) // Remove null entries

        setAllDeliveryData(processedDeliveryData)

        // Fetch LAB data (columns B to T)
        const labUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(LAB_SHEET_NAME)}&range=B2:T10000&t=${new Date().getTime()}`

        const labResponse = await fetch(labUrl)
        if (!labResponse.ok) throw new Error(`Network response was not ok: ${labResponse.statusText}`)

        const labResponseText = await labResponse.text()
        const labDataTable = parseGvizResponse(labResponseText, LAB_SHEET_NAME)

        const processedLabData = labDataTable.rows
          .map((row, gvizRowIndex) => {
            const getStringValue = (colIndex) => {
              if (!row.c || !row.c[colIndex]) return ""
              const cellValue = row.c[colIndex].v
              if (cellValue === null || cellValue === undefined) return ""
              return String(cellValue).trim()
            }

            // Skip rows that contain header text
            const liftNoValue = getStringValue(0) // Column B is index 0 in the range B:T
            if (
              !liftNoValue ||
              liftNoValue.toLowerCase().includes("lift") ||
              liftNoValue.toLowerCase().includes("no.")
            ) {
              return null
            }

            return {
              _id: Math.random().toString(36).substring(2, 15) + (liftNoValue || gvizRowIndex),
              _rowIndex: gvizRowIndex + 2, // Starting from row 2
              liftNo: liftNoValue,
              testingNumber: getStringValue(1), // Column C
              needMoreTesting: getStringValue(2), // Column D
              feM: getStringValue(3), // Column E
              feT: getStringValue(4), // Column F
              mzPercent: getStringValue(5), // Column G
              feO: getStringValue(6), // Column H
              cPercent: getStringValue(7), // Column I
              sPercent: getStringValue(8), // Column J
              nmPercent: getStringValue(9), // Column K
              lat: getStringValue(10), // Column L
              fuse: getStringValue(11), // Column M
              mesh100: getStringValue(12), // Column N
              mm1: getStringValue(13), // Column O
              mm4: getStringValue(14), // Column P
              kgYield5: getStringValue(15), // Column Q
              phPercent: getStringValue(16), // Column R
              smnPercent: getStringValue(17), // Column S
              photo: getStringValue(18), // Column T
            }
          })
          .filter((item) => item !== null) // Remove null entries

        setAllLabData(processedLabData)
      } catch (err) {
        console.error("Error fetching data:", err)
        const errorMessage = `Failed to load data: ${err.message}`
        setErrorData(errorMessage)
        toast.error("Data Load Error", {
          description: errorMessage,
          icon: <XCircle className="h-4 w-4" />,
        })
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [refreshTrigger])

  // Filter data for pending (from DELIVERY sheet)
  const pendingData = useMemo(() => {
    return allDeliveryData.filter((item) => {
      const ahValue = item.ahCondition
      const aiValue = item.aiCondition

      // Condition: Column AH = "Not Null" AND Column AI = "Null"
      const ahNotNull = ahValue && ahValue !== ""
      const aiIsNull = !aiValue || aiValue === ""

      return ahNotNull && aiIsNull
    })
  }, [allDeliveryData])

  // History data now comes from LAB sheet
  // Replace the historyData useMemo with this:
  const historyData = useMemo(() => {
    console.log('All Lab Data:', allLabData); // Debug: check what data we have

    // Group by lift number and find the entry with highest testing number
    const grouped = {};

    allLabData.forEach(item => {
      if (!item.liftNo || !item.testingNumber) return;

      const liftNo = item.liftNo;
      const testingNum = parseInt(item.testingNumber) || 0;

      if (!grouped[liftNo] || testingNum > grouped[liftNo].testingNum) {
        grouped[liftNo] = {
          ...item,
          testingNum: testingNum
        };
      }
    });

    // Convert to array and sort by lift number in descending order
    const result = Object.values(grouped).sort((a, b) => {
      const numA = parseInt(a.liftNo.split("-")[1]) || 0;
      const numB = parseInt(b.liftNo.split("-")[1]) || 0;
      return numB - numA; // Descending order
    });

    console.log('Grouped History Data:', result); // Debug: check the final result
    return result;
  }, [allLabData]);

  // Search functionality
  const filteredPendingData = useMemo(() => {
    if (!searchTerm) return pendingData

    const term = searchTerm.toLowerCase()
    return pendingData.filter((item) =>
      item.liftNo.toLowerCase().includes(term) ||
      item.erpPoNumber.toLowerCase().includes(term) ||
      item.indentNumber.toLowerCase().includes(term) ||
      item.brokerName.toLowerCase().includes(term) ||
      item.partyName.toLowerCase().includes(term) ||
      item.materialName.toLowerCase().includes(term) ||
      item.billNumber.toLowerCase().includes(term) ||
      item.truckNumber.toLowerCase().includes(term) ||
      item.transporterName.toLowerCase().includes(term) ||
      item.qty.toLowerCase().includes(term)
    )
  }, [pendingData, searchTerm])

  const filteredHistoryData = useMemo(() => {
    if (!searchTerm) return historyData

    const term = searchTerm.toLowerCase()
    return historyData.filter((item) =>
      item.liftNo.toLowerCase().includes(term) ||
      item.testingNumber.toLowerCase().includes(term) ||
      item.needMoreTesting.toLowerCase().includes(term)
    )
  }, [historyData, searchTerm])

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setRefreshTrigger((p) => p + 1)

    setTimeout(() => {
      setIsRefreshing(false)
      toast.success("Data Refreshed", {
        description: "Latest data has been loaded successfully.",
        icon: <CheckCircle className="h-4 w-4" />,
      })
    }, 1000)
  }


  // Add these functions near your other utility functions
  const togglePendingColumnVisibility = (column) => {
    setVisiblePendingColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const handleSelectAllPendingColumns = (checked) => {
    const newVisibility = {};
    PENDING_COLUMNS_META.forEach(col => {
      newVisibility[col.dataKey] = col.alwaysVisible ? true : checked;
    });
    setVisiblePendingColumns(newVisibility);
  };

  // Add these functions near your other utility functions
  const toggleHistoryColumnVisibility = (column) => {
    setVisibleHistoryColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const handleSelectAllHistoryColumns = (checked) => {
    const newVisibility = {};
    HISTORY_COLUMNS_META.forEach(col => {
      newVisibility[col.dataKey] = col.alwaysVisible ? true : checked;
    });
    setVisibleHistoryColumns(newVisibility);
  };
  // Form handling
  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target

    if (type === 'file' && name === 'photo') {
      // Handle file upload
      const file = files[0]
      if (file) {
        setFormData((prev) => ({ ...prev, [name]: file }))
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }

    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }))
  }

  const handleSelectChange = (name) => (value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: null }))
  }

  const handleOpenReceiptModal = (item) => {
    setSelectedItemForReceipt(item)
    setFormErrors({})
    setFormData({
      ...initialFormData,
      liftNo: item.liftNo,
      erpPoNumber: item.erpPoNumber,
      brokerName: item.brokerName,
      partyName: item.partyName,
      materialName: item.materialName,
    })
    setIsModalOpen(true)
  }

  // Removed validation function - no fields are required anymore
  const validateForm = useCallback(() => {
    // No validation needed - all fields are optional
    return true
  }, [])

  const generateTestingNumber = async (liftNo) => {
    try {
      // Use the already fetched LAB data to find the highest testing number for this lift
      let maxTestingNumber = 0
      allLabData.forEach((row) => {
        if (row.liftNo === liftNo) {
          const testingNumber = parseInt(row.testingNumber, 10)
          if (!isNaN(testingNumber)) {
            maxTestingNumber = Math.max(maxTestingNumber, testingNumber)
          }
        }
      })

      return maxTestingNumber + 1
    } catch (error) {
      console.error("Error generating testing number:", error)
      return 1 // Default to 1 if error
    }
  }

  const uploadImageToGoogleDrive = async (file) => {
    try {
      // Convert file to base64
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result)
        reader.onerror = (error) => reject(error)
      })

      const driveFormData = new FormData()
      driveFormData.append("action", "uploadFile")
      driveFormData.append("fileName", file.name)
      driveFormData.append("mimeType", file.type)
      driveFormData.append("base64Data", base64Data)
      driveFormData.append("folderId", DRIVE_FOLDER_ID)

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: driveFormData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to upload file: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || "Failed to upload file via Apps Script")
      }
      return result.fileUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      throw error
    }
  }

  const handleSubmitReceipt = async (e) => {
    e.preventDefault()
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const testingNumber = await generateTestingNumber(formData.liftNo)
      const timestamp = new Date().toLocaleDateString("en-GB")

      // Handle photo upload
      let photoLink = ""

      if (formData.photo && formData.photo instanceof File) {
        try {
          photoLink = await uploadImageToGoogleDrive(formData.photo)
        } catch (uploadError) {
          console.error('Error uploading photo:', uploadError)
          toast.error("Photo Upload Failed", {
            description: "Could not upload photo, but continuing with form submission.",
            icon: <AlertTriangle className="h-4 w-4" />,
          })
          // Continue with empty photo link if upload fails
        }
      }

      // Prepare data for LAB sheet - store all values regardless of "Need More Testing" selection
      const labData = [
        timestamp, // A: Time stamp
        formData.liftNo, // B: Lift No.
        testingNumber, // C: Testing Number
        formData.needMoreTesting, // D: Need More Testing
        formData.feM || "", // E: Fe (M)
        formData.feT || "", // F: Fe (T)
        formData.mzPercent || "", // G: Mz%
        formData.feO || "", // H: Fe (O)
        formData.cPercent || "", // I: C%
        formData.sPercent || "", // J: S%
        formData.nmPercent || "", // K: N.M.%
        formData.lat || "", // L: LAT
        formData.fuse || "", // M: Fuse
        formData.mesh100 || "", // N: 100 Mash
        formData.mm1 || "", // O: 1 mm
        formData.mm4 || "", // P: 4 mm
        formData.kgYield5 || "", // Q: 5 Kg Yield
        formData.phPercent || "", // R: Ph%
        formData.smnPercent || "", // S: SMN%
        photoLink, // T: Photo link
      ]

      const params = new URLSearchParams({
        action: "insert",
        sheetName: LAB_SHEET_NAME,
        rowData: JSON.stringify(labData),
      })

      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server error: ${response.status}. ${errorText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || "The script indicated a failure.")
      }

      toast.success("Success!", {
        description: `Receipt recorded for Lift No. ${formData.liftNo}`,
        icon: <CheckCircle className="h-4 w-4" />,
      })

      setTimeout(() => {
        setRefreshTrigger((p) => p + 1)
      }, 1000)

      setIsModalOpen(false)
    } catch (error) {
      console.error("Error submitting receipt:", error)
      toast.error("Operation Failed", {
        description: error.message,
        icon: <XCircle className="h-4 w-4" />,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setFormErrors({})
    setFormData(initialFormData)
    setSelectedItemForReceipt(null)
  }

  // Replace the renderPendingTable function with this:
  const renderPendingTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            {PENDING_COLUMNS_META.filter(col => visiblePendingColumns[col.dataKey]).map((col) => (
              <th key={col.dataKey} className="whitespace-nowrap text-xs text-left p-2 border-b">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredPendingData.map((item) => (
            <tr key={item._id} className="hover:bg-blue-50/50 border-b">
              {PENDING_COLUMNS_META.filter(col => visiblePendingColumns[col.dataKey]).map((column) => (
                <td
                  key={column.dataKey}
                  className={`whitespace-nowrap text-xs p-2 ${column.dataKey === "liftNo" ? "font-medium text-primary" : ""
                    }`}
                >
                  {column.dataKey === "actionColumn" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenReceiptModal(item)}
                      className="h-7 px-2.5 py-1 text-xs bg-blue-100 text-blue-700 hover:bg-blue-200"
                    >
                      Receipt
                    </Button>
                  ) : column.dataKey === "physicalImage" || column.dataKey === "weightSlipImage" ? (
                    item[column.dataKey] ? (
                      <a
                        href={
                          item[column.dataKey].startsWith("http")
                            ? item[column.dataKey]
                            : `https://drive.google.com/file/d/${item[column.dataKey]}/view`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline text-xs"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">N/A</span>
                    )
                  ) : (
                    item[column.dataKey] || <span className="text-gray-400 text-xs">N/A</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Replace the renderHistoryTable function with this:
  const renderHistoryTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            {HISTORY_COLUMNS_META.filter(col => visibleHistoryColumns[col.dataKey]).map((col) => (
              <th key={col.dataKey} className="whitespace-nowrap text-xs text-left p-2 border-b">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredHistoryData.map((item) => (
            <tr key={item._id} className="hover:bg-green-50/50 border-b">
              {HISTORY_COLUMNS_META.filter(col => visibleHistoryColumns[col.dataKey]).map((column) => (
                <td
                  key={column.dataKey}
                  className={`whitespace-nowrap text-xs p-2 ${column.dataKey === "liftNo" ? "font-medium text-primary" : ""
                    }`}
                >
                  {column.dataKey === "needMoreTesting" ? (
                    <Badge variant={item[column.dataKey] === "Yes" ? "destructive" : "secondary"} className="text-xs">
                      {item[column.dataKey]}
                    </Badge>
                  ) : column.dataKey === "photo" ? (
                    item[column.dataKey] ? (
                      <a
                        href={item[column.dataKey]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline text-xs"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">N/A</span>
                    )
                  ) : (
                    item[column.dataKey] || <span className="text-gray-400 text-xs">N/A</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loadingData) {
    return (
      <div className="flex flex-col justify-center items-center py-20">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
        <p className="text-muted-foreground">Loading delivery and lab data...</p>
      </div>
    )
  }

  if (errorData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
        <p className="font-medium text-destructive">Error Loading Data</p>
        <p className="text-sm text-muted-foreground max-w-md">{errorData}</p>
      </div>
    )
  }

  return (
    <div>
      <Card className="shadow-md border-none">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          {/* Search and Refresh Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Lift No, ERP Number, Party Name, Material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              className="flex items-center gap-2 h-10 px-4"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full sm:w-[400px] grid-cols-2 mb-6">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Pending
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {filteredPendingData.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" /> Lab History
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {filteredHistoryData.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="flex-1 flex flex-col mt-0">
              <Card className="shadow-sm border border-border flex-1 flex flex-col">
                {/* // Replace the CardHeader section in the pending tab with this: */}
                <CardHeader className="py-3 px-4 bg-muted/30 flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center text-md font-semibold text-foreground">
                      <FileText className="h-5 w-5 text-primary mr-2" />
                      Pending Deliveries ({filteredPendingData.length})
                      {searchTerm && (
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          - Filtered from {pendingData.length} total
                        </span>
                      )}
                    </CardTitle>
                  </div>
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
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col">
                  {filteredPendingData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-blue-200/50 bg-blue-50/50 rounded-lg mx-4 my-4 text-center flex-1">
                      <Info className="h-12 w-12 text-blue-500 mb-3" />
                      <p className="font-medium text-foreground">
                        {searchTerm ? 'No Matching Results' : 'No Pending Deliveries'}
                      </p>
                      <p className="text-sm text-muted-foreground text-center">
                        {searchTerm ? 'Try adjusting your search terms.' : 'All deliveries have been processed.'}
                      </p>
                    </div>
                  ) : (
                    renderPendingTable()
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="flex-1 flex flex-col mt-0">
              <Card className="shadow-sm border border-border flex-1 flex flex-col">
                {/* // Replace the CardHeader section in the history tab with this: */}
                <CardHeader className="py-3 px-4 bg-muted/30 flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center text-md font-semibold text-foreground">
                      <History className="h-5 w-5 text-primary mr-2" />
                      Lab Testing History ({filteredHistoryData.length})
                      {searchTerm && (
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          - Filtered from {historyData.length} total
                        </span>
                      )}
                    </CardTitle>
                    {/* <CardDescription className="text-sm text-muted-foreground mt-0.5">
                      Data from LAB sheet columns B to T - All lab testing records
                    </CardDescription> */}
                  </div>
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
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col">
                  {filteredHistoryData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-green-200/50 bg-green-50/50 rounded-lg mx-4 my-4 text-center flex-1">
                      <Info className="h-12 w-12 text-green-500 mb-3" />
                      <p className="font-medium text-foreground">
                        {searchTerm ? 'No Matching Results' : 'No Lab Records'}
                      </p>
                      <p className="text-sm text-muted-foreground text-center">
                        {searchTerm ? 'Try adjusting your search terms.' : 'No lab testing records found.'}
                      </p>
                    </div>
                  ) : (
                    renderHistoryTable()
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Receipt Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="text-lg md:text-xl text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              Receipt Form - Lift No: {selectedItemForReceipt?.liftNo}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1 text-xs">
              ERP PO: {selectedItemForReceipt?.erpPoNumber} | Party: {selectedItemForReceipt?.partyName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2 px-1">
            {/* Pre-filled fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-foreground text-xs font-medium">Lift No.</Label>
                <Input value={formData.liftNo} disabled className="h-9 mt-1 bg-gray-100 text-xs" />
              </div>
              <div>
                <Label className="text-foreground text-xs font-medium">ERP Po Number</Label>
                <Input value={formData.erpPoNumber} disabled className="h-9 mt-1 bg-gray-100 text-xs" />
              </div>
              <div>
                <Label className="text-foreground text-xs font-medium">Broker Name</Label>
                <Input value={formData.brokerName} disabled className="h-9 mt-1 bg-gray-100 text-xs" />
              </div>
              <div>
                <Label className="text-foreground text-xs font-medium">Party Name</Label>
                <Input value={formData.partyName} disabled className="h-9 mt-1 bg-gray-100 text-xs" />
              </div>
              <div>
                <Label className="text-foreground text-xs font-medium">Material Name</Label>
                <Input value={formData.materialName} disabled className="h-9 mt-1 bg-gray-100 text-xs" />
              </div>
              <div>
                <Label className="text-foreground text-xs font-medium">Need More Testing</Label>
                <Select value={formData.needMoreTesting} onValueChange={handleSelectChange("needMoreTesting")}>
                  <SelectTrigger className="h-9 mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="Complete">Complete</SelectItem>
                    <SelectItem value="Need No Test">Need No Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Testing fields - all optional now */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { label: "Fe (M)", name: "feM" },
                { label: "Fe (T)", name: "feT" },
                { label: "Mz%", name: "mzPercent" },
                { label: "Fe (O)", name: "feO" },
                { label: "C%", name: "cPercent" },
                { label: "S%", name: "sPercent" },
                { label: "N.M.%", name: "nmPercent" },
                { label: "LAT", name: "lat" },
                { label: "Fuse", name: "fuse" },
                { label: "100 Mash", name: "mesh100" },
                { label: "1 mm", name: "mm1" },
                { label: "4 mm", name: "mm4" },
                { label: "5 Kg Yield", name: "kgYield5" },
                { label: "Ph%", name: "phPercent" },
                { label: "SMN%", name: "smnPercent" },
              ].map((field) => (
                <div key={field.name}>
                  <Label className="text-foreground text-xs font-medium">
                    {field.label}
                  </Label>
                  <Input
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleInputChange}
                    placeholder={`Enter ${field.label} (optional)`}
                    className={`h-9 mt-1 text-xs ${formErrors[field.name] ? "border-destructive" : ""}`}
                  />
                  {formErrors[field.name] && <p className="mt-1 text-xs text-destructive">{formErrors[field.name]}</p>}
                </div>
              ))}
            </div>

            {/* Photo field - optional */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="text-foreground text-xs font-medium">Photo (Optional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  name="photo"
                  onChange={handleInputChange}
                  className="h-9 mt-1 text-xs"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Select an image to upload to Google Drive folder (optional)
                </p>
              </div>
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleModalClose}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmitReceipt}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-green-600 text-white font-semibold shadow-md hover:opacity-90 transition-opacity flex items-center justify-center min-w-[100px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
