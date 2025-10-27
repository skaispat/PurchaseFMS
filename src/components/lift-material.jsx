"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Truck, FileText, Loader2, Upload, X, History, FileCheck, AlertTriangle, Eye, RefreshCw } from "lucide-react"
import { MixerHorizontalIcon } from "@radix-ui/react-icons"

// Shadcn UI components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Helper function to format timestamp
function formatTimestamp(timestampStr) {
  if (!timestampStr) return "Invalid Date"

  try {
    const date = new Date(timestampStr)
    if (isNaN(date.getTime())) return "Invalid Date"

    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  } catch (error) {
    return "Invalid Date"
  }
}

// Constants
const SHEET_ID = "19Za1BvjKvHT01rzDOPLS_MErnuEJd6__l7C_4lUgLlg"
const PO_SHEET = "PO"
const DELIVERY_SHEET = "DELIVERY"
const API_URL =
  "https://script.google.com/macros/s/AKfycbx3_COAFa1T6tCTjJT8Ip0ep7Qy83wA7ZpJteErgfzZ-gQG0Zf8Yxw6iTspQ5oGy6Q/exec"
const DRIVE_FOLDER_ID = "1QSK7aOIAzl9fzz3APGgHyYlMNJi_cS_y"

// Column Definitions for Tables - Actions column moved to first position
const PO_COLUMNS_META = [
  { header: "Actions", dataKey: "actionColumn", toggleable: false, alwaysVisible: true },
  { header: "ERP Po Number", dataKey: "erpPoNumber", toggleable: true, alwaysVisible: true },
  { header: "Indent Number", dataKey: "indentNumber", toggleable: true },
  { header: "Material Name", dataKey: "materialName", toggleable: true },
  { header: "Broker Name", dataKey: "brokerName", toggleable: true },
  { header: "Party Name", dataKey: "partyName", toggleable: true },
  { header: "Qty", dataKey: "qty", toggleable: true },
  { header: "Rate", dataKey: "rate", toggleable: true },
  { header: "Lead Time To Lift Total Qty", dataKey: "leadTime", toggleable: true },
  { header: "Po Copy", dataKey: "poCopy", toggleable: true, isLink: true, linkText: "View" },
  { header: "Transporting Type", dataKey: "transportingType", toggleable: true },
  { header: "FEM %", dataKey: "femPercent", toggleable: true },
  { header: "Yield %", dataKey: "yieldPercent", toggleable: true },
]

const DELIVERY_COLUMNS_META = [
  { header: "Lift No.", dataKey: "liftNo", toggleable: true, alwaysVisible: true },
  { header: "ERP Po Number", dataKey: "erpPoNumber", toggleable: true },
  { header: "Indent Number", dataKey: "indentNumber", toggleable: true },
  { header: "Broker Name", dataKey: "brokerName", toggleable: true },
  { header: "Party Name", dataKey: "partyName", toggleable: true },
  { header: "Material Name", dataKey: "materialName", toggleable: true },
  { header: "Qty", dataKey: "qty", toggleable: true },
  { header: "Bill Number", dataKey: "billNumber", toggleable: true },
  { header: "Truck Number", dataKey: "truckNumber", toggleable: true },
  { header: "Driver Number", dataKey: "driverNumber", toggleable: true },
  { header: "Bill Image", dataKey: "billImage", toggleable: true, isLink: true, linkText: "View Bill" },
  { header: "Transporter Name", dataKey: "transporterName", toggleable: true },
  { header: "Party Weighment Copy", dataKey: "partyWeighmentCopy", toggleable: true, isLink: true, linkText: "View" },
  { header: "Mother Bill", dataKey: "motherBill", toggleable: true, isLink: true, linkText: "View" },
]

