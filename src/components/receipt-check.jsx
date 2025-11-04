"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Package, FileText, Loader2, Upload, History, FileCheck, AlertTriangle, ExternalLink, Eye } from "lucide-react"
import { MixerHorizontalIcon } from "@radix-ui/react-icons"

// Shadcn UI components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// Constants
const SHEET_ID = "19Za1BvjKvHT01rzDOPLS_MErnuEJd6__l7C_4lUgLlg"
const DELIVERY_SHEET = "DELIVERY"
const SKA_API_URL = "https://script.google.com/macros/s/AKfycbx3_COAFa1T6tCTjJT8Ip0ep7Qy83wA7ZpJteErgfzZ-gQG0Zf8Yxw6iTspQ5oGy6Q/exec"
const FMS_SHEET_ID = "1RWxBXCtaZI6Ho05-8LpLzXK3vFDMGU7zS9h6kqXXN_Y"
const FMS_SHEET_NAME = "FMS"
const API_URL =
  "https://script.google.com/macros/s/AKfycbx3taDYQb8l6sT5pUieAHf6ODLCBa8EHKHnry61FeIFPovae8qkOsKIj4tzZ-waXrKjKw/exec"
const DRIVE_FOLDER_ID = "1nB9vOp4dkazFpr95wIbgw1rZtzj6L6Cg"

// Column Definitions for Pending Table - Action moved to first position
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
  { header: "Bill Image", dataKey: "billImage", toggleable: true, isLink: true, linkText: "View" },
  { header: "Transporter Name", dataKey: "transporterName", toggleable: true },
  { header: "Party Weighment Copy", dataKey: "partyWeighmentCopy", toggleable: true, isLink: true, linkText: "View" },
  { header: "Mother Bill", dataKey: "motherBill", toggleable: true, isLink: true, linkText: "View" },
]

// Column Definitions for History Table - Added Action column at beginning
const HISTORY_COLUMNS_META = [
  { header: "Action", dataKey: "actionColumn", toggleable: false, alwaysVisible: true },
  { header: "Lift No.", dataKey: "liftNo", toggleable: true, alwaysVisible: true },
  { header: "ERP Po Number", dataKey: "erpPoNumber", toggleable: true },
  { header: "Broker Name", dataKey: "brokerName", toggleable: true },
  { header: "Party Name", dataKey: "partyName", toggleable: true },
  { header: "Material Name", dataKey: "materialName", toggleable: true },
  { header: "Qty", dataKey: "qty", toggleable: true },
  { header: "Physical Condition", dataKey: "physicalCondition", toggleable: true },
  { header: "Qty Difference", dataKey: "qtyDifference", toggleable: true },
  {
    header: "Physical Image Of Product",
    dataKey: "physicalImageOfProduct",
    toggleable: true,
    isLink: true,
    linkText: "View",
  },
  { header: "Image Of Weight Slip", dataKey: "imageOfWeightSlip", toggleable: true, isLink: true, linkText: "View" },
]

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

