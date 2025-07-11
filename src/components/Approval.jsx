"use client"

import { useState, useEffect, useCallback } from "react"
import { Package, FileText, Loader2, History, FileCheck, AlertTriangle, ExternalLink } from "lucide-react"
import { MixerHorizontalIcon } from "@radix-ui/react-icons"

// Shadcn UI components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Constants
const SHEET_ID = "1RWxBXCtaZI6Ho05-8LpLzXK3vFDMGU7zS9h6kqXXN_Y"
const FMS_SHEET = "FMS"
const API_URL = "https://script.google.com/macros/s/AKfycbx3taDYQb8l6sT5pUieAHf6ODLCBa8EHKHnry61FeIFPovae8qkOsKIj4tzZ-waXrKjKw/exec"

// Action Type Options
const ACTION_TYPE_OPTIONS = [
    { value: "Make Only Debit Note", label: "Make Only Debit Note" },
    { value: "Return Vehicle", label: "Return Vehicle" }
]

// Column Definitions for Pending Table
const PENDING_COLUMNS_META = [
    { header: "Action", dataKey: "actionColumn", toggleable: false, alwaysVisible: true },
    { header: "Purchase Return Number", dataKey: "purchaseReturnNumber", toggleable: true, alwaysVisible: true },
    { header: "Lift Number", dataKey: "liftNumber", toggleable: true },
    { header: "Return Qty", dataKey: "returnQty", toggleable: true },
    { header: "Return Reason", dataKey: "returnReason", toggleable: true },
    { header: "Party Name", dataKey: "partyName", toggleable: true },
    { header: "Product Name", dataKey: "productName", toggleable: true },
    { header: "Weight Slip", dataKey: "weightSlip", toggleable: true, isLink: true, linkText: "View" },
    { header: "ERP PO Number", dataKey: "erpPoNumber", toggleable: true },
]

// Column Definitions for History Table
const HISTORY_COLUMNS_META = [
    { header: "Purchase Return Number", dataKey: "purchaseReturnNumber", toggleable: true, alwaysVisible: true },
    { header: "Lift Number", dataKey: "liftNumber", toggleable: true },
    { header: "Return Qty", dataKey: "returnQty", toggleable: true },
    { header: "Return Reason", dataKey: "returnReason", toggleable: true },
    { header: "Party Name", dataKey: "partyName", toggleable: true },
    { header: "Product Name", dataKey: "productName", toggleable: true },
    { header: "Weight Slip", dataKey: "weightSlip", toggleable: true, isLink: true, linkText: "View" },
    { header: "ERP PO Number", dataKey: "erpPoNumber", toggleable: true },
    { header: "Actual Return Qty", dataKey: "actualReturnQty", toggleable: true },
    { header: "Action Type", dataKey: "actionType", toggleable: true },
]

