"use client"

import { useState, useEffect, useCallback } from "react"
import { Package, FileText, Loader2, Upload, History, FileCheck, AlertTriangle, ExternalLink, Eye } from "lucide-react"
import { MixerHorizontalIcon } from "@radix-ui/react-icons"

// Shadcn UI components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
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
const API_URL =
  "https://script.google.com/macros/s/AKfycbx3_COAFa1T6tCTjJT8Ip0ep7Qy83wA7ZpJteErgfzZ-gQG0Zf8Yxw6iTspQ5oGy6Q/exec"
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

// Column Definitions for History Table
const HISTORY_COLUMNS_META = [
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
  const [pendingDeliveries, setPendingDeliveries] = useState([])
  const [historyDeliveries, setHistoryDeliveries] = useState([])
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [loadingPending, setLoadingPending] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [error, setError] = useState(null)

  // Image preview states
  const [imagePreview, setImagePreview] = useState({
    physicalImageOfProduct: null,
    imageOfWeightSlip: null,
  })
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [currentImageSrc, setCurrentImageSrc] = useState("")
  const [currentImageTitle, setCurrentImageTitle] = useState("")

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
  const [visiblePendingColumns, setVisiblePendingColumns] = useState({})
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState({})

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

  const fetchDeliveryData = useCallback(async () => {
    setLoadingPending(true)
    setLoadingHistory(true)
    setError(null)

    try {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(DELIVERY_SHEET)}&range=A7:V1000`
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

  const handleSelectChange = (name, value) => {
    setFormData({ ...formData, [name]: value })
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null })
  }

  const handleFileUpload = (e) => {
    const { name, files } = e.target
    const file = files && files[0] ? files[0] : null
    setFormData({ ...formData, [name]: file })

    // Create image preview URL
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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!selectedDelivery) {
      alert("No delivery selected.")
      return
    }
    if (!validateForm()) {
      alert("Please fill all required fields correctly.")
      return
    }

    setIsSubmitting(true)
    try {
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

      // Upload files if provided
      let physicalImageUrl = ""
      let weightSlipImageUrl = ""

      if (formData.physicalImageOfProduct) {
        physicalImageUrl = await uploadFileToDrive(formData.physicalImageOfProduct)
      }
      if (formData.imageOfWeightSlip) {
        weightSlipImageUrl = await uploadFileToDrive(formData.imageOfWeightSlip)
      }

      // Prepare update data for the existing row
      const updateRowData = Array(22).fill("") // Assuming 22 columns (A to V)

      // Keep existing data and update specific columns
      updateRowData[16] = timestamp // Column Q - Time stamp
      updateRowData[18] = formData.physicalCondition // Column S - Physical Condition
      updateRowData[19] = formData.qtyDifference // Column T - Qty Difference
      updateRowData[20] = physicalImageUrl // Column U - Physical Image Of Product
      updateRowData[21] = weightSlipImageUrl // Column V - Image Of Weight Slip

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
      const result = await response.json()
      if (!result.success) throw new Error(result.message || "Failed to update delivery record")

      // Refresh data
      await fetchDeliveryData()

      handleClosePopup()
      alert(`Receipt recorded successfully for ${selectedDelivery.liftNo}.`)
    } catch (error) {
      console.error("Error submitting form:", error)
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

  const renderCell = (item, column) => {
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
    return value || (value === 0 ? "0" : <span className="text-xs text-gray-400">N/A</span>)
  }

  const renderFileUploadSection = (fieldName, label) => {
    const hasFile = formData[fieldName]
    const hasPreview = imagePreview[fieldName]

    return (
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">{label}</Label>
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
                  accept="image/*"
                />
              </Label>
            </div>
            <p className="text-xs text-gray-500">
              {hasFile ? formData[fieldName].name : "PNG, JPG (Optional)"}
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
                {title} ({data.length})
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-0.5">{description}</CardDescription>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <MixerHorizontalIcon className="mr-1.5 h-3.5 w-3.5" /> View Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-3">
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Toggle Columns</p>
                  <div className="flex items-center justify-between mt-1 mb-2">
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-xs"
                      onClick={() => handleSelectAllColumns(tabKey, columnsMeta, true)}
                    >
                      Select All
                    </Button>
                    <span className="text-gray-300 mx-1">|</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-xs"
                      onClick={() => handleSelectAllColumns(tabKey, columnsMeta, false)}
                    >
                      Deselect All
                    </Button>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {columnsMeta
                      .filter((col) => col.toggleable)
                      .map((col) => (
                        <div key={`toggle-${tabKey}-${col.dataKey}`} className="flex items-center space-x-2">
                          <Checkbox
                            id={`toggle-${tabKey}-${col.dataKey}`}
                            checked={!!visibilityState[col.dataKey]}
                            onCheckedChange={(checked) => handleToggleColumn(tabKey, col.dataKey, Boolean(checked))}
                            disabled={col.alwaysVisible}
                          />
                          <Label
                            htmlFor={`toggle-${tabKey}-${col.dataKey}`}
                            className="text-xs font-normal cursor-pointer"
                          >
                            {col.header}{" "}
                            {col.alwaysVisible && <span className="text-gray-400 ml-0.5 text-xs">(Fixed)</span>}
                          </Label>
                        </div>
                      ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center py-10 flex-1">
              <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : error && data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-destructive-foreground bg-destructive/10 rounded-lg mx-4 my-4 text-center flex-1">
              <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
              <p className="font-medium text-destructive">Error Loading Data</p>
              <p className="text-sm text-muted-foreground max-w-md">{error}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-blue-200/50 bg-blue-50/50 rounded-lg mx-4 my-4 text-center flex-1">
              <Package className="h-12 w-12 text-blue-500 mb-3" />
              <p className="font-medium text-foreground">No Data Found</p>
              <p className="text-sm text-muted-foreground text-center">
                {tabKey === "pending" ? "No pending deliveries found." : "No delivery history found."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-b-lg flex-1">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    {visibleCols.map((col) => (
                      <TableHead key={col.dataKey} className="whitespace-nowrap text-xs">
                        {col.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.id} className="hover:bg-blue-50/50">
                      {visibleCols.map((column) => (
                        <TableCell
                          key={`${item.id}-${column.dataKey}`}
                          className={`whitespace-nowrap text-xs ${column.dataKey === "liftNo" ? "font-medium text-primary" : "text-gray-700"}`}
                        >
                          {column.dataKey === "actionColumn" && tabKey === "pending" ? (
                            <Button
                              variant="default"
                              size="xs"
                              onClick={() => handleReceiptClick(item)}
                              className="h-7 px-3 py-1 text-xs bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium shadow-sm transition-all duration-200 hover:shadow-md"
                            >
                              Receipt
                            </Button>
                          ) : (
                            renderCell(item, column)
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
    )
  }

  return (
    <div>
      <Card className="shadow-md border-none">
        <CardContent className="p-4 sm:p-6 lg:p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full sm:w-[450px] grid-cols-2 mb-6">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" /> Pending
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {pendingDeliveries.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" /> History
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                  {historyDeliveries.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="flex-1 flex flex-col mt-0">
              {renderTableSection(
                "pending",
                "Pending Deliveries",
                "Deliveries awaiting receipt confirmation (Column P filled, Column Q empty).",
                pendingDeliveries,
                PENDING_COLUMNS_META,
                visiblePendingColumns,
                loadingPending,
              )}
            </TabsContent>

            <TabsContent value="history" className="flex-1 flex flex-col mt-0">
              {renderTableSection(
                "history",
                "Delivery History",
                "Completed delivery receipts (Both Column P and Q filled).",
                historyDeliveries,
                HISTORY_COLUMNS_META,
                visibleHistoryColumns,
                loadingHistory,
              )}
            </TabsContent>
          </Tabs>
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
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Material Name</Label>
                    <Input value={formData.materialName} readOnly className="bg-gray-100" />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">Bill Qty</Label>
                    <Input
                      type="number"
                      step="any"
                      name="qty"
                      value={formData.qty}
                      onChange={handleInputChange}
                      className="border-gray-300"
                      placeholder="Enter quantity"
                    />
                  </div>

                  {/* User input fields */}
                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">
                      Physical Condition <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.physicalCondition}
                      onValueChange={(value) => handleSelectChange("physicalCondition", value)}
                    >
                      <SelectTrigger className={formErrors.physicalCondition ? "border-red-500" : "border-gray-300"}>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Bad">Bad</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.physicalCondition && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.physicalCondition}</p>
                    )}
                  </div>

                  <div>
                    <Label className="block text-sm font-medium text-gray-700 mb-1">
                      Received Quantity <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      name="qtyDifference"
                      value={formData.qtyDifference}
                      onChange={handleInputChange}
                      className={formErrors.qtyDifference ? "border-red-500" : "border-gray-300"}
                      placeholder="Enter received quantity"
                    />
                    {formErrors.qtyDifference && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.qtyDifference}</p>
                    )}
                  </div>
                </div>

                {/* File upload sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {renderFileUploadSection("physicalImageOfProduct", "Physical Image Of Product")}
                  {renderFileUploadSection("imageOfWeightSlip", "Image Of Weight Slip")}
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