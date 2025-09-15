"use client"

import { useState, useEffect, useCallback } from "react"
import { Package, FileText, Loader2, History, FileCheck, AlertTriangle, ExternalLink, X, Search, RefreshCw } from "lucide-react" // Added RefreshCw icon

// Shadcn UI components
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Constants
const SHEET_ID = "19Za1BvjKvHT01rzDOPLS_MErnuEJd6__l7C_4lUgLlg"
const DELIVERY_SHEET = "DELIVERY"
const API_URL =
    "https://script.google.com/macros/s/AKfycbx3_COAFa1T6tCTjJT8Ip0ep7Qy83wA7ZpJteErgfzZ-gQG0Zf8Yxw6iTspQ5oGy6Q/exec"

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

// Update the formatDateToDDMMYYYY function to properly handle HTML date input format
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
    const [searchQuery, setSearchQuery] = useState("") // New state for search query
    const [isRefreshing, setIsRefreshing] = useState(false) // Added refresh state

    const [formData, setFormData] = useState({
        liftNo: "",
        erpPoNumber: "",
        brokerName: "",
        partyName: "",
        materialName: "",
        qty: "",
        outTime: "",
        vehicleOutDate: "",
        status: "",
    })
    const [formErrors, setFormErrors] = useState({})

    const [activeTab, setActiveTab] = useState("pending")

    const fetchDeliveryData = useCallback(async () => {
        setLoadingPending(true)
        setLoadingHistory(true)
        setError(null)

        try {
            const cacheBuster = new Date().getTime()
            const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(DELIVERY_SHEET)}&range=A7:AB1000&t=${cacheBuster}`

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
                        transporterName: getCellValue(12), // Column M
                        physicalCondition: getCellValue(18), // Column S
                        qtyDifference: getCellValue(19), // Column T
                        physicalImageOfProduct: getCellValue(20), // Column U
                        imageOfWeightSlip: getCellValue(21), // Column V
                        columnW: getCellValue(22), // Column W
                        columnX: getCellValue(23), // Column X
                        outTime: getCellValue(25), // Column Z
                        vehicleOutDate: getCellValue(26), // Column AA
                        status: getCellValue(27), // Column AB
                        rawCells: row.c ? row.c.map((cell) => (cell ? (cell.f ?? cell.v) : "")) : [],
                    }
                })
                .filter((row) => row !== null)

            // Filter for Pending: Column W not null and Column X null
            const pendingRows = processedRows.filter(
                (row) => row.columnW && row.columnW !== "" && (!row.columnX || row.columnX === ""),
            )

            // Filter for History: Column W not null and Column X not null
            const historyRows = processedRows.filter(
                (row) => row.columnW && row.columnW !== "" && row.columnX && row.columnX !== "",
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

    // Added refresh function
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
            outTime: "",
            vehicleOutDate: "",
            status: "",
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
            qty: "",
            outTime: "",
            vehicleOutDate: "",
            status: "",
        })
        setFormErrors({})
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData({ ...formData, [name]: value })
        if (formErrors[name]) setFormErrors({ ...formErrors, [name]: null })
    }

    const validateForm = () => {
        const newErrors = {}
        const requiredFields = ["outTime", "vehicleOutDate", "status"]

        requiredFields.forEach((field) => {
            if (!formData[field] || String(formData[field]).trim() === "") {
                newErrors[field] = `${field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())} is required.`
            }
        })

        setFormErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!selectedDelivery) {
            setToast({ message: "Error", description: "No delivery selected.", type: "error" });
            return;
        }
        if (!validateForm()) {
            setToast({
                message: "Validation Error",
                description: "Please fill all required fields correctly.",
                type: "error",
            });
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

            // Format Vehicle Out Date to DD/MM/YYYY
            const formattedVehicleOutDate = formatDateToDDMMYYYY(formData.vehicleOutDate);

            // Prepare update data for the existing row
            const updateRowData = [...selectedDelivery.rawCells];

            // Ensure array has enough elements (28 for columns A to AB)
            while (updateRowData.length < 28) {
                updateRowData.push("");
            }

            // Update only the specific columns we want:
            // Column X (index 23) - Timestamp
            updateRowData[23] = timestamp;

            // Column Z (index 25) - Out time
            updateRowData[25] = formData.outTime;

            // Column AA (index 26) - Vehicle Out Date
            updateRowData[26] = formattedVehicleOutDate;

            // Column AB (index 27) - Status
            updateRowData[27] = formData.status;

            // Remove any accidental updates to other columns
            // Specifically clear any unintended timestamp updates
            updateRowData[15] = ""; // Column P (16)
            // updateRowData[21] = ""; // Column V (22)
            updateRowData[22] = ""; // Column V (22)
            updateRowData[24] = ""; // Column V (22)

            const updateParams = new URLSearchParams({
                action: "update",
                sheetName: DELIVERY_SHEET,
                rowIndex: selectedDelivery.rowIndex,
                rowData: JSON.stringify(updateRowData),
            });

            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: updateParams.toString(),
            });

            if (!response.ok) throw new Error(`Update failed: ${response.status}`);

            const result = await response.json();
            if (!result.success) throw new Error(result.message || "Failed to update delivery record");

            // Refresh data
            await fetchDeliveryData();

            handleClosePopup();
            setToast({
                message: "Success",
                description: `Receipt recorded successfully for ${selectedDelivery.liftNo}.`,
                type: "success",
            });
        } catch (error) {
            console.error("Error submitting form:", error);
            setToast({
                message: "Submission Error",
                description: error.message,
                type: "error",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

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

    // Filtered data based on search query
    const filteredPendingDeliveries = pendingDeliveries.filter((delivery) =>
        Object.values(delivery).some((value) =>
            String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
    )

    const filteredHistoryDeliveries = historyDeliveries.filter((delivery) =>
        Object.values(delivery).some((value) =>
            String(value).toLowerCase().includes(searchQuery.toLowerCase())
        )
    )

    const renderPendingTable = (data) => (
        <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="font-semibold">Action</TableHead>
                        <TableHead className="font-semibold">Lift No.</TableHead>
                        <TableHead className="font-semibold">ERP Po Number</TableHead>
                        <TableHead className="font-semibold">Indent Number</TableHead>
                        <TableHead className="font-semibold">Broker Name</TableHead>
                        <TableHead className="font-semibold">Party Name</TableHead>
                        <TableHead className="font-semibold">Material Name</TableHead>
                        <TableHead className="font-semibold">Qty</TableHead>
                        <TableHead className="font-semibold">Bill Number</TableHead>
                        <TableHead className="font-semibold">Truck Number</TableHead>
                        <TableHead className="font-semibold">Driver Number</TableHead>
                        <TableHead className="font-semibold">Transporter Name</TableHead>
                        <TableHead className="font-semibold">Physical Condition</TableHead>
                        <TableHead className="font-semibold">Qty Difference</TableHead>
                        <TableHead className="font-semibold">Physical Image</TableHead>
                        <TableHead className="font-semibold">Weight Slip Image</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/30">
                            <TableCell>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleReceiptClick(item)}
                                    className="h-8 px-3 py-1 text-xs"
                                >
                                    Receipt
                                </Button>
                            </TableCell>
                            <TableCell className="font-medium text-primary">{renderCell(item.liftNo)}</TableCell>
                            <TableCell>{renderCell(item.erpPoNumber)}</TableCell>
                            <TableCell>{renderCell(item.indentNumber)}</TableCell>
                            <TableCell>{renderCell(item.brokerName)}</TableCell>
                            <TableCell>{renderCell(item.partyName)}</TableCell>
                            <TableCell>{renderCell(item.materialName)}</TableCell>
                            <TableCell>{renderCell(item.qty)}</TableCell>
                            <TableCell>{renderCell(item.billNumber)}</TableCell>
                            <TableCell>{renderCell(item.truckNumber)}</TableCell>
                            <TableCell>{renderCell(item.driverNumber)}</TableCell>
                            <TableCell>{renderCell(item.transporterName)}</TableCell>
                            <TableCell>{renderCell(item.physicalCondition)}</TableCell>
                            <TableCell>{renderCell(item.qtyDifference)}</TableCell>
                            <TableCell>{renderLinkCell(item.physicalImageOfProduct)}</TableCell>
                            <TableCell>{renderLinkCell(item.imageOfWeightSlip)}</TableCell>

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
                        <TableHead className="font-semibold">Lift No.</TableHead>
                        <TableHead className="font-semibold">ERP Po Number</TableHead>
                        <TableHead className="font-semibold">Broker Name</TableHead>
                        <TableHead className="font-semibold">Party Name</TableHead>
                        <TableHead className="font-semibold">Material Name</TableHead>
                        <TableHead className="font-semibold">Qty</TableHead>
                        <TableHead className="font-semibold">Physical Condition</TableHead>
                        <TableHead className="font-semibold">Out Time</TableHead>
                        <TableHead className="font-semibold">Vehicle Out Date</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item) => (
                        <TableRow key={item.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium text-primary">{renderCell(item.liftNo)}</TableCell>
                            <TableCell>{renderCell(item.erpPoNumber)}</TableCell>
                            <TableCell>{renderCell(item.brokerName)}</TableCell>
                            <TableCell>{renderCell(item.partyName)}</TableCell>
                            <TableCell>{renderCell(item.materialName)}</TableCell>
                            <TableCell>{renderCell(item.qty)}</TableCell>
                            <TableCell>{renderCell(item.physicalCondition)}</TableCell>
                            <TableCell>{renderCell(formatTimeTo12Hour(item.outTime))}</TableCell>
                            <TableCell>{renderCell(item.vehicleOutDate)}</TableCell>
                            <TableCell>{renderCell(item.status)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )

    return (
        <div className="p-2 sm:p-4 lg:p-6">
            {toast && (
                <Toast message={toast.message} description={toast.description} type={toast.type} onClose={closeToast} />
            )}

            <Card className="shadow-md border-none">
                <CardContent className="p-3 sm:p-6">
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
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                                <TabsList className="grid w-full sm:w-auto grid-cols-2">
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
                                <div className="flex flex-col sm:flex-row items-center gap-3">
                                    {/* Search Bar */}
                                    <div className="relative w-full sm:w-auto">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            type="text"
                                            placeholder="Search deliveries..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 pr-4 py-2 border rounded-md w-full sm:max-w-sm"
                                        />
                                    </div>
                                    {/* Refresh Button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleRefresh}
                                        disabled={isRefreshing}
                                        className="flex items-center gap-2 w-full sm:w-auto"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                        Refresh
                                    </Button>
                                </div>
                            </div>


                            <TabsContent value="pending" className="mt-0">
                                <Card>
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <FileCheck className="h-5 w-5 text-blue-600" />
                                            Pending Deliveries ({filteredPendingDeliveries.length})
                                        </CardTitle>
                                        <CardDescription>
                                            {/* Deliveries awaiting receipt confirmation (Column W filled, Column X empty) */}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {filteredPendingDeliveries.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                                <Package className="h-12 w-12 text-blue-500 mb-3" />
                                                <h3 className="text-lg font-medium text-foreground">No Pending Deliveries</h3>
                                                <p className="text-sm text-muted-foreground">No deliveries currently pending receipt matching your search.</p>
                                            </div>
                                        ) : (
                                            <div className="p-3 sm:p-6">{renderPendingTable(filteredPendingDeliveries)}</div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="history" className="mt-0">
                                <Card>
                                    <CardHeader className="py-3">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <History className="h-5 w-5 text-blue-600" />
                                            Delivery History ({filteredHistoryDeliveries.length})
                                        </CardTitle>
                                        <CardDescription>Completed delivery receipts (Both Column W and X filled)</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {filteredHistoryDeliveries.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                                <History className="h-12 w-12 text-blue-500 mb-3" />
                                                <h3 className="text-lg font-medium text-foreground">No Delivery History</h3>
                                                <p className="text-sm text-muted-foreground">No completed deliveries found matching your search.</p>
                                            </div>
                                        ) : (
                                            <div className="p-3 sm:p-6">{renderHistoryTable(filteredHistoryDeliveries)}</div>
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
                    <DialogContent className="w-[95vw] sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader className="border-b pb-4 mb-4">
                            <DialogTitle className="text-lg leading-6 font-medium text-gray-900 flex flex-col sm:flex-row sm:items-center">
                                <div className="flex items-center">
                                    <FileText className="h-6 w-6 text-blue-600 mr-3" />
                                    Record Receipt for Lift:
                                </div>
                                <span className="font-bold text-blue-600 ml-0 sm:ml-1">{selectedDelivery.liftNo}</span>
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
                                        <Label className="block text-sm font-medium text-gray-700 mb-1">Qty</Label>
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
                                            Out Time <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            type="time"
                                            name="outTime"
                                            value={formData.outTime}
                                            onChange={handleInputChange}
                                            className={formErrors.outTime ? "border-red-500" : "border-gray-300"}
                                        />
                                        {formErrors.outTime && <p className="mt-1 text-xs text-red-600">{formErrors.outTime}</p>}
                                    </div>

                                    <div>
                                        <Label className="block text-sm font-medium text-gray-700 mb-1">
                                            Vehicle Out Date <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            type="date"
                                            name="vehicleOutDate"
                                            value={formData.vehicleOutDate}
                                            onChange={handleInputChange}
                                            className={formErrors.vehicleOutDate ? "border-red-500" : "border-gray-300"}
                                        />
                                        {formErrors.vehicleOutDate && (
                                            <p className="mt-1 text-xs text-red-600">{formErrors.vehicleOutDate}</p>
                                        )}
                                    </div>

                                    <div className="md:col-span-2">
                                        <Label className="block text-sm font-medium text-gray-700 mb-1">
                                            Status <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={formData.status}
                                            onValueChange={(value) => {
                                                setFormData({ ...formData, status: value })
                                                if (formErrors.status) setFormErrors({ ...formErrors, status: null })
                                            }}
                                        >
                                            <SelectTrigger className={formErrors.status ? "border-red-500" : "border-gray-300"}>
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="All Okay">All Okay</SelectItem>
                                                <SelectItem value="Not Okay">Not Okay</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {formErrors.status && <p className="mt-1 text-xs text-red-600">{formErrors.status}</p>}
                                    </div>
                                </div>

                                <div className="pt-6 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 border-t border-gray-200 mt-6">
                                    <Button type="button" variant="outline" onClick={handleClosePopup} className="w-full sm:w-auto">
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto min-w-[120px]">
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