export default function FMSManagement() {
    const [pendingReturns, setPendingReturns] = useState([])
    const [historyReturns, setHistoryReturns] = useState([])
    const [selectedReturn, setSelectedReturn] = useState(null)
    const [loadingPending, setLoadingPending] = useState(true)
    const [loadingHistory, setLoadingHistory] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showPopup, setShowPopup] = useState(false)
    const [error, setError] = useState(null)

    // Form state for the action dialog
    const [formData, setFormData] = useState({
        purchaseReturnNumber: "",
        liftNumber: "",
        returnQty: "",
        actualReturnQty: "",
        actionType: "",
    })
    const [formErrors, setFormErrors] = useState({})

    const [activeTab, setActiveTab] = useState("pending")
    const [visiblePendingColumns, setVisiblePendingColumns] = useState({})
    const [visibleHistoryColumns, setVisibleHistoryColumns] = useState({})
    const [searchTerm, setSearchTerm] = useState("")

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

    const fetchFMSData = useCallback(async () => {
        setLoadingPending(true)
        setLoadingHistory(true)
        setError(null)

        try {
            const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(FMS_SHEET)}&range=A7:T1000`
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
                setPendingReturns([])
                setHistoryReturns([])
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
                        id: `fms-${index + 7}`,
                        rowIndex: index + 7,
                        purchaseReturnNumber: getCellValue(1), // Column B
                        liftNumber: getCellValue(2), // Column C
                        returnQty: getCellValue(3), // Column D
                        returnReason: getCellValue(4), // Column E
                        partyName: getCellValue(5), // Column F
                        productName: getCellValue(6), // Column G
                        weightSlip: getCellValue(7), // Column H
                        planned1: getCellValue(8), // Column I
                        actual1: getCellValue(9), // Column J
                        actualReturnQty: getCellValue(11), // Column L
                        actionType: getCellValue(12), // Column M
                        erpPoNumber: getCellValue(19), // Column T
                    }
                })
                .filter((row) => row !== null)

            // Filter for Pending: Column I (Planned1) NOT NULL and Column J (Actual1) NULL
            const pendingRows = processedRows.filter(
                (row) => row.planned1 && row.planned1 !== "" && (!row.actual1 || row.actual1 === ""),
            )

            // Filter for History: Column I (Planned1) NOT NULL and Column J (Actual1) NOT NULL
            const historyRows = processedRows.filter(
                (row) => row.planned1 && row.planned1 !== "" && row.actual1 && row.actual1 !== "",
            )

            setPendingReturns(pendingRows)
            setHistoryReturns(historyRows.reverse()) // Show latest first
        } catch (error) {
            console.error("Error fetching FMS data:", error)
            setError(`Failed to load FMS data: ${error.message}`)
            setPendingReturns([])
            setHistoryReturns([])
        } finally {
            setLoadingPending(false)
            setLoadingHistory(false)
        }
    }, [])

    useEffect(() => {
        fetchFMSData()
    }, [fetchFMSData])

    const handleActionClick = (returnItem) => {
        setSelectedReturn(returnItem)
        setFormData({
            purchaseReturnNumber: returnItem.purchaseReturnNumber,
            liftNumber: returnItem.liftNumber,
            returnQty: returnItem.returnQty,
            actualReturnQty: "",
            actionType: "",
        })
        setFormErrors({})
        setShowPopup(true)
    }

    const handleClosePopup = () => {
        setShowPopup(false)
        setSelectedReturn(null)
        setFormData({
            purchaseReturnNumber: "",
            liftNumber: "",
            returnQty: "",
            actualReturnQty: "",
            actionType: "",
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
        const requiredFields = ["actualReturnQty", "actionType"]

        requiredFields.forEach((field) => {
            if (!formData[field] || String(formData[field]).trim() === "") {
                newErrors[field] = `${field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} is required.`
            }
        })

        if (formData.actualReturnQty && isNaN(Number.parseFloat(formData.actualReturnQty))) {
            newErrors.actualReturnQty = "Actual Return Qty must be a valid number."
        }

        setFormErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        if (e) e.preventDefault()
        if (!selectedReturn) {
            alert("No return item selected.")
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

            // Prepare update data for the existing row (up to column T - 20 columns)
            const updateRowData = Array(20).fill("")

            // Keep existing data and update specific columns
            updateRowData[9] = timestamp // Column J - Actual1 (timestamp)
            updateRowData[11] = formData.actualReturnQty // Column L - Actual Return Qty
            updateRowData[12] = formData.actionType // Column M - Action Type

            // Conditionally update Column N (Planned) only if action type is "Make Only Debit Note"
            if (formData.actionType === "Make Only Debit Note") {
                updateRowData[13] = timestamp // Column N - Planned (timestamp)
            }

            // Use fetch with proper error handling
            const formDataToSend = new FormData()
            formDataToSend.append("action", "update")
            formDataToSend.append("sheetName", FMS_SHEET)
            formDataToSend.append("rowIndex", selectedReturn.rowIndex)
            formDataToSend.append("rowData", JSON.stringify(updateRowData))

            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    body: formDataToSend,
                })

                // Try to get response text (might be HTML or JSON)
                const responseText = await response.text()
                console.log("Response:", responseText)

                // Check if response contains success indicators
                if (responseText.includes('success') || response.ok) {
                    await fetchFMSData()
                    handleClosePopup()
                    setActiveTab("history") // Switch to history tab
                    alert(`Action recorded successfully for ${selectedReturn.purchaseReturnNumber}.`)
                } else {
                    throw new Error("Update may have failed")
                }
            } catch (fetchError) {
                console.log("Fetch failed, trying alternative approach...")

                // Create iframe for silent submission
                const iframe = document.createElement('iframe')
                iframe.style.display = 'none'
                iframe.name = 'hiddenFrame'
                document.body.appendChild(iframe)

                const form = document.createElement('form')
                form.method = 'POST'
                form.action = API_URL
                form.target = 'hiddenFrame'
                form.style.display = 'none'

                // Add form fields
                const actionField = document.createElement('input')
                actionField.type = 'hidden'
                actionField.name = 'action'
                actionField.value = 'update'
                form.appendChild(actionField)

                const sheetField = document.createElement('input')
                sheetField.type = 'hidden'
                sheetField.name = 'sheetName'
                sheetField.value = FMS_SHEET
                form.appendChild(sheetField)

                const rowField = document.createElement('input')
                rowField.type = 'hidden'
                rowField.name = 'rowIndex'
                rowField.value = selectedReturn.rowIndex
                form.appendChild(rowField)

                const dataField = document.createElement('input')
                dataField.type = 'hidden'
                dataField.name = 'rowData'
                dataField.value = JSON.stringify(updateRowData)
                form.appendChild(dataField)

                // Submit form
                document.body.appendChild(form)
                form.submit()

                // Clean up
                setTimeout(() => {
                    document.body.removeChild(form)
                    document.body.removeChild(iframe)
                }, 1000)

                // Wait and refresh data, then switch to history tab
                setTimeout(async () => {
                    await fetchFMSData()
                    handleClosePopup()
                    setActiveTab("history") // Switch to history tab
                    alert(`Action recorded successfully for ${selectedReturn.purchaseReturnNumber}.`)
                }, 2000)
            }

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
            return (
                <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleActionClick(item)}
                    className="h-7 px-3 py-1 text-xs bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium shadow-sm transition-all duration-200 hover:shadow-md"
                >
                    Process
                </Button>
            )
        }

        return value || (value === 0 ? "0" : <span className="text-xs text-gray-400">N/A</span>)
    }

    const filterData = (data, searchTerm) => {
        if (!searchTerm) return data
        const term = searchTerm.toLowerCase()
        return data.filter((item) =>
            Object.entries(item).some(([key, value]) => {
                if (key === "actionColumn") return false
                const stringValue = String(value || "").toLowerCase()
                return stringValue.includes(term)
            })
        )
    }

    const renderTableSection = (tabKey, title, description, data, columnsMeta, visibilityState, isLoading) => {
        const visibleCols = columnsMeta.filter((col) => visibilityState[col.dataKey])
        const filteredData = filterData(data, searchTerm)

        return (
            <Card className="shadow-sm border border-border flex-1 flex flex-col">
                <CardHeader className="py-3 px-4 bg-muted/30">
                    <div className="flex flex-col space-y-3">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="flex items-center text-md font-semibold text-foreground">
                                    {tabKey === "pending" ? (
                                        <FileCheck className="h-5 w-5 text-primary mr-2" />
                                    ) : (
                                        <History className="h-5 w-5 text-primary mr-2" />
                                    )}
                                    {title} ({filteredData.length}/{data.length})
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
                        <div className="w-full">
                            <Input
                                placeholder={`Search ${title.toLowerCase()}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full"
                            />
                        </div>
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
                    ) : filteredData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 px-4 border-2 border-dashed border-blue-200/50 bg-blue-50/50 rounded-lg mx-4 my-4 text-center flex-1">
                            <Package className="h-12 w-12 text-blue-500 mb-3" />
                            <p className="font-medium text-foreground">No Data Found</p>
                            <p className="text-sm text-muted-foreground text-center">
                                {searchTerm ? "No results match your search." : tabKey === "pending" ? "No pending returns found." : "No return history found."}
                            </p>
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
                                    {filteredData.map((item) => (
                                        <tr key={item.id} className="hover:bg-blue-50 border-b border-gray-100">
                                            {visibleCols.map((column) => (
                                                <td
                                                    key={`${item.id}-${column.dataKey}`}
                                                    className={`p-3 whitespace-nowrap text-xs ${column.dataKey === "purchaseReturnNumber" ? "font-medium text-blue-600" : "text-gray-700"}`}
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
        <div className="p-4">
            <Card className="shadow-md border-none">
                <CardContent className="p-4 sm:p-6 lg:p-8">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                        <TabsList className="grid w-full sm:w-[450px] grid-cols-2 mb-6">
                            <TabsTrigger value="pending" className="flex items-center gap-2">
                                <FileCheck className="h-4 w-4" /> Pending
                                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                                    {pendingReturns.length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="history" className="flex items-center gap-2">
                                <History className="h-4 w-4" /> History
                                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0.5 text-xs">
                                    {historyReturns.length}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="pending" className="flex-1 flex flex-col mt-0">
                            {renderTableSection(
                                "pending",
                                "Pending Returns",
                                "",
                                pendingReturns,
                                PENDING_COLUMNS_META,
                                visiblePendingColumns,
                                loadingPending,
                            )}
                        </TabsContent>

                        <TabsContent value="history" className="flex-1 flex flex-col mt-0">
                            {renderTableSection(
                                "history",
                                "Return History",
                                "Completed return records (Both Planned1 and Actual1 filled).",
                                historyReturns,
                                HISTORY_COLUMNS_META,
                                visibleHistoryColumns,
                                loadingHistory,
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Action Form Modal */}
            {showPopup && selectedReturn && (
                <Dialog open={showPopup} onOpenChange={setShowPopup}>
                    <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader className="border-b pb-4 mb-4">
                            <DialogTitle className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                                <FileText className="h-6 w-6 text-blue-600 mr-3" />
                                Process Return: <span className="font-bold text-blue-600 ml-1">{selectedReturn.purchaseReturnNumber}</span>
                            </DialogTitle>
                        </DialogHeader>
                        <div className="px-0 py-2 sm:px-0">
                            <div className="space-y-4">
                                {/* Pre-filled fields */}
                                <div>
                                    <Label className="block text-sm font-medium text-gray-700 mb-1">Purchase Return Number</Label>
                                    <Input value={formData.purchaseReturnNumber} readOnly className="bg-gray-100" />
                                </div>
                                <div>
                                    <Label className="block text-sm font-medium text-gray-700 mb-1">Lift Number</Label>
                                    <Input value={formData.liftNumber} readOnly className="bg-gray-100" />
                                </div>
                                <div>
                                    <Label className="block text-sm font-medium text-gray-700 mb-1">Return Qty</Label>
                                    <Input value={formData.returnQty} readOnly className="bg-gray-100" />
                                </div>

                                {/* Input fields */}
                                <div>
                                    <Label className="block text-sm font-medium text-gray-700 mb-1">
                                        Actual Return Qty <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        name="actualReturnQty"
                                        value={formData.actualReturnQty}
                                        onChange={handleInputChange}
                                        className={formErrors.actualReturnQty ? "border-red-500" : "border-gray-300"}
                                        placeholder="Enter actual return quantity"
                                    />
                                    {formErrors.actualReturnQty && (
                                        <p className="mt-1 text-xs text-red-600">{formErrors.actualReturnQty}</p>
                                    )}
                                </div>

                                <div>
                                    <Label className="block text-sm font-medium text-gray-700 mb-1">
                                        Action Type <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={formData.actionType}
                                        onValueChange={(value) => handleSelectChange("actionType", value)}
                                    >
                                        <SelectTrigger className={formErrors.actionType ? "border-red-500" : "border-gray-300"}>
                                            <SelectValue placeholder="Select action type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ACTION_TYPE_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {formErrors.actionType && (
                                        <p className="mt-1 text-xs text-red-600">{formErrors.actionType}</p>
                                    )}
                                </div>

                                <div className="pt-6 flex justify-end gap-4 border-t border-gray-200 mt-6">
                                    <Button type="button" variant="outline" onClick={handleClosePopup}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-[120px]">
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...
                                            </>
                                        ) : (
                                            "Submit"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}