export default function LiftMaterial() {
  // State declarations
  const [pendingPOs, setPendingPOs] = useState([])
  const [deliveryHistory, setDeliveryHistory] = useState([])
  const [selectedPO, setSelectedPO] = useState(null)
  const [loadingPOs, setLoadingPOs] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("pending")

  // Image preview states
  const [imagePreview, setImagePreview] = useState({
    billImage: null,
    partyWeighmentCopy: null,
    motherBill: null,
  })
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [currentImageSrc, setCurrentImageSrc] = useState("")
  const [currentImageTitle, setCurrentImageTitle] = useState("")

  // Form states
  const [formData, setFormData] = useState({
    indentNumber: "",
    materialName: "",
    brokerName: "",
    partyName: "",
    qty: "",
    billNumber: "",
    truckNumber: "",
    driverNumber: "",
    billImage: null,
    transporterName: "",
    partyWeighmentCopy: null,
    motherBill: null,
  })
  const [formErrors, setFormErrors] = useState({})

  // Column visibility states
  const [visiblePoColumns, setVisiblePoColumns] = useState(
    PO_COLUMNS_META.reduce((acc, col) => {
      acc[col.dataKey] = true
      return acc
    }, {})
  )

  const [visibleDeliveryColumns, setVisibleDeliveryColumns] = useState(
    DELIVERY_COLUMNS_META.reduce((acc, col) => {
      acc[col.dataKey] = true
      return acc
    }, {})
  )

  // Dropdown refs and states
  const poDropdownRef = useRef(null)
  const deliveryDropdownRef = useRef(null)
  const [isPoColumnDropdownOpen, setIsPoColumnDropdownOpen] = useState(false)
  const [isDeliveryColumnDropdownOpen, setIsDeliveryColumnDropdownOpen] = useState(false)

  // Filter data based on search term
  const filteredPOs = pendingPOs.filter(po => {
    const searchLower = searchTerm.toLowerCase()
    return (
      po.erpPoNumber?.toLowerCase().includes(searchLower) ||
      po.indentNumber?.toLowerCase().includes(searchLower) ||
      po.materialName?.toLowerCase().includes(searchLower) ||
      po.brokerName?.toLowerCase().includes(searchLower) ||
      po.partyName?.toLowerCase().includes(searchLower)
    )
  })

  const filteredDeliveries = deliveryHistory.filter(delivery => {
    const searchLower = searchTerm.toLowerCase()
    return (
      delivery.liftNo?.toLowerCase().includes(searchLower) ||
      delivery.erpPoNumber?.toLowerCase().includes(searchLower) ||
      delivery.indentNumber?.toLowerCase().includes(searchLower) ||
      delivery.brokerName?.toLowerCase().includes(searchLower) ||
      delivery.partyName?.toLowerCase().includes(searchLower) ||
      delivery.materialName?.toLowerCase().includes(searchLower)
    )
  })

  // Fetch data functions
  const fetchPendingPOs = useCallback(async () => {
    setLoadingPOs(true)
    setError(null)
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(PO_SHEET)}&range=A7:V1000`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch PO data: ${response.status}`)

      let text = await response.text()
      if (text.startsWith("google.visualization.Query.setResponse(")) {
        text = text.substring(text.indexOf("(") + 1, text.lastIndexOf(")"))
      } else {
        const jsonStart = text.indexOf("{")
        const jsonEnd = text.lastIndexOf("}")
        if (jsonStart === -1 || jsonEnd === -1) throw new Error("Invalid response format from Google Sheets for POs.")
        text = text.substring(jsonStart, jsonEnd + 1)
      }

      const data = JSON.parse(text)
      if (!data.table || !data.table.rows) {
        setPendingPOs([])
        return
      }

      const processedRows = data.table.rows
        .map((row, index) => {
          if (!row || !row.c) return null

          const getCellValue = (cellIndex) => {
            const cell = row.c && row.c[cellIndex]
            return cell && cell.v !== null && cell.v !== undefined ? String(cell.v).trim() : ""
          }

          const columnS = getCellValue(18)  // Column S (index 18)
          const columnU = getCellValue(20)  // Column U (index 20)
          const columnV = getCellValue(21)  // Column V (index 21)

          return {
            id: `po-${index + 7}`,
            rowIndex: index + 7,
            erpPoNumber: getCellValue(1), // Column B
            indentNumber: getCellValue(2), // Column C
            materialName: getCellValue(3), // Column D
            brokerName: getCellValue(4), // Column E
            partyName: getCellValue(5), // Column F
            qty: getCellValue(6), // Column G
            rate: getCellValue(7), // Column H
            leadTime: getCellValue(8), // Column I
            poCopy: getCellValue(9), // Column J
            transportingType: getCellValue(10), // Column K
            femPercent: getCellValue(11), // Column L
            yieldPercent: getCellValue(12), // Column M
            columnS: columnS,  // Store column S value
            columnU: columnU,
            columnV: columnV,
          }
        })
        .filter((row) => row !== null)

      // Updated filter: Exclude rows where column S is "Complete"
      const filteredRows = processedRows.filter(
        (row) =>
          row.columnU &&
          row.columnU !== "" &&
          (!row.columnV || row.columnV === "") &&
          row.columnS !== "Complete" &&
          row.columnS !== "complete"
      )

      setPendingPOs(filteredRows)
    } catch (error) {
      console.error("Error fetching pending POs:", error)
      setError((prev) =>
        prev ? `${prev}\nFailed to load PO data: ${error.message}` : `Failed to load PO data: ${error.message}`,
      )
      setPendingPOs([])
    } finally {
      setLoadingPOs(false)
    }
  }, [])

  const fetchDeliveryHistory = useCallback(async () => {
    setLoadingHistory(true)
    setError(null)
    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(DELIVERY_SHEET)}&range=A7:100000`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch delivery data: ${response.status}`)

      let text = await response.text()
      if (text.startsWith("google.visualization.Query.setResponse(")) {
        text = text.substring(text.indexOf("(") + 1, text.lastIndexOf(")"))
      } else {
        const jsonStart = text.indexOf("{")
        const jsonEnd = text.lastIndexOf("}")
        if (jsonStart === -1 || jsonEnd === -1)
          throw new Error("Invalid response format from Google Sheets for delivery data.")
        text = text.substring(jsonStart, jsonEnd + 1)
      }

      const data = JSON.parse(text)
      if (!data.table || !data.table.rows) {
        setDeliveryHistory([])
        return
      }

      const processedRows = data.table.rows
        .map((row, index) => {
          if (!row || !row.c) return null

          const getCellValue = (cellIndex) => {
            const cell = row.c && row.c[cellIndex]
            return cell && cell.v !== null && cell.v !== undefined ? String(cell.v).trim() : ""
          }

          return {
            id: `delivery-${index + 7}`,
            timestamp: getCellValue(0), // Column A
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
            billImage: getCellValue(11), // Column L
            transporterName: getCellValue(12), // Column M
            partyWeighmentCopy: getCellValue(13), // Column N
            motherBill: getCellValue(14), // Column O
          }
        })
        .filter((row) => row !== null && row.liftNo && row.liftNo !== "")

      setDeliveryHistory(processedRows.reverse()) // Show latest first
    } catch (error) {
      console.error("Error fetching delivery history:", error)
      setError((prev) =>
        prev
          ? `${prev}\nFailed to load delivery data: ${error.message}`
          : `Failed to load delivery data: ${error.message}`,
      )
      setDeliveryHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchPendingPOs()
    fetchDeliveryHistory()
  }, [fetchPendingPOs, fetchDeliveryHistory])

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (poDropdownRef.current && !poDropdownRef.current.contains(event.target)) {
        setIsPoColumnDropdownOpen(false)
      }
      if (deliveryDropdownRef.current && !deliveryDropdownRef.current.contains(event.target)) {
        setIsDeliveryColumnDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Column visibility handlers
  const toggleColumnVisibility = (tab, column) => {
    if (tab === 'pending') {
      setVisiblePoColumns(prev => ({
        ...prev,
        [column]: !prev[column]
      }))
    } else {
      setVisibleDeliveryColumns(prev => ({
        ...prev,
        [column]: !prev[column]
      }))
    }
  }

  const handleSelectAllColumns = (tab, checked) => {
    if (tab === 'pending') {
      const newVisibility = {}
      PO_COLUMNS_META.forEach(col => {
        newVisibility[col.dataKey] = col.alwaysVisible ? true : checked
      })
      setVisiblePoColumns(newVisibility)
    } else {
      const newVisibility = {}
      DELIVERY_COLUMNS_META.forEach(col => {
        newVisibility[col.dataKey] = col.alwaysVisible ? true : checked
      })
      setVisibleDeliveryColumns(newVisibility)
    }
  }

  // Other handlers (refresh, PO selection, form handling, etc.)
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([fetchPendingPOs(), fetchDeliveryHistory()])
    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handlePOSelect = (po) => {
    setSelectedPO(po)
    setFormData({
      indentNumber: po.indentNumber,
      materialName: po.materialName,
      brokerName: po.brokerName,
      partyName: po.partyName,
      qty: "",
      billNumber: "",
      truckNumber: "",
      driverNumber: "",
      billImage: null,
      transporterName: "",
      partyWeighmentCopy: null,
      motherBill: null,
    })
    setFormErrors({})
    setImagePreview({
      billImage: null,
      partyWeighmentCopy: null,
      motherBill: null,
    })
    setShowPopup(true)
  }

  const handleClosePopup = () => {
    setShowPopup(false)
    setSelectedPO(null)
    setFormData({
      indentNumber: "",
      materialName: "",
      brokerName: "",
      partyName: "",
      qty: "",
      billNumber: "",
      truckNumber: "",
      driverNumber: "",
      billImage: null,
      transporterName: "",
      partyWeighmentCopy: null,
      motherBill: null,
    })
    setFormErrors({})
    setImagePreview({
      billImage: null,
      partyWeighmentCopy: null,
      motherBill: null,
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null })
  }

  const handleFileUpload = (e) => {
    const { name, files } = e.target
    const file = files && files[0] ? files[0] : null
    setFormData({ ...formData, [name]: file })

    if (file && file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(prev => ({ ...prev, [name]: previewUrl }))
    } else {
      setImagePreview(prev => ({ ...prev, [name]: null }))
    }

    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null })
  }

  const handleImageView = (imageSrc, title) => {
    setCurrentImageSrc(imageSrc)
    setCurrentImageTitle(title)
    setShowImageDialog(true)
  }

  const validateForm = () => {
    const newErrors = {}
    const requiredFields = ["billNumber", "truckNumber"]

    requiredFields.forEach((field) => {
      if (!formData[field] || String(formData[field]).trim() === "") {
        newErrors[field] = `${field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} is required.`
      }
    })

    if (formData.qty && isNaN(Number.parseFloat(formData.qty))) {
      newErrors.qty = "Qty must be a valid number."
    }

    setFormErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const uploadFileToDrive = async (file) => {
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result)
        reader.onerror = (error) => reject(error)
      })

      const uploadFormData = new FormData()
      uploadFormData.append("action", "uploadFile")
      uploadFormData.append("fileName", file.name)
      uploadFormData.append("mimeType", file.type)
      uploadFormData.append("base64Data", base64Data.split(",")[1])
      uploadFormData.append("folderId", DRIVE_FOLDER_ID)

      const response = await fetch(API_URL, { method: "POST", body: uploadFormData })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Drive upload failed: ${response.status}. ${errorText}`)
      }
      const result = await response.json()
      if (!result.success) throw new Error(result.message || "Failed to upload file via Apps Script")
      return result.fileUrl
    } catch (error) {
      console.error("Error uploading file to Google Drive:", error)
      throw error
    }
  }

  const generateLiftNumber = async () => {
    try {
      let maxLiftNum = 0
      if (Array.isArray(deliveryHistory)) {
        deliveryHistory.forEach((delivery) => {
          if (delivery && typeof delivery.liftNo === "string" && delivery.liftNo.startsWith("LF-")) {
            const numPart = Number.parseInt(delivery.liftNo.substring(3), 10)
            if (!isNaN(numPart) && numPart > maxLiftNum) maxLiftNum = numPart
          }
        })
      }
      return `LF-${String(maxLiftNum + 1).padStart(3, "0")}`
    } catch (error) {
      console.error("Error generating lift number:", error)
      return `LF-001`
    }
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!selectedPO) {
      alert("No Purchase Order selected.")
      return
    }
    if (!validateForm()) {
      alert("Please fill all required fields correctly.")
      return
    }

    setIsSubmitting(true)
    try {
      const liftNo = await generateLiftNumber()
      const now = new Date()
      const timestamp = now
        .toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
        .replace(",", "")

      // Upload files
      let billImageUrl = ""
      let partyWeighmentCopyUrl = ""
      let motherBillUrl = ""

      if (formData.billImage) {
        billImageUrl = await uploadFileToDrive(formData.billImage)
      }
      if (formData.partyWeighmentCopy) {
        partyWeighmentCopyUrl = await uploadFileToDrive(formData.partyWeighmentCopy)
      }
      if (formData.motherBill) {
        motherBillUrl = await uploadFileToDrive(formData.motherBill)
      }

      // Prepare DELIVERY sheet data
      const deliveryRowData = [
        timestamp, // Column A
        liftNo, // Column B
        selectedPO.erpPoNumber, // Column C
        formData.indentNumber, // Column D
        formData.brokerName, // Column E
        formData.partyName, // Column F
        formData.materialName, // Column G
        formData.qty, // Column H
        formData.billNumber, // Column I
        formData.truckNumber, // Column J
        formData.driverNumber, // Column K
        billImageUrl, // Column L
        formData.transporterName, // Column M
        partyWeighmentCopyUrl, // Column N
        motherBillUrl, // Column O
      ]

      // Add to DELIVERY sheet
      const deliveryParams = new URLSearchParams({
        action: "insert",
        sheetName: DELIVERY_SHEET,
        rowData: JSON.stringify(deliveryRowData),
      })
      const deliveryResponse = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: deliveryParams.toString(),
      })
      if (!deliveryResponse.ok) throw new Error(`DELIVERY insert failed: ${deliveryResponse.status}`)
      const deliveryResult = await deliveryResponse.json()
      if (!deliveryResult.success) throw new Error(deliveryResult.message || "Failed to update DELIVERY sheet")

      // Update local state
      const newDelivery = {
        id: `delivery-new-${Date.now()}`,
        timestamp: timestamp,
        liftNo: liftNo,
        erpPoNumber: selectedPO.erpPoNumber,
        indentNumber: formData.indentNumber,
        brokerName: formData.brokerName,
        partyName: formData.partyName,
        materialName: formData.materialName,
        qty: formData.qty,
        billNumber: formData.billNumber,
        truckNumber: formData.truckNumber,
        driverNumber: formData.driverNumber,
        billImage: billImageUrl,
        transporterName: formData.transporterName,
        partyWeighmentCopy: partyWeighmentCopyUrl,
        motherBill: motherBillUrl,
      }

      setDeliveryHistory((prevHistory) => [newDelivery, ...prevHistory])
      setPendingPOs((prevPOs) => prevPOs.filter((po) => po.id !== selectedPO.id))

      handleClosePopup()
      alert(`Material Lift ${liftNo} created successfully.`)
    } catch (error) {
      console.error("Error submitting form:", error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render helpers
  const renderCell = (item, column) => {
    const value = item[column.dataKey]
    if (column.isLink) {
      return value ? (
        <a
          href={String(value).startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium text-xs"
        >
          {column.linkText || "View"}
        </a>
      ) : (
        <span className="text-gray-400 text-xs">N/A</span>
      )
    }
    return value || (value === 0 ? "0" : <span className="text-xs text-gray-400">N/A</span>)
  }

  const renderFileUploadSection = (fieldName, label) => {
    const hasFile = formData[fieldName]
    const hasPreview = imagePreview[fieldName]

    return (
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={fieldName}>
          {label}
        </Label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 transition-colors">
          <div className="space-y-1 text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-400" />
            <div className="flex text-sm text-gray-600 justify-center">
              <Label
                htmlFor={fieldName}
                className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 px-1"
              >
                <span>Upload</span>
                <Input
                  id={fieldName}
                  name={fieldName}
                  type="file"
                  className="sr-only"
                  onChange={handleFileUpload}
                  accept="image/*,.pdf"
                />
              </Label>
            </div>
            <p className="text-xs text-gray-500">
              {hasFile ? formData[fieldName].name : "PNG, JPG, PDF"}
            </p>
            {hasPreview && (
              <div className="mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleImageView(hasPreview, label)}
                  className="text-xs h-7 px-2 py-1 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Card className="shadow-md border-none">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            {/* Header section with search and refresh */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <TabsList className="grid w-full sm:w-[450px] grid-cols-2">
                <TabsTrigger value="pending" className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4" /> Pending
                  <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                    {filteredPOs.length}/{pendingPOs.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" /> History
                  <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                    {filteredDeliveries.length}/{deliveryHistory.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1 max-w-md">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    placeholder="Search POs or deliveries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 h-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  size="sm"
                  variant="outline"
                  className="h-10 px-3 py-2 flex items-center gap-2 whitespace-nowrap"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>

            {/* Pending POs Tab */}
            <TabsContent value="pending" className="flex-1 flex flex-col mt-0">
              <Card className="shadow-sm border border-border flex-1 flex flex-col">
                <CardHeader className="py-3 px-4 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center text-md font-semibold text-foreground">
                        <FileCheck className="h-5 w-5 text-primary mr-2" />
                        Pending Purchase Orders ({pendingPOs.length})
                      </CardTitle>
                    </div>
                    <div className="relative" ref={poDropdownRef}>
                      <button
                        onClick={() => setIsPoColumnDropdownOpen(!isPoColumnDropdownOpen)}
                        className="flex items-center justify-between border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[120px] text-sm"
                      >
                        <span>Columns</span>
                        <svg
                          className={`ml-2 h-4 w-4 transition-transform ${isPoColumnDropdownOpen ? 'rotate-180' : ''}`}
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
                      </button>

                      {isPoColumnDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                          <div className="p-2">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                              <button
                                onClick={() => handleSelectAllColumns('pending', true)}
                                className="text-xs text-indigo-600 hover:text-indigo-800"
                              >
                                Select All
                              </button>
                              <span className="text-gray-300 mx-1">|</span>
                              <button
                                onClick={() => handleSelectAllColumns('pending', false)}
                                className="text-xs text-indigo-600 hover:text-indigo-800"
                              >
                                Deselect All
                              </button>
                            </div>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {PO_COLUMNS_META.map((column) => (
                                <div
                                  key={column.dataKey}
                                  className="flex items-center px-3 py-2 hover:bg-gray-100 rounded cursor-pointer"
                                  onClick={() => !column.alwaysVisible && toggleColumnVisibility('pending', column.dataKey)}
                                >
                                  <input
                                    type="checkbox"
                                    checked={visiblePoColumns[column.dataKey]}
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
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col">
                  {loadingPOs ? (
                    <div className="flex flex-col justify-center items-center py-8 flex-1">
                      <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                      <p className="text-muted-foreground ml-2">Loading Purchase Orders...</p>
                    </div>
                  ) : error && pendingPOs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center flex-1">
                      <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
                      <p className="font-medium text-destructive">Error Loading POs</p>
                      <p className="text-sm text-muted-foreground max-w-md">
                        {error.split("\n").find((line) => line.includes("PO data")) || error}
                      </p>
                    </div>
                  ) : pendingPOs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-blue-200/50 bg-blue-50/50 rounded-lg mx-4 my-4 text-center flex-1">
                      <FileText className="h-12 w-12 text-blue-500 mb-3" />
                      <p className="font-medium text-foreground">No Pending POs Found</p>
                      <p className="text-sm text-muted-foreground text-center">
                        No purchase orders are ready for material lifting.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-b-lg flex-1">
                      <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-20">
                          <TableRow>
                            {PO_COLUMNS_META.filter(col => visiblePoColumns[col.dataKey]).map((col) => (
                              <TableHead key={col.dataKey} className="whitespace-nowrap text-xs">
                                {col.header}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPOs.map((po) => (
                            <TableRow key={po.id} className="hover:bg-blue-50/50">
                              {PO_COLUMNS_META.filter(col => visiblePoColumns[col.dataKey]).map((column) => (
                                <TableCell
                                  key={column.dataKey}
                                  className={`whitespace-nowrap text-xs ${column.dataKey === "erpPoNumber" ? "font-medium text-primary" : "text-gray-700"} ${column.dataKey === "materialName" || column.dataKey === "partyName" ? "truncate max-w-[150px]" : ""}`}
                                >
                                  {column.dataKey === "actionColumn" ? (
                                    <Button
                                      onClick={() => handlePOSelect(po)}
                                      size="xs"
                                      variant="default"
                                      disabled={isSubmitting}
                                      className="h-7 px-3 py-1 text-xs bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium shadow-sm transition-all duration-200 hover:shadow-md"
                                    >
                                      Lift
                                    </Button>
                                  ) : (
                                    renderCell(po, column)
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Delivery History Tab */}
            <TabsContent value="history" className="flex-1 flex flex-col mt-0">
              <Card className="shadow-sm border border-border flex-1 flex flex-col">
                <CardHeader className="py-3 px-4 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center text-md font-semibold text-foreground">
                        <History className="h-5 w-5 text-primary mr-2" />
                        Delivery History ({deliveryHistory.length})
                      </CardTitle>
                      <CardDescription className="text-sm text-muted-foreground mt-0.5">
                        All completed material lifting records.
                      </CardDescription>
                    </div>
                    <div className="relative" ref={deliveryDropdownRef}>
                      <button
                        onClick={() => setIsDeliveryColumnDropdownOpen(!isDeliveryColumnDropdownOpen)}
                        className="flex items-center justify-between border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[120px] text-sm"
                      >
                        <span>Columns</span>
                        <svg
                          className={`ml-2 h-4 w-4 transition-transform ${isDeliveryColumnDropdownOpen ? 'rotate-180' : ''}`}
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
                      </button>

                      {isDeliveryColumnDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                          <div className="p-2">
                            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                              <button
                                onClick={() => handleSelectAllColumns('history', true)}
                                className="text-xs text-indigo-600 hover:text-indigo-800"
                              >
                                Select All
                              </button>
                              <span className="text-gray-300 mx-1">|</span>
                              <button
                                onClick={() => handleSelectAllColumns('history', false)}
                                className="text-xs text-indigo-600 hover:text-indigo-800"
                              >
                                Deselect All
                              </button>
                            </div>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {DELIVERY_COLUMNS_META.map((column) => (
                                <div
                                  key={column.dataKey}
                                  className="flex items-center px-3 py-2 hover:bg-gray-100 rounded cursor-pointer"
                                  onClick={() => !column.alwaysVisible && toggleColumnVisibility('history', column.dataKey)}
                                >
                                  <input
                                    type="checkbox"
                                    checked={visibleDeliveryColumns[column.dataKey]}
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
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col">
                  {loadingHistory ? (
                    <div className="flex flex-col justify-center items-center py-8 flex-1">
                      <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
                      <p className="text-muted-foreground ml-2">Loading Delivery History...</p>
                    </div>
                  ) : error && deliveryHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center flex-1">
                      <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
                      <p className="font-medium text-destructive">Error Loading History</p>
                      <p className="text-sm text-muted-foreground max-w-md">
                        {error.split("\n").find((line) => line.includes("delivery data")) || error}
                      </p>
                    </div>
                  ) : deliveryHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-blue-200/50 bg-blue-50/50 rounded-lg mx-4 my-4 text-center flex-1">
                      <Truck className="h-12 w-12 text-blue-500 mb-3" />
                      <p className="font-medium text-foreground">No Delivery Records Found</p>
                      <p className="text-sm text-muted-foreground text-center">
                        Complete material lifts will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-b-lg flex-1">
                      <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-20">
                          <TableRow>
                            {DELIVERY_COLUMNS_META.filter(col => visibleDeliveryColumns[col.dataKey]).map((col) => (
                              <TableHead key={col.dataKey} className="whitespace-nowrap text-xs">
                                {col.header}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDeliveries.map((delivery) => (
                            <TableRow key={delivery.id} className="hover:bg-blue-50/50">
                              {DELIVERY_COLUMNS_META.filter(col => visibleDeliveryColumns[col.dataKey]).map(
                                (column) => (
                                  <TableCell
                                    key={column.dataKey}
                                    className={`whitespace-nowrap text-xs ${column.dataKey === "liftNo" ? "font-medium text-primary" : "text-gray-700"} ${column.dataKey === "materialName" || column.dataKey === "partyName" || column.dataKey === "transporterName" ? "truncate max-w-[150px]" : ""}`}
                                  >
                                    {renderCell(delivery, column)}
                                  </TableCell>
                                ),
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Lift Form Modal */}
      {showPopup && selectedPO && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl">
            <CardHeader className="px-7 py-5 bg-gray-50 border-b border-gray-200 flex justify-between items-center rounded-t-xl">
              <CardTitle className="font-semibold text-lg text-gray-800">
                Lift for PO Number  <span className="text-blue-600">{selectedPO.erpPoNumber}</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClosePopup}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-7 space-y-6 overflow-y-auto scrollbar-hide">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                  {/* Pre-filled fields */}
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Indent Number</Label>
                    <Input value={formData.indentNumber} readOnly className="bg-gray-100" />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Material Name</Label>
                    <Input value={formData.materialName} readOnly className="bg-gray-100" />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Broker Name</Label>
                    <Input value={formData.brokerName} readOnly className="bg-gray-100" />
                  </div>

                  {/* User input fields */}
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Party Name</Label>
                    <Input value={formData.partyName} readOnly className="bg-gray-100" />
                  </div>

                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="qty">
                      Qty
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      id="qty"
                      name="qty"
                      value={formData.qty}
                      onChange={handleInputChange}
                      className={formErrors.qty ? "border-red-500" : "border-gray-300"}
                      placeholder="Enter quantity"
                    />
                    {formErrors.qty && <p className="mt-1 text-xs text-red-600">{formErrors.qty}</p>}
                  </div>

                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="billNumber">
                      Bill Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="billNumber"
                      name="billNumber"
                      value={formData.billNumber}
                      onChange={handleInputChange}
                      className={formErrors.billNumber ? "border-red-500" : "border-gray-300"}
                      placeholder="Enter bill number"
                    />
                    {formErrors.billNumber && <p className="mt-1 text-xs text-red-600">{formErrors.billNumber}</p>}
                  </div>

                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="truckNumber">
                      Truck Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="truckNumber"
                      name="truckNumber"
                      value={formData.truckNumber}
                      onChange={handleInputChange}
                      className={formErrors.truckNumber ? "border-red-500" : "border-gray-300"}
                      placeholder="Enter truck number"
                    />
                    {formErrors.truckNumber && <p className="mt-1 text-xs text-red-600">{formErrors.truckNumber}</p>}
                  </div>

                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="driverNumber">
                      Driver Number <span className="text-red-500"></span>
                    </Label>
                    <Input
                      id="driverNumber"
                      name="driverNumber"
                      value={formData.driverNumber}
                      onChange={handleInputChange}
                      className={formErrors.driverNumber ? "border-red-500" : "border-gray-300"}
                      placeholder="Enter driver number"
                    />
                    {formErrors.driverNumber && <p className="mt-1 text-xs text-red-600">{formErrors.driverNumber}</p>}
                  </div>

                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="transporterName">
                      Transporter Name <span className="text-red-500"></span>
                    </Label>
                    <Input
                      id="transporterName"
                      name="transporterName"
                      value={formData.transporterName}
                      onChange={handleInputChange}
                      className={formErrors.transporterName ? "border-red-500" : "border-gray-300"}
                      placeholder="Enter transporter name"
                    />
                    {formErrors.transporterName && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.transporterName}</p>
                    )}
                  </div>
                </div>

                {/* File upload sections */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  {renderFileUploadSection("billImage", "Bill Image")}
                  {renderFileUploadSection("partyWeighmentCopy", "Party Weighment Copy")}
                  {renderFileUploadSection("motherBill", "Mother Bill")}
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* Image Preview Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-lg font-semibold">
              {currentImageTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-4">
            {currentImageSrc && (
              <div className="flex justify-center">
                <img
                  src={currentImageSrc}
                  alt={currentImageTitle}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