export default function DeliveryManagement() {
  // Original data states (never modified by search)
  const [originalPendingDeliveries, setOriginalPendingDeliveries] = useState([])
  const [originalHistoryDeliveries, setOriginalHistoryDeliveries] = useState([])

  // Display data states (filtered by search)
  const [pendingDeliveries, setPendingDeliveries] = useState([])
  const [historyDeliveries, setHistoryDeliveries] = useState([])

  const [fmsData, setFmsData] = useState([]) // New state for FMS sheet data
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [loadingPending, setLoadingPending] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [loadingFms, setLoadingFms] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [error, setError] = useState(null)

  // Search state
  const [searchTerm, setSearchTerm] = useState("")

  // Image preview states
  const [imagePreview, setImagePreview] = useState({
    physicalImageOfProduct: null,
    imageOfWeightSlip: null,
  })
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [currentImageSrc, setCurrentImageSrc] = useState("")
  const [currentImageTitle, setCurrentImageTitle] = useState("")

  // Return form state
  const [returnFormData, setReturnFormData] = useState({
    liftNo: "",
    qty: "",
    returnReason: ""
  })

  const [formData, setFormData] = useState({
    liftNo: "",
    erpPoNumber: "",
    brokerName: "",
    partyName: "",
    materialName: "",
    qty: "",
    physicalCondition: "Good",
    qtyDifference: "",
    physicalImageOfProduct: null,
    imageOfWeightSlip: null,
  })
  const [formErrors, setFormErrors] = useState({})

  const [activeTab, setActiveTab] = useState("pending")

  // Column visibility states
  const [visiblePendingColumns, setVisiblePendingColumns] = useState({})
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState({})

  // Dropdown visibility states
  const [isPendingColumnDropdownOpen, setIsPendingColumnDropdownOpen] = useState(false)
  const [isHistoryColumnDropdownOpen, setIsHistoryColumnDropdownOpen] = useState(false)

  const [returnedItems, setReturnedItems] = useState(new Set());

  // Refs for dropdown elements
  const pendingDropdownRef = useRef(null)
  const historyDropdownRef = useRef(null)

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

  // Filter deliveries based on search term
  const filterDeliveries = useCallback((deliveries, searchTerm) => {
    if (!searchTerm.trim()) return deliveries

    const lowerSearchTerm = searchTerm.toLowerCase()
    return deliveries.filter(item =>
      Object.values(item).some(
        val => val && val.toString().toLowerCase().includes(lowerSearchTerm)
      )
    )
  }, [])

  // Update filtered data when search term or original data changes
  useEffect(() => {
    setPendingDeliveries(filterDeliveries(originalPendingDeliveries, searchTerm))
  }, [originalPendingDeliveries, searchTerm, filterDeliveries])

  useEffect(() => {
    setHistoryDeliveries(filterDeliveries(originalHistoryDeliveries, searchTerm))
  }, [originalHistoryDeliveries, searchTerm, filterDeliveries])

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }

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

  const shouldReturnButtonBeRed = (liftNo) => {
    // Check if this item has been returned in the current session
    if (returnedItems.has(liftNo)) {
      return true;
    }

    // Check FMS data for planned returns
    const matchedFmsRow = fmsData.find(row => row.liftNo === liftNo);
    return matchedFmsRow && matchedFmsRow.planned1 && matchedFmsRow.planned1.trim() !== "";
  }
  // Fetch FMS data function
  const fetchFmsData = useCallback(async () => {
    setLoadingFms(true)
    try {
      const url = `https://docs.google.com/spreadsheets/d/${FMS_SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(FMS_SHEET_NAME)}`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Failed to fetch FMS data: ${response.status}`)

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
        setFmsData([])
        return
      }

      const processedFmsRows = data.table.rows
        .map((row, index) => {
          if (!row || !row.c) return null

          const getCellValue = (cellIndex) => {
            const cell = row.c && row.c[cellIndex]
            return cell && cell.v !== null && cell.v !== undefined ? String(cell.v).trim() : ""
          }

          return {
            id: `fms-${index}`,
            liftNo: getCellValue(2), // Column C - Lift No
            planned1: getCellValue(8), // Column I - Planned 1
          }
        })
        .filter((row) => row !== null && row.liftNo !== "")

      setFmsData(processedFmsRows)
    } catch (error) {
      console.error("Error fetching FMS data:", error)
      setFmsData([])
    } finally {
      setLoadingFms(false)
    }
  }, [])


  const fetchDeliveryData = useCallback(async () => {
    setLoadingPending(true)
    setLoadingHistory(true)
    setError(null)

    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(DELIVERY_SHEET)}&range=A7:V100000`
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
        setOriginalPendingDeliveries([])
        setOriginalHistoryDeliveries([])
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
            billImage: getCellValue(11), // Column L
            transporterName: getCellValue(12), // Column M
            partyWeighmentCopy: getCellValue(13), // Column N
            motherBill: getCellValue(14), // Column O
            columnP: getCellValue(15), // Column P
            columnQ: getCellValue(16), // Column Q
            physicalCondition: getCellValue(18), // Column S
            qtyDifference: getCellValue(19), // Column T
            physicalImageOfProduct: getCellValue(20), // Column U
            imageOfWeightSlip: getCellValue(21), // Column V
          }
        })
        .filter((row) => row !== null)

      // Filter for Pending: Column P not null and Column Q null
      const pendingRows = processedRows.filter(
        (row) => row.columnP && row.columnP !== "" && (!row.columnQ || row.columnQ === ""),
      )

      // Filter for History: Column P not null and Column Q not null
      const historyRows = processedRows.filter(
        (row) => row.columnP && row.columnP !== "" && row.columnQ && row.columnQ !== "",
      )

      // Update original data states
      setOriginalPendingDeliveries(pendingRows)
      setOriginalHistoryDeliveries(historyRows.reverse()) // Show latest first
    } catch (error) {
      console.error("Error fetching delivery data:", error)
      setError(`Failed to load delivery data: ${error.message}`)
      setOriginalPendingDeliveries([])
      setOriginalHistoryDeliveries([])
    } finally {
      setLoadingPending(false)
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    fetchDeliveryData()
    fetchFmsData()
  }, [fetchDeliveryData, fetchFmsData])

  const handleReceiptClick = (delivery) => {
    setSelectedDelivery(delivery)
    setFormData({
      liftNo: delivery.liftNo,
      erpPoNumber: delivery.erpPoNumber,
      brokerName: delivery.brokerName,
      partyName: delivery.partyName,
      materialName: delivery.materialName,
      qty: delivery.qty,
      physicalCondition: "Good",
      qtyDifference: "",
      physicalImageOfProduct: null,
      imageOfWeightSlip: null,
    })
    setFormErrors({})
    setImagePreview({
      physicalImageOfProduct: null,
      imageOfWeightSlip: null,
    })
    setShowPopup(true)
  }

  const handleReturnClick = (delivery) => {
    setSelectedDelivery(delivery)
    setReturnFormData({
      liftNo: delivery.liftNo,
      qty: delivery.qty,
      returnReason: ""
    })
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
      qty: "",
      physicalCondition: "Good",
      qtyDifference: "",
      physicalImageOfProduct: null,
      imageOfWeightSlip: null,
    })
    setReturnFormData({
      liftNo: "",
      qty: "",
      returnReason: ""
    })
    setFormErrors({})
    setImagePreview({
      physicalImageOfProduct: null,
      imageOfWeightSlip: null,
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null })
  }

  const handleReturnInputChange = (e) => {
    const { name, value } = e.target
    setReturnFormData({ ...returnFormData, [name]: value })
  }

  const handleSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value })
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null })
  }

  const [uploadingImages, setUploadingImages] = useState({
    physicalImageOfProduct: false,
    imageOfWeightSlip: false
  })

  const handleFileUpload = (e) => {
    const { name, files } = e.target
    const file = files && files[0] ? files[0] : null
    setFormData({ ...formData, [name]: file })

    // Create preview URL for images only (PDFs won't have preview)
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
    const requiredFields = ["physicalCondition", "qtyDifference"]

    requiredFields.forEach((field) => {
      if (!formData[field] || String(formData[field]).trim() === "") {
        newErrors[field] = `${field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} is required.`
      }
    })

    if (formData.qtyDifference && isNaN(Number.parseFloat(formData.qtyDifference))) {
      newErrors.qtyDifference = "Qty Difference must be a valid number."
    }

    setFormErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateReturnForm = () => {
    if (!returnFormData.returnReason || returnFormData.returnReason.trim() === "") {
      alert("Please enter a return reason.")
      return false
    }
    return true
  }

  const uploadFileToDrive = async (file) => {
    try {
      console.log(`Starting upload for file: ${file.name}`)

      // Read file as base64 string
      const base64String = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          // Remove the data URL prefix (e.g., "data:image/png;base64,")
          const base64Data = reader.result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });

      console.log(`File converted to base64, size: ${base64String.length} characters`)

      // Create URLSearchParams for the upload request
      const params = new URLSearchParams();
      params.append('action', 'uploadFile');
      params.append('fileName', file.name);
      params.append('mimeType', file.type);
      params.append('base64Data', base64String);
      params.append('folderId', DRIVE_FOLDER_ID); // Add folder ID to store files in specific folder

      console.log(`Uploading to folder: ${DRIVE_FOLDER_ID}`)

      const response = await fetch(SKA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      console.log(`Upload response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Upload failed: ${response.status}. ${errorText}`);
        throw new Error(`Drive upload failed: ${response.status}. ${errorText}`);
      }

      const result = await response.json();
      console.log('Upload result:', result);

      if (!result.success) {
        throw new Error(result.message || "Failed to upload file via Apps Script");
      }

      console.log(`File uploaded successfully: ${result.fileUrl}`)
      return result.fileUrl;
    } catch (error) {
      console.error("Error uploading file to Google Drive:", error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  };

  // const handleSubmit = async (e) => {
  //   if (e) e.preventDefault()
  //   if (!selectedDelivery) {
  //     alert("No delivery selected.")
  //     return
  //   }
  //   if (!validateForm()) {
  //     alert("Please fill all required fields correctly.")
  //     return
  //   }

  //   setIsSubmitting(true)
  //   try {
  //     const now = new Date()
  //     const timestamp = now
  //       .toLocaleString("en-GB", {
  //         day: "2-digit",
  //         month: "2-digit",
  //         year: "numeric",
  //         hour: "2-digit",
  //         minute: "2-digit",
  //         second: "2-digit",
  //         hour12: false,
  //       })
  //       .replace(",", "")

  //     // Upload images if they exist
  //     let physicalImageUrl = ""
  //     let weightSlipImageUrl = ""

  //     if (formData.physicalImageOfProduct) {
  //       console.log("Uploading physical image...")
  //       setUploadingImages(prev => ({ ...prev, physicalImageOfProduct: true }))
  //       physicalImageUrl = await uploadFileToDrive(formData.physicalImageOfProduct)
  //       setUploadingImages(prev => ({ ...prev, physicalImageOfProduct: false }))
  //     }

  //     if (formData.imageOfWeightSlip) {
  //       console.log("Uploading weight slip file...")
  //       setUploadingImages(prev => ({ ...prev, imageOfWeightSlip: true }))
  //       weightSlipImageUrl = await uploadFileToDrive(formData.imageOfWeightSlip)
  //       setUploadingImages(prev => ({ ...prev, imageOfWeightSlip: false }))
  //     }

  //     console.log("File uploads completed:", {
  //       physicalImageUrl,
  //       weightSlipImageUrl
  //     })

  //     // Prepare update data for the existing row
  //     const updateRowData = Array(22).fill("") // Assuming 22 columns (A to V)

  //     // Keep existing data and update specific columns
  //     updateRowData[16] = timestamp // Column Q - Actual 1 (timestamp)
  //     updateRowData[18] = formData.physicalCondition // Column S - Physical Condition
  //     updateRowData[19] = formData.qtyDifference // Column T - Qty Difference
  //     updateRowData[20] = physicalImageUrl // Column U - Physical Image Of Product
  //     updateRowData[21] = weightSlipImageUrl // Column V - Image Of Weight Slip

  //     console.log("Updating sheet with data:", updateRowData)

  //     // Use direct iframe approach for fastest submission
  //     const iframe = document.createElement('iframe')
  //     iframe.style.display = 'none'
  //     iframe.name = 'hiddenFrame'
  //     document.body.appendChild(iframe)

  //     const form = document.createElement('form')
  //     form.method = 'POST'
  //     form.action = SKA_API_URL
  //     form.target = 'hiddenFrame'
  //     form.style.display = 'none'

  //     // Add form fields
  //     const actionField = document.createElement('input')
  //     actionField.type = 'hidden'
  //     actionField.name = 'action'
  //     actionField.value = 'update'
  //     form.appendChild(actionField)

  //     const sheetField = document.createElement('input')
  //     sheetField.type = 'hidden'
  //     sheetField.name = 'sheetName'
  //     sheetField.value = DELIVERY_SHEET
  //     form.appendChild(sheetField)

  //     const rowField = document.createElement('input')
  //     rowField.type = 'hidden'
  //     rowField.name = 'rowIndex'
  //     rowField.value = selectedDelivery.rowIndex
  //     form.appendChild(rowField)

  //     const dataField = document.createElement('input')
  //     dataField.type = 'hidden'
  //     dataField.name = 'rowData'
  //     dataField.value = JSON.stringify(updateRowData)
  //     form.appendChild(dataField)

  //     // Submit form
  //     document.body.appendChild(form)
  //     form.submit()

  //     // Clean up
  //     setTimeout(() => {
  //       if (document.body.contains(form)) document.body.removeChild(form)
  //       if (document.body.contains(iframe)) document.body.removeChild(iframe)
  //     }, 500)

  //     // Show success immediately and close popup
  //     setTimeout(() => {
  //       handleClosePopup()
  //       alert(`Receipt recorded successfully for ${selectedDelivery.liftNo}.`)

  //       // Force refresh data and switch to history tab
  //       setLoadingPending(true)
  //       setLoadingHistory(true)
  //       fetchDeliveryData().then(() => {
  //         setActiveTab("history")
  //       })
  //     }, 1500)

  //   } catch (error) {
  //     console.error("Error submitting form:", error)
  //     alert(`Error: ${error.message}`)
  //   } finally {
  //     setIsSubmitting(false)
  //     setUploadingImages({
  //       physicalImageOfProduct: false,
  //       imageOfWeightSlip: false
  //     })
  //   }
  // }


  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!selectedDelivery) {
      alert("No delivery selected.");
      return;
    }
    if (!validateForm()) {
      alert("Please fill all required fields correctly.");
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
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
        .replace(",", "");

      // Upload images if they exist
      let physicalImageUrl = "";
      let weightSlipImageUrl = "";

      if (formData.physicalImageOfProduct) {
        setUploadingImages((prev) => ({
          ...prev,
          physicalImageOfProduct: true,
        }));
        physicalImageUrl = await uploadFileToDrive(
          formData.physicalImageOfProduct
        );
        setUploadingImages((prev) => ({
          ...prev,
          physicalImageOfProduct: false,
        }));
      }

      if (formData.imageOfWeightSlip) {
        setUploadingImages((prev) => ({ ...prev, imageOfWeightSlip: true }));
        weightSlipImageUrl = await uploadFileToDrive(
          formData.imageOfWeightSlip
        );
        setUploadingImages((prev) => ({ ...prev, imageOfWeightSlip: false }));
      }

      // Prepare update data for the existing row
      const updateRowData = Array(22).fill(""); // Assuming 22 columns (A to V)

      // Keep existing data and update specific columns
      updateRowData[16] = timestamp; // Column Q - Actual 1 (timestamp)
      updateRowData[18] = formData.physicalCondition; // Column S - Physical Condition
      updateRowData[19] = formData.qtyDifference; // Column T - Qty Difference
      updateRowData[20] = physicalImageUrl; // Column U - Physical Image Of Product
      updateRowData[21] = weightSlipImageUrl; // Column V - Image Of Weight Slip

      // Use proper fetch with async/await
      const response = await fetch(SKA_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          action: "update",
          sheetName: DELIVERY_SHEET,
          rowIndex: selectedDelivery.rowIndex,
          rowData: JSON.stringify(updateRowData),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update row: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "Failed to update delivery");
      }

      // Show success and close popup
      handleClosePopup();
      alert(`Receipt recorded successfully for ${selectedDelivery.liftNo}.`);

      // Force refresh data and switch to history tab
      setLoadingPending(true);
      setLoadingHistory(true);
      fetchDeliveryData().then(() => {
        setActiveTab("history");
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
      setUploadingImages({
        physicalImageOfProduct: false,
        imageOfWeightSlip: false,
      });
    }
  };

  
  const handleReturnSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!selectedDelivery) {
      alert("No delivery selected.")
      return
    }
    if (!validateReturnForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      const now = new Date()
      const timestamp = now.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).replace(",", "")

      // Use direct iframe approach for fastest submission
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.name = 'hiddenFrame'
      document.body.appendChild(iframe)

      const form = document.createElement('form')
      form.method = 'POST'
      form.action = API_URL // Changed from API_URL to SKA_API_URL for consistency
      form.target = 'hiddenFrame'
      form.style.display = 'none'

      // Add form fields
      const actionField = document.createElement('input')
      actionField.type = 'hidden'
      actionField.name = 'action'
      actionField.value = 'insert'
      form.appendChild(actionField)

      const sheetField = document.createElement('input')
      sheetField.type = 'hidden'
      sheetField.name = 'sheetName'
      sheetField.value = 'FMS'
      form.appendChild(sheetField)

      const dataField = document.createElement('input')
      dataField.type = 'hidden'
      dataField.name = 'rowData'
      dataField.value = JSON.stringify([
        timestamp,
        returnFormData.liftNo,
        returnFormData.qty,
        returnFormData.returnReason
      ])
      form.appendChild(dataField)

      // Submit form
      document.body.appendChild(form)
      form.submit()

      // Add this item to returned items set to make button red
      setReturnedItems(prev => new Set(prev).add(returnFormData.liftNo));

      // Clean up
      setTimeout(() => {
        if (document.body.contains(form)) document.body.removeChild(form)
        if (document.body.contains(iframe)) document.body.removeChild(iframe)
      }, 500)

      // Show success immediately and close popup
      setTimeout(() => {
        handleClosePopup()
        alert(`Return recorded successfully for ${selectedDelivery.liftNo}.`)
        // Refresh FMS data in background
        fetchFmsData()
      }, 1500)

    } catch (error) {
      console.error("Error submitting return form:", error)
      alert(`Error: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }


  const handleToggleColumn = (tab, dataKey, checked) => {
    if (tab === "pending") {
      setVisiblePendingColumns((prev) => ({ ...prev, [dataKey]: checked }))
    } else {
      setVisibleHistoryColumns((prev) => ({ ...prev, [dataKey]: checked }))
    }
  }

  const handleSelectAllColumns = (tab, columnsMeta, checked) => {
    const newVisibility = {}
    columnsMeta.forEach((col) => {
      if (col.toggleable && !col.alwaysVisible) newVisibility[col.dataKey] = checked
    })
    if (tab === "pending") {
      setVisiblePendingColumns((prev) => ({ ...prev, ...newVisibility }))
    } else {
      setVisibleHistoryColumns((prev) => ({ ...prev, ...newVisibility }))
    }
  }

  const renderCell = (item, column, tab) => {
    const value = item[column.dataKey]
    if (column.isLink) {
      return value ? (
        <a
          href={String(value).startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center text-xs"
        >
          <ExternalLink className="h-3 w-3 mr-1" /> {column.linkText || "View"}
        </a>
      ) : (
        <span className="text-gray-400 text-xs">N/A</span>
      )
    }

    if (column.dataKey === "actionColumn") {
      return tab === "pending" ? (
        <Button
          variant="default"
          size="xs"
          onClick={() => handleReceiptClick(item)}
          className="h-7 px-3 py-1 text-xs bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium shadow-sm transition-all duration-200 hover:shadow-md"
        >
          Receipt
        </Button>
      ) : (
        <Button
          variant="default"
          size="xs"
          onClick={() => handleReturnClick(item)}
          className={`h-7 px-3 py-1 text-xs font-medium shadow-sm transition-all duration-200 hover:shadow-md ${shouldReturnButtonBeRed(item.liftNo)
            ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
            : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
            }`}
        >
          Return
        </Button>
      )
    }

    return value || (value === 0 ? "0" : <span className="text-xs text-gray-400">N/A</span>)
  }

  const renderFileUploadSection = (fieldName, label) => {
    const hasFile = formData[fieldName]
    const hasPreview = imagePreview[fieldName]
    const isUploading = uploadingImages[fieldName]

    return (
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">{label}</Label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 transition-colors">
          <div className="space-y-1 text-center">
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="mx-auto h-8 w-8 text-blue-500 animate-spin" />
                <p className="text-xs text-blue-600 mt-2">Uploading...</p>
              </div>
            ) : (
              <Upload className="mx-auto h-8 w-8 text-gray-400" />
            )}
            <div className="flex text-sm text-gray-600 justify-center">
              <Label
                htmlFor={fieldName}
                className={`relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 px-1 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
                <Input
                  id={fieldName}
                  name={fieldName}
                  type="file"
                  className="sr-only"
                  onChange={handleFileUpload}
                  accept="image/*,application/pdf"
                  disabled={isUploading}
                />
              </Label>
            </div>
            <p className="text-xs text-gray-500">
              {hasFile ? formData[fieldName].name : "PNG, JPG, PDF (Optional)"}
            </p>
            {hasPreview && !isUploading && (
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
            {hasFile && !hasPreview && !isUploading && (
              <div className="mt-2">
                <p className="text-xs text-green-600">✓ File selected</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderTableSection = (tabKey, title, description, data, columnsMeta, visibilityState, isLoading) => {
    const visibleCols = columnsMeta.filter((col) => visibilityState[col.dataKey])

    return (
      <Card className="shadow-sm border border-border flex-1 flex flex-col">
        <CardHeader className="py-3 px-4 bg-muted/30">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center text-md font-semibold text-foreground">
                {tabKey === "pending" ? (
                  <FileCheck className="h-5 w-5 text-primary mr-2" />
                ) : (
                  <History className="h-5 w-5 text-primary mr-2" />
                )}
                {title}
                {searchTerm && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    - Filtered from {tabKey === "pending" ? originalPendingDeliveries.length : originalHistoryDeliveries.length} total
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {description}
              </CardDescription>
            </div>
            <div className="relative" ref={tabKey === "pending" ? pendingDropdownRef : historyDropdownRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => tabKey === "pending" ? setIsPendingColumnDropdownOpen(!isPendingColumnDropdownOpen) : setIsHistoryColumnDropdownOpen(!isHistoryColumnDropdownOpen)}
                className="flex items-center gap-2"
              >
                <span>Columns</span>
                <svg
                  className={`ml-1 h-4 w-4 transition-transform ${(tabKey === "pending" ? isPendingColumnDropdownOpen : isHistoryColumnDropdownOpen) ? 'rotate-180' : ''}`}
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

              {((tabKey === "pending" && isPendingColumnDropdownOpen) || (tabKey === "history" && isHistoryColumnDropdownOpen)) && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                  <div className="p-2">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                      <button
                        onClick={() => tabKey === "pending" ? handleSelectAllPendingColumns(true) : handleSelectAllHistoryColumns(true)}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300 mx-1">|</span>
                      <button
                        onClick={() => tabKey === "pending" ? handleSelectAllPendingColumns(false) : handleSelectAllHistoryColumns(false)}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        Deselect All
                      </button>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {columnsMeta.map((column) => (
                        <div
                          key={column.dataKey}
                          className="flex items-center px-3 py-2 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => !column.alwaysVisible && (tabKey === "pending" ? togglePendingColumnVisibility(column.dataKey) : toggleHistoryColumnVisibility(column.dataKey))}
                        >
                          <input
                            type="checkbox"
                            checked={visibilityState[column.dataKey]}
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
        <CardContent className="p-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Package className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No {tabKey === "pending" ? "pending" : "historical"} deliveries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-b-lg flex-1">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    {visibleCols.map((col) => (
                      <th key={col.dataKey} className="text-left p-3 whitespace-nowrap text-xs font-medium text-gray-700">
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-50 border-b border-gray-100">
                      {visibleCols.map((column) => (
                        <td
                          key={`${item.id}-${column.dataKey}`}
                          className={`p-3 whitespace-nowrap text-xs ${column.dataKey === "liftNo" ? "font-medium text-blue-600" : "text-gray-700"}`}
                        >
                          {renderCell(item, column, tabKey)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col gap-6">
        {/* Header section with search */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Delivery Management</h1>
          <div className="flex gap-2">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search deliveries..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-8 w-[200px] sm:w-[300px]"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground"
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("")
                fetchDeliveryData()
              }}
              disabled={loadingPending || loadingHistory}
            >
              <Loader2
                className={`h-4 w-4 mr-2 ${loadingPending || loadingHistory ? "animate-spin" : "hidden"}`}
              />
              Refresh Data
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center text-red-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="pending" className="px-4 py-2 text-sm">
              <FileText className="h-4 w-4 mr-2" />
              Pending Deliveries
              {pendingDeliveries.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingDeliveries.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="px-4 py-2 text-sm">
              <History className="h-4 w-4 mr-2" />
              Delivery History
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="flex-1">
            {renderTableSection(
              "pending",
              "Pending Deliveries",
              "Deliveries awaiting receipt confirmation",
              pendingDeliveries,
              PENDING_COLUMNS_META,
              visiblePendingColumns,
              loadingPending
            )}
          </TabsContent>
          <TabsContent value="history" className="flex-1">
            {renderTableSection(
              "history",
              "Delivery History",
              "Completed delivery receipts",
              historyDeliveries,
              HISTORY_COLUMNS_META,
              visibleHistoryColumns,
              loadingHistory
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={showPopup && selectedDelivery} onOpenChange={handleClosePopup}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {selectedDelivery?.columnQ ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                  <span>Return Delivery</span>
                </>
              ) : (
                <>
                  <FileCheck className="h-5 w-5 text-green-500 mr-2" />
                  <span>Confirm Receipt</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedDelivery?.columnQ ? (
            // Return Form
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Lift No.</Label>
                  <Input
                    name="liftNo"
                    value={returnFormData.liftNo}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Quantity</Label>
                  <Input
                    name="qty"
                    value={returnFormData.qty}
                    onChange={handleReturnInputChange}
                    placeholder="Enter Qty"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium">Return Reason</Label>
                <Input
                  name="returnReason"
                  value={returnFormData.returnReason}
                  onChange={handleReturnInputChange}
                  placeholder="Enter reason for return"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClosePopup}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReturnSubmit}
                  variant="destructive"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    "Submit Return"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            // Receipt Form
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Lift No.</Label>
                  <Input
                    name="liftNo"
                    value={formData.liftNo}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">ERP PO Number</Label>
                  <Input
                    name="erpPoNumber"
                    value={formData.erpPoNumber}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Broker Name</Label>
                  <Input
                    name="brokerName"
                    value={formData.brokerName}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Party Name</Label>
                  <Input
                    name="partyName"
                    value={formData.partyName}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Material Name</Label>
                  <Input
                    name="materialName"
                    value={formData.materialName}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Quantity</Label>
                  <Input
                    name="qty"
                    value={formData.qty}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Physical Condition*</Label>
                  <Select
                    name="physicalCondition"
                    value={formData.physicalCondition}
                    onValueChange={(value) => handleSelectChange("physicalCondition", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Bad">Bad</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.physicalCondition && (
                    <p className="text-xs text-red-500">{formErrors.physicalCondition}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Received Quantity</Label>
                  <Input
                    name="qtyDifference"
                    value={formData.qtyDifference}
                    onChange={handleInputChange}
                    placeholder="Enter quantity difference"
                  />
                  {formErrors.qtyDifference && (
                    <p className="text-xs text-red-500">{formErrors.qtyDifference}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {renderFileUploadSection("physicalImageOfProduct", "Physical Image Of Product")}
                {renderFileUploadSection("imageOfWeightSlip", "Image Of Weight Slip")}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClosePopup}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  disabled={isSubmitting || uploadingImages.physicalImageOfProduct || uploadingImages.imageOfWeightSlip}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>Processing...</span>
                    </>
                  ) : uploadingImages.physicalImageOfProduct || uploadingImages.imageOfWeightSlip ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>Uploading Files...</span>
                    </>
                  ) : (
                    "Confirm Receipt"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentImageTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {currentImageSrc && (
              <img
                src={currentImageSrc}
                alt={currentImageTitle}
                className="max-h-[70vh] max-w-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
